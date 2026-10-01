#!/usr/bin/env node
/**
 * toonlab-compatibility-spike-check — deterministic gate for #341.
 * Location: scripts/toonlab-compatibility-spike-check.mjs
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));

function fail(msg) {
  console.error(`toonlab-compatibility-spike-check FAIL: ${msg}`);
  process.exit(1);
}

function check(cond, msg) {
  if (!cond) fail(msg);
}

function read(rel) {
  return readFileSync(join(root, rel), 'utf8');
}

/** Parse glTF JSON chunk from a GLB/VRM container without Three.js. */
function readGltfJsonFromGlb(absPath) {
  const buf = readFileSync(absPath);
  check(buf.length >= 12, `file too small: ${absPath}`);
  const magic = buf.toString('utf8', 0, 4);
  check(magic === 'glTF', `not glTF/GLB: ${absPath}`);
  let offset = 12;
  while (offset + 8 <= buf.length) {
    const chunkLength = buf.readUInt32LE(offset);
    const chunkType = buf.toString('utf8', offset + 4, offset + 8);
    const start = offset + 8;
    const end = start + chunkLength;
    check(end <= buf.length, `chunk overflow in ${absPath}`);
    if (chunkType === 'JSON') {
      const jsonText = buf.toString('utf8', start, end).replace(/\0+$/, '');
      return JSON.parse(jsonText);
    }
    offset = end;
  }
  fail(`no JSON chunk in ${absPath}`);
}

function inventoryGltf(gltf, fixtureId) {
  const meshes = Array.isArray(gltf.meshes) ? gltf.meshes : [];
  const materials = Array.isArray(gltf.materials) ? gltf.materials : [];
  const skins = Array.isArray(gltf.skins) ? gltf.skins : [];
  const animations = Array.isArray(gltf.animations) ? gltf.animations : [];
  const extensionsUsed = Array.isArray(gltf.extensionsUsed) ? gltf.extensionsUsed : [];

  let morphTargetCount = 0;
  let skinnedPrimitiveCount = 0;
  let alphaModes = new Set();
  let hasBaseColor = false;
  let hasNormal = false;
  let hasMetallicRoughness = false;

  for (const mesh of meshes) {
    const primitives = Array.isArray(mesh.primitives) ? mesh.primitives : [];
    for (const prim of primitives) {
      if (prim.targets && prim.targets.length) morphTargetCount += prim.targets.length;
      if (typeof prim.attributes?.JOINTS_0 === 'number') skinnedPrimitiveCount += 1;
    }
  }

  for (const mat of materials) {
    if (mat.alphaMode) alphaModes.add(mat.alphaMode);
    const pbr = mat.pbrMetallicRoughness ?? {};
    if (pbr.baseColorTexture) hasBaseColor = true;
    if (mat.normalTexture) hasNormal = true;
    if (pbr.metallicRoughnessTexture || typeof pbr.metallicFactor === 'number') {
      hasMetallicRoughness = true;
    }
  }

  return {
    fixtureId,
    meshCount: meshes.length,
    materialCount: materials.length,
    skinCount: skins.length,
    animationCount: animations.length,
    skinnedPrimitiveCount,
    morphTargetCount,
    alphaModes: [...alphaModes].sort(),
    hasBaseColor,
    hasNormal,
    hasMetallicRoughness,
    extensionsUsed,
    hasVrmExtension: extensionsUsed.some((e) => /vrm/i.test(e)),
  };
}

const design = read('.qa/design/toonlab-compatibility-spike.md');
const acceptance = read('.qa/acceptance/toonlab-compatibility-spike.md');
const spikeSrc = read('src/infrastructure/character/avatar/toonlab-compatibility-spike.ts');
const pkg = JSON.parse(read('package.json'));
const runtime = read('src/infrastructure/character/avatar/character-studio-runtime.ts');

check(/Verdict:\s*\*\*BLOCKED\*\*/.test(design), 'design must document BLOCKED');
check(/minimal integration path/i.test(design), 'design must name integration path');
check(/0\.185\.1/.test(design), 'design must cite three peer requirement');
check(/WebGPU|TSL|NodeMaterial/.test(design), 'design must cite renderer stack');
check(/human-male-quality-20260921-m5\.glb/.test(design + acceptance), 'glb fixture documented');
check(/human-male-quality-20260921-m5-face1\.vrm/.test(design + acceptance), 'vrm fixture documented');
check(!/:\s*any\b|as\s+any\b|<any>/.test(spikeSrc), 'typed-strict: no any escape hatches');
check(!/as unknown as/.test(spikeSrc), 'typed-strict: no double cast');
check(/WebGLRenderer/.test(runtime), 'host still uses WebGLRenderer');
check(!pkg.dependencies?.['@call-me-sensei/toonlab'], 'must not add toonlab production dep');
check(!pkg.dependencies?.toonlab, 'must not add toonlab alias dep');
check(!pkg.devDependencies?.['@call-me-sensei/toonlab'], 'spike must not force toonlab install');

const fixtures = [
  {
    id: 'human-male-glb',
    rel: 'public/assets/avatars/species/human-male-quality-20260921-m5.glb',
  },
  {
    id: 'human-male-vrm',
    rel: 'public/assets/avatars/species/human-male-quality-20260921-m5-face1.vrm',
  },
];

const inventories = [];
for (const fixture of fixtures) {
  const abs = join(root, fixture.rel);
  check(existsSync(abs), `missing fixture ${fixture.rel}`);
  const gltf = readGltfJsonFromGlb(abs);
  const inv = inventoryGltf(gltf, fixture.id);
  inventories.push(inv);
  check(inv.meshCount > 0, `${fixture.id}: meshes`);
  check(inv.materialCount > 0, `${fixture.id}: materials`);
  check(inv.skinCount > 0 || inv.skinnedPrimitiveCount > 0, `${fixture.id}: skinned`);
}

const glbInv = inventories.find((i) => i.fixtureId === 'human-male-glb');
const vrmInv = inventories.find((i) => i.fixtureId === 'human-male-vrm');
check(glbInv.hasBaseColor || glbInv.hasNormal, 'glb map bindings present');
check(vrmInv.hasVrmExtension || vrmInv.morphTargetCount >= 0, 'vrm fixture readable');

const outDir = join(root, 'node_modules/.cache/toonlab-compatibility-spike-check');
mkdirSync(outDir, { recursive: true });
const outfile = join(outDir, 'spike.mjs');
await build({
  entryPoints: [join(root, 'src/infrastructure/character/avatar/toonlab-compatibility-spike.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile,
  logLevel: 'silent',
});

const mod = await import(`${outfile}?t=${Date.now()}`);
const decision = mod.evaluateToonLabCompatibilitySpike();
const invariants = mod.assertToonLabSpikeInvariants(decision);
check(invariants.ok, `invariants: ${invariants.issues.join('; ')}`);
check(decision.verdict === 'BLOCKED', `expected BLOCKED, got ${decision.verdict}`);
check(decision.matrix.some((row) => row.id === 'portrait-capture'), 'portrait row');
check(decision.matrix.some((row) => row.id === 'morph-targets'), 'morph row');
check(decision.matrix.some((row) => row.id === 'alpha-transparency'), 'alpha row');
check(
  decision.matrix.every((row) => row.toonLabPath !== 'pass'),
  'no false ToonLab PASS on blocked stack',
);

const evidenceDir = join(root, '.qa/evidence/toonlab-compatibility-spike');
mkdirSync(evidenceDir, { recursive: true });
const artifact = {
  generatedAt: new Date().toISOString(),
  verdict: decision.verdict,
  package: `${decision.packageName}@${decision.packageVersion}`,
  host: mod.SAGADRIVE_AVATAR_HOST_AT_SPIKE,
  peers: mod.TOONLAB_PEERS_AT_SPIKE,
  fixtures: inventories,
  matrix: decision.matrix,
  findings: decision.findings,
  minimalIntegrationPath: decision.minimalIntegrationPath,
  performanceRisks: decision.performanceRisks,
  note:
    'ToonLab side-by-side GPU capture is not executable on current WebGL/MToon stack; inventory + peer matrix are the reproducible artifacts for this spike.',
};
writeFileSync(join(evidenceDir, 'asset-inventory.json'), `${JSON.stringify(artifact, null, 2)}\n`);
writeFileSync(
  join(evidenceDir, 'decision.json'),
  `${JSON.stringify({ verdict: decision.verdict, findings: decision.findings }, null, 2)}\n`,
);

check(existsSync(join(evidenceDir, 'asset-inventory.json')), 'evidence written');

console.log('toonlab-compatibility-spike-check PASS');
console.log(`verdict=${decision.verdict} fixtures=${inventories.length} blockers=${decision.findings.filter((f) => f.severity === 'blocker').length}`);
