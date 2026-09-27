#!/usr/bin/env node
/**
 * saga-human-canonical-v1-check — test-gate for the Saga Human Canonical V1 PoC.
 * Location: scripts/saga-human-canonical-v1-check.mjs
 *
 * Offline (no network): MakeHuman parser + skin-weight unit tests, pinned sources manifest,
 * build-report ↔ domain constant ↔ face-anchor / authoring sidecars, UI wiring, and that the
 * LiveAct runtime has no avatar-specific code for this mesh. The VRM binary is gitignored:
 * when built locally it is re-inspected (sha, structural QA, anchors, Khronos); otherwise WARN.
 */

import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { validateBytes } from 'gltf-validator';
import {
  parseMhclo,
  parseMhskel,
  parseMhw,
  parseObj,
  parseTarget,
} from './lib/saga-human-canonical-v1/makehuman-formats.mjs';
import { finalizeSkinWeights } from './lib/saga-human-canonical-v1/assemble.mjs';
import { loadSourcesManifest, SOURCES_MANIFEST_REL } from './lib/saga-human-canonical-v1/sources.mjs';
import { inspectCanonicalHumanVrm } from './lib/saga-human-canonical-v1/inspect-vrm.mjs';
import { FULL_V1_CHANNELS } from './lib/liveact-face-asset-validate.mjs';
import { SAGA_DRIVE_FACE_ANCHOR_IDS } from './lib/liveact-face-anchor-ids.mjs';
import { validateFaceAnchorsManifestFile } from './lib/liveact-face-anchor-validate.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const REPORT_REL = 'assets/species-3d/human-canonical-v1/build-report.json';
const DOMAIN_REL = 'src/domains/character/avatar/saga-human-canonical-v1.ts';
const VARIANTS_REL = 'src/domains/character/avatar/liveact-golden-reference-avatar-v1.ts';
const HOOK_REL = 'src/app/character/edit/useCharacterAvatarEditor.ts';
const LIVEACT_RUNTIME_DIRS = ['src/infrastructure/character/liveact', 'src/domains/character/liveact'];

const failures = [];
const warnings = [];
const check = (ok, msg) => {
  if (!ok) failures.push(msg);
};
const read = (rel) => readFileSync(join(root, rel), 'utf8');
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const throws = (fn) => {
  try {
    fn();
    return false;
  } catch {
    return true;
  }
};

function checkParsers() {
  const obj = parseObj('v 0 0 0\nv 1 0 0\nv 0 1 0\nvt 0 0\nvt 1 0\nvt 0 1\ng body\nf 1/1 2/2 3/3\nf -3 -2 -1\n');
  check(obj.positions.length === 9 && obj.uvs.length === 6, 'parseObj: counts');
  check(obj.faces[0].group === 'body' && obj.faces[0].vt?.join() === '0,1,2', 'parseObj: group / uv indices');
  check(obj.faces[1].v.join() === '0,1,2' && obj.faces[1].vt === null, 'parseObj: negative indices, no uv');
  check(throws(() => parseObj('v 0 0 0\nf 1 2 3\n')), 'parseObj: out-of-range index must throw');

  const target = parseTarget('# comment\n0 0.1 0 0\n2 0 -0.2 0.3\n');
  check(target.indices.join() === '0,2' && target.deltas[4] === -0.2, 'parseTarget: sparse deltas');
  check(throws(() => parseTarget('1 0 0 0\n1 0 0 0\n')), 'parseTarget: duplicate index must throw');

  const clo = parseMhclo('name teeth\nx_scale 1 2 0.5\nverts 0\n7\n1 2 3 0.5 0.25 0.25 0.1 0.2 0.3\n');
  check(clo.name === 'teeth' && clo.scale.x?.den === 0.5, 'parseMhclo: header / scale ref');
  check(clo.refs.length === 2 && clo.refs[0].idx.join() === '7,7,7' && clo.refs[1].w[0] === 0.5, 'parseMhclo: refs');
  check(throws(() => parseMhclo('verts 0\n1\ndelete_verts\n')), 'parseMhclo: delete_verts must throw');

  const skel = JSON.stringify({ bones: { root: { head: 'a', tail: 'b', parent: null } }, joints: { a: [1], b: [2] } });
  check(parseMhskel(skel).bones.root.tail === 'b', 'parseMhskel: bones');
  check(throws(() => parseMhskel(skel.replace('"b":[2]', '"c":[2]'))), 'parseMhskel: unknown joint must throw');
  check(parseMhw('{"weights":{"jaw":[[4,0.5]]}}').jaw[0][1] === 0.5, 'parseMhw: weights');
  check(throws(() => parseMhw('{"weights":{"jaw":[[4.5,0.5]]}}')), 'parseMhw: non-integer vertex must throw');
}

function checkSkinWeights() {
  const top = finalizeSkinWeights(new Map([[3, 0.5], [1, 0.3], [7, 0.1], [5, 0.05], [2, 0.05]]));
  check(top?.joints.join() === '3,1,7,2', 'finalizeSkinWeights: top-4 order (ties by joint index)');
  const sum = top ? top.weights.reduce((s, w) => s + w, 0) : 0;
  check(Math.abs(sum - 1) < 1e-12, 'finalizeSkinWeights: renormalized');
  const single = finalizeSkinWeights(new Map([[4, 1]]));
  check(single?.joints.join() === '4,0,0,0' && single?.weights.join() === '1,0,0,0', 'finalizeSkinWeights: unused slots = joint 0 / weight 0');
  check(finalizeSkinWeights(new Map([[1, -0.01]])) === null, 'finalizeSkinWeights: no positive weight → null');
}

function checkManifest() {
  const manifest = loadSourcesManifest(root);
  check(manifest.licenseSpdx === 'CC0-1.0', 'sources: licenseSpdx must be CC0-1.0');
  check(manifest.files.length === 72, `sources: expected 72 pinned files, got ${manifest.files.length}`);
  // Git origins pin a commit; the unversioned system-assets zip pins every member by sha256 below.
  for (const [name, origin] of Object.entries(manifest.origins ?? {})) {
    const pinned = /^[0-9a-f]{40}$/.test(origin.commit ?? '') || (Boolean(origin.zipUrl) && origin.observed?.bytes > 0);
    check(pinned, `sources: origin ${name} must pin a commit or an observed zip`);
  }
  for (const f of manifest.files) {
    check(/^[0-9a-f]{64}$/.test(f.sha256 ?? '') && f.bytes > 0, `sources: ${f.id} needs sha256 + bytes`);
  }
  const faceunits = manifest.files
    .filter((f) => f.id.startsWith('faceunit:'))
    .map((f) => f.id.slice('faceunit:'.length))
    .sort();
  check(
    JSON.stringify(faceunits) === JSON.stringify([...FULL_V1_CHANNELS, 'tongueOut'].sort()),
    'sources: faceunits must equal LiveAct full-v1 channels + tongueOut',
  );
}

function checkReportAndSidecars() {
  const report = JSON.parse(read(REPORT_REL));
  const domain = read(DOMAIN_REL);
  const vrmSha = report.outputs?.vrm?.sha256 ?? '';
  check(report.contractVersion === 'SagaHumanCanonicalBuildReportV1', 'report: contractVersion');
  check(report.sourcesManifestSha256 === sha256(readFileSync(join(root, SOURCES_MANIFEST_REL))), 'report: stale sourcesManifestSha256 (rebuild)');
  const prefix = domain.match(/SAGA_HUMAN_CANONICAL_V1_VRM_SHA256_PREFIX = '([0-9a-f]{12})'/)?.[1];
  check(prefix !== undefined && vrmSha.startsWith(prefix), 'domain: SAGA_HUMAN_CANONICAL_V1_VRM_SHA256_PREFIX must equal build-report VRM sha');
  check(report.faceGate?.structuralPass === true && report.faceGate?.khronosErrors === 0, 'report: face gate must pass');
  check(report.faceGate?.usableChannels === 52 && report.faceGate?.gazeMode === 'bones', 'report: 52 channels, bone gaze');
  check(report.vrmPack?.khronosErrors === 0 && report.structuralQa?.vrm?.pass === true, 'report: VRM Khronos + structural QA');
  check(report.outputs?.faceAnchors?.bindsToVrm === true, 'report: anchors must bind to the VRM');

  const anchorsRel = report.outputs?.faceAnchors?.path ?? '';
  const anchors = JSON.parse(read(anchorsRel)).anchors ?? {};
  check(
    SAGA_DRIVE_FACE_ANCHOR_IDS.every((id) => anchors[id]?.nodeIdentity === 'Body'),
    'anchors: all 21 SagaDrive face anchors must bind to Body',
  );
  const authoring = JSON.parse(read(anchorsRel.replace(/-face-anchors\.json$/, '-face-mapping-authoring.json')));
  check(authoring.source === 'auto' && authoring.reviewed === false, 'authoring: must stay auto / unreviewed');
  check(authoring.asset?.modelSha256 === vrmSha, 'authoring: modelSha256 must equal build-report VRM sha');
  return { report, vrmSha, anchorsRel };
}

function checkWiring() {
  const variants = read(VARIANTS_REL);
  const hook = read(HOOK_REL);
  check(/SAGA_HUMAN_CANONICAL_V1_ID[\s\S]*resolveSagaHumanCanonicalV1ModelUrl\(\)/.test(variants), 'variants: canonical id must resolve to the canonical model URL');
  check(/labelDe: 'Saga Human Canonical V1 \(Kandidat\)'/.test(variants), 'variants: canonical option label');
  check(hook.includes('resolveLiveActHumanMeshVariantModelUrl(humanMeshVariant)'), 'hook: comparison URL via resolveLiveActHumanMeshVariantModelUrl');
  check(/face_anchors:\s*_comparisonAnchors/.test(hook), 'hook: comparison anchors must never persist into the character');
}

function listFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? listFiles(path) : [path];
  });
}

function checkRuntimeIsolation() {
  for (const dir of LIVEACT_RUNTIME_DIRS) {
    for (const file of listFiles(join(root, dir))) {
      const text = readFileSync(file, 'utf8');
      check(!/saga-human-canonical|SAGA_HUMAN_CANONICAL/i.test(text), `runtime isolation: ${file.slice(root.length)} references the canonical mesh`);
    }
  }
}

async function checkBuiltVrm({ report, vrmSha, anchorsRel }) {
  const vrmPath = join(root, report.outputs.vrm.path);
  if (!existsSync(vrmPath)) {
    warnings.push(`${report.outputs.vrm.path} not built (gitignored) — run npm run build:saga-human-canonical-v1`);
    return;
  }
  const bytes = readFileSync(vrmPath);
  check(sha256(bytes) === vrmSha, 'vrm: sha256 differs from build-report (rebuild or re-run the builder)');
  const qa = await inspectCanonicalHumanVrm(bytes);
  check(qa.pass, `vrm: structural QA failed (${qa.failures.join('; ')})`);
  const bound = await validateFaceAnchorsManifestFile({ manifestPath: join(root, anchorsRel), glbPath: vrmPath });
  check(bound.ok, `vrm: face anchors do not bind (${bound.errors.join(', ')})`);
  const khronos = await validateBytes(new Uint8Array(bytes), { maxIssues: 50 });
  check(khronos.issues.numErrors === 0, `vrm: Khronos errors ${khronos.issues.numErrors}`);
}

async function main() {
  checkParsers();
  checkSkinWeights();
  checkManifest();
  const ctx = checkReportAndSidecars();
  checkWiring();
  checkRuntimeIsolation();
  await checkBuiltVrm(ctx);

  for (const w of warnings) console.warn(`saga-human-canonical-v1-check WARN: ${w}`);
  if (failures.length) {
    console.error(`saga-human-canonical-v1-check FAIL:\n  ${failures.join('\n  ')}`);
    process.exit(1);
  }
  console.log('saga-human-canonical-v1-check OK');
}

main().catch((error) => {
  console.error(`saga-human-canonical-v1-check FAIL: ${error instanceof Error ? error.stack : error}`);
  process.exit(1);
});
