#!/usr/bin/env node
/**
 * liveact-face-asset-contract-check — SagaDriveLiveActFaceAssetV1 profiles (#382).
 * Location: scripts/liveact-face-asset-contract-check.mjs
 */
import { readFileSync } from 'node:fs';
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
    console.error(`liveact-face-asset-contract-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const contract = read('src/domains/character/liveact/liveact-face-asset-contract.ts');
const face = read('src/domains/character/liveact/liveact-face-contract.ts');
const barrel = read('src/domains/character/liveact/index.ts');
const gate = read('scripts/test-gate.mjs');

check(/SagaDriveLiveActFaceAssetV1|LIVEACT_FACE_ASSET_CONTRACT_VERSION/.test(contract), 'contract version');
check(/core-v1/.test(contract) && /full-v1/.test(contract), 'profiles core/full');
check(/gazeMode|"none".*"morphs".*"bones"|LiveActFaceAssetGazeMode/.test(contract), 'gazeMode union');
check(/checkLiveActFaceAssetProfile/.test(contract), 'profile checker');
check(/LIVEACT_FACE_ASSET_CORE_V1_CHANNELS/.test(contract), 'core channel list');
check(!/from ['"]three['"]/.test(contract), 'domain pure no three');
check(!/faceit|blender|meshy/i.test(contract), 'no DCC in contract');
check(/liveact-face-asset-contract/.test(barrel), 'barrel export');
check(/liveact-face-asset-contract-check/.test(gate), 'test-gate wiring');
check(!/tongueOut/.test(face), 'tongueOut not in LiveAct face channels');

const outfile = join(root, '.qa/runs/liveact-face-asset-contract-bundle.mjs');
await build({
  entryPoints: [join(root, 'src/domains/character/liveact/liveact-face-asset-contract.ts')],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  write: true,
  outfile,
  logLevel: 'silent',
});

const mod = await import(outfile);
const {
  LIVEACT_FACE_ASSET_CORE_V1_CHANNELS,
  LIVEACT_FACE_ASSET_FULL_V1_CHANNELS,
  checkLiveActFaceAssetProfile,
  isLiveActFaceAssetV1Channel,
} = mod;

check(LIVEACT_FACE_ASSET_CORE_V1_CHANNELS.length === 10, 'core-v1 has exactly 10 channels');
check(LIVEACT_FACE_ASSET_FULL_V1_CHANNELS.length === 51, 'full-v1 has 51 animatable channels');
check(!LIVEACT_FACE_ASSET_FULL_V1_CHANNELS.includes('_neutral'), 'full-v1 excludes _neutral');
check(isLiveActFaceAssetV1Channel('jawOpen') === true, 'jawOpen is V1');
check(isLiveActFaceAssetV1Channel('_neutral') === false, '_neutral not V1 capability');
check(isLiveActFaceAssetV1Channel('tongueOut') === false, 'tongueOut not V1');

const coreOnly = {
  presentChannels: [...LIVEACT_FACE_ASSET_CORE_V1_CHANNELS],
  hasEyeBones: false,
};
const corePass = checkLiveActFaceAssetProfile(coreOnly, 'core-v1', 'none');
check(corePass.ok === true, 'core-v1 + gaze none passes with core morphs');
const fullFail = checkLiveActFaceAssetProfile(coreOnly, 'full-v1', 'none');
check(fullFail.ok === false, 'core morphs fail full-v1');
check(fullFail.missingChannels.length > 0, 'full-v1 reports missing');

const morphGazeFail = checkLiveActFaceAssetProfile(coreOnly, 'core-v1', 'morphs');
check(morphGazeFail.ok === false && morphGazeFail.missingGaze === true, 'gaze morphs required');

const boneGaze = checkLiveActFaceAssetProfile(
  { presentChannels: [...LIVEACT_FACE_ASSET_CORE_V1_CHANNELS], hasEyeBones: true },
  'core-v1',
  'bones',
);
check(boneGaze.ok === true, 'gaze bones ok with hasEyeBones');

console.log('liveact-face-asset-contract-check OK');
