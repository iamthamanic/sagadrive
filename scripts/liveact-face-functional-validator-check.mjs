#!/usr/bin/env node
/**
 * liveact-face-functional-validator-check — Functional Face QA fixtures (#422).
 * Location: scripts/liveact-face-functional-validator-check.mjs
 *
 * Proves Semantic PASS / Functional FAIL with deliberate wrong morphs.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { Document, NodeIO } from '@gltf-transform/core';
import { CORE_V1_CHANNELS, validateLiveActFaceAsset } from './lib/liveact-face-asset-validate.mjs';
import { FACE_ANCHORS_CONTRACT_VERSION } from './lib/liveact-face-anchor-ids.mjs';
import {
  FACE_FUNCTIONAL_QA_CONTRACT_VERSION,
  FACE_FUNCTIONAL_PROFILE_VERSION,
  FUNCTIONAL_REQUIRED_CHANNELS_V1,
} from './lib/liveact-face-functional-profile-v1.mjs';
import {
  computeFaceAssetTopologyFingerprint,
} from './lib/liveact-face-functional-validate.mjs';
import { FACE_MAPPING_AUTHORING_CONTRACT_VERSION } from './lib/liveact-face-mapping-authoring.mjs';
import { NodeIO as IO2 } from '@gltf-transform/core';

const root = fileURLToPath(new URL('..', import.meta.url));
const fixtureDir = join(root, '.qa/fixtures/liveact-face-functional-v1');
const io = new NodeIO();

function check(cond, msg) {
  if (!cond) {
    console.error(`liveact-face-functional-validator-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const gate = readFileSync(join(root, 'scripts/test-gate.mjs'), 'utf8');
const assetLib = readFileSync(join(root, 'scripts/lib/liveact-face-asset-validate.mjs'), 'utf8');
const functionalLib = readFileSync(join(root, 'scripts/lib/liveact-face-functional-validate.mjs'), 'utf8');
const profileLib = readFileSync(join(root, 'scripts/lib/liveact-face-functional-profile-v1.mjs'), 'utf8');
const authoringMd = readFileSync(join(root, 'assets/species-3d/FACE-AUTHORING.md'), 'utf8');

check(/liveact-face-functional-validator-check/.test(gate), 'test-gate wiring');
check(/validateLiveActFaceFunctionalQa|functionalQa/.test(assetLib), 'asset validate wires functionalQa');
check(/SagaDriveLiveActFaceFunctionalQaV1/.test(profileLib), 'functional contract');
check(!/m5-face|f5-face|human-male/i.test(profileLib), 'no filename thresholds');
check(/functionalQa|Functional Face QA/.test(authoringMd), 'FACE-AUTHORING documents functionalQa');
check(/resolveFaceAnchorPositions/.test(functionalLib), 'reuses anatomy neutral resolver');
check(/resolvePosedFaceAnchorPosition|resolveFaceAnchorPositionsPosed/.test(functionalLib), 'posed evaluator');

/** Same layout as semantic fixtures (+X = character left). */
const ANCHOR_POS = {
  mouthUpper: [0, -0.25, 0.15],
  mouthLower: [0, -0.45, 0.12],
  mouthCornerLeft: [0.35, -0.42, 0.18],
  mouthCornerRight: [-0.35, -0.42, 0.18],
  eyeLeftInner: [0.25, 0.42, 0.28],
  eyeLeftOuter: [0.72, 0.4, 0.22],
  eyeLeftUpper: [0.48, 0.52, 0.26],
  eyeLeftLower: [0.48, 0.32, 0.24],
  eyeRightInner: [-0.25, 0.42, 0.28],
  eyeRightOuter: [-0.72, 0.4, 0.22],
  eyeRightUpper: [-0.48, 0.52, 0.26],
  eyeRightLower: [-0.48, 0.32, 0.24],
  browLeftInner: [0.22, 0.72, 0.12],
  browLeftOuter: [0.72, 0.74, 0.08],
  browLeftCenter: [0.48, 0.76, 0.1],
  browRightInner: [-0.22, 0.72, 0.12],
  browRightOuter: [-0.72, 0.74, 0.08],
  browRightCenter: [-0.48, 0.76, 0.1],
  noseTip: [0, 0.05, 0.92],
  chin: [0, -1.05, 0.02],
  forehead: [0, 1.15, 0.02],
};

/**
 * @param {{
 *   mode?: 'good' | 'jawNoGap' | 'blinkBoth' | 'blinkNoLid' | 'browDown' | 'smileWrongSide' | 'puckerNoWidth' | 'slightOpenNeutral';
 * }} opts
 */
async function buildFunctionalFixtureGlb(opts = {}) {
  const mode = opts.mode || 'good';
  const anchorIds = Object.keys(ANCHOR_POS);
  /** @type {number[]} */
  const positions = [];
  /** @type {number[]} */
  const indices = [];
  /** @type {Record<string, number>} */
  const vertexIndexByAnchor = {};

  for (let ai = 0; ai < anchorIds.length; ai += 1) {
    const anchorId = anchorIds[ai];
    let [ax, ay, az] = ANCHOR_POS[anchorId];
    if (mode === 'slightOpenNeutral' && anchorId === 'mouthLower') {
      ay -= 0.04; // slightly open mouth at rest
    }
    if (mode === 'slightOpenNeutral' && anchorId === 'mouthUpper') {
      ay += 0.01;
    }
    // Asymmetric neutral: left eye slightly more open
    if (mode === 'slightOpenNeutral' && anchorId === 'eyeLeftUpper') ay += 0.02;
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
  const prim = doc.createPrimitive().setAttribute('POSITION', posAcc).setIndices(idxAcc);
  prim.setMaterial(doc.createMaterial('face'));

  const morphNames = [...new Set([...CORE_V1_CHANNELS, ...FUNCTIONAL_REQUIRED_CHANNELS_V1])];
  /** @type {Record<string, number[][]>} */
  const deltasByChannel = {};
  const vertexCount = positions.length / 3;
  for (const channel of morphNames) {
    deltasByChannel[channel] = Array.from({ length: vertexCount }, () => [0, 0, 0]);
  }

  function bump(channel, anchorId, delta) {
    const idx = vertexIndexByAnchor[anchorId];
    if (idx === undefined) return;
    // Apply to all three triangle verts so barycentric (1,0,0) and neighbors move.
    for (let k = 0; k < 3; k += 1) {
      deltasByChannel[channel][idx + k] = delta;
    }
  }

  // Correct functional morphs (baseline)
  bump('jawOpen', 'chin', [0, -0.18, 0]);
  bump('jawOpen', 'mouthLower', [0, -0.14, 0.02]);
  bump('eyeBlinkLeft', 'eyeLeftUpper', [0, -0.1, 0]);
  bump('eyeBlinkLeft', 'eyeLeftLower', [0, 0.04, 0]);
  bump('eyeBlinkRight', 'eyeRightUpper', [0, -0.1, 0]);
  bump('eyeBlinkRight', 'eyeRightLower', [0, 0.04, 0]);
  bump('browInnerUp', 'browLeftInner', [0, 0.08, 0]);
  bump('browInnerUp', 'browRightInner', [0, 0.08, 0]);
  bump('mouthSmileLeft', 'mouthCornerLeft', [0.02, 0.1, 0.02]);
  bump('mouthSmileRight', 'mouthCornerRight', [-0.02, 0.1, 0.02]);
  bump('mouthPucker', 'mouthCornerLeft', [-0.12, 0, 0.04]);
  bump('mouthPucker', 'mouthCornerRight', [0.12, 0, 0.04]);
  bump('mouthPucker', 'mouthUpper', [0, 0.02, 0.06]);
  bump('mouthFrownLeft', 'mouthCornerLeft', [0, -0.07, -0.02]);
  bump('mouthFrownRight', 'mouthCornerRight', [0, -0.07, -0.02]);
  bump('mouthShrugUpper', 'mouthUpper', [0, 0.06, 0]);
  bump('mouthShrugLower', 'mouthLower', [0, -0.09, 0]);
  bump('mouthShrugLower', 'chin', [0, -0.08, 0]);

  if (mode === 'jawNoGap') {
    // Large mouth-region energy, upper+lower move together → gap barely changes.
    bump('jawOpen', 'chin', [0, 0, 0]);
    bump('jawOpen', 'mouthLower', [0.15, 0, 0.05]);
    bump('jawOpen', 'mouthUpper', [0.15, 0, 0.05]);
    bump('jawOpen', 'mouthCornerLeft', [0.12, 0, 0.04]);
    bump('jawOpen', 'mouthCornerRight', [0.12, 0, 0.04]);
  }
  if (mode === 'blinkBoth') {
    bump('eyeBlinkLeft', 'eyeLeftUpper', [0, -0.1, 0]);
    bump('eyeBlinkLeft', 'eyeLeftLower', [0, 0.04, 0]);
    bump('eyeBlinkLeft', 'eyeRightUpper', [0, -0.1, 0]);
    bump('eyeBlinkLeft', 'eyeRightLower', [0, 0.04, 0]);
  }
  if (mode === 'blinkNoLid') {
    // Moves brow/cheek near eye but not lid opening.
    bump('eyeBlinkLeft', 'eyeLeftUpper', [0, 0, 0]);
    bump('eyeBlinkLeft', 'eyeLeftLower', [0, 0, 0]);
    bump('eyeBlinkLeft', 'browLeftCenter', [0, -0.05, 0.08]);
    bump('eyeBlinkLeft', 'eyeLeftOuter', [0.05, 0, 0.05]);
  }
  if (mode === 'browDown') {
    bump('browInnerUp', 'browLeftInner', [0, -0.08, 0]);
    bump('browInnerUp', 'browRightInner', [0, -0.08, 0]);
  }
  if (mode === 'smileWrongSide') {
    bump('mouthSmileLeft', 'mouthCornerLeft', [0, 0, 0]);
    bump('mouthSmileLeft', 'mouthCornerRight', [-0.02, 0.12, 0.02]);
  }
  if (mode === 'puckerNoWidth') {
    // Strong mouth energy / forward, corners do not contract.
    bump('mouthPucker', 'mouthCornerLeft', [0, 0, 0.12]);
    bump('mouthPucker', 'mouthCornerRight', [0, 0, 0.12]);
    bump('mouthPucker', 'mouthUpper', [0, 0.04, 0.15]);
    bump('mouthPucker', 'mouthLower', [0, -0.02, 0.12]);
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
  const ids = Object.keys(ANCHOR_POS);
  for (let ai = 0; ai < ids.length; ai += 1) {
    anchors[ids[ai]] = {
      nodeIdentity: 'FaceMesh',
      primitiveIndex: 0,
      triangleIndex: ai,
      barycentric: { u: 1, v: 0, w: 0 },
    };
  }
  return { contractVersion: FACE_ANCHORS_CONTRACT_VERSION, anchors };
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

/**
 * @param {string} glbPath
 * @param {{ reviewed?: boolean; source?: string; topologyFingerprint?: string|null; modelSha256?: string|null; anchorsSha256?: string|null; modelPath?: string; omitAnchorsSha?: boolean }} opts
 */
async function writeAuthoring(glbPath, opts = {}) {
  const bytes = readFileSync(glbPath);
  const doc = await new IO2().readBinary(new Uint8Array(bytes));
  const topo =
    opts.topologyFingerprint === null
      ? undefined
      : opts.topologyFingerprint || computeFaceAssetTopologyFingerprint(doc);
  const sha =
    opts.modelSha256 === null
      ? undefined
      : opts.modelSha256 || createHash('sha256').update(bytes).digest('hex');
  const anchorsSha =
    opts.omitAnchorsSha || opts.anchorsSha256 === null
      ? undefined
      : opts.anchorsSha256 || createHash('sha256').update(readFileSync(anchorsPath)).digest('hex');
  const authoring = {
    contractVersion: FACE_MAPPING_AUTHORING_CONTRACT_VERSION,
    source: opts.source || 'manual',
    reviewed: opts.reviewed !== false,
    reviewedAt: '2026-09-29T10:00:00.000Z',
    asset: {
      modelPath: opts.modelPath || basename(glbPath),
      ...(topo ? { topologyFingerprint: topo } : {}),
      ...(sha ? { modelSha256: sha } : {}),
      ...(anchorsSha ? { anchorsSha256: anchorsSha } : {}),
    },
  };
  if (opts.reviewed === false) {
    delete authoring.reviewedAt;
  }
  return authoring;
}

mkdirSync(fixtureDir, { recursive: true });
const baselinePath = join(fixtureDir, 'baseline-body.glb');
const anchorsPath = join(fixtureDir, 'face-anchors.json');
writeFileSync(baselinePath, await makeBaselineGlb());
writeFileSync(anchorsPath, `${JSON.stringify(buildAnchorsManifest(), null, 2)}\n`);

async function runCase(name, mode, authoringOpts = {}) {
  const glbPath = join(fixtureDir, `${name}.glb`);
  writeFileSync(glbPath, await buildFunctionalFixtureGlb({ mode }));
  const authoringPath = join(fixtureDir, `${name}-authoring.json`);
  const authoring = await writeAuthoring(glbPath, authoringOpts);
  writeFileSync(authoringPath, `${JSON.stringify(authoring, null, 2)}\n`);
  const result = await validateLiveActFaceAsset({
    inputPath: glbPath,
    baselinePath,
    profile: 'core-v1',
    anchorsPath,
    authoringPath,
    outPath: join(fixtureDir, `${name}-inventory.json`),
  });
  return result;
}

// 1) good reviewed GT → PASS
const good = await runCase('functional-ok', 'good');
check(good.ok === true, 'good fixture overall pass');
check(good.inventory.semanticQa?.pass === true, 'good semantic pass');
check(good.inventory.functionalQa?.contractVersion === FACE_FUNCTIONAL_QA_CONTRACT_VERSION, 'functional contract');
check(good.inventory.functionalQa?.profileVersion === FACE_FUNCTIONAL_PROFILE_VERSION, 'functional profile');
check(good.inventory.functionalQa?.pass === true, 'good functional pass');
check(good.inventory.functionalQa?.channels?.jawOpen?.pass === true, 'jawOpen functional pass');
check(good.inventory.functionalQa?.channels?.mouthPucker?.pass === true, 'pucker functional pass');
check(good.inventory.functionalQa?.blockedByGroundTruth === false, 'good not blocked by GT');

// 2) KEY: Semantic PASS / Functional FAIL — jaw energy without mouthGap
const jawNoGap = await runCase('functional-jaw-no-gap', 'jawNoGap');
check(jawNoGap.inventory.structuralPass === true, 'jawNoGap structural pass');
check(jawNoGap.inventory.semanticQa?.pass === true, 'jawNoGap semantic PASS');
check(jawNoGap.inventory.functionalQa?.pass === false, 'jawNoGap functional FAIL');
check(
  (jawNoGap.inventory.functionalQa?.channels?.jawOpen?.violations || []).some((v) =>
    String(v).includes('mouth_gap'),
  ),
  'jawNoGap mouth gap violation',
);
check(jawNoGap.ok === false, 'jawNoGap overall fail');
check(jawNoGap.inventory.sagaDrive.errors.includes('functional_qa_failed'), 'functional_qa_failed surfaced');

// 3) blink both eyes
const blinkBoth = await runCase('functional-blink-both', 'blinkBoth');
check(blinkBoth.inventory.functionalQa?.channels?.eyeBlinkLeft?.pass === false, 'blinkBoth fail');
check(
  (blinkBoth.inventory.functionalQa?.channels?.eyeBlinkLeft?.violations || []).some((v) =>
    String(v).includes('crosstalk'),
  ),
  'blinkBoth crosstalk',
);

// 4) blink no lid
const blinkNoLid = await runCase('functional-blink-no-lid', 'blinkNoLid');
check(blinkNoLid.inventory.functionalQa?.channels?.eyeBlinkLeft?.pass === false, 'blinkNoLid fail');

// 5) brow down
const browDown = await runCase('functional-brow-down', 'browDown');
check(browDown.inventory.functionalQa?.channels?.browInnerUp?.pass === false, 'browDown fail');

// 6) smile wrong side
const smileWrong = await runCase('functional-smile-wrong', 'smileWrongSide');
check(smileWrong.inventory.functionalQa?.channels?.mouthSmileLeft?.pass === false, 'smileWrong fail');

// 7) pucker no width
const puckerNoWidth = await runCase('functional-pucker-no-width', 'puckerNoWidth');
check(puckerNoWidth.inventory.semanticQa?.pass === true, 'puckerNoWidth semantic can pass');
check(puckerNoWidth.inventory.functionalQa?.channels?.mouthPucker?.pass === false, 'puckerNoWidth functional fail');

// 8) unreviewed / auto
const unreviewed = await runCase('functional-unreviewed', 'good', {
  reviewed: false,
  source: 'auto',
});
check(unreviewed.inventory.functionalQa?.blockedByGroundTruth === true, 'unreviewed blocked');
check(unreviewed.ok === false, 'unreviewed overall fail');

const autoProp = await runCase('functional-auto', 'good', {
  reviewed: false,
  source: 'auto',
});
check(
  (autoProp.inventory.functionalQa?.violations || []).some((v) => String(v).includes('auto')),
  'auto proposal blocked',
);

// Diagnostic mode: auto/unreviewed sidecar → skip Functional QA (do not fail semantic-only callers)
{
  const glbPath = join(fixtureDir, 'functional-auto.glb');
  const diag = await validateLiveActFaceAsset({
    inputPath: glbPath,
    baselinePath,
    profile: 'core-v1',
    anchorsPath,
    authoringPath: join(fixtureDir, 'functional-auto-authoring.json'),
    functionalMode: 'diagnostic',
  });
  check(diag.inventory.functionalQa?.skipped === true, 'diagnostic skips auto authoring');
  check(diag.inventory.functionalQa?.pass !== false || diag.inventory.functionalQa?.skipped === true, 'diagnostic not hard-fail');
  check(
    !((diag.inventory.sagaDrive?.errors || []).includes('functional_qa_blocked_by_ground_truth')),
    'diagnostic does not report GT block error',
  );
}

// Diagnostic mode + auto sidecar with stale anchorsSha256 → still block (fingerprint before skip)
{
  const glbPath = join(fixtureDir, 'functional-ok.glb');
  const tmpDir = mkdtempSync(join(tmpdir(), 'liveact-face-functional-'));
  const staleAutoPath = join(tmpDir, 'functional-diag-stale-auto-authoring.json');
  const staleAuto = await writeAuthoring(glbPath, {
    reviewed: false,
    source: 'auto',
    anchorsSha256: '0'.repeat(64),
  });
  writeFileSync(staleAutoPath, `${JSON.stringify(staleAuto, null, 2)}\n`);
  const diagStale = await validateLiveActFaceAsset({
    inputPath: glbPath,
    baselinePath,
    profile: 'core-v1',
    anchorsPath,
    authoringPath: staleAutoPath,
    functionalMode: 'diagnostic',
  });
  check(diagStale.ok === false, 'diagnostic stale auto still fails');
  check(diagStale.inventory.functionalQa?.skipped !== true, 'diagnostic stale auto not skipped');
  check(
    (diagStale.inventory.functionalQa?.violations || []).includes('anchors_sha256_mismatch'),
    'diagnostic stale auto reports anchors mismatch',
  );
  try {
    rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

// Malformed authoring JSON → fail-closed even in diagnostic
{
  const glbPath = join(fixtureDir, 'functional-ok.glb');
  const tmpDir = mkdtempSync(join(tmpdir(), 'liveact-face-functional-'));
  const badPath = join(tmpDir, 'functional-malformed-authoring.json');
  writeFileSync(badPath, '{not-json');
  const badParse = await validateLiveActFaceAsset({
    inputPath: glbPath,
    baselinePath,
    profile: 'core-v1',
    anchorsPath,
    authoringPath: badPath,
    functionalMode: 'diagnostic',
  });
  check(badParse.ok === false, 'malformed authoring fails diagnostic');
  check(
    (badParse.inventory.functionalQa?.violations || []).some((v) =>
      String(v).includes('malformed_authoring'),
    ),
    'malformed_authoring_provenance',
  );
  try {
    rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

// Explicit authoringPath that does not exist → fail-closed (even diagnostic)
{
  const glbPath = join(fixtureDir, 'functional-ok.glb');
  const missingPath = join(fixtureDir, 'does-not-exist-authoring.json');
  const missingExplicit = await validateLiveActFaceAsset({
    inputPath: glbPath,
    baselinePath,
    profile: 'core-v1',
    anchorsPath,
    authoringPath: missingPath,
    functionalMode: 'diagnostic',
  });
  check(missingExplicit.ok === false, 'missing explicit authoringPath fails diagnostic');
  check(
    (missingExplicit.inventory.functionalQa?.violations || []).some((v) =>
      String(v).includes('authoring_path_not_found'),
    ),
    'authoring_path_not_found',
  );
}
{
  const glbPath = join(fixtureDir, 'functional-ok.glb');
  const noAnchorsPublish = await validateLiveActFaceAsset({
    inputPath: glbPath,
    baselinePath,
    profile: 'core-v1',
  });
  check(noAnchorsPublish.ok === true, 'morph-only without anchors still structurally OK');
  check(noAnchorsPublish.inventory.functionalQa?.skipped === true, 'functional skipped without anchors');
  check(
    (noAnchorsPublish.inventory.functionalQa?.violations || []).includes('no_anchors_manifest'),
    'no_anchors_manifest skip reason',
  );

  const noAnchorsDiag = await validateLiveActFaceAsset({
    inputPath: glbPath,
    baselinePath,
    profile: 'core-v1',
    functionalMode: 'diagnostic',
  });
  check(noAnchorsDiag.ok === true, 'diagnostic morph-only without anchors still OK');
  check(noAnchorsDiag.inventory.functionalQa?.skipped === true, 'functional skipped without anchors in diagnostic');
}

// Authoring without anchors on CLI → reject (publish pairing)
{
  let cliFailed = false;
  try {
    execFileSync(
      process.execPath,
      [
        join(root, 'scripts/liveact-face-asset-check.mjs'),
        '--input',
        join(fixtureDir, 'functional-ok.glb'),
        '--baseline',
        baselinePath,
        '--profile',
        'core-v1',
        '--authoring',
        join(fixtureDir, 'functional-ok-authoring.json'),
      ],
      { cwd: root, stdio: 'pipe' },
    );
  } catch {
    cliFailed = true;
  }
  check(cliFailed, 'CLI authoring without anchors fails');
}

// 9) fingerprint mismatch
const mismatch = await runCase('functional-topo-mismatch', 'good', {
  topologyFingerprint: 'v0:t0:m0',
});
check(mismatch.inventory.functionalQa?.blockedByGroundTruth === true, 'topo mismatch blocked');
check(
  (mismatch.inventory.functionalQa?.violations || []).includes('topology_fingerprint_mismatch'),
  'topo mismatch code',
);

// insufficient fingerprint
const insuff = await runCase('functional-insuff-fp', 'good', {
  topologyFingerprint: null,
  modelSha256: null,
  omitAnchorsSha: true,
});
check(
  (insuff.inventory.functionalQa?.violations || []).includes('insufficient_fingerprint'),
  'insufficient fingerprint blocked',
);
check(
  (insuff.inventory.functionalQa?.violations || []).includes('anchors_sha256_required'),
  'anchors sha required',
);

// stale / remapped anchors fingerprint
const staleAnchors = await runCase('functional-stale-anchors', 'good', {
  anchorsSha256: '0'.repeat(64),
});
check(staleAnchors.inventory.functionalQa?.blockedByGroundTruth === true, 'stale anchors blocked');
check(
  (staleAnchors.inventory.functionalQa?.violations || []).includes('anchors_sha256_mismatch'),
  'anchors_sha256_mismatch',
);

// basename-only path without model sha → blocked (cross-run collision)
const baseNoSha = await runCase('functional-basename-no-sha', 'good', {
  modelPath: 'functional-basename-no-sha.glb',
  modelSha256: null,
});
check(
  (baseNoSha.inventory.functionalQa?.violations || []).includes(
    'asset_model_path_basename_requires_sha256',
  ),
  `basename without sha blocked (${(baseNoSha.inventory.functionalQa?.violations || []).join(',')})`,
);

// 10) slight open neutral still judged by delta
const slightOpen = await runCase('functional-slight-open', 'slightOpenNeutral');
check(slightOpen.inventory.functionalQa?.pass === true, 'slight open neutral still passes jawOpen delta');

// Missing authoring in publish mode → blocked (P1)
{
  const glbPath = join(fixtureDir, 'functional-ok.glb');
  const missingAuth = await validateLiveActFaceAsset({
    inputPath: glbPath,
    baselinePath,
    profile: 'core-v1',
    anchorsPath,
  });
  check(missingAuth.ok === false, 'missing authoring blocks publish gate');
  check(
    missingAuth.inventory.functionalQa?.blockedByGroundTruth === true,
    'missing authoring blockedByGroundTruth',
  );
  check(
    (missingAuth.inventory.functionalQa?.violations || []).includes('missing_authoring_provenance'),
    'missing_authoring_provenance',
  );
}

// Invalid reviewedAt
{
  const badAt = await runCase('functional-bad-reviewed-at', 'good', {
    reviewed: true,
    source: 'manual',
  });
  // overwrite authoring with invalid timestamp
  const authoringPath = join(fixtureDir, 'functional-bad-reviewed-at-authoring.json');
  const invPath = join(fixtureDir, 'functional-bad-reviewed-at-inventory.json');
  const raw = JSON.parse(readFileSync(authoringPath, 'utf8'));
  raw.reviewedAt = 'not-a-date';
  writeFileSync(authoringPath, `${JSON.stringify(raw, null, 2)}\n`);
  const bad = await validateLiveActFaceAsset({
    inputPath: join(fixtureDir, 'functional-bad-reviewed-at.glb'),
    baselinePath,
    profile: 'core-v1',
    anchorsPath,
    authoringPath,
    outPath: invPath,
  });
  writeFileSync(invPath, `${JSON.stringify(bad.inventory, null, 2)}\n`);
  check(bad.ok === false, 'invalid reviewedAt blocks');
  check(
    (bad.inventory.functionalQa?.violations || []).some((v) => String(v).includes('reviewed')),
    'invalid reviewedAt violation',
  );
  check(bad.inventory.functionalQa?.pass === false, 'invalid reviewedAt inventory pass=false');
}

// CLI with authoring
execFileSync(
  process.execPath,
  [
    join(root, 'scripts/liveact-face-asset-check.mjs'),
    '--input',
    join(fixtureDir, 'functional-ok.glb'),
    '--baseline',
    baselinePath,
    '--profile',
    'core-v1',
    '--anchors',
    anchorsPath,
    '--authoring',
    join(fixtureDir, 'functional-ok-authoring.json'),
    '--out',
    join(fixtureDir, 'cli-functional-out.json'),
  ],
  { cwd: root, stdio: 'pipe' },
);

const cliOut = JSON.parse(readFileSync(join(fixtureDir, 'cli-functional-out.json'), 'utf8'));
check(cliOut.functionalQa?.pass === true, 'CLI inventory functional pass');
check(cliOut.functionalQa?.channels?.jawOpen?.poseWeight === 1, 'pose weight recorded');
check(cliOut.functionalQa?.channels?.jawOpen?.thresholds != null, 'thresholds recorded');

console.log('liveact-face-functional-validator-check OK');
