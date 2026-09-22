/**
 * avatar-vrm-pack — pack validated humanoid GLB + face inventory into VRM 1.0 (#404).
 * Location: scripts/lib/avatar-vrm-pack.mjs
 *
 * Does not re-author geometry/skin/PBR/morphs. Offline authoring only.
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, basename, join } from 'node:path';
import { Document, NodeIO } from '@gltf-transform/core';
import {
  attachVrmcVrm1Extension,
  encodeGlbFromJsonDocument,
  VRMC_VRM_EXTENSION_NAME,
  VRMC_VRM_SPEC_VERSION,
} from './gltf-transform-vrm1-extension.mjs';

/** SagaDrive / VRM shared humanoid bone ids that map 1:1 into VRMC_vrm.humanoid. */
export const VRM1_HUMANOID_BONE_IDS = [
  'hips',
  'spine',
  'chest',
  'neck',
  'head',
  'leftUpperArm',
  'leftLowerArm',
  'leftHand',
  'rightUpperArm',
  'rightLowerArm',
  'rightHand',
  'leftUpperLeg',
  'leftLowerLeg',
  'leftFoot',
  'rightUpperLeg',
  'rightLowerLeg',
  'rightFoot',
  'leftEye',
  'rightEye',
];

/** Exact LiveAct → VRM preset name (semantic exact only). */
export const LIVEACT_TO_VRM_PRESET = Object.freeze({
  eyeBlinkLeft: 'blinkLeft',
  eyeBlinkRight: 'blinkRight',
});

const EYE_LOOK_CHANNELS = new Set([
  'eyeLookDownLeft',
  'eyeLookDownRight',
  'eyeLookInLeft',
  'eyeLookInRight',
  'eyeLookOutLeft',
  'eyeLookOutRight',
  'eyeLookUpLeft',
  'eyeLookUpRight',
]);

/** Lowercase bone name → SagaDrive/VRM humanoid id (subset of runtime alias table). */
export const PACK_BONE_ALIASES = Object.freeze({
  hips: 'hips',
  j_hips: 'hips',
  pelvis: 'hips',
  spine: 'spine',
  j_spine: 'spine',
  chest: 'chest',
  j_chest: 'chest',
  upperchest: 'chest',
  neck: 'neck',
  j_neck: 'neck',
  head: 'head',
  j_head: 'head',
  leftupperarm: 'leftUpperArm',
  left_upper_arm: 'leftUpperArm',
  leftlowerarm: 'leftLowerArm',
  left_lower_arm: 'leftLowerArm',
  lefthand: 'leftHand',
  left_hand: 'leftHand',
  rightupperarm: 'rightUpperArm',
  right_upper_arm: 'rightUpperArm',
  rightlowerarm: 'rightLowerArm',
  right_lower_arm: 'rightLowerArm',
  righthand: 'rightHand',
  right_hand: 'rightHand',
  leftupperleg: 'leftUpperLeg',
  left_upper_leg: 'leftUpperLeg',
  leftlowerleg: 'leftLowerLeg',
  left_lower_leg: 'leftLowerLeg',
  leftfoot: 'leftFoot',
  left_foot: 'leftFoot',
  rightupperleg: 'rightUpperLeg',
  right_upper_leg: 'rightUpperLeg',
  rightlowerleg: 'rightLowerLeg',
  right_lower_leg: 'rightLowerLeg',
  rightfoot: 'rightFoot',
  right_foot: 'rightFoot',
  lefteye: 'leftEye',
  left_eye: 'leftEye',
  righteye: 'rightEye',
  right_eye: 'rightEye',
  'mixamorig:hips': 'hips',
  'mixamorig:spine': 'spine',
  'mixamorig:spine1': 'chest',
  'mixamorig:spine2': 'chest',
  'mixamorig:neck': 'neck',
  'mixamorig:head': 'head',
  'mixamorig:leftarm': 'leftUpperArm',
  'mixamorig:leftforearm': 'leftLowerArm',
  'mixamorig:lefthand': 'leftHand',
  'mixamorig:rightarm': 'rightUpperArm',
  'mixamorig:rightforearm': 'rightLowerArm',
  'mixamorig:righthand': 'rightHand',
  'mixamorig:leftupleg': 'leftUpperLeg',
  'mixamorig:leftleg': 'leftLowerLeg',
  'mixamorig:leftfoot': 'leftFoot',
  'mixamorig:rightupleg': 'rightUpperLeg',
  'mixamorig:rightleg': 'rightLowerLeg',
  'mixamorig:rightfoot': 'rightFoot',
});

function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function normalizeBoneKey(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

/**
 * Map glTF node names → humanoid bone ids using optional precomputed rig + aliases.
 * @returns {Record<string, number>} humanoidBoneId → nodeIndex
 */
export function resolveHumanoidNodeMap(json, rigBones) {
  const nodes = Array.isArray(json.nodes) ? json.nodes : [];
  const out = {};
  const claimed = new Set();

  if (rigBones && typeof rigBones === 'object') {
    for (const id of VRM1_HUMANOID_BONE_IDS) {
      const sourceName = rigBones[id];
      if (typeof sourceName !== 'string' || !sourceName) continue;
      const idx = nodes.findIndex((n) => n && n.name === sourceName);
      if (idx >= 0 && !claimed.has(idx)) {
        out[id] = idx;
        claimed.add(idx);
      }
    }
  }

  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i];
    if (!node || claimed.has(i)) continue;
    const key = normalizeBoneKey(node.name);
    const id = PACK_BONE_ALIASES[key];
    if (!id || out[id] != null) continue;
    out[id] = i;
    claimed.add(i);
  }
  return out;
}

/**
 * Build morphTargetBinds for a morph target name across all meshes.
 */
export function findMorphTargetBinds(json, morphName) {
  const meshes = Array.isArray(json.meshes) ? json.meshes : [];
  const binds = [];
  for (let meshIndex = 0; meshIndex < meshes.length; meshIndex += 1) {
    const mesh = meshes[meshIndex];
    const prims = Array.isArray(mesh?.primitives) ? mesh.primitives : [];
    for (const prim of prims) {
      const targets = Array.isArray(prim?.targets) ? prim.targets : [];
      if (!targets.length) continue;
      const extras = mesh.extras && typeof mesh.extras === 'object' ? mesh.extras : {};
      const targetNames = Array.isArray(extras.targetNames) ? extras.targetNames : [];
      let index = targetNames.findIndex((n) => n === morphName);
      if (index < 0) {
        // Some assets put names on primitive extras
        const pExtras = prim.extras && typeof prim.extras === 'object' ? prim.extras : {};
        const pNames = Array.isArray(pExtras.targetNames) ? pExtras.targetNames : [];
        index = pNames.findIndex((n) => n === morphName);
      }
      if (index < 0) continue;
      binds.push({ node: findMeshNodeIndex(json, meshIndex), index, weight: 1.0 });
    }
  }
  return binds.filter((b) => typeof b.node === 'number' && b.node >= 0);
}

function findMeshNodeIndex(json, meshIndex) {
  const nodes = Array.isArray(json.nodes) ? json.nodes : [];
  for (let i = 0; i < nodes.length; i += 1) {
    if (nodes[i] && nodes[i].mesh === meshIndex) return i;
  }
  return -1;
}

function defaultRangeMap() {
  return { inputMaxValue: 90.0, outputScale: 10.0 };
}

function buildLookAt(gazeMode, humanBones) {
  if (gazeMode !== 'bones' && gazeMode !== 'morphs') return undefined;
  const type = gazeMode === 'morphs' ? 'expression' : 'bone';
  return {
    type,
    offsetFromHeadBone: [0, 0.06, 0],
    rangeMapHorizontalInner: defaultRangeMap(),
    rangeMapHorizontalOuter: defaultRangeMap(),
    rangeMapVerticalDown: defaultRangeMap(),
    rangeMapVerticalUp: defaultRangeMap(),
    extras: {
      sagaDriveGazeMode: gazeMode,
      hasLeftEyeBone: humanBones.leftEye != null,
      hasRightEyeBone: humanBones.rightEye != null,
    },
  };
}

/**
 * Build expressions.preset + expressions.custom from inventory channels.
 * When LookAt owns gaze, eyeLook* channels are omitted (single gaze path).
 */
export function buildVrmExpressions(json, presentChannels, gazeMode) {
  const skipEyeLook = gazeMode === 'bones' || gazeMode === 'morphs';
  const preset = {};
  const custom = {};
  const channels = Array.isArray(presentChannels) ? presentChannels : [];

  for (const id of channels) {
    if (typeof id !== 'string' || !id || id === '_neutral') continue;
    if (skipEyeLook && EYE_LOOK_CHANNELS.has(id)) continue;
    const binds = findMorphTargetBinds(json, id);
    if (!binds.length) continue;
    const expression = {
      isBinary: false,
      morphTargetBinds: binds,
    };
    const presetName = LIVEACT_TO_VRM_PRESET[id];
    if (presetName) {
      preset[presetName] = expression;
    } else {
      custom[id] = expression;
    }
  }

  // Expression LookAt presets from combined eyeLook morphs (morphs gaze path).
  if (gazeMode === 'morphs') {
    const pairs = [
      ['lookUp', ['eyeLookUpLeft', 'eyeLookUpRight']],
      ['lookDown', ['eyeLookDownLeft', 'eyeLookDownRight']],
      ['lookLeft', ['eyeLookOutLeft', 'eyeLookInRight']],
      ['lookRight', ['eyeLookOutRight', 'eyeLookInLeft']],
    ];
    for (const [presetName, names] of pairs) {
      const binds = [];
      for (const n of names) {
        binds.push(...findMorphTargetBinds(json, n));
      }
      if (binds.length) {
        preset[presetName] = { isBinary: false, morphTargetBinds: binds };
      }
    }
  }

  const expressions = {};
  if (Object.keys(preset).length) expressions.preset = preset;
  if (Object.keys(custom).length) expressions.custom = custom;
  return Object.keys(expressions).length ? expressions : undefined;
}

/**
 * Pack a validated GLB into a VRM 1.0 binary (+ manifest).
 */
export async function packAvatarVrm1(opts) {
  const {
    inputGlbPath,
    inventoryPath,
    outputVrmPath,
    rigPath = null,
    metaName = null,
    licenseUrl = 'https://vrm.dev/licenses/1.0/',
  } = opts;

  const inventory = JSON.parse(readFileSync(inventoryPath, 'utf8'));
  if (inventory.version !== 'SagaDriveLiveActFaceInventoryV1') {
    throw new Error(`Unsupported inventory version: ${inventory.version}`);
  }
  if (inventory.structuralPass !== true) {
    throw new Error('Inventory structuralPass must be true before VRM pack');
  }
  const gazeMode = inventory.gazeMode === 'bones' || inventory.gazeMode === 'morphs' || inventory.gazeMode === 'none'
    ? inventory.gazeMode
    : 'none';

  let rigBones = null;
  if (rigPath) {
    const rig = JSON.parse(readFileSync(rigPath, 'utf8'));
    if (rig.contractVersion !== 'SagaDriveHumanoidRigV1') {
      throw new Error(`Unsupported rig contract: ${rig.contractVersion}`);
    }
    rigBones = rig.bones || null;
  }

  const io = new NodeIO();
  const jsonDoc = await io.readAsJSON(inputGlbPath);
  const json = jsonDoc.json;
  const humanBoneNodes = resolveHumanoidNodeMap(json, rigBones);

  const requiredCore = ['hips', 'spine', 'chest', 'neck', 'head'];
  const missingCore = requiredCore.filter((id) => humanBoneNodes[id] == null);
  if (missingCore.length) {
    throw new Error(`Missing core humanoid bones for VRM pack: ${missingCore.join(', ')}`);
  }

  const humanBones = {};
  for (const [id, nodeIndex] of Object.entries(humanBoneNodes)) {
    humanBones[id] = { node: nodeIndex };
  }

  const expressions = buildVrmExpressions(
    json,
    inventory.presentChannels || inventory.supportedChannels || [],
    gazeMode,
  );
  const lookAt = buildLookAt(gazeMode, humanBones);

  const vrmcVrm = {
    specVersion: VRMC_VRM_SPEC_VERSION,
    meta: {
      name: metaName || String(inventory.input || basename(inputGlbPath)).replace(/\.glb$/i, ''),
      version: '1.0',
      authors: ['SagaDrive'],
      licenseUrl,
      avatarPermission: 'onlyAuthor',
      allowExcessivelyViolentUsage: false,
      allowExcessivelySexualUsage: false,
      commercialUsage: 'personalNonProfit',
      allowPoliticalOrReligiousUsage: false,
      allowAntisocialOrHateUsage: false,
      creditNotation: 'required',
      allowRedistribution: false,
      modification: 'prohibited',
    },
    humanoid: {
      humanBones,
    },
  };
  if (lookAt) vrmcVrm.lookAt = lookAt;
  if (expressions) vrmcVrm.expressions = expressions;

  attachVrmcVrm1Extension(jsonDoc, vrmcVrm);
  const binary = encodeGlbFromJsonDocument(jsonDoc);

  mkdirSync(dirname(outputVrmPath), { recursive: true });
  writeFileSync(outputVrmPath, binary);

  const manifest = {
    contractVersion: 'SagaDriveAvatarVrmPackV1',
    packedAt: new Date().toISOString(),
    inputGlbPath,
    inventoryPath,
    rigPath,
    outputVrmPath,
    extension: VRMC_VRM_EXTENSION_NAME,
    specVersion: VRMC_VRM_SPEC_VERSION,
    gazeMode,
    lookAtType: lookAt?.type ?? null,
    humanoidBoneCount: Object.keys(humanBones).length,
    expressionPresetCount: expressions?.preset ? Object.keys(expressions.preset).length : 0,
    expressionCustomCount: expressions?.custom ? Object.keys(expressions.custom).length : 0,
    inputSha256: sha256File(inputGlbPath),
    outputSha256: createHash('sha256').update(binary).digest('hex'),
    outputBytes: binary.byteLength,
    inventoryProfile: inventory.profile ?? null,
  };

  const manifestPath = outputVrmPath.replace(/\.vrm$/i, '') + '.pack.json';
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  return { manifest, manifestPath, outputVrmPath, vrmcVrm };
}

/**
 * Build a tiny humanoid+morph Document for packer checks (no network).
 */
export function createMinimalPackFixtureDocument() {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const position = doc
    .createAccessor()
    .setType('VEC3')
    .setArray(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]))
    .setBuffer(buffer);
  const indices = doc
    .createAccessor()
    .setType('SCALAR')
    .setArray(new Uint16Array([0, 1, 2]))
    .setBuffer(buffer);
  const delta = doc
    .createAccessor()
    .setType('VEC3')
    .setArray(new Float32Array([0, 0.1, 0, 0, 0.1, 0, 0, 0.1, 0]))
    .setBuffer(buffer);
  const blinkDelta = doc
    .createAccessor()
    .setType('VEC3')
    .setArray(new Float32Array([0, -0.05, 0, 0, -0.05, 0, 0, -0.05, 0]))
    .setBuffer(buffer);

  const prim = doc
    .createPrimitive()
    .setAttribute('POSITION', position)
    .setIndices(indices)
    .setMode(4);
  const tJaw = doc.createPrimitiveTarget().setName('jawOpen').setAttribute('POSITION', delta);
  const tBlinkL = doc.createPrimitiveTarget().setName('eyeBlinkLeft').setAttribute('POSITION', blinkDelta);
  const tBlinkR = doc.createPrimitiveTarget().setName('eyeBlinkRight').setAttribute('POSITION', blinkDelta);
  prim.addTarget(tJaw).addTarget(tBlinkL).addTarget(tBlinkR);

  const mesh = doc.createMesh('Face');
  mesh.addPrimitive(prim);

  const hips = doc.createNode('hips');
  const spine = doc.createNode('spine');
  const chest = doc.createNode('chest');
  const neck = doc.createNode('neck');
  const head = doc.createNode('head').setMesh(mesh);

  const leftUpperLeg = doc.createNode('leftUpperLeg');
  const leftLowerLeg = doc.createNode('leftLowerLeg');
  const leftFoot = doc.createNode('leftFoot');
  const rightUpperLeg = doc.createNode('rightUpperLeg');
  const rightLowerLeg = doc.createNode('rightLowerLeg');
  const rightFoot = doc.createNode('rightFoot');
  const leftUpperArm = doc.createNode('leftUpperArm');
  const leftLowerArm = doc.createNode('leftLowerArm');
  const leftHand = doc.createNode('leftHand');
  const rightUpperArm = doc.createNode('rightUpperArm');
  const rightLowerArm = doc.createNode('rightLowerArm');
  const rightHand = doc.createNode('rightHand');

  hips.addChild(spine);
  spine.addChild(chest);
  chest.addChild(neck);
  neck.addChild(head);
  hips.addChild(leftUpperLeg);
  leftUpperLeg.addChild(leftLowerLeg);
  leftLowerLeg.addChild(leftFoot);
  hips.addChild(rightUpperLeg);
  rightUpperLeg.addChild(rightLowerLeg);
  rightLowerLeg.addChild(rightFoot);
  chest.addChild(leftUpperArm);
  leftUpperArm.addChild(leftLowerArm);
  leftLowerArm.addChild(leftHand);
  chest.addChild(rightUpperArm);
  rightUpperArm.addChild(rightLowerArm);
  rightLowerArm.addChild(rightHand);

  const scene = doc.createScene('Scene').addChild(hips);
  doc.getRoot().setDefaultScene(scene);
  return doc;
}
