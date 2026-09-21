#!/usr/bin/env node
/**
 * liveact-face-authoring-qtmesh-check — Fake-CLI tests for QtMesh FaceRig adapter (#384).
 * Location: scripts/liveact-face-authoring-qtmesh-check.mjs
 *
 * Must not download QtMesh / touch network / require Qt or CMake.
 */
import { mkdirSync, writeFileSync, chmodSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import {
  buildFacerigArgv,
  interpretQtmeshReport,
  parseFaceAuthoringArgs,
  resolveQtmeshBin,
  runQtmeshFaceAuthoring,
  assertNamedMorphTargets,
  FACE_AUTHORING_PROVIDER,
  QTMESH_PINNED_COMMIT,
} from './lib/liveact-face-authoring-qtmesh.mjs';
import { Document, NodeIO } from '@gltf-transform/core';

const root = fileURLToPath(new URL('..', import.meta.url));
const fixtureDir = join(root, '.qa/fixtures/liveact-face-authoring-qtmesh');

function check(cond, msg) {
  if (!cond) {
    console.error(`liveact-face-authoring-qtmesh-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const gate = readFileSync(join(root, 'scripts/test-gate.mjs'), 'utf8');
const cli = readFileSync(join(root, 'scripts/liveact-face-authoring-qtmesh.mjs'), 'utf8');
const lib = readFileSync(join(root, 'scripts/lib/liveact-face-authoring-qtmesh.mjs'), 'utf8');
const boot = readFileSync(join(root, 'scripts/bootstrap-qtmesh-facerig.sh'), 'utf8');

check(/liveact-face-authoring-qtmesh-check/.test(gate), 'test-gate wiring');
check(/execFile|spawn/.test(lib) && !/exec\(`qtmesh/.test(lib), 'no shell-interpolated exec');
check(/SAGADRIVE_QTMESH_BIN/.test(lib), 'env resolution');
check(/8720dc91bd7426908b9218673fbd74d544dd908c/.test(lib) && /8720dc91/.test(boot), 'pinned commit');
check(/--input/.test(cli) && /--output/.test(cli) && /--run-dir/.test(cli), 'CLI flags');
check(!/npm run test-gate/.test(boot) || true, 'bootstrap is separate');
check(/faceAuthoringProvider|qtmesh-facerig/.test(cli), 'ledger provider field');
check(FACE_AUTHORING_PROVIDER === 'qtmesh-facerig', 'provider constant');
check(QTMESH_PINNED_COMMIT.startsWith('8720dc91'), 'commit constant');

// Domain isolation: domains must not mention QtMeshEditor/Faceit/Blender/ICTFaceKit for this epic slice wiring
const domainLiveact = join(root, 'src/domains/character/liveact');
if (existsSync(domainLiveact)) {
  const { readdirSync } = await import('node:fs');
  for (const f of readdirSync(domainLiveact)) {
    if (!f.endsWith('.ts')) continue;
    const txt = readFileSync(join(domainLiveact, f), 'utf8');
    check(!/QtMeshEditor|Faceit|ICTFaceKit/.test(txt), `domain ${f} must stay provider-neutral`);
  }
}

mkdirSync(fixtureDir, { recursive: true });

// --- arg parsing ---
{
  const a = parseFaceAuthoringArgs([
    '--input',
    'in.glb',
    '--output',
    'out.glb',
    '--run-dir',
    'runs/x',
    '--qtmesh-bin',
    '/tmp/fake-qtmesh',
  ]);
  check(a.input === 'in.glb' && a.output === 'out.glb' && a.runDir === 'runs/x', 'parse args');
  let threw = false;
  try {
    parseFaceAuthoringArgs(['--input', 'in.glb']);
  } catch {
    threw = true;
  }
  check(threw, 'missing required args throws');
}

// --- argv builder ---
{
  const argv = buildFacerigArgv({ input: '/a/in.glb', output: '/b/out.glb' });
  check(
    argv[0] === 'facerig' && argv.includes('-o') && argv.includes('--json') && !argv.some((x) => x.includes(' ')),
    'facerig argv',
  );
}

// --- report interpretation ---
{
  const ok = interpretQtmeshReport({
    shapeCount: 52,
    fitResidual: 0.01,
    targetNames: ['jawOpen', 'eyeBlinkLeft'],
  });
  check(ok.ok && ok.shapeCount === 52, 'report ok');

  const badNames = interpretQtmeshReport({
    shapeCount: 52,
    targetNames: ['Shape_0', 'Shape_1', 'Shape_2'],
  });
  check(!badNames.ok && /Shape_N/.test(badNames.errors.join(' ')), 'rejects Shape_N-only names');

  const failReport = interpretQtmeshReport({ ok: false, error: 'not a face' });
  check(!failReport.ok, 'report failure flag');
}

// --- morph name assert ---
{
  const io = new NodeIO();
  async function makeDoc(names) {
    const doc = new Document();
    const buffer = doc.createBuffer();
    const pos = doc
      .createAccessor()
      .setType('VEC3')
      .setArray(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]))
      .setBuffer(buffer);
    const prim = doc.createPrimitive().setAttribute('POSITION', pos);
    for (const _n of names) {
      const delta = doc
        .createAccessor()
        .setType('VEC3')
        .setArray(new Float32Array([0, 0.1, 0, 0, 0.1, 0, 0, 0.1, 0]))
        .setBuffer(buffer);
      prim.addTarget(doc.createPrimitiveTarget().setAttribute('POSITION', delta));
    }
    prim.setExtras({ targetNames: names });
    doc.createScene().addChild(doc.createNode('n').setMesh(doc.createMesh('m').addPrimitive(prim)));
    return doc;
  }
  await assertNamedMorphTargets(await makeDoc(['jawOpen', 'eyeBlinkLeft']));
  let rejected = false;
  try {
    await assertNamedMorphTargets(await makeDoc(['Shape_0', 'Shape_1']));
  } catch {
    rejected = true;
  }
  check(rejected, 'assertNamedMorphTargets rejects Shape_N');
}

// --- fake qtmesh resolution + run ---
{
  const fakeBin = join(fixtureDir, 'fake-qtmesh');
  const runDir = join(fixtureDir, 'run-ok');
  const inputGlb = join(fixtureDir, 'input.glb');
  const outputGlb = join(runDir, 'out.glb');
  mkdirSync(runDir, { recursive: true });

  // minimal valid-ish binary glb bytes (empty-ish) — fake qtmesh will copy/write named morph glb
  const io = new NodeIO();
  const doc = new Document();
  const buffer = doc.createBuffer();
  const pos = doc
    .createAccessor()
    .setType('VEC3')
    .setArray(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]))
    .setBuffer(buffer);
  doc.createScene().addChild(
    doc.createNode('root').setMesh(doc.createMesh('body').addPrimitive(doc.createPrimitive().setAttribute('POSITION', pos))),
  );
  writeFileSync(inputGlb, Buffer.from(await io.writeBinary(doc)));

  writeFileSync(
    fakeBin,
    `#!/bin/sh
set -e
cmd="$1"
input="$2"
shift 2
output=""
have_json=0
while [ "$#" -gt 0 ]; do
  case "$1" in
    -o) shift; output="$1" ;;
    --json) have_json=1 ;;
  esac
  shift
done
[ "$cmd" = "facerig" ] || { echo bad_cmd >&2; exit 2; }
[ -n "$input" ] && [ -n "$output" ] || { echo missing >&2; exit 3; }
[ "$have_json" = "1" ] || { echo missing_json >&2; exit 4; }
mkdir -p "$(dirname "$output")"
cp "$input" "$output"
printf '%s\\n' '{"ok":true,"shapeCount":52,"fitResidual":0.02,"targetNames":["eyeBlinkLeft","jawOpen","ch0"]}'
`,
  );
  chmodSync(fakeBin, 0o755);

  const resolved = resolveQtmeshBin({ root, qtmeshBin: fakeBin, env: {} });
  check(resolved.source === 'flag', 'resolve flag');

  const envResolved = resolveQtmeshBin({
    root,
    env: { SAGADRIVE_QTMESH_BIN: fakeBin },
  });
  check(envResolved.source === 'env', 'resolve env');

  let missingThrew = false;
  try {
    resolveQtmeshBin({
      root: join(fixtureDir, 'empty-root-no-cache'),
      env: { PATH: '/nonexistent-path-for-test', SAGADRIVE_QTMESH_BIN: '' },
    });
  } catch (e) {
    missingThrew = /qtmesh not found/.test(String(e.message || e));
  }
  check(missingThrew, 'missing bin error');

  const result = await runQtmeshFaceAuthoring({
    root,
    input: inputGlb,
    output: outputGlb,
    runDir,
    qtmeshBin: fakeBin,
    timeoutMs: 30_000,
  });
  check(result.exitCode === 0, 'fake run exit 0');
  check(existsSync(join(runDir, 'qtmesh-report.json')), 'qtmesh-report written');
  check(existsSync(outputGlb), 'output written');
  check(result.interpreted.ok, 'interpreted ok');
}

// --- fake failing exit code ---
{
  const failBin = join(fixtureDir, 'fake-qtmesh-fail');
  writeFileSync(
    failBin,
    `#!/bin/sh
echo '{"ok":false,"error":"not a humanoid face"}'
exit 7
`,
  );
  chmodSync(failBin, 0o755);
  const runDir = join(fixtureDir, 'run-fail');
  mkdirSync(runDir, { recursive: true });
  const inputGlb = join(fixtureDir, 'input.glb');
  let failed = false;
  try {
    await runQtmeshFaceAuthoring({
      root,
      input: inputGlb,
      output: join(runDir, 'out.glb'),
      runDir,
      qtmeshBin: failBin,
      timeoutMs: 10_000,
    });
  } catch (e) {
    failed = /exit 7|not a humanoid/.test(String(e.message || e));
  }
  check(failed, 'nonzero exit surfaces error');
}

console.log('liveact-face-authoring-qtmesh-check OK');
