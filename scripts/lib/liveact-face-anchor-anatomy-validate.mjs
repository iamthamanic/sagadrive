/**
 * liveact-face-anchor-anatomy-validate — independent face-anchor anatomy QA.
 * Location: scripts/lib/liveact-face-anchor-anatomy-validate.mjs
 *
 * Must run BEFORE Semantic Morph QA. Does NOT use morph deltas.
 */

import { readFileSync } from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import { parseManifestEnvelope, validateFaceAnchorsAgainstDocument } from './liveact-face-anchor-validate.mjs';
import { findNodeByIdentity } from './liveact-face-anchor-glb.mjs';
import {
  FACE_ANCHOR_ANATOMY_QA_CONTRACT_VERSION,
  FACE_ANCHOR_ANATOMY_PROFILE_VERSION,
  FACE_ANCHOR_ANATOMY_THRESHOLDS_V1 as T,
} from './liveact-face-anchor-anatomy-profile-v1.mjs';

const REQUIRED = [
  'forehead',
  'browLeftInner',
  'browLeftCenter',
  'browLeftOuter',
  'browRightInner',
  'browRightCenter',
  'browRightOuter',
  'eyeLeftInner',
  'eyeLeftOuter',
  'eyeLeftUpper',
  'eyeLeftLower',
  'eyeRightInner',
  'eyeRightOuter',
  'eyeRightUpper',
  'eyeRightLower',
  'noseTip',
  'mouthUpper',
  'mouthLower',
  'mouthCornerLeft',
  'mouthCornerRight',
  'chin',
];

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function mid(a, b) {
  return { x: (a.x + b.x) * 0.5, y: (a.y + b.y) * 0.5, z: (a.z + b.z) * 0.5 };
}

/**
 * Resolve world/local positions from triangle bindings (rest pose, model space).
 * @param {import('@gltf-transform/core').Document} document
 * @param {Record<string, unknown>} anchors
 */
export function resolveFaceAnchorPositions(document, anchors) {
  /** @type {Partial<Record<string, { x: number; y: number; z: number }>>} */
  const out = {};
  for (const [id, bindingRaw] of Object.entries(anchors)) {
    if (!bindingRaw || typeof bindingRaw !== 'object') continue;
    const binding = /** @type {Record<string, unknown>} */ (bindingRaw);
    const nodeIdentity = typeof binding.nodeIdentity === 'string' ? binding.nodeIdentity.trim() : '';
    const node = findNodeByIdentity(document, nodeIdentity);
    const mesh = node?.getMesh();
    if (!mesh) continue;
    const primIndex = typeof binding.primitiveIndex === 'number' ? binding.primitiveIndex : 0;
    const prim = mesh.listPrimitives()[primIndex];
    if (!prim) continue;
    const pos = prim.getAttribute('POSITION');
    const idx = prim.getIndices();
    if (!pos || !idx) continue;
    const tri = typeof binding.triangleIndex === 'number' ? binding.triangleIndex : -1;
    if (tri < 0) continue;
    const base = tri * 3;
    if (base + 2 >= idx.getCount()) continue;
    const i0 = idx.getScalar(base);
    const i1 = idx.getScalar(base + 1);
    const i2 = idx.getScalar(base + 2);
    const a = pos.getElement(i0, []);
    const b = pos.getElement(i1, []);
    const c = pos.getElement(i2, []);
    const bary = /** @type {{ u?: number; v?: number; w?: number }} */ (binding.barycentric || {});
    const u = Number(bary.u);
    const v = Number(bary.v);
    const w = Number(bary.w);
    if (![u, v, w].every(Number.isFinite)) continue;
    out[id] = {
      x: a[0] * u + b[0] * v + c[0] * w,
      y: a[1] * u + b[1] * v + c[1] * w,
      z: a[2] * u + b[2] * v + c[2] * w,
    };
  }
  return out;
}

/**
 * @param {Partial<Record<string, { x: number; y: number; z: number }>>} P
 */
export function evaluateFaceAnchorAnatomy(P) {
  /** @type {string[]} */
  const violations = [];
  /** @type {Record<string, unknown>} */
  const checks = {};

  for (const id of REQUIRED) {
    if (!P[id]) {
      violations.push(`missing_anchor:${id}`);
    }
  }
  if (violations.length) {
    return {
      contractVersion: FACE_ANCHOR_ANATOMY_QA_CONTRACT_VERSION,
      profileVersion: FACE_ANCHOR_ANATOMY_PROFILE_VERSION,
      pass: false,
      violations,
      checks,
      metrics: null,
    };
  }

  const faceH = Math.max(1e-6, P.forehead.y - P.chin.y);
  const faceW = Math.max(1e-6, Math.abs(P.eyeLeftOuter.x - P.eyeRightOuter.x));
  const midX = P.noseTip.x;

  const yGap = (hi, lo, minFrac, code) => {
    const gap = (P[hi].y - P[lo].y) / faceH;
    checks[code] = { gap: +gap.toFixed(4), min: minFrac };
    if (!(gap >= minFrac)) violations.push(code);
  };

  yGap('forehead', 'browLeftCenter', T.minForeheadAboveBrow, 'vertical_forehead_above_browL');
  yGap('forehead', 'browRightCenter', T.minForeheadAboveBrow, 'vertical_forehead_above_browR');
  yGap('browLeftCenter', 'eyeLeftUpper', T.minBrowAboveEyeUpper, 'vertical_browL_above_eyeUpperL');
  yGap('browRightCenter', 'eyeRightUpper', T.minBrowAboveEyeUpper, 'vertical_browR_above_eyeUpperR');
  {
    const gapL = (P.eyeLeftUpper.y - P.eyeLeftLower.y) / faceH;
    const gapR = (P.eyeRightUpper.y - P.eyeRightLower.y) / faceH;
    checks.vertical_eyeL_aperture = { gap: +gapL.toFixed(4), min: T.minEyeApertureY };
    checks.vertical_eyeR_aperture = { gap: +gapR.toFixed(4), min: T.minEyeApertureY };
    if (!(gapL >= T.minEyeApertureY)) violations.push('vertical_eyeL_aperture');
    if (!(gapR >= T.minEyeApertureY)) violations.push('vertical_eyeR_aperture');
  }
  yGap('noseTip', 'mouthUpper', T.minNoseAboveMouth, 'vertical_nose_above_mouth');
  {
    const gap = (P.mouthUpper.y - P.mouthLower.y) / faceH;
    checks.vertical_mouth_aperture = { gap: +gap.toFixed(4), min: T.minMouthApertureY };
    if (!(gap >= T.minMouthApertureY)) violations.push('vertical_mouth_aperture');
  }
  yGap('mouthLower', 'chin', T.minMouthAboveChin, 'vertical_mouth_above_chin');

  // Left/right ordering (character: +X = left)
  if (!(P.eyeLeftOuter.x > P.eyeLeftInner.x)) violations.push('lr_eyeL_outer_lateral');
  if (!(P.eyeRightOuter.x < P.eyeRightInner.x)) violations.push('lr_eyeR_outer_lateral');
  if (!(P.mouthCornerLeft.x > midX && P.mouthCornerRight.x < midX)) {
    violations.push('lr_mouth_corners_sides');
  }
  if (!(P.browLeftCenter.x > midX && P.browRightCenter.x < midX)) {
    violations.push('lr_brow_centers_sides');
  }
  if (!(P.eyeLeftOuter.x > midX && P.eyeRightOuter.x < midX)) {
    violations.push('lr_eye_outers_sides');
  }

  const eyeUpperForeheadL = dist(P.eyeLeftUpper, P.forehead) / faceH;
  const eyeUpperForeheadR = dist(P.eyeRightUpper, P.forehead) / faceH;
  checks.eyeUpper_near_forehead = {
    left: +eyeUpperForeheadL.toFixed(4),
    right: +eyeUpperForeheadR.toFixed(4),
    max: T.maxEyeUpperNearForehead,
  };
  if (eyeUpperForeheadL < T.maxEyeUpperNearForehead) violations.push('eyeLeftUpper_near_forehead');
  if (eyeUpperForeheadR < T.maxEyeUpperNearForehead) violations.push('eyeRightUpper_near_forehead');

  const browInnerSep = dist(P.browLeftInner, P.browRightInner) / faceW;
  checks.brow_inner_separation = { value: +browInnerSep.toFixed(4), min: T.minBrowInnerSeparation };
  if (!(browInnerSep >= T.minBrowInnerSeparation)) violations.push('brow_inners_collapsed');

  const browLLat = Math.abs(P.browLeftCenter.x - midX) / faceW;
  const browRLat = Math.abs(P.browRightCenter.x - midX) / faceW;
  checks.brow_center_lateral = {
    left: +browLLat.toFixed(4),
    right: +browRLat.toFixed(4),
    min: T.minBrowCenterLateral,
  };
  if (!(browLLat >= T.minBrowCenterLateral)) violations.push('browLeftCenter_near_midline');
  if (!(browRLat >= T.minBrowCenterLateral)) violations.push('browRightCenter_near_midline');

  // Eye upper/lower between inner/outer in X
  const betweenX = (p, a, b) => {
    const lo = Math.min(a.x, b.x);
    const hi = Math.max(a.x, b.x);
    return p.x >= lo - faceW * 0.02 && p.x <= hi + faceW * 0.02;
  };
  if (!betweenX(P.eyeLeftUpper, P.eyeLeftInner, P.eyeLeftOuter)) violations.push('eyeL_upper_not_between_corners');
  if (!betweenX(P.eyeLeftLower, P.eyeLeftInner, P.eyeLeftOuter)) violations.push('eyeL_lower_not_between_corners');
  if (!betweenX(P.eyeRightUpper, P.eyeRightInner, P.eyeRightOuter)) violations.push('eyeR_upper_not_between_corners');
  if (!betweenX(P.eyeRightLower, P.eyeRightInner, P.eyeRightOuter)) violations.push('eyeR_lower_not_between_corners');

  const eyeOpenL = dist(P.eyeLeftUpper, P.eyeLeftLower) / Math.max(1e-8, dist(P.eyeLeftInner, P.eyeLeftOuter));
  const eyeOpenR = dist(P.eyeRightUpper, P.eyeRightLower) / Math.max(1e-8, dist(P.eyeRightInner, P.eyeRightOuter));
  const browLiftL =
    dist(P.browLeftCenter, mid(P.eyeLeftInner, P.eyeLeftOuter)) /
    Math.max(1e-8, dist(P.eyeLeftInner, P.eyeLeftOuter));
  const browLiftR =
    dist(P.browRightCenter, mid(P.eyeRightInner, P.eyeRightOuter)) /
    Math.max(1e-8, dist(P.eyeRightInner, P.eyeRightOuter));
  const mouthGap =
    dist(P.mouthUpper, P.mouthLower) /
    Math.max(1e-8, dist(P.mouthCornerLeft, P.mouthCornerRight));

  const metrics = {
    faceH: +faceH.toFixed(5),
    faceW: +faceW.toFixed(5),
    mouthGap: +mouthGap.toFixed(4),
    eyeOpenL: +eyeOpenL.toFixed(4),
    eyeOpenR: +eyeOpenR.toFixed(4),
    browLiftL: +browLiftL.toFixed(4),
    browLiftR: +browLiftR.toFixed(4),
    eyeSymRel: +(Math.abs(eyeOpenL - eyeOpenR) / Math.max(eyeOpenL, eyeOpenR, 1e-8)).toFixed(4),
    browSymRel: +(Math.abs(browLiftL - browLiftR) / Math.max(browLiftL, browLiftR, 1e-8)).toFixed(4),
  };

  if (!(eyeOpenL >= T.eyeOpenMin && eyeOpenL <= T.eyeOpenMax)) violations.push('eyeOpenL_out_of_band');
  if (!(eyeOpenR >= T.eyeOpenMin && eyeOpenR <= T.eyeOpenMax)) violations.push('eyeOpenR_out_of_band');
  if (!(browLiftL >= T.browLiftMin && browLiftL <= T.browLiftMax)) violations.push('browLiftL_out_of_band');
  if (!(browLiftR >= T.browLiftMin && browLiftR <= T.browLiftMax)) violations.push('browLiftR_out_of_band');
  if (!(mouthGap >= T.mouthGapMin && mouthGap <= T.mouthGapMax)) violations.push('mouthGap_out_of_band');
  if (metrics.eyeSymRel > T.maxEyeOpenSymRel) violations.push('eyeOpen_asymmetry');
  if (metrics.browSymRel > T.maxBrowLiftSymRel) violations.push('browLift_asymmetry');

  const mouthMid = mid(P.mouthUpper, P.mouthLower);
  const cornerMid = mid(P.mouthCornerLeft, P.mouthCornerRight);
  const mouthToNose = dist(mouthMid, P.noseTip);
  const mouthToCorners = dist(mouthMid, cornerMid);
  const nearNoseRatio = mouthToCorners / Math.max(1e-8, mouthToNose);
  checks.mouth_near_nose_ratio = { value: +nearNoseRatio.toFixed(4), max: T.maxMouthNearNoseRatio };
  // mouth should be nearer corners than nose → nearNoseRatio = cornerDist/noseDist should be small
  // Actually: if mouth on lips, mouthMid ≈ cornerMid → small mouthToCorners; mouthToNose larger → ratio small.
  // If mouth on nose, mouthToNose small → ratio large. Fail when ratio > max is wrong.
  // Fail when mouthToNose < mouthToCorners * (1/max) i.e. closer to nose than expected.
  if (mouthToNose < mouthToCorners / T.maxMouthNearNoseRatio) {
    violations.push('mouth_closer_to_nose_than_corners');
  }

  return {
    contractVersion: FACE_ANCHOR_ANATOMY_QA_CONTRACT_VERSION,
    profileVersion: FACE_ANCHOR_ANATOMY_PROFILE_VERSION,
    pass: violations.length === 0,
    violations: [...new Set(violations)].sort(),
    checks,
    metrics,
  };
}

/**
 * @param {import('@gltf-transform/core').Document} document
 * @param {Record<string, unknown>} anchors
 */
export function validateFaceAnchorAnatomyAgainstDocument(document, anchors) {
  const topology = validateFaceAnchorsAgainstDocument(document, anchors);
  if (!topology.ok) {
    return {
      contractVersion: FACE_ANCHOR_ANATOMY_QA_CONTRACT_VERSION,
      profileVersion: FACE_ANCHOR_ANATOMY_PROFILE_VERSION,
      pass: false,
      violations: topology.errors.map((e) => `topology:${e}`),
      checks: {},
      metrics: null,
    };
  }
  const positions = resolveFaceAnchorPositions(document, anchors);
  return evaluateFaceAnchorAnatomy(positions);
}

/**
 * @param {{ manifestPath: string; glbPath: string }} opts
 */
export async function validateFaceAnchorAnatomyFile(opts) {
  let raw;
  try {
    raw = JSON.parse(readFileSync(opts.manifestPath, 'utf8'));
  } catch {
    return {
      contractVersion: FACE_ANCHOR_ANATOMY_QA_CONTRACT_VERSION,
      profileVersion: FACE_ANCHOR_ANATOMY_PROFILE_VERSION,
      pass: false,
      violations: ['manifest_read_failed'],
      checks: {},
      metrics: null,
    };
  }
  const envelope = parseManifestEnvelope(raw);
  if (!envelope.ok) {
    return {
      contractVersion: FACE_ANCHOR_ANATOMY_QA_CONTRACT_VERSION,
      profileVersion: FACE_ANCHOR_ANATOMY_PROFILE_VERSION,
      pass: false,
      violations: envelope.errors,
      checks: {},
      metrics: null,
    };
  }
  let document;
  try {
    const io = new NodeIO();
    document = await io.readBinary(new Uint8Array(readFileSync(opts.glbPath)));
  } catch {
    return {
      contractVersion: FACE_ANCHOR_ANATOMY_QA_CONTRACT_VERSION,
      profileVersion: FACE_ANCHOR_ANATOMY_PROFILE_VERSION,
      pass: false,
      violations: ['glb_parse_failed'],
      checks: {},
      metrics: null,
    };
  }
  return validateFaceAnchorAnatomyAgainstDocument(document, envelope.anchors);
}
