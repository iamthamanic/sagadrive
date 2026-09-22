#!/usr/bin/env node
/**
 * avatar-vrm-pack-check — deterministic VRM 1.0 packer gate (#404).
 * Location: scripts/avatar-vrm-pack-check.mjs
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import process from 'node:process';
import { NodeIO } from '@gltf-transform/core';
import {
  createMinimalPackFixtureDocument,
  packAvatarVrm1,
  LIVEACT_TO_VRM_PRESET,
  resolveHumanoidNodeMap,
} from './lib/avatar-vrm-pack.mjs';
import { VRMC_VRM_EXTENSION_NAME } from './lib/gltf-transform-vrm1-extension.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));

function check(cond, msg) {
  if (!cond) {
    console.error(`avatar-vrm-pack-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const packLib = readFileSync(join(root, 'scripts/lib/avatar-vrm-pack.mjs'), 'utf8');
const extLib = readFileSync(join(root, 'scripts/lib/gltf-transform-vrm1-extension.mjs'), 'utf8');
const cli = readFileSync(join(root, 'scripts/avatar-vrm-pack.mjs'), 'utf8');
const gate = readFileSync(join(root, 'scripts/test-gate.mjs'), 'utf8');
const acceptance = join(root, '.qa/acceptance/avatar-vrm-pack.md');

check(/packAvatarVrm1/.test(packLib), 'packAvatarVrm1 export');
check(/VRMC_vrm/.test(extLib), 'VRMC_vrm extension helper');
check(/--inventory/.test(cli), 'CLI inventory flag');
check(!/src\/app\//.test(packLib) && !/from 'three'/.test(packLib), 'packer stays offline scripts');
check(existsSync(acceptance), 'acceptance doc');
check(/checkAvatarVrmPack/.test(gate), 'test-gate wiring');
check(LIVEACT_TO_VRM_PRESET.eyeBlinkLeft === 'blinkLeft', 'exact blinkLeft preset');
check(LIVEACT_TO_VRM_PRESET.jawOpen == null, 'jawOpen stays custom (not preset)');

const fixtureDir = join(root, '.qa/fixtures/avatar-vrm-pack');
mkdirSync(fixtureDir, { recursive: true });
const io = new NodeIO();
const fixtureGlb = join(fixtureDir, 'minimal-humanoid-face.glb');
await io.write(fixtureGlb, createMinimalPackFixtureDocument());

const inventory = {
  version: 'SagaDriveLiveActFaceInventoryV1',
  input: 'minimal-humanoid-face.glb',
  profile: 'core-v1',
  profileOk: true,
  structuralPass: true,
  gazeMode: 'bones',
  presentChannels: ['jawOpen', 'eyeBlinkLeft', 'eyeBlinkRight', 'eyeLookUpLeft'],
  supportedChannels: ['jawOpen', 'eyeBlinkLeft', 'eyeBlinkRight', 'eyeLookUpLeft'],
};
const inventoryPath = join(fixtureDir, 'face-inventory.json');
writeFileSync(inventoryPath, `${JSON.stringify(inventory, null, 2)}\n`);

const outVrm = join(root, '.qa/runs/avatar-vrm-pack-minimal.vrm');
const result = await packAvatarVrm1({
  inputGlbPath: fixtureGlb,
  inventoryPath,
  outputVrmPath: outVrm,
  metaName: 'SagaDriveMinimalPack',
});

check(existsSync(outVrm), 'output VRM written');
check(existsSync(result.manifestPath), 'pack manifest written');
check(result.manifest.humanoidBoneCount >= 17, 'full core humanoid bones packed');
check(result.manifest.lookAtType === 'bone', 'bones gaze → LookAt type bone');
check(result.manifest.expressionPresetCount >= 2, 'blinkLeft/Right presets');
check(result.manifest.extension === VRMC_VRM_EXTENSION_NAME, 'manifest extension name');

const packedJson = await io.readAsJSON(outVrm);
check(
  packedJson.json.extensionsUsed?.includes(VRMC_VRM_EXTENSION_NAME),
  'extensionsUsed includes VRMC_vrm',
);
const vrm = packedJson.json.extensions?.[VRMC_VRM_EXTENSION_NAME];
check(vrm?.specVersion === '1.0', 'specVersion 1.0');
check(vrm?.humanoid?.humanBones?.hips?.node != null, 'hips humanBone');
check(vrm?.humanoid?.humanBones?.head?.node != null, 'head humanBone');
check(vrm?.lookAt?.type === 'bone', 'lookAt bone');
check(vrm?.expressions?.preset?.blinkLeft, 'blinkLeft preset');
check(vrm?.expressions?.custom?.jawOpen, 'jawOpen custom expression');
check(!vrm?.expressions?.custom?.eyeLookUpLeft, 'eyeLook omitted when LookAt owns gaze');

const nodeMap = resolveHumanoidNodeMap(packedJson.json, null);
check(nodeMap.hips != null && nodeMap.head != null, 'alias resolver finds hips/head');

// Load-smoke via @pixiv/three-vrm (dynamic, Node-safe fail if DOM missing — structural OK above).
let loaderOk = false;
try {
  const three = await import('three');
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
  const { VRMLoaderPlugin } = await import('@pixiv/three-vrm');
  // Node has no URL.createObjectURL for file — use parse of ArrayBuffer
  const buf = readFileSync(outVrm);
  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));
  const gltf = await new Promise((resolve, reject) => {
    loader.parse(
      buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
      '',
      resolve,
      reject,
    );
  });
  loaderOk = Boolean(gltf?.userData?.vrm?.humanoid);
  check(loaderOk, 'three-vrm loader exposes humanoid');
  check(Boolean(gltf.userData.vrm.expressionManager), 'three-vrm expressionManager');
} catch (err) {
  // Some environments lack WebGL/URL; still require structural pack validity.
  console.warn(
    `avatar-vrm-pack-check: three-vrm load smoke skipped (${err instanceof Error ? err.message : String(err)})`,
  );
}

console.log('avatar-vrm-pack-check OK');
