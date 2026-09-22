#!/usr/bin/env node
/**
 * liveact-face-mapping-authoring-check — sidecar cache-bust + provenance (#419).
 * Location: scripts/liveact-face-mapping-authoring-check.mjs
 *
 * Feature slug: liveact-face-anchor-ground-truth
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { build } from 'esbuild';
import {
  createAutoUnreviewedFaceMappingAuthoring,
  faceMappingAuthoringPathBesideAnchors,
  isReviewedFaceMappingGroundTruth,
  validateFaceMappingAuthoringV1,
} from './lib/liveact-face-mapping-authoring.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));

function read(rel) {
  return readFileSync(join(root, rel), 'utf8');
}

function check(cond, msg) {
  if (!cond) {
    console.error(`liveact-face-mapping-authoring-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const domain = read('src/domains/character/avatar/face-mapping-authoring-contract.ts');
const anchorsContract = read('src/domains/character/avatar/face-anchor-contract.ts');
const barrel = read('src/domains/character/avatar/index.ts');
const manifestUrlSrc = read('src/infrastructure/character/liveact/face-anchors-manifest-url.ts');
const authorLib = read('scripts/lib/liveact-face-anchor-author-lib.mjs');
const authoringLib = read('scripts/lib/liveact-face-mapping-authoring.mjs');
const faceAuthoringDoc = read('assets/species-3d/FACE-AUTHORING.md');
const gate = read('scripts/test-gate.mjs');
const acceptance = read('.qa/acceptance/liveact-face-anchor-ground-truth.md');

check(/SagaDriveFaceMappingAuthoringV1/.test(domain), 'domain contract version');
check(/auto.*manual.*manual_override|FACE_MAPPING_AUTHORING_SOURCES/.test(domain), 'source enum');
check(/isReviewedFaceMappingGroundTruth/.test(domain), 'fail-closed ground-truth helper');
check(/createAutoUnreviewedFaceMappingAuthoring/.test(domain), 'auto unreviewed builder');
check(!/from ['"]three['"]/.test(domain), 'domain pure no three');
check(!/from ['"]react['"]/.test(domain), 'domain no React');
check(!/mediapipe|faceit|blender|meshy|qtmesh/i.test(domain), 'no provider names in domain');

check(/FACE_ANCHORS_CONTRACT_VERSION/.test(anchorsContract), 'runtime anchors contract untouched');
check(/face-mapping-authoring-contract/.test(barrel), 'barrel export');

check(/cacheBustSearch|cache-bust|Preserve model cache-bust/i.test(manifestUrlSrc), 'cache-bust comment/intent');
check(/url\.search = cacheBustSearch/.test(manifestUrlSrc), 'search copied to candidates');
check(!/url\.search = ''/.test(manifestUrlSrc), 'must not clear search');

check(/createAutoUnreviewedFaceMappingAuthoring/.test(authorLib), 'author writes provenance');
check(/faceMappingAuthoringPathBesideAnchors/.test(authorLib), 'sibling authoring path');
check(/isReviewedFaceMappingGroundTruth/.test(authoringLib), 'offline helper present');

check(/SagaDriveFaceMappingAuthoringV1|face-mapping-authoring/.test(faceAuthoringDoc), 'FACE-AUTHORING docs');
check(/reviewed|Ground[- ]Truth|unreviewed/i.test(faceAuthoringDoc), 'review policy docs');
check(/checkLiveActFaceMappingAuthoring|liveact-face-mapping-authoring-check/.test(gate), 'test-gate wiring');
check(/SagaDriveFaceMappingAuthoringV1/.test(acceptance), 'acceptance references contract');

// --- Runtime: cache-bust regression ---
const runsDir = join(root, '.qa/runs');
mkdirSync(runsDir, { recursive: true });
const urlOut = join(runsDir, 'liveact-face-anchors-manifest-url-bundle.mjs');
await build({
  entryPoints: [join(root, 'src/infrastructure/character/liveact/face-anchors-manifest-url.ts')],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  outfile: urlOut,
  logLevel: 'silent',
});

const urlMod = await import(`${urlOut}?t=${Date.now()}`);
const modelUrl = 'https://cdn.example/assets/human-m5-face1.vrm?v=quality5-face1-vrm2';
const candidates = urlMod.listFaceAnchorsManifestUrlCandidates(modelUrl);
check(candidates.length === 2, 'stem + generic candidates');
check(
  candidates.every((u) => u.includes('?v=quality5-face1-vrm2')),
  'all sidecar candidates keep cache-bust query',
);
check(
  candidates[0].includes('human-m5-face1-face-anchors.json') &&
    candidates[0].includes('?v=quality5-face1-vrm2'),
  'stem sidecar keeps version',
);
check(
  candidates[1].includes('/face-anchors.json') && candidates[1].includes('?v=quality5-face1-vrm2'),
  'generic sidecar keeps version',
);

const withHash = urlMod.listFaceAnchorsManifestUrlCandidates(
  '/assets/avatars/species/human-f5-face1.glb?v=tex2k#frag',
);
check(withHash.every((u) => u.includes('?v=tex2k')), 'relative URL preserves search');
check(withHash.every((u) => !u.includes('#frag')), 'hash stripped from fetch URL');

// --- Domain bundle: provenance fail-closed ---
const domainOut = join(runsDir, 'liveact-face-mapping-authoring-domain-bundle.mjs');
await build({
  entryPoints: [join(root, 'src/domains/character/avatar/face-mapping-authoring-contract.ts')],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  outfile: domainOut,
  logLevel: 'silent',
});
const domainMod = await import(`${domainOut}?t=${Date.now()}`);

const auto = domainMod.createAutoUnreviewedFaceMappingAuthoring({
  modelPath: 'public/assets/avatars/species/human-m5-face1.vrm',
  cacheBust: 'quality5-face1-vrm2',
});
check(auto.source === 'auto' && auto.reviewed === false, 'auto builder unreviewed');
check(!domainMod.isReviewedFaceMappingGroundTruth(auto), 'auto is not ground truth');

const reviewedManual = {
  contractVersion: domainMod.FACE_MAPPING_AUTHORING_CONTRACT_VERSION,
  source: 'manual',
  reviewed: true,
  reviewedAt: '2026-09-22T00:00:00.000Z',
  asset: { modelPath: 'public/assets/avatars/species/human-m5-face1.vrm', cacheBust: 'v2' },
};
check(domainMod.isReviewedFaceMappingGroundTruth(reviewedManual), 'manual reviewed is ground truth');

const autoReviewedIllegal = { ...auto, reviewed: true, reviewedAt: '2026-09-22T00:00:00.000Z' };
check(!domainMod.isReviewedFaceMappingGroundTruth(autoReviewedIllegal), 'auto+reviewed never ground truth');
const autoReviewedValidation = domainMod.validateFaceMappingAuthoringV1(autoReviewedIllegal);
check(!autoReviewedValidation.ok, 'validator rejects auto reviewed');
check(
  autoReviewedValidation.issues.some((i) => i.code === 'auto_marked_reviewed'),
  'auto_marked_reviewed issue',
);

// Offline mirror parity
const offlineAuto = createAutoUnreviewedFaceMappingAuthoring({
  modelPath: 'assets/species-3d/human/runs/x/face.glb',
});
check(!isReviewedFaceMappingGroundTruth(offlineAuto), 'offline helper rejects auto');
const offlineOk = validateFaceMappingAuthoringV1(offlineAuto);
check(offlineOk.ok, 'offline validates auto unreviewed');

const sibling = faceMappingAuthoringPathBesideAnchors(
  'public/assets/avatars/species/human-m5-face1-face-anchors.json',
);
check(sibling.endsWith('human-m5-face1-face-mapping-authoring.json'), 'stem sibling path');

const fixtureDir = join(root, '.qa/fixtures/liveact-face-anchor-ground-truth');
mkdirSync(fixtureDir, { recursive: true });
const fixturePath = join(fixtureDir, 'face-mapping-authoring.json');
writeFileSync(fixturePath, `${JSON.stringify(auto, null, 2)}\n`, 'utf8');
check(existsSync(fixturePath), 'fixture written');

console.log('liveact-face-mapping-authoring-check OK');
