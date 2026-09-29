/**
 * liveact-face-functional-validate — Functional Face QA on reviewed GT anchors (#422).
 * Location: scripts/lib/liveact-face-functional-validate.mjs
 *
 * Neutral 0 vs isolated morph weight 1.0. Normalized geometry only.
 * Reuses anatomy `resolveFaceAnchorPositions` for neutral; posed path applies
 * morph POSITION deltas to triangle vertices without mutating the glTF document.
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { parseManifestEnvelope, validateFaceAnchorsAgainstDocument } from './liveact-face-anchor-validate.mjs';
import {
  resolveFaceAnchorPositions,
  validateFaceAnchorAnatomyAgainstDocument,
} from './liveact-face-anchor-anatomy-validate.mjs';
import { findNodeByIdentity } from './liveact-face-anchor-glb.mjs';
import {
  faceMappingAuthoringPathBesideAnchors,
  isReviewedFaceMappingGroundTruth,
  validateFaceMappingAuthoringV1,
} from './liveact-face-mapping-authoring.mjs';
import {
  FACE_FUNCTIONAL_POSE_WEIGHT,
  FACE_FUNCTIONAL_PROFILE_VERSION,
  FACE_FUNCTIONAL_QA_CONTRACT_VERSION,
  FACE_FUNCTIONAL_THRESHOLDS_V1 as T,
  FUNCTIONAL_REQUIRED_CHANNELS_V1,
} from './liveact-face-functional-profile-v1.mjs';

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function sub(a, b) {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function add(a, b) {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function scale(a, s) {
  return { x: a.x * s, y: a.y * s, z: a.z * s };
}

function dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function cross(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function len(a) {
  return Math.hypot(a.x, a.y, a.z);
}

function norm(a) {
  const L = len(a);
  if (!(L > T.eps)) return { x: 0, y: 0, z: 0 };
  return scale(a, 1 / L);
}

/**
 * Face-local frame from neutral reviewed anchors (design Geometry frame).
 * @param {Partial<Record<string, { x: number; y: number; z: number }>>} P
 */
export function buildFaceLocalFrame(P) {
  const chin = P.chin;
  const forehead = P.forehead;
  const eyeL = P.eyeLeftOuter;
  const eyeR = P.eyeRightOuter;
  if (!chin || !forehead || !eyeL || !eyeR) return null;
  const up = norm(sub(forehead, chin));
  const left = norm(sub(eyeL, eyeR));
  const forward = norm(cross(left, up));
  const faceHeight = Math.max(T.eps, dist(chin, forehead));
  const mouthL = P.mouthCornerLeft;
  const mouthR = P.mouthCornerRight;
  const mouthWidth0 =
    mouthL && mouthR ? Math.max(T.eps, dist(mouthL, mouthR)) : T.eps;
  const eyeWidthL0 =
    P.eyeLeftInner && P.eyeLeftOuter
      ? Math.max(T.eps, dist(P.eyeLeftInner, P.eyeLeftOuter))
      : T.eps;
  const eyeWidthR0 =
    P.eyeRightInner && P.eyeRightOuter
      ? Math.max(T.eps, dist(P.eyeRightInner, P.eyeRightOuter))
      : T.eps;
  return { up, left, forward, faceHeight, mouthWidth0, eyeWidthL0, eyeWidthR0 };
}

/**
 * Topology fingerprint used for authoring identity (vertex/triangle/mesh counts).
 * @param {import('@gltf-transform/core').Document} document
 */
export function computeFaceAssetTopologyFingerprint(document) {
  let vertices = 0;
  let triangles = 0;
  const meshes = document.getRoot().listMeshes();
  for (const mesh of meshes) {
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION');
      if (pos) vertices += pos.getCount();
      const idx = prim.getIndices();
      if (idx) triangles += Math.floor(idx.getCount() / 3);
      else if (pos) triangles += Math.floor(pos.getCount() / 3);
    }
  }
  return `v${vertices}:t${triangles}:m${meshes.length}`;
}

/**
 * @param {Uint8Array|Buffer} bytes
 */
export function computeFaceAssetSha256Hex(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

/**
 * Normalize paths for identity compare (POSIX separators, no trailing slash).
 * @param {string} value
 */
function normalizeModelPathForCompare(value) {
  return String(value || '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/\/+$/, '');
}

/**
 * Strong path identity: exact match or one path ends with the other as a full suffix
 * that includes at least one directory segment (rejects basename-only collisions).
 * @param {string} modelPath
 * @param {string} inputPath
 */
export function isStrongFaceAssetPathMatch(modelPath, inputPath) {
  const a = normalizeModelPathForCompare(modelPath);
  const b = normalizeModelPathForCompare(inputPath);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes('/') && b.endsWith(`/${a}`)) return true;
  if (b.includes('/') && a.endsWith(`/${b}`)) return true;
  return false;
}

/**
 * Reviewed GT + asset/topology/anchors identity gate.
 * @param {{
 *   authoring: unknown;
 *   inputPath: string;
 *   inputBytes: Uint8Array|Buffer;
 *   anchorsBytes: Uint8Array|Buffer;
 *   document: import('@gltf-transform/core').Document;
 * }} opts
 */
export function evaluateReviewedGroundTruthGate(opts) {
  /** @type {string[]} */
  const violations = [];
  const validation = validateFaceMappingAuthoringV1(opts.authoring);
  if (!validation.ok) {
    return {
      ok: false,
      blockedByGroundTruth: true,
      violations: validation.issues.map((i) => `authoring:${i.code}`),
      reason: 'malformed_provenance',
    };
  }
  if (!isReviewedFaceMappingGroundTruth(opts.authoring)) {
    const record = /** @type {Record<string, unknown>} */ (opts.authoring);
    if (record.source === 'auto') {
      violations.push('auto_proposal_not_ground_truth');
    } else if (record.reviewed !== true) {
      violations.push('unreviewed_mapping');
    } else {
      violations.push('not_reviewed_ground_truth');
    }
    return {
      ok: false,
      blockedByGroundTruth: true,
      violations,
      reason: 'unreviewed_or_auto',
    };
  }

  const record = /** @type {Record<string, unknown>} */ (opts.authoring);
  const asset = /** @type {Record<string, unknown>} */ (record.asset);
  const modelPath = String(asset.modelPath || '').trim();
  const strongPath = isStrongFaceAssetPathMatch(modelPath, opts.inputPath);
  const basenameOnly =
    !strongPath &&
    Boolean(modelPath) &&
    basename(normalizeModelPathForCompare(modelPath)) ===
      basename(normalizeModelPathForCompare(opts.inputPath));

  const topo = computeFaceAssetTopologyFingerprint(opts.document);
  const topoFp = typeof asset.topologyFingerprint === 'string' ? asset.topologyFingerprint.trim() : '';
  const shaFp = typeof asset.modelSha256 === 'string' ? asset.modelSha256.trim().toLowerCase() : '';
  const anchorsFp =
    typeof asset.anchorsSha256 === 'string' ? asset.anchorsSha256.trim().toLowerCase() : '';

  if (!strongPath && !basenameOnly) {
    violations.push('asset_model_path_mismatch');
  }
  // Basename-only collision across run dirs is accepted only with an exact model content hash.
  if (basenameOnly && !shaFp) {
    violations.push('asset_model_path_basename_requires_sha256');
  }

  if (!anchorsFp) {
    violations.push('insufficient_fingerprint');
    violations.push('anchors_sha256_required');
  } else {
    const actualAnchors = computeFaceAssetSha256Hex(opts.anchorsBytes);
    if (anchorsFp !== actualAnchors) violations.push('anchors_sha256_mismatch');
  }

  if (!topoFp && !shaFp) {
    violations.push('insufficient_fingerprint');
  }
  if (topoFp && topoFp !== topo) {
    violations.push('topology_fingerprint_mismatch');
  }
  if (shaFp) {
    const actual = computeFaceAssetSha256Hex(opts.inputBytes);
    if (shaFp !== actual) violations.push('model_sha256_mismatch');
  }

  const unique = [...new Set(violations)];
  if (unique.length) {
    return {
      ok: false,
      blockedByGroundTruth: true,
      violations: unique,
      reason: unique.includes('insufficient_fingerprint') || unique.includes('anchors_sha256_required')
        ? 'insufficient_fingerprint'
        : unique.includes('anchors_sha256_mismatch')
          ? 'stale_or_mismatched_anchors'
          : 'asset_or_topology_mismatch',
      topologyFingerprint: topo,
    };
  }
  return {
    ok: true,
    blockedByGroundTruth: false,
    violations: [],
    reason: null,
    topologyFingerprint: topo,
  };
}

/**
 * Resolve morph target index by extras.targetNames on a primitive (or mesh extras).
 * @param {import('@gltf-transform/core').Primitive} prim
 * @param {import('@gltf-transform/core').Mesh | null | undefined} mesh
 * @param {string} morphName
 */
function findMorphTargetIndex(prim, mesh, morphName) {
  const extras = prim.getExtras() || {};
  const meshExtras = mesh?.getExtras?.() || {};
  const targetNames = Array.isArray(extras.targetNames)
    ? extras.targetNames
    : Array.isArray(meshExtras.targetNames)
      ? meshExtras.targetNames
      : [];
  const targets = prim.listTargets();
  for (let i = 0; i < targets.length; i += 1) {
    const name =
      typeof targetNames[i] === 'string' && targetNames[i].trim()
        ? String(targetNames[i]).trim()
        : `target_${i}`;
    if (name === morphName) return i;
  }
  return -1;
}

/**
 * Resolve one anchor under an isolated morph pose without mutating the document.
 * @param {import('@gltf-transform/core').Document} document
 * @param {Record<string, unknown>} binding
 * @param {string} morphName
 * @param {number} weight
 */
export function resolvePosedFaceAnchorPosition(document, binding, morphName, weight) {
  const nodeIdentity = typeof binding.nodeIdentity === 'string' ? binding.nodeIdentity.trim() : '';
  const node = findNodeByIdentity(document, nodeIdentity);
  const mesh = node?.getMesh();
  if (!mesh) return null;
  const primIndex = typeof binding.primitiveIndex === 'number' ? binding.primitiveIndex : 0;
  const prim = mesh.listPrimitives()[primIndex];
  if (!prim) return null;
  const pos = prim.getAttribute('POSITION');
  const idx = prim.getIndices();
  if (!pos || !idx) return null;
  const tri = typeof binding.triangleIndex === 'number' ? binding.triangleIndex : -1;
  if (tri < 0) return null;
  const base = tri * 3;
  if (base + 2 >= idx.getCount()) return null;
  const i0 = idx.getScalar(base);
  const i1 = idx.getScalar(base + 1);
  const i2 = idx.getScalar(base + 2);
  const a = pos.getElement(i0, []);
  const b = pos.getElement(i1, []);
  const c = pos.getElement(i2, []);

  let da = [0, 0, 0];
  let db = [0, 0, 0];
  let dc = [0, 0, 0];
  const morphIndex = findMorphTargetIndex(prim, mesh, morphName);
  if (morphIndex >= 0) {
    const target = prim.listTargets()[morphIndex];
    const delta = target?.getAttribute('POSITION');
    if (delta) {
      da = delta.getElement(i0, []);
      db = delta.getElement(i1, []);
      dc = delta.getElement(i2, []);
    }
  }

  const w = Number.isFinite(weight) ? weight : FACE_FUNCTIONAL_POSE_WEIGHT;
  const pa = [a[0] + da[0] * w, a[1] + da[1] * w, a[2] + da[2] * w];
  const pb = [b[0] + db[0] * w, b[1] + db[1] * w, b[2] + db[2] * w];
  const pc = [c[0] + dc[0] * w, c[1] + dc[1] * w, c[2] + dc[2] * w];

  const bary = /** @type {{ u?: number; v?: number; w?: number }} */ (binding.barycentric || {});
  const u = Number(bary.u);
  const v = Number(bary.v);
  const bw = Number(bary.w);
  if (![u, v, bw].every(Number.isFinite)) return null;
  return {
    x: pa[0] * u + pb[0] * v + pc[0] * bw,
    y: pa[1] * u + pb[1] * v + pc[1] * bw,
    z: pa[2] * u + pb[2] * v + pc[2] * bw,
  };
}

/**
 * @param {import('@gltf-transform/core').Document} document
 * @param {Record<string, unknown>} anchors
 * @param {string} morphName
 * @param {number} [weight]
 */
export function resolveFaceAnchorPositionsPosed(document, anchors, morphName, weight = FACE_FUNCTIONAL_POSE_WEIGHT) {
  /** @type {Partial<Record<string, { x: number; y: number; z: number }>>} */
  const out = {};
  for (const [id, bindingRaw] of Object.entries(anchors)) {
    if (!bindingRaw || typeof bindingRaw !== 'object') continue;
    const posed = resolvePosedFaceAnchorPosition(
      document,
      /** @type {Record<string, unknown>} */ (bindingRaw),
      morphName,
      weight,
    );
    if (posed) out[id] = posed;
  }
  return out;
}

/**
 * Shared neutral/posed normalized metrics from resolved anchor positions.
 * @param {Partial<Record<string, { x: number; y: number; z: number }>>} P
 * @param {ReturnType<typeof buildFaceLocalFrame>} frame
 */
export function computeFunctionalMetricsFromAnchors(P, frame) {
  if (!frame) return null;
  const mouthW = frame.mouthWidth0;
  const mouthGap =
    P.mouthUpper && P.mouthLower ? dist(P.mouthUpper, P.mouthLower) / mouthW : null;
  const eyeOpenL =
    P.eyeLeftUpper && P.eyeLeftLower ? dist(P.eyeLeftUpper, P.eyeLeftLower) / frame.eyeWidthL0 : null;
  const eyeOpenR =
    P.eyeRightUpper && P.eyeRightLower
      ? dist(P.eyeRightUpper, P.eyeRightLower) / frame.eyeWidthR0
      : null;
  const browInnerLiftL =
    P.browLeftInner && P.eyeLeftInner
      ? dot(sub(P.browLeftInner, P.eyeLeftInner), frame.up) / frame.eyeWidthL0
      : null;
  const browInnerLiftR =
    P.browRightInner && P.eyeRightInner
      ? dot(sub(P.browRightInner, P.eyeRightInner), frame.up) / frame.eyeWidthR0
      : null;
  const mouthWidth =
    P.mouthCornerLeft && P.mouthCornerRight
      ? dist(P.mouthCornerLeft, P.mouthCornerRight)
      : null;
  return {
    mouthGap,
    eyeOpenL,
    eyeOpenR,
    browInnerLiftL,
    browInnerLiftR,
    mouthWidth,
    mouthWidthRatio: mouthWidth != null ? mouthWidth / mouthW : null,
  };
}

function round4(n) {
  return n == null || !Number.isFinite(n) ? null : +Number(n).toFixed(4);
}

/**
 * @param {string} channel
 * @param {ReturnType<typeof computeFunctionalMetricsFromAnchors>} neutral
 * @param {ReturnType<typeof computeFunctionalMetricsFromAnchors>} posed
 * @param {Partial<Record<string, { x: number; y: number; z: number }>>} Pn
 * @param {Partial<Record<string, { x: number; y: number; z: number }>>} Pp
 * @param {NonNullable<ReturnType<typeof buildFaceLocalFrame>>} frame
 */
function evaluateChannel(channel, neutral, posed, Pn, Pp, frame) {
  /** @type {string[]} */
  const violations = [];
  /** @type {Record<string, unknown>} */
  const thresholds = {};
  /** @type {Record<string, unknown>} */
  const deltas = {};
  /** @type {Record<string, unknown>} */
  const neutralMetrics = {};
  /** @type {Record<string, unknown>} */
  const posedMetrics = {};

  const copyMetric = (key, src, dest) => {
    dest[key] = round4(src?.[key] ?? null);
  };

  if (channel === 'jawOpen') {
    const th = T.jawOpen;
    thresholds.minMouthGapDelta = th.minMouthGapDelta;
    thresholds.maxNoseTipDispFaceH = th.maxNoseTipDispFaceH;
    thresholds.maxForeheadDispFaceH = th.maxForeheadDispFaceH;
    copyMetric('mouthGap', neutral, neutralMetrics);
    copyMetric('mouthGap', posed, posedMetrics);
    const gapDelta = (posed?.mouthGap ?? 0) - (neutral?.mouthGap ?? 0);
    deltas.mouthGap = round4(gapDelta);
    if (!(gapDelta >= th.minMouthGapDelta)) violations.push('jawOpen_mouth_gap_delta_below');

    const noseDisp =
      Pn.noseTip && Pp.noseTip ? dist(Pn.noseTip, Pp.noseTip) / frame.faceHeight : Number.POSITIVE_INFINITY;
    const foreheadDisp =
      Pn.forehead && Pp.forehead
        ? dist(Pn.forehead, Pp.forehead) / frame.faceHeight
        : Number.POSITIVE_INFINITY;
    deltas.noseTipDispFaceH = round4(noseDisp);
    deltas.foreheadDispFaceH = round4(foreheadDisp);
    posedMetrics.noseTipDispFaceH = round4(noseDisp);
    posedMetrics.foreheadDispFaceH = round4(foreheadDisp);
    if (!(noseDisp <= th.maxNoseTipDispFaceH)) violations.push('jawOpen_nose_leakage');
    if (!(foreheadDisp <= th.maxForeheadDispFaceH)) violations.push('jawOpen_forehead_leakage');
  } else if (channel === 'eyeBlinkLeft' || channel === 'eyeBlinkRight') {
    const th = channel === 'eyeBlinkLeft' ? T.eyeBlinkLeft : T.eyeBlinkRight;
    const primaryN = channel === 'eyeBlinkLeft' ? neutral?.eyeOpenL : neutral?.eyeOpenR;
    const primaryP = channel === 'eyeBlinkLeft' ? posed?.eyeOpenL : posed?.eyeOpenR;
    const oppN = channel === 'eyeBlinkLeft' ? neutral?.eyeOpenR : neutral?.eyeOpenL;
    const oppP = channel === 'eyeBlinkLeft' ? posed?.eyeOpenR : posed?.eyeOpenL;
    thresholds.maxOpenRatio = th.maxOpenRatio;
    thresholds.minOpenDrop = th.minOpenDrop;
    thresholds.maxOppositeRelChange = th.maxOppositeRelChange;
    neutralMetrics.eyeOpenPrimary = round4(primaryN);
    posedMetrics.eyeOpenPrimary = round4(primaryP);
    neutralMetrics.eyeOpenOpposite = round4(oppN);
    posedMetrics.eyeOpenOpposite = round4(oppP);
    const drop = (primaryN ?? 0) - (primaryP ?? 0);
    const ratio =
      primaryN != null && primaryN > T.eps && primaryP != null ? primaryP / primaryN : Number.POSITIVE_INFINITY;
    const oppRel =
      oppN != null && oppN > T.eps && oppP != null
        ? Math.abs(oppP - oppN) / Math.max(oppN, T.eps)
        : Number.POSITIVE_INFINITY;
    deltas.openDrop = round4(drop);
    deltas.openRatio = round4(ratio);
    deltas.oppositeRelChange = round4(oppRel);
    if (!(ratio <= th.maxOpenRatio)) violations.push(`${channel}_open_ratio_above`);
    if (!(drop >= th.minOpenDrop)) violations.push(`${channel}_open_drop_below`);
    if (!(oppRel <= th.maxOppositeRelChange)) violations.push(`${channel}_opposite_crosstalk`);
  } else if (channel === 'browInnerUp') {
    const th = T.browInnerUp;
    thresholds.minMeanLiftDelta = th.minMeanLiftDelta;
    thresholds.maxDownwardPerSide = th.maxDownwardPerSide;
    copyMetric('browInnerLiftL', neutral, neutralMetrics);
    copyMetric('browInnerLiftR', neutral, neutralMetrics);
    copyMetric('browInnerLiftL', posed, posedMetrics);
    copyMetric('browInnerLiftR', posed, posedMetrics);
    const dL = (posed?.browInnerLiftL ?? 0) - (neutral?.browInnerLiftL ?? 0);
    const dR = (posed?.browInnerLiftR ?? 0) - (neutral?.browInnerLiftR ?? 0);
    const mean = (dL + dR) / 2;
    deltas.browInnerLiftL = round4(dL);
    deltas.browInnerLiftR = round4(dR);
    deltas.meanLiftDelta = round4(mean);
    if (!(mean >= th.minMeanLiftDelta)) violations.push('browInnerUp_mean_lift_below');
    if (dL < -th.maxDownwardPerSide) violations.push('browInnerUp_left_downward');
    if (dR < -th.maxDownwardPerSide) violations.push('browInnerUp_right_downward');
  } else if (channel === 'mouthSmileLeft' || channel === 'mouthSmileRight') {
    const th = channel === 'mouthSmileLeft' ? T.mouthSmileLeft : T.mouthSmileRight;
    const targetId = channel === 'mouthSmileLeft' ? 'mouthCornerLeft' : 'mouthCornerRight';
    const oppId = channel === 'mouthSmileLeft' ? 'mouthCornerRight' : 'mouthCornerLeft';
    const outDir = channel === 'mouthSmileLeft' ? frame.left : scale(frame.left, -1);
    thresholds.minCornerUp = th.minCornerUp;
    thresholds.minCornerMotion = th.minCornerMotion;
    thresholds.minUpAdvantageOverOpposite = th.minUpAdvantageOverOpposite;
    const tn = Pn[targetId];
    const tp = Pp[targetId];
    const on = Pn[oppId];
    const op = Pp[oppId];
    if (!tn || !tp || !on || !op) {
      violations.push(`${channel}_missing_corner_anchors`);
    } else {
      const dTarget = sub(tp, tn);
      const dOpp = sub(op, on);
      const cornerUp = dot(dTarget, frame.up) / frame.mouthWidth0;
      const cornerOut = dot(dTarget, outDir) / frame.mouthWidth0;
      const cornerMotion = len(dTarget) / frame.mouthWidth0;
      const oppUp = dot(dOpp, frame.up) / frame.mouthWidth0;
      deltas.cornerUp = round4(cornerUp);
      deltas.cornerOut = round4(cornerOut);
      deltas.cornerMotion = round4(cornerMotion);
      deltas.oppositeCornerUp = round4(oppUp);
      deltas.upAdvantage = round4(cornerUp - oppUp);
      posedMetrics.cornerUp = round4(cornerUp);
      posedMetrics.cornerOut = round4(cornerOut);
      posedMetrics.cornerMotion = round4(cornerMotion);
      if (!(cornerUp >= th.minCornerUp)) violations.push(`${channel}_corner_up_below`);
      if (!(cornerMotion >= th.minCornerMotion)) violations.push(`${channel}_corner_motion_below`);
      if (!(cornerUp - oppUp >= th.minUpAdvantageOverOpposite)) {
        violations.push(`${channel}_up_advantage_below`);
      }
    }
  } else if (channel === 'mouthPucker') {
    const th = T.mouthPucker;
    thresholds.maxMouthWidthRatio = th.maxMouthWidthRatio;
    copyMetric('mouthWidth', neutral, neutralMetrics);
    copyMetric('mouthWidth', posed, posedMetrics);
    copyMetric('mouthGap', neutral, neutralMetrics);
    copyMetric('mouthGap', posed, posedMetrics);
    const ratio = posed?.mouthWidthRatio;
    deltas.mouthWidthRatio = round4(ratio);
    deltas.mouthGap = round4((posed?.mouthGap ?? 0) - (neutral?.mouthGap ?? 0));
    // Diagnostic: forward protrusion of mouth midpoint
    if (Pn.mouthUpper && Pn.mouthLower && Pp.mouthUpper && Pp.mouthLower) {
      const midN = scale(add(Pn.mouthUpper, Pn.mouthLower), 0.5);
      const midP = scale(add(Pp.mouthUpper, Pp.mouthLower), 0.5);
      deltas.forwardProtrusion = round4(dot(sub(midP, midN), frame.forward) / frame.mouthWidth0);
    }
    posedMetrics.mouthWidthRatio = round4(ratio);
    if (!(ratio != null && ratio <= th.maxMouthWidthRatio)) {
      violations.push('mouthPucker_width_ratio_above');
    }
  } else {
    violations.push(`unknown_channel:${channel}`);
  }

  return {
    pass: violations.length === 0,
    poseWeight: FACE_FUNCTIONAL_POSE_WEIGHT,
    neutralMetrics,
    posedMetrics,
    deltas,
    thresholds,
    violations: [...new Set(violations)].sort(),
  };
}

/**
 * @param {import('@gltf-transform/core').Document} document
 * @param {{
 *   anchorsPath: string;
 *   authoringPath?: string | null;
 *   authoring?: unknown;
 *   inputPath: string;
 *   inputBytes: Uint8Array|Buffer;
 *   usableChannels: Set<string>;
 *   mode?: 'publish'|'diagnostic';
 * }} opts
 */
export async function validateLiveActFaceFunctionalQa(document, opts) {
  const mode = opts.mode === 'diagnostic' ? 'diagnostic' : 'publish';
  /** @type {Record<string, unknown>} */
  const emptyChannels = {};

  const skipped = (reason, extra = {}) => ({
    contractVersion: FACE_FUNCTIONAL_QA_CONTRACT_VERSION,
    profileVersion: FACE_FUNCTIONAL_PROFILE_VERSION,
    pass: mode === 'diagnostic',
    skipped: true,
    blockedByGroundTruth: false,
    violations: [reason],
    channels: emptyChannels,
    ...extra,
  });

  let anchorsRaw;
  let anchorsBytes;
  try {
    anchorsBytes = readFileSync(opts.anchorsPath);
    anchorsRaw = JSON.parse(anchorsBytes.toString('utf8'));
  } catch {
    return {
      contractVersion: FACE_FUNCTIONAL_QA_CONTRACT_VERSION,
      profileVersion: FACE_FUNCTIONAL_PROFILE_VERSION,
      pass: false,
      skipped: false,
      blockedByGroundTruth: false,
      violations: ['anchors_read_failed'],
      channels: emptyChannels,
    };
  }

  const envelope = parseManifestEnvelope(anchorsRaw);
  if (!envelope.ok) {
    return {
      contractVersion: FACE_FUNCTIONAL_QA_CONTRACT_VERSION,
      profileVersion: FACE_FUNCTIONAL_PROFILE_VERSION,
      pass: false,
      skipped: false,
      blockedByGroundTruth: false,
      violations: envelope.errors.map((e) => `anchor_envelope:${e}`),
      channels: emptyChannels,
    };
  }

  const topology = validateFaceAnchorsAgainstDocument(document, envelope.anchors);
  if (!topology.ok) {
    return {
      contractVersion: FACE_FUNCTIONAL_QA_CONTRACT_VERSION,
      profileVersion: FACE_FUNCTIONAL_PROFILE_VERSION,
      pass: false,
      skipped: false,
      blockedByGroundTruth: false,
      violations: topology.errors.map((e) => `anchor_topology:${e}`),
      channels: emptyChannels,
    };
  }

  const anatomy = validateFaceAnchorAnatomyAgainstDocument(document, envelope.anchors);
  if (!anatomy.pass) {
    return {
      contractVersion: FACE_FUNCTIONAL_QA_CONTRACT_VERSION,
      profileVersion: FACE_FUNCTIONAL_PROFILE_VERSION,
      pass: false,
      skipped: false,
      blockedByGroundTruth: false,
      violations: ['blocked_by_invalid_face_anchors', ...anatomy.violations.map((v) => `anatomy:${v}`)],
      channels: emptyChannels,
    };
  }

  let authoring = opts.authoring ?? null;
  if (authoring == null) {
    const path =
      opts.authoringPath ||
      (opts.anchorsPath ? faceMappingAuthoringPathBesideAnchors(opts.anchorsPath) : null);
    if (path) {
      try {
        authoring = JSON.parse(readFileSync(path, 'utf8'));
      } catch {
        authoring = null;
      }
    }
  }

  if (authoring == null) {
    if (mode === 'diagnostic') {
      return skipped('no_authoring_provenance');
    }
    return {
      contractVersion: FACE_FUNCTIONAL_QA_CONTRACT_VERSION,
      profileVersion: FACE_FUNCTIONAL_PROFILE_VERSION,
      pass: false,
      skipped: false,
      blockedByGroundTruth: true,
      violations: ['missing_authoring_provenance'],
      channels: emptyChannels,
    };
  }

  const gt = evaluateReviewedGroundTruthGate({
    authoring,
    inputPath: opts.inputPath,
    inputBytes: opts.inputBytes,
    anchorsBytes,
    document,
  });
  if (!gt.ok) {
    // Diagnostic: auto/unreviewed sidecar must not fail callers that only asked for Semantic QA.
    // Publish: still fail-closed. Fingerprint/stale mismatches stay blocking in both modes.
    if (mode === 'diagnostic' && gt.reason === 'unreviewed_or_auto') {
      return skipped(gt.reason || 'unreviewed_or_auto');
    }
    return {
      contractVersion: FACE_FUNCTIONAL_QA_CONTRACT_VERSION,
      profileVersion: FACE_FUNCTIONAL_PROFILE_VERSION,
      pass: false,
      skipped: false,
      blockedByGroundTruth: true,
      violations: gt.violations,
      channels: emptyChannels,
      groundTruth: { reason: gt.reason, topologyFingerprint: gt.topologyFingerprint ?? null },
    };
  }

  const Pn = resolveFaceAnchorPositions(document, envelope.anchors);
  const frame = buildFaceLocalFrame(Pn);
  if (!frame) {
    return {
      contractVersion: FACE_FUNCTIONAL_QA_CONTRACT_VERSION,
      profileVersion: FACE_FUNCTIONAL_PROFILE_VERSION,
      pass: false,
      skipped: false,
      blockedByGroundTruth: false,
      violations: ['face_frame_incomplete'],
      channels: emptyChannels,
    };
  }

  const neutralMetrics = computeFunctionalMetricsFromAnchors(Pn, frame);
  /** @type {Record<string, unknown>} */
  const channels = {};
  /** @type {string[]} */
  const violations = [];

  for (const channel of FUNCTIONAL_REQUIRED_CHANNELS_V1) {
    if (!opts.usableChannels.has(channel)) {
      channels[channel] = {
        pass: false,
        poseWeight: FACE_FUNCTIONAL_POSE_WEIGHT,
        neutralMetrics: {},
        posedMetrics: {},
        deltas: {},
        thresholds: {},
        violations: ['missing_usable_morph'],
      };
      violations.push(`${channel}:missing_usable_morph`);
      continue;
    }
    const Pp = resolveFaceAnchorPositionsPosed(document, envelope.anchors, channel, FACE_FUNCTIONAL_POSE_WEIGHT);
    const posedMetrics = computeFunctionalMetricsFromAnchors(Pp, frame);
    const result = evaluateChannel(channel, neutralMetrics, posedMetrics, Pn, Pp, frame);
    channels[channel] = result;
    if (!result.pass) {
      for (const v of result.violations) violations.push(`${channel}:${v}`);
    }
  }

  const unique = [...new Set(violations)].sort();
  return {
    contractVersion: FACE_FUNCTIONAL_QA_CONTRACT_VERSION,
    profileVersion: FACE_FUNCTIONAL_PROFILE_VERSION,
    pass: unique.length === 0,
    skipped: false,
    blockedByGroundTruth: false,
    violations: unique,
    channels,
    neutralShared: {
      mouthGap: round4(neutralMetrics?.mouthGap),
      eyeOpenL: round4(neutralMetrics?.eyeOpenL),
      eyeOpenR: round4(neutralMetrics?.eyeOpenR),
      browInnerLiftL: round4(neutralMetrics?.browInnerLiftL),
      browInnerLiftR: round4(neutralMetrics?.browInnerLiftR),
      mouthWidth: round4(neutralMetrics?.mouthWidth),
    },
    groundTruth: {
      reason: null,
      topologyFingerprint: gt.topologyFingerprint ?? null,
    },
  };
}

export function functionalQaSkippedResult(reason) {
  return {
    contractVersion: FACE_FUNCTIONAL_QA_CONTRACT_VERSION,
    profileVersion: FACE_FUNCTIONAL_PROFILE_VERSION,
    pass: true,
    skipped: true,
    blockedByGroundTruth: false,
    violations: [reason],
    channels: {},
  };
}
