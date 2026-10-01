/**
 * liveact-face-functional-morph-author — GT-aware functional shape-key rewrite (#423).
 * Location: scripts/lib/liveact-face-functional-morph-author.mjs
 *
 * Design decision: from reviewed semantic anchors + mesh topology, deterministically
 * rewrite named SagaDrive face morph POSITION accessors.
 * Milestone 1: jawOpen. Milestone 2: blinks. Milestone 3: browInnerUp. Milestone 4: smiles.
 * Milestone 5: mouthPucker.
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
  MOUTH_PUCKER_AUTHOR_CONTRACT_V1,
  MOUTH_SMILE_LEFT_AUTHOR_CONTRACT_V1,
  MOUTH_SMILE_RIGHT_AUTHOR_CONTRACT_V1,
} from './liveact-face-functional-morph-profile-v1.mjs';
import {
  buildFaceLocalFrame,
  computeFaceAssetSha256Hex,
  computeFaceAssetTopologyFingerprint,
  evaluateReviewedGroundTruthGate,
  resolveFaceAnchorPositionsPosed,
  computeFunctionalMetricsFromAnchors,
} from './liveact-face-functional-validate.mjs';
import {
  buildGtBoundSurfaceGate,
  maxTopologyHopsForRadius,
  resolveCoupledFacialPatches,
  resolveGtBoundTriangleVertices,
} from './liveact-face-functional-morph-surface.mjs';
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
  // Primary: mouthLower lip neighborhood. Chin spatial weight is optional — only when
  // chin lies on the GT-bound allowed surface (caller may zero refs.useChinSpatial).
  const wLower = Math.max(0, 1 - dist3(p, refs.mouthLower) / rMove) ** 1.2;
  let w = wLower;
  if (refs.useChinSpatial !== false) {
    const wChin = Math.max(0, 1 - dist3(p, refs.chin) / (rMove * 1.05)) ** 1.15;
    w = Math.max(w, wChin * 0.55);
  }
  // Keep influence below the oral commissure midplane; no extra chin-band boost
  // (that previously exaggerated beard-tip silhouette against a frozen neck shell).
  const midY = (refs.mouthUpper.y + refs.mouthLower.y) / 2;
  if (p.y > midY) w *= 0.15;
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

  const surface = buildGtBoundSurfaceGate(prim, anchors, contract.surfaceSeedAnchors);
  // Chin GT may bind a disconnected body shell — keep as spatial reference only when
  // at least one chin triangle vertex is on the mouth-allowed surface.
  let chinOnAllowed = false;
  try {
    const chinVerts = resolveGtBoundTriangleVertices(prim, anchors.chin, 'chin');
    chinOnAllowed = chinVerts.some((v) => surface.allowed[v] === 1);
  } catch {
    chinOnAllowed = false;
  }

  const refs = {
    mouthUpper: neutral.mouthUpper,
    mouthLower: neutral.mouthLower,
    chin: neutral.chin,
    noseTip: neutral.noseTip,
    forehead: neutral.forehead,
    useChinSpatial: chinOnAllowed,
  };

  const rMove = frame.faceHeight * contract.moveRadiusFaceH;
  const maxHops = maxTopologyHopsForRadius(surface.meanEdgeLength, rMove * 1.15);
  const topoExp = typeof contract.topoFalloffExp === 'number' ? contract.topoFalloffExp : 1.25;

  const n = basePos.getCount();
  const arr = new Float32Array(n * 3); // full rewrite — discard ICT deltas
  const mouthW =
    neutral.mouthCornerLeft && neutral.mouthCornerRight
      ? dist3(neutral.mouthCornerLeft, neutral.mouthCornerRight)
      : frame.faceHeight * 0.35;
  const metricsN0 = computeFunctionalMetricsFromAnchors(neutral, frame);
  const neutralGap = Math.max(metricsN0?.mouthGap ?? 0, frame.faceHeight * 0.05);
  const ampFace = frame.faceHeight * contract.ampFaceH;
  const ampMouth = mouthW * contract.ampMouthWidth;
  const ampGap = neutralGap * (contract.ampNeutralGap ?? 0.22);
  const amp = Math.min(ampFace, ampMouth, ampGap);
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
  let offSurfaceRejected = 0;
  let offTopoRejected = 0;
  let maxOffSurfaceDispWouldBe = 0;
  /** @type {number[]} */
  const primaryAffected = [];
  const el = [0, 0, 0];
  for (let i = 0; i < n; i += 1) {
    basePos.getElement(i, el);
    const p = { x: el[0], y: el[1], z: el[2] };
    const wEuclid = computeJawOpenVertexWeight(p, refs, frame.faceHeight, contract);
    if (wEuclid <= 1e-8) continue;
    if (!surface.allowed[i]) {
      offSurfaceRejected += 1;
      const would = amp * wEuclid;
      maxOffSurfaceDispWouldBe = Math.max(maxOffSurfaceDispWouldBe, would);
      continue;
    }
    const hops = surface.topoDist[i];
    if (hops < 0 || hops > maxHops) {
      offTopoRejected += 1;
      continue;
    }
    const topoW = Math.max(0, 1 - hops / Math.max(1, maxHops)) ** topoExp;
    const w = wEuclid * topoW;
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
    primaryAffected.push(i);
  }

  // Coupled Facial Shell Contract (Option C): transfer primary deltas to seam patches only.
  const jointNames =
    document
      .getRoot()
      .listSkins()[0]
      ?.listJoints()
      .map((j) => j.getName() || '') || [];
  const gtRefs = [
    neutral.mouthLower,
    neutral.mouthUpper,
    neutral.chin,
    neutral.mouthCornerLeft,
    neutral.mouthCornerRight,
  ].filter(Boolean);
  const contactPrimary =
    primaryAffected.length >= 50
      ? primaryAffected
      : (() => {
          /** @type {number[]} */
          const all = [];
          for (let i = 0; i < n; i += 1) {
            if (!surface.allowed[i]) continue;
            const hops = surface.topoDist[i];
            if (hops >= 0 && hops <= maxHops) all.push(i);
          }
          return all;
        })();
  const coupling = resolveCoupledFacialPatches({
    prim,
    surface,
    primaryVerts: contactPrimary,
    faceHeight: frame.faceHeight,
    gtRefs,
    jointNames,
  });

  let coupledAffected = 0;
  let coupledMaxDisp = 0;
  let coupledSumDisp = 0;
  /** @type {Array<{ secondary: number; primary: number; hops: number; falloff: number; componentId: number }>} */
  const coupledTransfers = [];
  for (const [sec, bind] of [...coupling.secondaryBindings.entries()].sort(
    (a, b) => a[0] - b[0],
  )) {
    // Never overwrite primary surface verts
    if (surface.allowed[sec]) continue;
    const px = arr[bind.primary * 3];
    const py = arr[bind.primary * 3 + 1];
    const pz = arr[bind.primary * 3 + 2];
    const dx = px * bind.falloff;
    const dy = py * bind.falloff;
    const dz = pz * bind.falloff;
    if (Math.hypot(dx, dy, dz) <= 1e-12) continue;
    arr[sec * 3] = dx;
    arr[sec * 3 + 1] = dy;
    arr[sec * 3 + 2] = dz;
    coupledAffected += 1;
    const d = Math.hypot(dx, dy, dz);
    coupledMaxDisp = Math.max(coupledMaxDisp, d);
    coupledSumDisp += d;
    coupledTransfers.push({
      secondary: sec,
      primary: bind.primary,
      hops: bind.hops,
      falloff: bind.falloff,
      componentId: bind.componentId,
    });
  }
  affected += coupledAffected;
  maxDisp = Math.max(maxDisp, coupledMaxDisp);
  sumDisp += coupledSumDisp;

  // Seam continuity at weight 1 for accepted pairs
  const seamContinuity = {
    pairs: coupling.patches.flatMap((p) =>
      p.seamPairs.slice(0, 40).map((sp) => {
        const gap0 = sp.neutralDist;
        const bSec = [0, 0, 0];
        const bPri = [0, 0, 0];
        basePos.getElement(sp.secondary, bSec);
        basePos.getElement(sp.primary, bPri);
        const a1 = {
          x: bSec[0] + arr[sp.secondary * 3],
          y: bSec[1] + arr[sp.secondary * 3 + 1],
          z: bSec[2] + arr[sp.secondary * 3 + 2],
        };
        const b1 = {
          x: bPri[0] + arr[sp.primary * 3],
          y: bPri[1] + arr[sp.primary * 3 + 1],
          z: bPri[2] + arr[sp.primary * 3 + 2],
        };
        const gap1 = Math.hypot(a1.x - b1.x, a1.y - b1.y, a1.z - b1.z);
        return {
          secondary: sp.secondary,
          primary: sp.primary,
          gap0,
          gap1,
          componentId: p.componentId,
        };
      }),
    ),
  };
  const gap1s = seamContinuity.pairs.map((p) => p.gap1);
  gap1s.sort((a, b) => a - b);
  const seamStats = {
    pairCount: gap1s.length,
    maxGap1: gap1s.length ? gap1s[gap1s.length - 1] : 0,
    meanGap1: gap1s.length ? gap1s.reduce((a, b) => a + b, 0) / gap1s.length : 0,
    p95Gap1: gap1s.length ? gap1s[Math.min(gap1s.length - 1, Math.floor(gap1s.length * 0.95))] : 0,
    // Continuity: after transfer, gap should stay near meanEdge scale (not open like pre-fix ~6mm)
    pass:
      gap1s.length === 0 ||
      (gap1s[gap1s.length - 1] <= Math.max(surface.meanEdgeLength * 2.5, frame.faceHeight * 0.008)),
  };

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
    meanWeightAffected: affected ? sumW / Math.max(1, affected - coupledAffected) : 0,
    maxDisplacement: maxDisp,
    meanDisplacementAffected: affected ? sumDisp / affected : 0,
    amp,
    ampFaceHComponent: ampFace,
    ampMouthWidthComponent: ampMouth,
    ampNeutralGapComponent: ampGap,
    chinSpatialUsed: chinOnAllowed,
    mouthWidth: mouthW,
    faceHeight: frame.faceHeight,
    morphPositionSha256: hashMorphPositionArray(arr),
    mouthGapNeutral: metricsN?.mouthGap ?? null,
    mouthGapJawOpen1: metricsP?.mouthGap ?? null,
    mouthGapDelta: gapDelta,
    surfaceSafety: {
      allowedSurfaceVertexCount: surface.allowedCount,
      maxTopologyHops: maxHops,
      meanEdgeLength: surface.meanEdgeLength,
      offSurfaceRejected,
      offTopoRejected,
      offSurfaceAffectedCount: 0,
      offSurfaceMaxDisplacement: 0,
      maxOffSurfaceDispWouldHaveBeen: maxOffSurfaceDispWouldBe,
      surfaceSeedAnchors: [...contract.surfaceSeedAnchors],
      chinOnAllowedSurface: chinOnAllowed,
    },
    coupledShell: {
      acceptedComponentIds: coupling.patches.map((p) => p.componentId),
      rejected: coupling.rejected,
      thresholds: coupling.thresholds,
      patches: coupling.patches.map((p) => ({
        componentId: p.componentId,
        componentSize: p.componentSize,
        coincideCount: p.coincideCount,
        meanNormalDot: p.meanNormalDot,
        medianGtDist: p.medianGtDist,
        wholeCompBodyFrac: p.wholeCompBodyFrac,
        patchBodyFrac: p.patchBodyFrac,
        patchVertexCount: p.patchVerts.length,
        maxPatchHops: p.maxPatchHops,
        seamPairCount: p.seamPairs.length,
      })),
      coupledAffectedVertices: coupledAffected,
      coupledMaxDisplacement: coupledMaxDisp,
      coupledMeanDisplacement: coupledAffected ? coupledSumDisp / coupledAffected : 0,
      transferCount: coupledTransfers.length,
      seamContinuity: seamStats,
      noRecursivePropagation: true,
    },
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

  const surfaceSeedAnchors = [
    contract.upperAnchor,
    contract.lowerAnchor,
    contract.innerAnchor,
    contract.outerAnchor,
  ];
  const surface = buildGtBoundSurfaceGate(prim, anchors, surfaceSeedAnchors);
  const rMove = frame.faceHeight * contract.moveRadiusFaceH;
  const maxHops = maxTopologyHopsForRadius(surface.meanEdgeLength, rMove * 1.35);

  const n = basePos.getCount();
  const arr = new Float32Array(n * 3); // full rewrite — discard ICT deltas
  let affected = 0;
  let maxW = 0;
  let sumW = 0;
  let maxDisp = 0;
  let sumDisp = 0;
  let offSurfaceRejected = 0;
  let offTopoRejected = 0;
  const el = [0, 0, 0];
  for (let i = 0; i < n; i += 1) {
    basePos.getElement(i, el);
    const p = { x: el[0], y: el[1], z: el[2] };
    const wEuclid = computeEyeBlinkVertexWeight(p, refs, frame, contract);
    if (wEuclid <= 1e-8) continue;
    if (!surface.allowed[i]) {
      offSurfaceRejected += 1;
      continue;
    }
    const hops = surface.topoDist[i];
    if (hops < 0 || hops > maxHops) {
      offTopoRejected += 1;
      continue;
    }
    const w = wEuclid;
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
    surfaceSafety: {
      allowedSurfaceVertexCount: surface.allowedCount,
      maxTopologyHops: maxHops,
      meanEdgeLength: surface.meanEdgeLength,
      offSurfaceRejected,
      offTopoRejected,
      offSurfaceAffectedCount: 0,
      offSurfaceMaxDisplacement: 0,
      surfaceSeedAnchors,
    },
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
 * Unilateral smile falloff in [0,1]. Strongest near target mouth corner; opposite + upper face protected.
 * @param {{ x: number; y: number; z: number }} p
 * @param {Record<string, { x: number; y: number; z: number }>} refs
 * @param {ReturnType<typeof buildFaceLocalFrame>} frame
 * @param {typeof MOUTH_SMILE_LEFT_AUTHOR_CONTRACT_V1} contract
 */
export function computeMouthSmileVertexWeight(p, refs, frame, contract) {
  if (!frame) return 0;
  const faceH = frame.faceHeight;
  const r = faceH * contract.moveRadiusFaceH;
  const wCorner = Math.max(0, 1 - dist3(p, refs.target) / r) ** 1.2;
  const wUpper = Math.max(0, 1 - dist3(p, refs.mouthUpper) / (r * 1.35)) ** 1.1 * 0.25;
  const wLower = Math.max(0, 1 - dist3(p, refs.mouthLower) / (r * 1.25)) ** 1.1 * 0.35;
  let w = Math.max(wCorner, wUpper, wLower);

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

  const rKill = faceH * 0.1;
  if (dist3(p, refs.opposite) < rKill) return 0;
  if (dist3(p, refs.noseTip) < faceH * 0.1) return 0;
  if (dist3(p, refs.forehead) < faceH * 0.2) return 0;
  if (refs.browLeftInner && dist3(p, refs.browLeftInner) < faceH * 0.12) w *= 0.05;
  if (refs.browRightInner && dist3(p, refs.browRightInner) < faceH * 0.12) w *= 0.05;
  if (refs.eyeLeftOuter && dist3(p, refs.eyeLeftOuter) < faceH * 0.1) w *= 0.08;
  if (refs.eyeRightOuter && dist3(p, refs.eyeRightOuter) < faceH * 0.1) w *= 0.08;
  // Chin: soft protect — smile may nudge nearby skin but not translate chin anchor
  if (refs.chin && dist3(p, refs.chin) < faceH * 0.08) w *= 0.15;

  return Math.max(0, Math.min(1, w));
}

/**
 * @param {import('@gltf-transform/core').Document} document
 * @param {Record<string, unknown>} anchors
 * @param {typeof MOUTH_SMILE_LEFT_AUTHOR_CONTRACT_V1} contract
 */
function rewriteMouthSmileMorph(document, anchors, contract) {
  const neutralPre = resolveFaceAnchorPositions(document, anchors);
  for (const id of contract.requiredAnchors) {
    if (!neutralPre[id]) throw new Error(`${contract.morphName} author: required anchor unresolved: ${id}`);
  }

  const sampleBinding = /** @type {Record<string, unknown>} */ (anchors[contract.targetCorner]);
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

  const neutral = neutralPre;
  const frame = buildFaceLocalFrame(neutral);
  if (!frame) throw new Error(`${contract.morphName} author: face local frame incomplete`);

  const outDir =
    contract.side === 'left'
      ? frame.left
      : { x: -frame.left.x, y: -frame.left.y, z: -frame.left.z };
  const dx0 = frame.up.x * contract.upBias + outDir.x * contract.outBias;
  const dy0 = frame.up.y * contract.upBias + outDir.y * contract.outBias;
  const dz0 = frame.up.z * contract.upBias + outDir.z * contract.outBias;
  const dLen = Math.hypot(dx0, dy0, dz0) || 1;
  const dir = { x: dx0 / dLen, y: dy0 / dLen, z: dz0 / dLen };
  const amp = frame.mouthWidth0 * contract.ampMouthW;

  const refs = {
    target: neutral[contract.targetCorner],
    opposite: neutral[contract.oppositeCorner],
    mouthUpper: neutral.mouthUpper,
    mouthLower: neutral.mouthLower,
    chin: neutral.chin,
    noseTip: neutral.noseTip,
    forehead: neutral.forehead,
    browLeftInner: neutral.browLeftInner,
    browRightInner: neutral.browRightInner,
    eyeLeftOuter: neutral.eyeLeftOuter,
    eyeRightOuter: neutral.eyeRightOuter,
  };

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
    const w = computeMouthSmileVertexWeight(p, refs, frame, contract);
    if (w <= 1e-8) continue;
    affected += 1;
    maxW = Math.max(maxW, w);
    sumW += w;
    const dx = dir.x * amp * w;
    const dy = dir.y * amp * w;
    const dz = dir.z * amp * w;
    arr[i * 3] = dx;
    arr[i * 3 + 1] = dy;
    arr[i * 3 + 2] = dz;
    const d = Math.hypot(dx, dy, dz);
    maxDisp = Math.max(maxDisp, d);
    sumDisp += d;
  }
  morphPos.setArray(arr);

  const posed = resolveFaceAnchorPositionsPosed(document, anchors, contract.morphName, 1);
  const tn = neutral[contract.targetCorner];
  const tp = posed[contract.targetCorner];
  const on = neutral[contract.oppositeCorner];
  const op = posed[contract.oppositeCorner];
  const dTarget = { x: tp.x - tn.x, y: tp.y - tn.y, z: tp.z - tn.z };
  const dOpp = { x: op.x - on.x, y: op.y - on.y, z: op.z - on.z };
  const cornerUp =
    (dTarget.x * frame.up.x + dTarget.y * frame.up.y + dTarget.z * frame.up.z) / frame.mouthWidth0;
  const cornerOut =
    (dTarget.x * outDir.x + dTarget.y * outDir.y + dTarget.z * outDir.z) / frame.mouthWidth0;
  const cornerMotion = Math.hypot(dTarget.x, dTarget.y, dTarget.z) / frame.mouthWidth0;
  const oppUp = (dOpp.x * frame.up.x + dOpp.y * frame.up.y + dOpp.z * frame.up.z) / frame.mouthWidth0;

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
    mouthWidth0: frame.mouthWidth0,
    faceHeight: frame.faceHeight,
    morphPositionSha256: hashMorphPositionArray(arr),
    cornerUp,
    cornerOut,
    cornerMotion,
    oppositeCornerUp: oppUp,
    upAdvantage: cornerUp - oppUp,
    displacements: {
      [contract.targetCorner]: disp(contract.targetCorner),
      [contract.oppositeCorner]: disp(contract.oppositeCorner),
      mouthUpper: disp('mouthUpper'),
      mouthLower: disp('mouthLower'),
      chin: disp('chin'),
      noseTip: disp('noseTip'),
      forehead: disp('forehead'),
      browLeftInner: disp('browLeftInner'),
      browRightInner: disp('browRightInner'),
    },
  };
}

/**
 * Bilateral pucker falloff in [0,1]. Strongest at mouth corners + lip perimeter; protected regions killed.
 * @param {{ x: number; y: number; z: number }} p
 * @param {Record<string, { x: number; y: number; z: number }>} refs
 * @param {ReturnType<typeof buildFaceLocalFrame>} frame
 * @param {typeof MOUTH_PUCKER_AUTHOR_CONTRACT_V1} contract
 */
export function computeMouthPuckerVertexWeight(p, refs, frame, contract) {
  if (!frame) return 0;
  const faceH = frame.faceHeight;
  const r = faceH * contract.moveRadiusFaceH;
  const wL = Math.max(0, 1 - dist3(p, refs.mouthCornerLeft) / r) ** 1.15;
  const wR = Math.max(0, 1 - dist3(p, refs.mouthCornerRight) / r) ** 1.15;
  const wUpper = Math.max(0, 1 - dist3(p, refs.mouthUpper) / (r * 1.2)) ** 1.1 * 0.7;
  const wLower = Math.max(0, 1 - dist3(p, refs.mouthLower) / (r * 1.2)) ** 1.1 * 0.7;
  let w = Math.max(wL, wR, wUpper, wLower);

  // Hard protect nose / forehead / upper face; soft protect chin & eyes/brows.
  if (dist3(p, refs.noseTip) < faceH * 0.11) return 0;
  if (dist3(p, refs.forehead) < faceH * 0.22) return 0;
  if (refs.chin && dist3(p, refs.chin) < faceH * 0.09) w *= 0.12;
  if (refs.browLeftInner && dist3(p, refs.browLeftInner) < faceH * 0.13) w *= 0.04;
  if (refs.browRightInner && dist3(p, refs.browRightInner) < faceH * 0.13) w *= 0.04;
  if (refs.eyeLeftOuter && dist3(p, refs.eyeLeftOuter) < faceH * 0.11) w *= 0.06;
  if (refs.eyeRightOuter && dist3(p, refs.eyeRightOuter) < faceH * 0.11) w *= 0.06;

  return Math.max(0, Math.min(1, w));
}

/**
 * Full rewrite of mouthPucker: both corners inward toward mouth center + local lip compaction.
 * @param {import('@gltf-transform/core').Document} document
 * @param {Record<string, unknown>} anchors
 * @param {typeof MOUTH_PUCKER_AUTHOR_CONTRACT_V1} contract
 */
function rewriteMouthPuckerMorph(document, anchors, contract = MOUTH_PUCKER_AUTHOR_CONTRACT_V1) {
  const neutralPre = resolveFaceAnchorPositions(document, anchors);
  for (const id of contract.requiredAnchors) {
    if (!neutralPre[id]) throw new Error(`${contract.morphName} author: required anchor unresolved: ${id}`);
  }

  const sampleBinding = /** @type {Record<string, unknown>} */ (anchors.mouthCornerLeft);
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

  const neutral = neutralPre;
  const frame = buildFaceLocalFrame(neutral);
  if (!frame) throw new Error(`${contract.morphName} author: face local frame incomplete`);

  const L = neutral.mouthCornerLeft;
  const R = neutral.mouthCornerRight;
  const U = neutral.mouthUpper;
  const Lo = neutral.mouthLower;
  const mouthCenter = {
    x: (L.x + R.x + U.x + Lo.x) / 4,
    y: (L.y + R.y + U.y + Lo.y) / 4,
    z: (L.z + R.z + U.z + Lo.z) / 4,
  };
  const mouthMid = {
    x: (L.x + R.x) / 2,
    y: (L.y + R.y) / 2,
    z: (L.z + R.z) / 2,
  };

  const amp = frame.mouthWidth0 * contract.ampMouthW;
  const forwardAmp = frame.mouthWidth0 * contract.forwardAmpMouthW;
  const left = frame.left;
  const up = frame.up;
  const forward = frame.forward;

  const refs = {
    mouthCornerLeft: L,
    mouthCornerRight: R,
    mouthUpper: U,
    mouthLower: Lo,
    chin: neutral.chin,
    noseTip: neutral.noseTip,
    forehead: neutral.forehead,
    browLeftInner: neutral.browLeftInner,
    browRightInner: neutral.browRightInner,
    eyeLeftOuter: neutral.eyeLeftOuter,
    eyeRightOuter: neutral.eyeRightOuter,
  };

  const n = basePos.getCount();
  const arr = new Float32Array(n * 3);
  let affected = 0;
  let maxW = 0;
  let sumW = 0;
  let maxDisp = 0;
  let sumDisp = 0;
  const el = [0, 0, 0];
  const halfW = Math.max(frame.mouthWidth0 * 0.45, 1e-6);

  for (let i = 0; i < n; i += 1) {
    basePos.getElement(i, el);
    const p = { x: el[0], y: el[1], z: el[2] };
    const w = computeMouthPuckerVertexWeight(p, refs, frame, contract);
    if (w <= 1e-8) continue;

    // Lateral: move toward midplane along face-left (inward for both corners).
    const sideDot =
      (p.x - mouthMid.x) * left.x + (p.y - mouthMid.y) * left.y + (p.z - mouthMid.z) * left.z;
    const sideAbs = Math.abs(sideDot);
    const sideSign = sideAbs < 1e-12 ? 0 : sideDot > 0 ? 1 : -1;
    const latScale = Math.min(1, sideAbs / halfW);
    const inwardAmt = amp * w * latScale;

    // Local forward for lip compaction (stronger near upper/lower than far-cheek).
    const lipNear =
      Math.max(
        Math.max(0, 1 - dist3(p, U) / (frame.faceHeight * contract.moveRadiusFaceH * 1.3)),
        Math.max(0, 1 - dist3(p, Lo) / (frame.faceHeight * contract.moveRadiusFaceH * 1.3)),
        Math.max(0, 1 - dist3(p, L) / (frame.faceHeight * contract.moveRadiusFaceH)),
        Math.max(0, 1 - dist3(p, R) / (frame.faceHeight * contract.moveRadiusFaceH)),
      ) ** 1.05;
    const fwdAmt = forwardAmp * w * lipNear;

    // Mild attract toward mouthCenter (non-lateral) for contour compaction — damped.
    const toCx = mouthCenter.x - p.x;
    const toCy = mouthCenter.y - p.y;
    const toCz = mouthCenter.z - p.z;
    const toLen = Math.hypot(toCx, toCy, toCz) || 1;
    const compactAmt = amp * 0.18 * w * (1 - latScale);

    let dx = -sideSign * left.x * inwardAmt + forward.x * fwdAmt + (toCx / toLen) * compactAmt;
    let dy = -sideSign * left.y * inwardAmt + forward.y * fwdAmt + (toCy / toLen) * compactAmt;
    let dz = -sideSign * left.z * inwardAmt + forward.z * fwdAmt + (toCz / toLen) * compactAmt;

    // Kill most vertical component so pucker is width/protrusion-led.
    const alongUp = dx * up.x + dy * up.y + dz * up.z;
    dx -= up.x * alongUp * (1 - contract.verticalDamp);
    dy -= up.y * alongUp * (1 - contract.verticalDamp);
    dz -= up.z * alongUp * (1 - contract.verticalDamp);

    affected += 1;
    maxW = Math.max(maxW, w);
    sumW += w;
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
  const width0 = metricsN?.mouthWidth ?? frame.mouthWidth0;
  const widthP = metricsP?.mouthWidth ?? null;
  const widthRatio = width0 && widthP != null ? widthP / width0 : null;

  const dCorner = (id) => {
    const a = neutral[id];
    const b = posed[id];
    if (!a || !b) return null;
    return { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
  };
  const dL = dCorner('mouthCornerLeft');
  const dR = dCorner('mouthCornerRight');
  // Inward = component toward midplane (opposite of outward along left for left corner).
  const leftInward =
    dL != null ? -(dL.x * left.x + dL.y * left.y + dL.z * left.z) / frame.mouthWidth0 : null;
  const rightInward =
    dR != null ? (dR.x * left.x + dR.y * left.y + dR.z * left.z) / frame.mouthWidth0 : null;
  const leftVert =
    dL != null ? (dL.x * up.x + dL.y * up.y + dL.z * up.z) / frame.mouthWidth0 : null;
  const rightVert =
    dR != null ? (dR.x * up.x + dR.y * up.y + dR.z * up.z) / frame.mouthWidth0 : null;
  const asymmetry =
    leftInward != null && rightInward != null ? Math.abs(leftInward - rightInward) : null;

  const midN = {
    x: (neutral.mouthUpper.x + neutral.mouthLower.x) / 2,
    y: (neutral.mouthUpper.y + neutral.mouthLower.y) / 2,
    z: (neutral.mouthUpper.z + neutral.mouthLower.z) / 2,
  };
  const midP = {
    x: (posed.mouthUpper.x + posed.mouthLower.x) / 2,
    y: (posed.mouthUpper.y + posed.mouthLower.y) / 2,
    z: (posed.mouthUpper.z + posed.mouthLower.z) / 2,
  };
  const forwardProtrusion =
    ((midP.x - midN.x) * forward.x +
      (midP.y - midN.y) * forward.y +
      (midP.z - midN.z) * forward.z) /
    frame.mouthWidth0;

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
    forwardAmp,
    mouthWidth0: width0,
    mouthWidthPucker: widthP,
    widthRatio,
    faceHeight: frame.faceHeight,
    morphPositionSha256: hashMorphPositionArray(arr),
    leftCornerInward: leftInward,
    rightCornerInward: rightInward,
    leftCornerVertical: leftVert,
    rightCornerVertical: rightVert,
    asymmetry,
    forwardProtrusion,
    displacements: {
      mouthCornerLeft: disp('mouthCornerLeft'),
      mouthCornerRight: disp('mouthCornerRight'),
      mouthUpper: disp('mouthUpper'),
      mouthLower: disp('mouthLower'),
      chin: disp('chin'),
      noseTip: disp('noseTip'),
      forehead: disp('forehead'),
      browLeftInner: disp('browLeftInner'),
      browRightInner: disp('browRightInner'),
      eyeLeftOuter: disp('eyeLeftOuter'),
      eyeRightOuter: disp('eyeRightOuter'),
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
  if (channel === 'mouthSmileLeft') {
    return rewriteMouthSmileMorph(document, anchors, MOUTH_SMILE_LEFT_AUTHOR_CONTRACT_V1);
  }
  if (channel === 'mouthSmileRight') {
    return rewriteMouthSmileMorph(document, anchors, MOUTH_SMILE_RIGHT_AUTHOR_CONTRACT_V1);
  }
  if (channel === 'mouthPucker') {
    return rewriteMouthPuckerMorph(document, anchors, MOUTH_PUCKER_AUTHOR_CONTRACT_V1);
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
