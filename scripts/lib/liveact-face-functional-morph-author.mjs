/**
 * liveact-face-functional-morph-author — GT-aware functional shape-key rewrite (#423).
 * Location: scripts/lib/liveact-face-functional-morph-author.mjs
 *
 * Design decision: from reviewed semantic anchors + mesh topology, deterministically
 * rewrite named SagaDrive face morph POSITION accessors.
 * Milestone 1: jawOpen. Milestone 2: blinks. Milestone 3: browInnerUp.
 *
 * Does not import Functional QA thresholds as an optimization loop.
 * Domain/runtime code must not import this module.
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { parseManifestEnvelope, validateFaceAnchorsAgainstDocument } from './liveact-face-anchor-validate.mjs';
import { resolveFaceAnchorPositions } from './liveact-face-anchor-anatomy-validate.mjs';
import { findNodeByIdentity } from './liveact-face-anchor-glb.mjs';
import {
  BROW_INNER_UP_AUTHOR_CONTRACT_V1,
  EYE_BLINK_LEFT_AUTHOR_CONTRACT_V1,
  EYE_BLINK_RIGHT_AUTHOR_CONTRACT_V1,
  FACE_FUNCTIONAL_MORPH_AUTHOR_CONTRACT_VERSION,
  FACE_FUNCTIONAL_MORPH_AUTHOR_PROFILE_VERSION,
  FUNCTIONAL_MORPH_AUTHOR_SUPPORTED_CHANNELS_V1,
  JAW_OPEN_AUTHOR_CONTRACT_V1,
} from './liveact-face-functional-morph-profile-v1.mjs';
import {
  buildFaceLocalFrame,
  computeFaceAssetSha256Hex,
  computeFaceAssetTopologyFingerprint,
  evaluateReviewedGroundTruthGate,
  resolveFaceAnchorPositionsPosed,
  computeFunctionalMetricsFromAnchors,
} from './liveact-face-functional-validate.mjs';
/**
 * @param {import('@gltf-transform/core').Primitive} prim
 * @param {import('@gltf-transform/core').Mesh} mesh
 * @param {string} morphName
 */
export function findNamedMorphTargetIndex(prim, mesh, morphName) {
  const primExtras = prim.getExtras() || {};
  const meshExtras = mesh?.getExtras?.() || {};
  const names = Array.isArray(primExtras.targetNames)
    ? primExtras.targetNames.map(String)
    : Array.isArray(meshExtras.targetNames)
      ? meshExtras.targetNames.map(String)
      : [];
  const targets = prim.listTargets();
  for (let i = 0; i < targets.length; i += 1) {
    const name =
      typeof names[i] === 'string' && names[i].trim() ? String(names[i]).trim() : `target_${i}`;
    if (name === morphName) return i;
  }
  return -1;
}

/**
 * @param {Float32Array|import('@gltf-transform/core').TypedArray} arr
 */
export function hashMorphPositionArray(arr) {
  const buf = Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength);
  return createHash('sha256').update(buf).digest('hex');
}

/**
 * @param {import('@gltf-transform/core').Document} document
 * @returns {Map<string, string>}
 */
export function hashAllMorphPositionBuffers(document) {
  /** @type {Map<string, string>} */
  const out = new Map();
  for (const mesh of document.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const targets = prim.listTargets();
      const primExtras = prim.getExtras() || {};
      const meshExtras = mesh.getExtras() || {};
      const localNames = Array.isArray(primExtras.targetNames)
        ? primExtras.targetNames.map(String)
        : Array.isArray(meshExtras.targetNames)
          ? meshExtras.targetNames.map(String)
          : [];
      for (let i = 0; i < targets.length; i += 1) {
        const name =
          typeof localNames[i] === 'string' && localNames[i].trim()
            ? String(localNames[i]).trim()
            : `target_${i}`;
        const pos = targets[i].getAttribute('POSITION');
        if (!pos) continue;
        const arr = pos.getArray();
        if (!arr) continue;
        out.set(name, hashMorphPositionArray(arr));
      }
    }
  }
  return out;
}

/**
 * @param {{ x: number; y: number; z: number }} a
 * @param {{ x: number; y: number; z: number }} b
 */
function dist3(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

/**
 * Deterministic jawOpen falloff weight in [0,1].
 * @param {{ x: number; y: number; z: number }} p
 * @param {Record<string, { x: number; y: number; z: number }>} refs
 * @param {number} faceH
 * @param {typeof JAW_OPEN_AUTHOR_CONTRACT_V1} contract
 */
export function computeJawOpenVertexWeight(p, refs, faceH, contract = JAW_OPEN_AUTHOR_CONTRACT_V1) {
  const rMove = faceH * contract.moveRadiusFaceH;
  const wLower = Math.max(0, 1 - dist3(p, refs.mouthLower) / rMove) ** 1.15;
  const wChin = Math.max(0, 1 - dist3(p, refs.chin) / (rMove * 1.2)) ** 1.05;
  let w = Math.max(wLower, wChin);
  const midY = (refs.mouthUpper.y + refs.mouthLower.y) / 2;
  if (p.y < midY && Math.abs(p.x - refs.chin.x) < faceH * 0.38) {
    const band = Math.max(0, 1 - Math.abs(p.y - refs.mouthLower.y) / (faceH * 0.35));
    w = Math.max(w, 0.45 * band);
  }
  if (p.y > refs.mouthUpper.y + faceH * 0.02) w *= 0.05;
  if (dist3(p, refs.noseTip) < faceH * 0.12) w = 0;
  if (dist3(p, refs.forehead) < faceH * 0.25) w = 0;
  return Math.max(0, Math.min(1, w));
}

/**
 * @param {import('@gltf-transform/core').Document} document
 * @param {Record<string, unknown>} anchors
 * @param {typeof JAW_OPEN_AUTHOR_CONTRACT_V1} contract
 */
function rewriteJawOpenMorph(document, anchors, contract) {
  const sampleBinding = /** @type {Record<string, unknown>} */ (anchors.mouthUpper);
  const nodeIdentity = String(sampleBinding.nodeIdentity || '').trim();
  const node = findNodeByIdentity(document, nodeIdentity);
  const mesh = node?.getMesh();
  if (!mesh) {
    throw new Error(`jawOpen author: meshed node missing for ${nodeIdentity || '(empty)'}`);
  }
  const primIndex = typeof sampleBinding.primitiveIndex === 'number' ? sampleBinding.primitiveIndex : 0;
  const prim = mesh.listPrimitives()[primIndex];
  if (!prim) throw new Error(`jawOpen author: primitive ${primIndex} missing`);

  const morphIndex = findNamedMorphTargetIndex(prim, mesh, 'jawOpen');
  if (morphIndex < 0) throw new Error('jawOpen author: morph target jawOpen missing');
  const target = prim.listTargets()[morphIndex];
  const morphPos = target.getAttribute('POSITION');
  const basePos = prim.getAttribute('POSITION');
  if (!morphPos || !basePos) throw new Error('jawOpen author: POSITION accessors missing');

  const neutral = resolveFaceAnchorPositions(document, anchors);
  for (const id of contract.requiredAnchors) {
    if (!neutral[id]) throw new Error(`jawOpen author: required anchor unresolved: ${id}`);
  }
  const frame = buildFaceLocalFrame(neutral);
  if (!frame) throw new Error('jawOpen author: face local frame incomplete');

  const refs = {
    mouthUpper: neutral.mouthUpper,
    mouthLower: neutral.mouthLower,
    chin: neutral.chin,
    noseTip: neutral.noseTip,
    forehead: neutral.forehead,
  };

  const n = basePos.getCount();
  const arr = new Float32Array(n * 3); // full rewrite — discard ICT deltas
  const amp = frame.faceHeight * contract.ampFaceH;
  const down = { x: -frame.up.x, y: -frame.up.y, z: -frame.up.z };
  const back = {
    x: -frame.forward.x * contract.backBias,
    y: -frame.forward.y * contract.backBias,
    z: -frame.forward.z * contract.backBias,
  };

  let affected = 0;
  let maxW = 0;
  let sumW = 0;
  let maxDisp = 0;
  let sumDisp = 0;
  const el = [0, 0, 0];
  for (let i = 0; i < n; i += 1) {
    basePos.getElement(i, el);
    const p = { x: el[0], y: el[1], z: el[2] };
    const w = computeJawOpenVertexWeight(p, refs, frame.faceHeight, contract);
    if (w <= 1e-8) continue;
    affected += 1;
    maxW = Math.max(maxW, w);
    sumW += w;
    const dx = (down.x + back.x) * amp * w;
    const dy = (down.y + back.y) * amp * w;
    const dz = (down.z + back.z) * amp * w;
    arr[i * 3] = dx;
    arr[i * 3 + 1] = dy;
    arr[i * 3 + 2] = dz;
    const d = Math.hypot(dx, dy, dz);
    maxDisp = Math.max(maxDisp, d);
    sumDisp += d;
  }
  morphPos.setArray(arr);

  const posed = resolveFaceAnchorPositionsPosed(document, anchors, 'jawOpen', 1);
  const metricsN = computeFunctionalMetricsFromAnchors(neutral, frame);
  const metricsP = computeFunctionalMetricsFromAnchors(posed, frame);
  const gapDelta = (metricsP?.mouthGap ?? 0) - (metricsN?.mouthGap ?? 0);

  const disp = (id) => {
    const a = neutral[id];
    const b = posed[id];
    if (!a || !b) return null;
    return dist3(a, b);
  };

  return {
    morphIndex,
    nodeIdentity,
    primitiveIndex: primIndex,
    vertexCount: n,
    affectedVertices: affected,
    maxWeight: maxW,
    meanWeightAffected: affected ? sumW / affected : 0,
    maxDisplacement: maxDisp,
    meanDisplacementAffected: affected ? sumDisp / affected : 0,
    amp,
    faceHeight: frame.faceHeight,
    morphPositionSha256: hashMorphPositionArray(arr),
    mouthGapNeutral: metricsN?.mouthGap ?? null,
    mouthGapJawOpen1: metricsP?.mouthGap ?? null,
    mouthGapDelta: gapDelta,
    displacements: {
      mouthUpper: disp('mouthUpper'),
      mouthLower: disp('mouthLower'),
      chin: disp('chin'),
      noseTip: disp('noseTip'),
      forehead: disp('forehead'),
      mouthCornerLeft: disp('mouthCornerLeft'),
      mouthCornerRight: disp('mouthCornerRight'),
    },
  };
}

/**
 * Unilateral blink falloff in [0,1]. Highest near primary lids; opposite eye forced 0.
 * @param {{ x: number; y: number; z: number }} p
 * @param {Record<string, { x: number; y: number; z: number }>} refs
 * @param {ReturnType<typeof buildFaceLocalFrame>} frame
 * @param {typeof EYE_BLINK_LEFT_AUTHOR_CONTRACT_V1} contract
 */
export function computeEyeBlinkVertexWeight(p, refs, frame, contract) {
  if (!frame) return 0;
  const faceH = frame.faceHeight;
  const rMove = faceH * contract.moveRadiusFaceH;
  const wUpper = Math.max(0, 1 - dist3(p, refs.upper) / rMove) ** 1.2;
  const wLower = Math.max(0, 1 - dist3(p, refs.lower) / (rMove * 1.05)) ** 1.15;
  const wInner = Math.max(0, 1 - dist3(p, refs.inner) / (rMove * 1.15)) ** 1.1;
  const wOuter = Math.max(0, 1 - dist3(p, refs.outer) / (rMove * 1.15)) ** 1.1;
  let w = Math.max(wUpper, wLower, wInner * 0.85, wOuter * 0.85);

  // Side isolation via face midplane (left = +frame.left). Soft band near centerline.
  const mid = refs.noseTip;
  const sideDot =
    (p.x - mid.x) * frame.left.x + (p.y - mid.y) * frame.left.y + (p.z - mid.z) * frame.left.z;
  const soft = faceH * contract.midplaneSoftFaceH;
  if (contract.side === 'left') {
    if (sideDot < 0) return 0;
    if (sideDot < soft) w *= sideDot / soft;
  } else {
    if (sideDot > 0) return 0;
    if (sideDot > -soft) w *= -sideDot / soft;
  }

  // Opposite lid region hard kill
  const rKill = faceH * 0.12;
  if (dist3(p, refs.oppUpper) < rKill) return 0;
  if (dist3(p, refs.oppLower) < rKill) return 0;
  if (dist3(p, refs.oppInner) < rKill * 1.15) return 0;
  if (dist3(p, refs.oppOuter) < rKill * 1.15) return 0;

  // Mouth / chin stay out of blink
  if (refs.mouthUpper && dist3(p, refs.mouthUpper) < faceH * 0.12) w *= 0.05;
  if (refs.chin && dist3(p, refs.chin) < faceH * 0.18) w *= 0.02;

  return Math.max(0, Math.min(1, w));
}

/**
 * @param {import('@gltf-transform/core').Document} document
 * @param {Record<string, unknown>} anchors
 * @param {typeof EYE_BLINK_LEFT_AUTHOR_CONTRACT_V1} contract
 */
function rewriteEyeBlinkMorph(document, anchors, contract) {
  const sampleBinding = /** @type {Record<string, unknown>} */ (anchors[contract.upperAnchor]);
  const nodeIdentity = String(sampleBinding?.nodeIdentity || '').trim();
  const node = findNodeByIdentity(document, nodeIdentity);
  const mesh = node?.getMesh();
  if (!mesh) {
    throw new Error(`${contract.morphName} author: meshed node missing for ${nodeIdentity || '(empty)'}`);
  }
  const primIndex = typeof sampleBinding.primitiveIndex === 'number' ? sampleBinding.primitiveIndex : 0;
  const prim = mesh.listPrimitives()[primIndex];
  if (!prim) throw new Error(`${contract.morphName} author: primitive ${primIndex} missing`);

  const morphIndex = findNamedMorphTargetIndex(prim, mesh, contract.morphName);
  if (morphIndex < 0) throw new Error(`${contract.morphName} author: morph target missing`);
  const target = prim.listTargets()[morphIndex];
  const morphPos = target.getAttribute('POSITION');
  const basePos = prim.getAttribute('POSITION');
  if (!morphPos || !basePos) throw new Error(`${contract.morphName} author: POSITION accessors missing`);

  const neutral = resolveFaceAnchorPositions(document, anchors);
  for (const id of contract.requiredAnchors) {
    if (!neutral[id]) throw new Error(`${contract.morphName} author: required anchor unresolved: ${id}`);
  }
  const frame = buildFaceLocalFrame(neutral);
  if (!frame) throw new Error(`${contract.morphName} author: face local frame incomplete`);

  const upper = neutral[contract.upperAnchor];
  const lower = neutral[contract.lowerAnchor];
  const refs = {
    upper,
    lower,
    inner: neutral[contract.innerAnchor],
    outer: neutral[contract.outerAnchor],
    oppUpper: neutral[contract.oppositeUpper],
    oppLower: neutral[contract.oppositeLower],
    oppInner: neutral[contract.oppositeInner],
    oppOuter: neutral[contract.oppositeOuter],
    noseTip: neutral.noseTip,
    forehead: neutral.forehead,
    mouthUpper: neutral.mouthUpper,
    chin: neutral.chin,
  };

  const aperture = dist3(upper, lower);
  if (!(aperture > 1e-8)) throw new Error(`${contract.morphName} author: zero lid aperture`);
  const closeLen = Math.hypot(lower.x - upper.x, lower.y - upper.y, lower.z - upper.z);
  const closeDir = {
    x: (lower.x - upper.x) / closeLen,
    y: (lower.y - upper.y) / closeLen,
    z: (lower.z - upper.z) / closeLen,
  };
  const ampUpper = aperture * contract.upperCloseFraction;
  const ampLower = aperture * contract.lowerCloseFraction;

  const n = basePos.getCount();
  const arr = new Float32Array(n * 3); // full rewrite — discard ICT deltas
  let affected = 0;
  let maxW = 0;
  let sumW = 0;
  let maxDisp = 0;
  let sumDisp = 0;
  const el = [0, 0, 0];
  for (let i = 0; i < n; i += 1) {
    basePos.getElement(i, el);
    const p = { x: el[0], y: el[1], z: el[2] };
    const w = computeEyeBlinkVertexWeight(p, refs, frame, contract);
    if (w <= 1e-8) continue;
    affected += 1;
    maxW = Math.max(maxW, w);
    sumW += w;

    // Blend upper-closure vs lower-closure by proximity (deterministic).
    const dU = dist3(p, upper);
    const dL = dist3(p, lower);
    const upperBias = dL + 1e-8;
    const lowerBias = dU + 1e-8;
    const sumBias = upperBias + lowerBias;
    const kUpper = upperBias / sumBias;
    const kLower = lowerBias / sumBias;

    const dx =
      closeDir.x * ampUpper * w * kUpper + -closeDir.x * ampLower * w * kLower;
    const dy =
      closeDir.y * ampUpper * w * kUpper + -closeDir.y * ampLower * w * kLower;
    const dz =
      closeDir.z * ampUpper * w * kUpper + -closeDir.z * ampLower * w * kLower;
    arr[i * 3] = dx;
    arr[i * 3 + 1] = dy;
    arr[i * 3 + 2] = dz;
    const d = Math.hypot(dx, dy, dz);
    maxDisp = Math.max(maxDisp, d);
    sumDisp += d;
  }
  morphPos.setArray(arr);

  const posed = resolveFaceAnchorPositionsPosed(document, anchors, contract.morphName, 1);
  const metricsN = computeFunctionalMetricsFromAnchors(neutral, frame);
  const metricsP = computeFunctionalMetricsFromAnchors(posed, frame);
  const primaryN = contract.side === 'left' ? metricsN?.eyeOpenL : metricsN?.eyeOpenR;
  const primaryP = contract.side === 'left' ? metricsP?.eyeOpenL : metricsP?.eyeOpenR;
  const oppN = contract.side === 'left' ? metricsN?.eyeOpenR : metricsN?.eyeOpenL;
  const oppP = contract.side === 'left' ? metricsP?.eyeOpenR : metricsP?.eyeOpenL;
  const openDrop = (primaryN ?? 0) - (primaryP ?? 0);
  const openRatio =
    primaryN != null && primaryN > 1e-8 && primaryP != null ? primaryP / primaryN : null;
  const oppositeRelChange =
    oppN != null && oppN > 1e-8 && oppP != null ? Math.abs(oppP - oppN) / Math.max(oppN, 1e-8) : null;

  const disp = (id) => {
    const a = neutral[id];
    const b = posed[id];
    if (!a || !b) return null;
    return dist3(a, b);
  };

  return {
    morphIndex,
    nodeIdentity,
    primitiveIndex: primIndex,
    vertexCount: n,
    affectedVertices: affected,
    maxWeight: maxW,
    meanWeightAffected: affected ? sumW / affected : 0,
    maxDisplacement: maxDisp,
    meanDisplacementAffected: affected ? sumDisp / affected : 0,
    ampUpper,
    ampLower,
    aperture,
    faceHeight: frame.faceHeight,
    morphPositionSha256: hashMorphPositionArray(arr),
    eyeOpenNeutral: primaryN ?? null,
    eyeOpenPosed: primaryP ?? null,
    openDrop,
    openRatio,
    oppositeRelChange,
    displacements: {
      [contract.upperAnchor]: disp(contract.upperAnchor),
      [contract.lowerAnchor]: disp(contract.lowerAnchor),
      [contract.oppositeUpper]: disp(contract.oppositeUpper),
      [contract.oppositeLower]: disp(contract.oppositeLower),
      noseTip: disp('noseTip'),
      forehead: disp('forehead'),
    },
  };
}

/**
 * Bilateral browInnerUp falloff in [0,1]. Strongest near inner brows; lids/nose/mouth protected.
 * @param {{ x: number; y: number; z: number }} p
 * @param {Record<string, { x: number; y: number; z: number }>} refs
 * @param {ReturnType<typeof buildFaceLocalFrame>} frame
 * @param {typeof BROW_INNER_UP_AUTHOR_CONTRACT_V1} contract
 */
export function computeBrowInnerUpVertexWeight(p, refs, frame, contract) {
  if (!frame) return 0;
  const faceH = frame.faceHeight;
  const r = faceH * contract.moveRadiusFaceH;
  const wLI = Math.max(0, 1 - dist3(p, refs.browLeftInner) / r) ** 1.15;
  const wRI = Math.max(0, 1 - dist3(p, refs.browRightInner) / r) ** 1.15;
  const wLC = Math.max(0, 1 - dist3(p, refs.browLeftCenter) / (r * 1.1)) ** 1.1 * 0.7;
  const wRC = Math.max(0, 1 - dist3(p, refs.browRightCenter) / (r * 1.1)) ** 1.1 * 0.7;
  const wLO =
    Math.max(0, 1 - dist3(p, refs.browLeftOuter) / (r * 1.2)) ** 1.05 * contract.outerFalloffScale;
  const wRO =
    Math.max(0, 1 - dist3(p, refs.browRightOuter) / (r * 1.2)) ** 1.05 * contract.outerFalloffScale;
  let w = Math.max(wLI, wRI, wLC, wRC, wLO, wRO);

  // Protect lids / eye aperture — but never suppress verts closer to an inner brow.
  const dBrow = Math.min(dist3(p, refs.browLeftInner), dist3(p, refs.browRightInner));
  const rEye = faceH * 0.065;
  let dEye = Infinity;
  for (const id of [
    'eyeLeftUpper',
    'eyeLeftLower',
    'eyeRightUpper',
    'eyeRightLower',
    'eyeLeftInner',
    'eyeRightInner',
    'eyeLeftOuter',
    'eyeRightOuter',
  ]) {
    if (refs[id]) dEye = Math.min(dEye, dist3(p, refs[id]));
  }
  if (dEye < rEye && dEye + faceH * 0.01 < dBrow) w *= 0.06;

  // Nose / mouth / chin hard protect
  if (dist3(p, refs.noseTip) < faceH * 0.11) return 0;
  if (refs.mouthUpper && dist3(p, refs.mouthUpper) < faceH * 0.16) return 0;
  if (refs.chin && dist3(p, refs.chin) < faceH * 0.22) return 0;

  // Do not lift the entire upper forehead crown — require proximity to brow band
  const browMidY = (refs.browLeftInner.y + refs.browRightInner.y) / 2;
  if (p.y > browMidY + faceH * 0.12) w *= 0.15;
  if (p.y < browMidY - faceH * 0.08) w *= 0.05;

  return Math.max(0, Math.min(1, w));
}

/**
 * @param {import('@gltf-transform/core').Document} document
 * @param {Record<string, unknown>} anchors
 * @param {typeof BROW_INNER_UP_AUTHOR_CONTRACT_V1} contract
 */
function rewriteBrowInnerUpMorph(document, anchors, contract) {
  const neutral = resolveFaceAnchorPositions(document, anchors);
  for (const id of contract.requiredAnchors) {
    if (!neutral[id]) throw new Error(`browInnerUp author: required anchor unresolved: ${id}`);
  }

  const sampleBinding = /** @type {Record<string, unknown>} */ (anchors.browLeftInner);
  const nodeIdentity = String(sampleBinding?.nodeIdentity || '').trim();
  const node = findNodeByIdentity(document, nodeIdentity);
  const mesh = node?.getMesh();
  if (!mesh) {
    throw new Error(`browInnerUp author: meshed node missing for ${nodeIdentity || '(empty)'}`);
  }
  const primIndex = typeof sampleBinding.primitiveIndex === 'number' ? sampleBinding.primitiveIndex : 0;
  const prim = mesh.listPrimitives()[primIndex];
  if (!prim) throw new Error(`browInnerUp author: primitive ${primIndex} missing`);

  const morphIndex = findNamedMorphTargetIndex(prim, mesh, 'browInnerUp');
  if (morphIndex < 0) throw new Error('browInnerUp author: morph target missing');
  const target = prim.listTargets()[morphIndex];
  const morphPos = target.getAttribute('POSITION');
  const basePos = prim.getAttribute('POSITION');
  if (!morphPos || !basePos) throw new Error('browInnerUp author: POSITION accessors missing');

  const frame = buildFaceLocalFrame(neutral);
  if (!frame) throw new Error('browInnerUp author: face local frame incomplete');

  const refs = {
    browLeftInner: neutral.browLeftInner,
    browRightInner: neutral.browRightInner,
    browLeftCenter: neutral.browLeftCenter,
    browRightCenter: neutral.browRightCenter,
    browLeftOuter: neutral.browLeftOuter,
    browRightOuter: neutral.browRightOuter,
    eyeLeftInner: neutral.eyeLeftInner,
    eyeRightInner: neutral.eyeRightInner,
    eyeLeftUpper: neutral.eyeLeftUpper,
    eyeRightUpper: neutral.eyeRightUpper,
    eyeLeftLower: neutral.eyeLeftLower,
    eyeRightLower: neutral.eyeRightLower,
    eyeLeftOuter: neutral.eyeLeftOuter,
    eyeRightOuter: neutral.eyeRightOuter,
    noseTip: neutral.noseTip,
    forehead: neutral.forehead,
    mouthUpper: neutral.mouthUpper,
    chin: neutral.chin,
  };

  const eyeWMean = (frame.eyeWidthL0 + frame.eyeWidthR0) / 2;
  const amp = eyeWMean * contract.ampEyeW;
  const up = frame.up;

  const n = basePos.getCount();
  const arr = new Float32Array(n * 3);
  let affected = 0;
  let maxW = 0;
  let sumW = 0;
  let maxDisp = 0;
  let sumDisp = 0;
  const el = [0, 0, 0];
  for (let i = 0; i < n; i += 1) {
    basePos.getElement(i, el);
    const p = { x: el[0], y: el[1], z: el[2] };
    const w = computeBrowInnerUpVertexWeight(p, refs, frame, contract);
    if (w <= 1e-8) continue;
    affected += 1;
    maxW = Math.max(maxW, w);
    sumW += w;
    const dx = up.x * amp * w;
    const dy = up.y * amp * w;
    const dz = up.z * amp * w;
    arr[i * 3] = dx;
    arr[i * 3 + 1] = dy;
    arr[i * 3 + 2] = dz;
    const d = Math.hypot(dx, dy, dz);
    maxDisp = Math.max(maxDisp, d);
    sumDisp += d;
  }
  morphPos.setArray(arr);

  const posed = resolveFaceAnchorPositionsPosed(document, anchors, 'browInnerUp', 1);
  const metricsN = computeFunctionalMetricsFromAnchors(neutral, frame);
  const metricsP = computeFunctionalMetricsFromAnchors(posed, frame);
  const dL = (metricsP?.browInnerLiftL ?? 0) - (metricsN?.browInnerLiftL ?? 0);
  const dR = (metricsP?.browInnerLiftR ?? 0) - (metricsN?.browInnerLiftR ?? 0);
  const meanLiftDelta = (dL + dR) / 2;

  const disp = (id) => {
    const a = neutral[id];
    const b = posed[id];
    if (!a || !b) return null;
    return dist3(a, b);
  };
  const liftAlongUp = (id) => {
    const a = neutral[id];
    const b = posed[id];
    if (!a || !b) return null;
    return (b.x - a.x) * up.x + (b.y - a.y) * up.y + (b.z - a.z) * up.z;
  };

  return {
    morphIndex,
    nodeIdentity,
    primitiveIndex: primIndex,
    vertexCount: n,
    affectedVertices: affected,
    maxWeight: maxW,
    meanWeightAffected: affected ? sumW / affected : 0,
    maxDisplacement: maxDisp,
    meanDisplacementAffected: affected ? sumDisp / affected : 0,
    amp,
    eyeWidthMean: eyeWMean,
    faceHeight: frame.faceHeight,
    morphPositionSha256: hashMorphPositionArray(arr),
    browInnerLiftLDelta: dL,
    browInnerLiftRDelta: dR,
    meanLiftDelta,
    asymmetry: Math.abs(dL - dR),
    displacements: {
      browLeftInner: disp('browLeftInner'),
      browRightInner: disp('browRightInner'),
      browLeftOuter: disp('browLeftOuter'),
      browRightOuter: disp('browRightOuter'),
      eyeLeftUpper: disp('eyeLeftUpper'),
      eyeRightUpper: disp('eyeRightUpper'),
      eyeLeftLower: disp('eyeLeftLower'),
      eyeRightLower: disp('eyeRightLower'),
      noseTip: disp('noseTip'),
      forehead: disp('forehead'),
      mouthUpper: disp('mouthUpper'),
      chin: disp('chin'),
    },
    liftsAlongUp: {
      browLeftInner: liftAlongUp('browLeftInner'),
      browRightInner: liftAlongUp('browRightInner'),
    },
  };
}

/**
 * @param {string} channel
 * @param {import('@gltf-transform/core').Document} document
 * @param {Record<string, unknown>} anchors
 */
function rewriteChannelMorph(channel, document, anchors) {
  if (channel === 'jawOpen') {
    return rewriteJawOpenMorph(document, anchors, JAW_OPEN_AUTHOR_CONTRACT_V1);
  }
  if (channel === 'eyeBlinkLeft') {
    return rewriteEyeBlinkMorph(document, anchors, EYE_BLINK_LEFT_AUTHOR_CONTRACT_V1);
  }
  if (channel === 'eyeBlinkRight') {
    return rewriteEyeBlinkMorph(document, anchors, EYE_BLINK_RIGHT_AUTHOR_CONTRACT_V1);
  }
  if (channel === 'browInnerUp') {
    return rewriteBrowInnerUpMorph(document, anchors, BROW_INNER_UP_AUTHOR_CONTRACT_V1);
  }
  throw new Error(`unsupported_channel:${channel}`);
}

/**
 * @param {{
 *   inputPath: string;
 *   outputPath: string;
 *   anchorsPath: string;
 *   authoringPath: string;
 *   channel: string;
 *   root?: string;
 *   reportPath?: string;
 * }} opts
 */
export async function authorLiveActFunctionalMorph(opts) {
  const root = opts.root || process.cwd();
  const inputPath = resolve(root, opts.inputPath);
  const outputPath = resolve(root, opts.outputPath);
  const anchorsPath = resolve(root, opts.anchorsPath);
  const authoringPath = resolve(root, opts.authoringPath);
  const channel = String(opts.channel || '').trim();

  if (!FUNCTIONAL_MORPH_AUTHOR_SUPPORTED_CHANNELS_V1.includes(channel)) {
    throw new Error(`unsupported_channel:${channel || '(empty)'}`);
  }
  if (!existsSync(inputPath)) throw new Error(`input missing: ${inputPath}`);
  if (!existsSync(anchorsPath)) throw new Error(`anchors missing: ${anchorsPath}`);
  if (!existsSync(authoringPath)) throw new Error(`authoring missing: ${authoringPath}`);

  const inputBytes = readFileSync(inputPath);
  const anchorsBytes = readFileSync(anchorsPath);
  const authoring = JSON.parse(readFileSync(authoringPath, 'utf8'));
  const anchorsEnvelope = parseManifestEnvelope(JSON.parse(anchorsBytes.toString('utf8')));
  if (!anchorsEnvelope.ok) {
    throw new Error(`anchors_manifest_invalid:${anchorsEnvelope.errors.join(',')}`);
  }

  const io = new NodeIO();
  const document = await io.readBinary(inputBytes);
  const topologyFingerprint = computeFaceAssetTopologyFingerprint(document);
  const inputSha256 = computeFaceAssetSha256Hex(inputBytes);

  // isReviewedFaceMappingGroundTruth (via gate) already verifies agent_reviewed ledgers.
  const gt = evaluateReviewedGroundTruthGate({
    authoring,
    inputPath: opts.inputPath,
    inputBytes,
    anchorsBytes,
    document,
  });
  if (!gt.ok) {
    throw new Error(`ground_truth_rejected:${gt.reason}:${(gt.violations || []).join(',')}`);
  }

  const anchorValidate = validateFaceAnchorsAgainstDocument(document, anchorsEnvelope.anchors);
  if (!anchorValidate.ok) {
    throw new Error(`anchors_binding_invalid:${anchorValidate.errors.join(',')}`);
  }

  const beforeHashes = hashAllMorphPositionBuffers(document);
  const beforeJaw = beforeHashes.get('jawOpen') || null;
  const beforeChannel = beforeHashes.get(channel) || null;

  const anchorsRecord = /** @type {Record<string, unknown>} */ (anchorsEnvelope.anchors);
  const channelStats = rewriteChannelMorph(channel, document, anchorsRecord);

  const afterHashes = hashAllMorphPositionBuffers(document);
  /** @type {string[]} */
  const changedMorphs = [];
  for (const [name, sha] of afterHashes) {
    if (beforeHashes.get(name) !== sha) changedMorphs.push(name);
  }
  for (const name of beforeHashes.keys()) {
    if (!afterHashes.has(name)) changedMorphs.push(name);
  }
  const uniqueChanged = [...new Set(changedMorphs)].sort();
  if (uniqueChanged.length !== 1 || uniqueChanged[0] !== channel) {
    throw new Error(`morph_regression_unexpected_changes:${uniqueChanged.join(',')}`);
  }

  mkdirSync(dirname(outputPath), { recursive: true });
  const outBytes = Buffer.from(await io.writeBinary(document));
  writeFileSync(outputPath, outBytes);
  const outputSha256 = computeFaceAssetSha256Hex(outBytes);

  // Determinism: re-author from the same input in-memory once more and compare morph hash.
  const doc2 = await io.readBinary(inputBytes);
  const stats2 = rewriteChannelMorph(channel, doc2, anchorsRecord);
  if (stats2.morphPositionSha256 !== channelStats.morphPositionSha256) {
    throw new Error(`${channel}_author_nondeterministic_morph_hash`);
  }

  const afterJaw = afterHashes.get('jawOpen') || null;
  const report = {
    contractVersion: FACE_FUNCTIONAL_MORPH_AUTHOR_CONTRACT_VERSION,
    profileVersion: FACE_FUNCTIONAL_MORPH_AUTHOR_PROFILE_VERSION,
    channel,
    inputPath: opts.inputPath,
    outputPath: opts.outputPath,
    anchorsPath: opts.anchorsPath,
    authoringPath: opts.authoringPath,
    inputSha256,
    outputSha256,
    topologyFingerprint,
    anchorsSha256: computeFaceAssetSha256Hex(anchorsBytes),
    groundTruth: {
      ok: true,
      reason: gt.reason || null,
      reviewStatus: authoring.reviewStatus || null,
    },
    beforeChannelMorphSha256: beforeChannel,
    afterChannelMorphSha256: channelStats.morphPositionSha256,
    // Preserve Milestone-1 report keys for jawOpen callers / regression tooling.
    beforeJawOpenMorphSha256: beforeJaw,
    afterJawOpenMorphSha256: channel === 'jawOpen' ? channelStats.morphPositionSha256 : afterJaw,
    jawOpenMorphUnchanged: channel === 'jawOpen' ? false : beforeJaw === afterJaw,
    deterministicRerunMorphSha256: stats2.morphPositionSha256,
    morphsUnchangedExceptChannel: true,
    morphCount: afterHashes.size,
    changedMorphs: uniqueChanged,
    channelStats,
    authoredAt: new Date().toISOString(),
  };

  if (opts.reportPath) {
    const reportAbs = resolve(root, opts.reportPath);
    mkdirSync(dirname(reportAbs), { recursive: true });
    writeFileSync(reportAbs, `${JSON.stringify(report, null, 2)}\n`);
  }

  return report;
}

/**
 * @param {string[]} argv
 */
export function parseFunctionalMorphAuthorArgs(argv) {
  /** @type {Record<string, string>} */
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (
      a === '--input' ||
      a === '--output' ||
      a === '--anchors' ||
      a === '--authoring' ||
      a === '--channel' ||
      a === '--report'
    ) {
      const v = argv[++i];
      if (!v || v.startsWith('--')) throw new Error(`missing value for ${a}`);
      out[a.slice(2)] = v;
      continue;
    }
    if (a === '--help' || a === '-h') {
      out.help = '1';
      continue;
    }
    throw new Error(`unknown arg: ${a}`);
  }
  if (out.help) return /** @type {any} */ (out);
  if (!out.input || !out.output || !out.anchors || !out.authoring || !out.channel) {
    throw new Error('required: --input --output --anchors --authoring --channel');
  }
  return /** @type {any} */ (out);
}
