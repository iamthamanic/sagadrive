#!/usr/bin/env node
/**
 * liveact-face-semantic-validator-check — semantic morph QA fixtures (#401).
 * Location: scripts/liveact-face-semantic-validator-check.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { Document, NodeIO } from '@gltf-transform/core';
import { CORE_V1_CHANNELS } from './lib/liveact-face-asset-validate.mjs';
import { validateLiveActFaceAsset } from './lib/liveact-face-asset-validate.mjs';
import { FACE_ANCHORS_CONTRACT_VERSION } from './lib/liveact-face-anchor-ids.mjs';
import { SEMANTIC_QA_CONTRACT_VERSION } from './lib/liveact-face-semantic-profile-v1.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const fixtureDir = join(root, '.qa/fixtures/liveact-face-semantic-v2');
const io = new NodeIO();

function check(cond, msg) {
  if (!cond) {
    console.error(`liveact-face-semantic-validator-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const gate = readFileSync(join(root, 'scripts/test-gate.mjs'), 'utf8');
const assetLib = readFileSync(join(root, 'scripts/lib/liveact-face-asset-validate.mjs'), 'utf8');
const semanticLib = readFileSync(join(root, 'scripts/lib/liveact-face-semantic-validate.mjs'), 'utf8');
const profileLib = readFileSync(join(root, 'scripts/lib/liveact-face-semantic-profile-v1.mjs'), 'utf8');

check(/liveact-face-semantic-validator-check/.test(gate), 'test-gate wiring');
check(/validateLiveActFaceSemanticQa/.test(assetLib), 'asset validate orchestrates semantic');
check(/semanticQa/.test(assetLib), 'inventory semanticQa field');
check(/SEMANTIC_THRESHOLDS_V1/.test(profileLib), 'versioned thresholds');
check(!/m5-face|f5-face|human-male/i.test(profileLib), 'no filename thresholds in profile');

/** Anchor reference positions for fixture mesh (model space). */
const ANCHOR_POS = {
  mouthUpper: [0, -0.25, 0.15],
  mouthLower: [0, -0.45, 0.12],
  mouthCornerLeft: [-0.35, -0.42, 0.18],
  mouthCornerRight: [0.35, -0.42, 0.18],
  eyeLeftInner: [-0.25, 0.42, 0.28],
  eyeLeftOuter: [-0.72, 0.4, 0.22],
  eyeLeftUpper: [-0.48, 0.52, 0.26],
  eyeLeftLower: [-0.48, 0.32, 0.24],
  eyeRightInner: [0.25, 0.42, 0.28],
  eyeRightOuter: [0.72, 0.4, 0.22],
  eyeRightUpper: [0.48, 0.52, 0.26],
  eyeRightLower: [0.48, 0.32, 0.24],
  browLeftInner: [-0.22, 0.72, 0.12],
  browLeftOuter: [-0.72, 0.74, 0.08],
  browLeftCenter: [-0.48, 0.76, 0.1],
  browRightInner: [0.22, 0.72, 0.12],
  browRightOuter: [0.72, 0.74, 0.08],
  browRightCenter: [0.48, 0.76, 0.1],
  noseTip: [0, 0.48, 0.92],
  chin: [0, -1.05, 0.02],
  forehead: [0, 1.15, 0.02],
};

/**
 * @param {{ morphOverrides?: Record<string, number[][]>; jawOpenLeakForehead?: boolean; smileLeftWrongSide?: boolean }} opts
 */
async function buildSemanticFixtureGlb(opts = {}) {
  const anchorIds = Object.keys(ANCHOR_POS);
  /** @type {number[]} */
  const positions = [];
  /** @type {number[]} */
  const indices = [];
  /** @type {Record<string, number>} */
  const vertexIndexByAnchor = {};

  for (let ai = 0; ai < anchorIds.length; ai += 1) {
    const anchorId = anchorIds[ai];
    const [ax, ay, az] = ANCHOR_POS[anchorId];
    const base = positions.length / 3;
    vertexIndexByAnchor[anchorId] = base;
    positions.push(ax, ay, az, ax + 0.02, ay, az, ax, ay + 0.02, az);
    indices.push(base, base + 1, base + 2);
  }

  const doc = new Document();
  const buffer = doc.createBuffer();
  const posAcc = doc
    .createAccessor()
    .setType('VEC3')
    .setArray(new Float32Array(positions))
    .setBuffer(buffer);
  const idxAcc = doc
    .createAccessor()
    .setType('SCALAR')
    .setArray(new Uint16Array(indices))
    .setBuffer(buffer);
  const prim = doc
    .createPrimitive()
    .setAttribute('POSITION', posAcc)
    .setIndices(idxAcc);
  const mat = doc.createMaterial('face');
  prim.setMaterial(mat);

  const morphNames = [...CORE_V1_CHANNELS];
  /** @type {Record<string, number[][]>} */
  const deltasByChannel = {};

  const vertexCount = positions.length / 3;
  for (const channel of morphNames) {
    deltasByChannel[channel] = Array.from({ length: vertexCount }, () => [0, 0, 0]);
  }

  function bump(channel, anchorId, delta) {
    const idx = vertexIndexByAnchor[anchorId];
    if (idx === undefined) return;
    deltasByChannel[channel][idx] = delta;
  }

  bump('jawOpen', 'chin', [0, -0.12, 0]);
  bump('jawOpen', 'mouthLower', [0, -0.08, 0.02]);
  if (opts.smileLeftWrongSide) {
    bump('mouthSmileLeft', 'mouthCornerRight', [0, 0.12, 0.05]);
    bump('mouthSmileLeft', 'mouthUpper', [0, 0.02, 0.01]);
  } else {
    bump('mouthSmileLeft', 'mouthCornerLeft', [0, 0.08, 0.04]);
    bump('mouthSmileLeft', 'mouthUpper', [0, 0.03, 0.01]);
  }
  bump('mouthSmileRight', 'mouthCornerRight', [0, 0.08, 0.04]);
  bump('mouthSmileRight', 'mouthUpper', [0, 0.03, 0.01]);
  bump('mouthFrownLeft', 'mouthCornerLeft', [0, -0.07, -0.02]);
  bump('mouthFrownRight', 'mouthCornerRight', [0, -0.07, -0.02]);
  bump('mouthPucker', 'mouthUpper', [0, 0.05, 0.08]);
  bump('mouthPucker', 'noseTip', [0, 0.02, 0.04]);
  bump('mouthShrugUpper', 'mouthUpper', [0, 0.06, 0]);
  bump('mouthShrugLower', 'mouthLower', [0, -0.09, 0]);
  bump('mouthShrugLower', 'chin', [0, -0.08, 0]);
  bump('mouthShrugLower', 'mouthUpper', [0, -0.04, 0]);
  bump('eyeBlinkLeft', 'eyeLeftUpper', [0, -0.06, 0]);
  bump('eyeBlinkLeft', 'eyeLeftLower', [0, 0.06, 0]);
  bump('eyeBlinkRight', 'eyeRightUpper', [0, -0.06, 0]);
  bump('eyeBlinkRight', 'eyeRightLower', [0, 0.06, 0]);

  if (opts.jawOpenLeakForehead) {
    bump('jawOpen', 'forehead', [0, 0.25, 0]);
    bump('jawOpen', 'noseTip', [0, 0.15, 0.1]);
  }

  if (opts.morphOverrides) {
    for (const [channel, overrides] of Object.entries(opts.morphOverrides)) {
      deltasByChannel[channel] = overrides;
    }
  }

  const targetNames = [];
  for (const channel of morphNames) {
    const flat = deltasByChannel[channel].flat();
    const deltaAcc = doc
      .createAccessor()
      .setType('VEC3')
      .setArray(new Float32Array(flat))
      .setBuffer(buffer);
    prim.addTarget(doc.createPrimitiveTarget().setAttribute('POSITION', deltaAcc));
    targetNames.push(channel);
  }
  prim.setExtras({ targetNames });

  const mesh = doc.createMesh('FaceMesh').addPrimitive(prim);

  const joints = doc
    .createAccessor()
    .setType('VEC4')
    .setArray(new Uint16Array(vertexCount * 4).fill(0))
    .setBuffer(buffer);
  const weightArr = new Float32Array(vertexCount * 4);
  for (let v = 0; v < vertexCount; v += 1) weightArr[v * 4] = 1;
  const weights = doc.createAccessor().setType('VEC4').setArray(weightArr).setBuffer(buffer);
  prim.setAttribute('JOINTS_0', joints).setAttribute('WEIGHTS_0', weights);
  const joint = doc.createNode('Hips');
  const skin = doc.createSkin('skin').addJoint(joint).setSkeleton(joint);
  const faceNode = doc.createNode('FaceMesh').setMesh(mesh).setSkin(skin);
  doc.createScene().addChild(faceNode).addChild(joint);

  return Buffer.from(await io.writeBinary(doc));
}

function buildAnchorsManifest() {
  /** @type {Record<string, unknown>} */
  const anchors = {};
  for (let ai = 0; ai < Object.keys(ANCHOR_POS).length; ai += 1) {
    const anchorId = Object.keys(ANCHOR_POS)[ai];
    anchors[anchorId] = {
      nodeIdentity: 'FaceMesh',
      primitiveIndex: 0,
      triangleIndex: ai,
      barycentric: { u: 1, v: 0, w: 0 },
    };
  }
  return {
    contractVersion: FACE_ANCHORS_CONTRACT_VERSION,
    anchors,
  };
}

async function makeBaselineGlb() {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const pos = doc
    .createAccessor()
    .setType('VEC3')
    .setArray(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]))
    .setBuffer(buffer);
  const prim = doc.createPrimitive().setAttribute('POSITION', pos).setMaterial(doc.createMaterial('body'));
  const mesh = doc.createMesh('body').addPrimitive(prim);
  const node = doc.createNode('root').setMesh(mesh);
  const joint = doc.createNode('Hips');
  const skin = doc.createSkin('skin').addJoint(joint).setSkeleton(joint);
  node.setSkin(skin);
  doc.createScene().addChild(node).addChild(joint);
  return Buffer.from(await io.writeBinary(doc));
}

mkdirSync(fixtureDir, { recursive: true });

const baselinePath = join(fixtureDir, 'baseline-body.glb');
const semanticOkPath = join(fixtureDir, 'face-semantic-ok.glb');
const semanticFailPath = join(fixtureDir, 'face-semantic-jaw-leak.glb');
const anchorsPath = join(fixtureDir, 'face-anchors.json');

writeFileSync(baselinePath, await makeBaselineGlb());
writeFileSync(semanticOkPath, await buildSemanticFixtureGlb());
writeFileSync(semanticFailPath, await buildSemanticFixtureGlb({ jawOpenLeakForehead: true }));
writeFileSync(anchorsPath, `${JSON.stringify(buildAnchorsManifest(), null, 2)}\n`);

const passResult = await validateLiveActFaceAsset({
  inputPath: semanticOkPath,
  baselinePath,
  profile: 'core-v1',
  anchorsPath,
  outPath: join(fixtureDir, 'face-inventory-semantic-ok.json'),
});
check(passResult.ok === true, 'semantic fixture passes');
check(passResult.inventory.semanticQa?.contractVersion === SEMANTIC_QA_CONTRACT_VERSION, 'semantic contract');
check(passResult.inventory.semanticQa?.pass === true, 'semantic pass flag');
check(passResult.inventory.semanticQa?.channels?.jawOpen?.pass === true, 'jawOpen semantic pass');

const failResult = await validateLiveActFaceAsset({
  inputPath: semanticFailPath,
  baselinePath,
  profile: 'core-v1',
  anchorsPath,
});
check(failResult.ok === false, 'leaky jawOpen fails overall');
check(failResult.inventory.sagaDrive.errors.includes('semantic_qa_failed'), 'semantic error surfaced');
check(failResult.inventory.semanticQa?.channels?.jawOpen?.pass === false, 'jawOpen semantic fail');

const wrongSidePath = join(fixtureDir, 'face-semantic-smile-wrong-side.glb');
writeFileSync(wrongSidePath, await buildSemanticFixtureGlb({ smileLeftWrongSide: true }));
const wrongSide = await validateLiveActFaceAsset({
  inputPath: wrongSidePath,
  baselinePath,
  profile: 'core-v1',
  anchorsPath,
});
check(wrongSide.ok === false, 'asymmetric smile fail');
check(wrongSide.inventory.semanticQa?.channels?.mouthSmileLeft?.pass === false, 'smileLeft fail detail');

execFileSync(
  process.execPath,
  [
    join(root, 'scripts/liveact-face-asset-check.mjs'),
    '--input',
    semanticOkPath,
    '--baseline',
    baselinePath,
    '--profile',
    'core-v1',
    '--anchors',
    anchorsPath,
    '--out',
    join(fixtureDir, 'cli-semantic-out.json'),
  ],
  { cwd: root, stdio: 'pipe' },
);

console.log('liveact-face-semantic-validator-check OK');
