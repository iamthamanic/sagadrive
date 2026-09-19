#!/usr/bin/env node
/**
 * avatar-v2-asset-authoring-check — deterministic tests for #254.
 * Location: scripts/avatar-v2-asset-authoring-check.mjs
 */
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
function read(rel) {
  return readFileSync(join(root, rel), 'utf8');
}
function check(cond, msg) {
  if (!cond) {
    console.error(`avatar-v2-asset-authoring-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const domain = read('src/domains/character/avatar/asset-authoring-contract-v1.ts');
const index = read('src/domains/character/avatar/index.ts');
const docs = read('docs/avatar-v2-asset-authoring.md');
const agents = read('AGENTS.md');
const apply = read('scripts/apply-migrations.sh');

check(/ASSET_AUTHORING_CONTRACT_VERSION/.test(domain), 'version');
check(/createAssetAuthoringManifest/.test(domain), 'manifest');
check(/validateAssetAuthoringCandidate/.test(domain), 'validate');
check(/selectAssetAuthoringCandidate/.test(domain), 'select');
check(/assertCanPublishAuthoringAsset/.test(domain), 'publish');
check(/AVATAR_3D_GENERATION_CONTRACT_VERSION/.test(domain), 'uses generation contract');
check(!/meshy-adapter|MESHY_PROVIDER/.test(domain), 'no meshy hardcode in domain');
check(!/from ['"]react['"]/.test(domain), 'no react');
check(/createAssetAuthoringManifest/.test(index), 'barrel');
check(/Tripo/.test(docs), 'docs mention Tripo');
check(/Generate → Select → Normalize → Validate → Publish/.test(docs), 'docs workflow');
check(/askUserToCompact: false/.test(read('.qa/runner-profile.yaml')), 'runner profile');
check(/Forbidden \(hard stop violations/.test(agents), 'AGENTS forbidden list');
check(/036_character_avatar_artifacts/.test(apply), 'apply-migrations 036');
check(/038_character_avatar_body_profile/.test(apply), 'apply-migrations 038');
check(existsSync(join(root, '.qa/runner-profile.yaml')), 'runner-profile exists');

const outDir = join(root, 'node_modules/.cache/avatar-v2-asset-authoring-check');
mkdirSync(outDir, { recursive: true });
const outfile = join(outDir, 'authoring.mjs');
await build({
  entryPoints: [join(root, 'src/domains/character/avatar/asset-authoring-contract-v1.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile,
  logLevel: 'silent',
});
const m = await import(outfile + `?t=${Date.now()}`);

const settings = {
  modelId: 'meshy-6',
  geometryQuality: 'high',
  textureQuality: '2k',
  pose: 'a-pose',
  topology: 'triangle',
  imageEnhancement: false,
  pbr: true,
  initialRemesh: true,
  targetPolycount: 30000,
  outputFormat: 'glb',
  keepMaster: true,
  runtimePolycount: 15000,
};

const manifest = m.createAssetAuthoringManifest({
  assetId: 'base-body-standard-v1',
  kind: 'base-body',
  assetVersion: '1.0.0',
  providerId: 'meshy',
  modelId: 'meshy-6',
  prompt: 'adult stylized humanoid base body a-pose mtoon',
  settings,
  provenance: { license: 'first-party', attributionDe: 'SagaDrive first-party' },
  outputChecksum: 'abc123',
  bodyFamily: 'standard',
  createdAt: '2026-09-19T00:00:00.000Z',
});
check(manifest.contractVersion === 'SagaDriveAssetAuthoringV1', 'manifest version');
check(manifest.generationContractVersion.includes('Generation'), 'gen contract pin');

let threw = false;
try {
  m.assertAuthoringUsesGenerationContract('tripo');
} catch {
  threw = true;
}
check(threw, 'unknown provider fails closed until adapter registered');

const goodEvidence = {
  pose: 'a-pose',
  modularGlbStatus: 'valid',
  humanoidBoneCount: 16,
  morphTargetCount: 20,
  mtoonMaterialHint: true,
  styleTagsClaimed: ['adult-stylized', 'mtoon', 'palworld-korra-direction', 'no-chibi'],
  byteSize: 1000,
  checksum: 'abc123',
};
const good = m.validateAssetAuthoringCandidate({ kind: 'base-body', evidence: goodEvidence });
check(good.ok === true, 'good candidate ok');

const badRig = m.validateAssetAuthoringCandidate({
  kind: 'base-body',
  evidence: { ...goodEvidence, humanoidBoneCount: 3 },
});
check(badRig.ok === false, 'bad rig rejected');

const c1 = {
  candidateId: 'c1',
  status: 'pending',
  providerId: 'meshy',
  modelId: 'meshy-6',
  settings,
  evidence: goodEvidence,
  validation: good,
};
const c2 = {
  candidateId: 'c2',
  status: 'pending',
  providerId: 'meshy',
  modelId: 'meshy-6',
  settings,
  evidence: { ...goodEvidence, checksum: 'other', mtoonMaterialHint: false },
  validation: m.validateAssetAuthoringCandidate({
    kind: 'base-body',
    evidence: { ...goodEvidence, checksum: 'other', mtoonMaterialHint: false },
  }),
};
const selected = m.selectAssetAuthoringCandidate([c1, c2]);
check(selected?.candidateId === 'c1', 'select highest score');

const publish = m.assertCanPublishAuthoringAsset({
  manifest,
  candidate: { ...selected, status: 'selected' },
});
check(publish.ok === true, 'publish ok');

console.log('avatar-v2-asset-authoring-check OK');
