/**
 * liveact-face-semantic-validate — region / side / combination morph QA (#401).
 * Location: scripts/lib/liveact-face-semantic-validate.mjs
 */

import { readFileSync } from 'node:fs';
import {
  parseManifestEnvelope,
  validateFaceAnchorsAgainstDocument,
} from './liveact-face-anchor-validate.mjs';
import { findNodeByIdentity } from './liveact-face-anchor-glb.mjs';
import {
  CORE_CHANNEL_SEMANTIC_RULES_V1,
  CORE_COMBINATION_POSES_V1,
  SEMANTIC_PROFILE_VERSION,
  SEMANTIC_QA_CONTRACT_VERSION,
  SEMANTIC_THRESHOLDS_V1,
  listCombinationPosesForProfile,
  listSemanticChannelsForProfile,
} from './liveact-face-semantic-profile-v1.mjs';

/**
 * @param {import('@gltf-transform/core').Primitive} prim
 * @param {number} triangleIndex
 * @param {{ u: number; v: number; w: number }} barycentric
 */
function triangleVertexIndices(prim, triangleIndex, barycentric) {
  const indices = prim.getIndices();
  const pos = prim.getAttribute('POSITION');
  if (!pos) return null;
  let i0;
  let i1;
  let i2;
  if (indices) {
    const idxArr = indices.getArray();
    if (!idxArr) return null;
    const base = triangleIndex * 3;
    if (base + 2 >= idxArr.length) return null;
    i0 = idxArr[base];
    i1 = idxArr[base + 1];
    i2 = idxArr[base + 2];
  } else {
    const base = triangleIndex * 3;
    if (base + 2 >= pos.getCount()) return null;
    i0 = base;
    i1 = base + 1;
    i2 = base + 2;
  }
  const posArr = pos.getArray();
  if (!posArr) return null;
  const { u, v, w } = barycentric;
  const x = posArr[i0 * 3] * u + posArr[i1 * 3] * v + posArr[i2 * 3] * w;
  const y = posArr[i0 * 3 + 1] * u + posArr[i1 * 3 + 1] * v + posArr[i2 * 3 + 1] * w;
  const z = posArr[i0 * 3 + 2] * u + posArr[i1 * 3 + 2] * v + posArr[i2 * 3 + 2] * w;
  return { x, y, z };
}

/**
 * @param {import('@gltf-transform/core').Document} document
 * @param {Record<string, unknown>} anchors
 */
function resolveAnchorPositions(document, anchors) {
  /** @type {Partial<Record<string, { x: number; y: number; z: number }>>>} */
  const positions = {};
  for (const [anchorId, bindingRaw] of Object.entries(anchors)) {
    if (!bindingRaw || typeof bindingRaw !== 'object') continue;
    const binding = /** @type {Record<string, unknown>} */ (bindingRaw);
    const nodeIdentity = typeof binding.nodeIdentity === 'string' ? binding.nodeIdentity.trim() : '';
    const primitiveIndex =
      typeof binding.primitiveIndex === 'number' ? binding.primitiveIndex : Number.NaN;
    const triangleIndex =
      typeof binding.triangleIndex === 'number' ? binding.triangleIndex : Number.NaN;
    const baryRaw = binding.barycentric;
    if (!baryRaw || typeof baryRaw !== 'object') continue;
    const bary = /** @type {Record<string, number>} */ (baryRaw);
    const node = findNodeByIdentity(document, nodeIdentity);
    const mesh = node?.getMesh();
    if (!mesh) continue;
    const prims = mesh.listPrimitives();
    if (primitiveIndex < 0 || primitiveIndex >= prims.length) continue;
    const pos = triangleVertexIndices(prims[primitiveIndex], triangleIndex, {
      u: bary.u,
      v: bary.v,
      w: bary.w,
    });
    if (pos) positions[anchorId] = pos;
  }
  return positions;
}

/**
 * @param {import('@gltf-transform/core').Document} document
 */
function collectVertexSamples(document) {
  /** @type {{ x: number; y: number; z: number; nodeKey: string; primIndex: number; vertexIndex: number }[]} */
  const samples = [];
  for (const node of document.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const nodeKey = (node.getName() || '').trim() || 'node';
    const prims = mesh.listPrimitives();
    for (let primIndex = 0; primIndex < prims.length; primIndex += 1) {
      const prim = prims[primIndex];
      const pos = prim.getAttribute('POSITION');
      if (!pos) continue;
      const posArr = pos.getArray();
      if (!posArr) continue;
      for (let vertexIndex = 0; vertexIndex < pos.getCount(); vertexIndex += 1) {
        samples.push({
          x: posArr[vertexIndex * 3],
          y: posArr[vertexIndex * 3 + 1],
          z: posArr[vertexIndex * 3 + 2],
          nodeKey,
          primIndex,
          vertexIndex,
        });
      }
    }
  }
  return samples;
}

function dist3(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function dist3Sq(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
}

/** @typedef {'mouth'|'jaw'|'eyeLeft'|'eyeRight'|'browLeft'|'browRight'|'nose'|'forehead'|'cheek'} QaRegionId */

/**
 * Anatomical bands from SagaDriveFaceAnchorsV1 — avoids whole-midface nearest-centroid → nose/forehead.
 * @param {Partial<Record<string, { x: number; y: number; z: number }>>} anchorPositions
 * @returns {{ ok: true; classify: (v: { x: number; y: number; z: number }) => QaRegionId } | { ok: false; missing: string[] }}
 */
function buildAnatomicalRegionClassifier(anchorPositions) {
  /** @type {string[]} */
  const missing = [];
  const need = (id) => {
    const p = anchorPositions[id];
    if (!p) missing.push(id);
    return p;
  };

  const noseTip = need('noseTip');
  const chin = need('chin');
  const mouthUpper = need('mouthUpper');
  const mouthLower = need('mouthLower');
  const browLeftCenter = anchorPositions.browLeftCenter || anchorPositions.browLeftInner;
  const browRightCenter = anchorPositions.browRightCenter || anchorPositions.browRightInner;
  if (!browLeftCenter) missing.push('browLeftCenter');
  if (!browRightCenter) missing.push('browRightCenter');

  if (missing.length > 0) {
    return { ok: false, missing: [...new Set(missing)] };
  }

  const browCenterY = (browLeftCenter.y + browRightCenter.y) / 2;
  const li = anchorPositions.eyeLeftInner;
  const ri = anchorPositions.eyeRightInner;
  let faceScale = li && ri ? dist3(li, ri) : dist3(mouthUpper, chin);
  if (!Number.isFinite(faceScale) || faceScale <= 1e-6) {
    faceScale = Math.max(Math.abs(mouthUpper.y - chin.y), 0.05);
  }

  // Tight nose; generous mouth — nearest-centroid used to steal peri-oral energy into nose/cheek.
  const noseRadiusSq = (faceScale * 0.22) ** 2;
  const eyeRadiusSq = (faceScale * 0.32) ** 2;
  const eyeBandHalfHeight = faceScale * 0.2;
  const browRadiusSq = (faceScale * 0.35) ** 2;
  const mouthLocalRadiusSq = (faceScale * 0.72) ** 2;
  const cheekRadiusSq = (faceScale * 0.58) ** 2;
  const chinRadiusSq = (faceScale * 0.36) ** 2;
  const jawBelowMouthY = mouthLower.y - faceScale * 0.22;
  const oralYMin = mouthLower.y - faceScale * 0.35;
  const oralYMax = Math.max(mouthUpper.y + faceScale * 0.25, noseTip.y - faceScale * 0.05);

  let maxEyeY = browCenterY;
  for (const id of ['eyeLeftUpper', 'eyeRightUpper', 'eyeLeftLower', 'eyeRightLower']) {
    const p = anchorPositions[id];
    if (p && p.y > maxEyeY) maxEyeY = p.y;
  }
  const foreheadAnchor = anchorPositions.forehead;
  const foreheadCutoffY = Math.max(
    maxEyeY + faceScale * 0.18,
    foreheadAnchor ? foreheadAnchor.y - faceScale * 0.35 : browCenterY + faceScale * 0.55,
  );

  /** @type {{ id: string; region: QaRegionId }[]} */
  const eyeAnchors = [
    ['eyeLeftInner', 'eyeLeft'],
    ['eyeLeftOuter', 'eyeLeft'],
    ['eyeLeftUpper', 'eyeLeft'],
    ['eyeLeftLower', 'eyeLeft'],
    ['eyeRightInner', 'eyeRight'],
    ['eyeRightOuter', 'eyeRight'],
    ['eyeRightUpper', 'eyeRight'],
    ['eyeRightLower', 'eyeRight'],
  ].flatMap(([id, region]) => (anchorPositions[id] ? [{ id, region: /** @type {QaRegionId} */ (region) }] : []));

  /** @type {{ pos: { x: number; y: number; z: number }; region: QaRegionId }[]} */
  const browAnchors = [];
  for (const [id, region] of [
    ['browLeftInner', 'browLeft'],
    ['browLeftOuter', 'browLeft'],
    ['browLeftCenter', 'browLeft'],
    ['browRightInner', 'browRight'],
    ['browRightOuter', 'browRight'],
    ['browRightCenter', 'browRight'],
  ]) {
    const pos = anchorPositions[id];
    if (pos) browAnchors.push({ pos, region: /** @type {QaRegionId} */ (region) });
  }

  /** @type {{ pos: { x: number; y: number; z: number } }[]} */
  const mouthAnchors = ['mouthUpper', 'mouthLower', 'mouthCornerLeft', 'mouthCornerRight']
    .map((id) => anchorPositions[id])
    .filter(Boolean);

  const mouthCornerLeft = anchorPositions.mouthCornerLeft;
  const mouthCornerRight = anchorPositions.mouthCornerRight;

  /**
   * @param {{ x: number; y: number; z: number }} vertex
   * @returns {QaRegionId}
   */
  function classify(vertex) {
    const midX = li && ri ? (li.x + ri.x) / 2 : 0;
    const lateralFromMid = li && ri ? Math.abs(vertex.x - midX) : 0;
    const leftIsPositiveX = li && ri ? li.x > ri.x : false;
    const orbitalLateralMax = faceScale * 0.38;

    for (const { id, region } of eyeAnchors) {
      const pos = anchorPositions[id];
      if (!pos) continue;
      const isLowerLid = id === 'eyeLeftLower' || id === 'eyeRightLower';
      if (isLowerLid && lateralFromMid > orbitalLateralMax) continue;
      if (
        Math.abs(vertex.y - pos.y) <= eyeBandHalfHeight &&
        dist3Sq(vertex, pos) <= eyeRadiusSq
      ) {
        return region;
      }
    }
    for (const { pos, region } of browAnchors) {
      if (dist3Sq(vertex, pos) <= browRadiusSq) return region;
    }

    if (vertex.y > foreheadCutoffY) {
      return 'forehead';
    }
    if (vertex.y > browCenterY) {
      const betweenBrowAndForehead = vertex.y <= foreheadCutoffY;
      if (betweenBrowAndForehead && li && ri) {
        const onLeft = leftIsPositiveX ? vertex.x >= midX : vertex.x <= midX;
        if (lateralFromMid > faceScale * 0.42) {
          return onLeft ? 'cheek' : 'cheek';
        }
        return onLeft ? 'eyeLeft' : 'eyeRight';
      }
      return 'forehead';
    }

    // Mouth before cheek/nose so smile/pucker peri-oral energy stays expected.
    for (const pos of mouthAnchors) {
      if (dist3Sq(vertex, pos) <= mouthLocalRadiusSq) {
        return 'mouth';
      }
    }

    if (vertex.y >= oralYMin && vertex.y <= oralYMax && lateralFromMid <= faceScale * 0.85) {
      return 'mouth';
    }

    if (dist3Sq(vertex, noseTip) <= noseRadiusSq) {
      return 'nose';
    }

    if (dist3Sq(vertex, chin) <= chinRadiusSq || vertex.y < jawBelowMouthY) {
      return 'jaw';
    }

    if (mouthCornerLeft && dist3Sq(vertex, mouthCornerLeft) <= cheekRadiusSq) {
      return 'cheek';
    }
    if (mouthCornerRight && dist3Sq(vertex, mouthCornerRight) <= cheekRadiusSq) {
      return 'cheek';
    }

    if (vertex.y > oralYMax && vertex.y <= browCenterY) {
      if (lateralFromMid > faceScale * 0.22) {
        return 'cheek';
      }
      return 'nose';
    }

    if (vertex.y < oralYMin) {
      if (lateralFromMid > faceScale * 0.26) {
        return 'cheek';
      }
      if (dist3Sq(vertex, chin) <= chinRadiusSq) {
        return 'jaw';
      }
      return 'cheek';
    }

    if (leftIsPositiveX !== undefined && li && ri) {
      const onLeft = leftIsPositiveX ? vertex.x >= midX : vertex.x <= midX;
      return onLeft ? 'cheek' : 'cheek';
    }
    return 'cheek';
  }

  return { ok: true, classify };
}

/**
 * @param {import('@gltf-transform/core').Document} document
 */
function collectMorphDeltasByName(document) {
  /** @type {Map<string, Map<string, Float32Array>>} */
  const byChannel = new Map();
  /** @type {Map<string, { prim: import('@gltf-transform/core').Primitive; vertexCount: number }>} */
  const primKeys = new Map();

  for (const node of document.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const nodeKey = (node.getName() || '').trim() || 'node';
    const meshExtras = mesh.getExtras() || {};
    const prims = mesh.listPrimitives();
    for (let primIndex = 0; primIndex < prims.length; primIndex += 1) {
      const prim = prims[primIndex];
      const pos = prim.getAttribute('POSITION');
      if (!pos) continue;
      const primKey = `${nodeKey}#${primIndex}`;
      primKeys.set(primKey, { prim, vertexCount: pos.getCount() });
      const extras = prim.getExtras() || {};
      const targetNames = Array.isArray(extras.targetNames)
        ? extras.targetNames
        : Array.isArray(meshExtras.targetNames)
          ? meshExtras.targetNames
          : [];
      const targets = prim.listTargets();
      for (let ti = 0; ti < targets.length; ti += 1) {
        const name =
          typeof targetNames[ti] === 'string' && targetNames[ti].trim()
            ? String(targetNames[ti]).trim()
            : `target_${ti}`;
        const acc = targets[ti].getAttribute('POSITION');
        if (!acc) continue;
        const arr = acc.getArray();
        if (!arr) continue;
        const copy = new Float32Array(arr.length);
        copy.set(arr);
        if (!byChannel.has(name)) byChannel.set(name, new Map());
        byChannel.get(name).set(primKey, copy);
      }
    }
  }
  return { byChannel, primKeys };
}

/**
 * @param {Map<string, Float32Array>} primDeltas
 * @param {Map<string, { prim: import('@gltf-transform/core').Primitive; vertexCount: number }>} primKeys
 */
function perVertexMagnitudes(primDeltas, primKeys, vertexSamples) {
  /** @type {number[]} */
  const mags = new Array(vertexSamples.length).fill(0);
  let sampleIdx = 0;
  for (const sample of vertexSamples) {
    const primKey = `${sample.nodeKey}#${sample.primIndex}`;
    const delta = primDeltas.get(primKey);
    const meta = primKeys.get(primKey);
    if (delta && meta && sample.vertexIndex < meta.vertexCount) {
      const base = sample.vertexIndex * 3;
      const dx = delta[base] ?? 0;
      const dy = delta[base + 1] ?? 0;
      const dz = delta[base + 2] ?? 0;
      mags[sampleIdx] = dx * dx + dy * dy + dz * dz;
    }
    sampleIdx += 1;
  }
  return mags;
}

/**
 * @param {number[]} mags
 * @param {string[]} regionBySampleIndex
 * @param {{ x: number; y: number; z: number }[]} vertexSamples
 * @param {string[]} expectedRegions
 * @param {string[]} forbiddenRegions
 */
/**
 * @param {Partial<Record<string, { x: number; y: number; z: number }>>} anchorPositions
 */
function resolveCharacterSideSplit(anchorPositions) {
  const li = anchorPositions.eyeLeftInner;
  const ri = anchorPositions.eyeRightInner;
  const lc = anchorPositions.mouthCornerLeft;
  const rc = anchorPositions.mouthCornerRight;
  if (!li || !ri) return null;
  const midX = (li.x + ri.x) / 2;
  const leftIsPositiveX = li.x > ri.x;
  const mouthCornerMidX = lc && rc ? (lc.x + rc.x) / 2 : null;
  return { midX, leftIsPositiveX, mouthCornerMidX };
}

function vertexOnCharacterLeft(vertex, split, opts) {
  if (!split) return vertex.x <= 0;
  const useMouthMid =
    opts?.preferMouthCornerMid && split.mouthCornerMidX != null
      ? split.mouthCornerMidX
      : split.midX;
  if (split.leftIsPositiveX) return vertex.x >= useMouthMid;
  return vertex.x <= useMouthMid;
}

function summarizeRegionEnergy(
  mags,
  regionBySampleIndex,
  vertexSamples,
  expectedRegions,
  forbiddenRegions,
  sideSplit,
  headMask,
) {
  let total = 0;
  let expected = 0;
  let forbidden = 0;
  let left = 0;
  let right = 0;
  let leftExpected = 0;
  let rightExpected = 0;
  for (let i = 0; i < mags.length; i += 1) {
    if (headMask && headMask[i] === false) continue;
    const e = mags[i];
    if (e <= SEMANTIC_THRESHOLDS_V1.noiseFloor) continue;
    total += e;
    const region = regionBySampleIndex[i];
    if (expectedRegions.includes(region)) expected += e;
    if (forbiddenRegions.includes(region)) forbidden += e;
    let onLeft = vertexOnCharacterLeft(vertexSamples[i], sideSplit);
    if (onLeft) left += e;
    else right += e;
    if (expectedRegions.includes(region)) {
      const mouthSide =
        region === 'mouth' || region === 'cheek'
          ? vertexOnCharacterLeft(vertexSamples[i], sideSplit, { preferMouthCornerMid: true })
          : onLeft;
      if (mouthSide) leftExpected += e;
      else rightExpected += e;
    }
  }
  return {
    totalEnergy: total,
    expectedEnergy: expected,
    forbiddenEnergy: forbidden,
    expectedRatio: total > 0 ? expected / total : 0,
    forbiddenRatio: total > 0 ? forbidden / total : 0,
    leftEnergy: left,
    rightEnergy: right,
    leftExpectedEnergy: leftExpected,
    rightExpectedEnergy: rightExpected,
  };
}

/**
 * @param {{ side: 'left'|'right'|null; expectedRegions: string[]; forbiddenRegions: string[] }} rule
 * @param {{ expectedRatio: number; forbiddenRatio: number; leftEnergy: number; rightEnergy: number; totalEnergy: number }} summary
 */
function evaluateChannelRule(rule, summary) {
  /** @type {string[]} */
  const violations = [];
  if (summary.totalEnergy < SEMANTIC_THRESHOLDS_V1.minTotalEnergy) {
    violations.push('channel_energy_below_noise_floor');
  }
  if (summary.expectedRatio < SEMANTIC_THRESHOLDS_V1.minExpectedEnergyRatio) {
    violations.push(
      `expected_region_ratio_below:${summary.expectedRatio.toFixed(4)}<${SEMANTIC_THRESHOLDS_V1.minExpectedEnergyRatio}`,
    );
  }
  if (summary.forbiddenRatio > SEMANTIC_THRESHOLDS_V1.maxForbiddenLeakageRatio) {
    violations.push(
      `forbidden_leakage_above:${summary.forbiddenRatio.toFixed(4)}>${SEMANTIC_THRESHOLDS_V1.maxForbiddenLeakageRatio}`,
    );
  }
  if (rule.side === 'left') {
    const leftE = summary.leftExpectedEnergy ?? summary.leftEnergy;
    const rightE = summary.rightExpectedEnergy ?? summary.rightEnergy;
    const ratio =
      rightE > SEMANTIC_THRESHOLDS_V1.noiseFloor
        ? leftE / rightE
        : leftE > SEMANTIC_THRESHOLDS_V1.minTotalEnergy
          ? Number.POSITIVE_INFINITY
          : 0;
    if (ratio < SEMANTIC_THRESHOLDS_V1.minSideDominanceRatio) {
      violations.push(
        `side_dominance_left_below:${ratio.toFixed(4)}<${SEMANTIC_THRESHOLDS_V1.minSideDominanceRatio}`,
      );
    }
  }
  if (rule.side === 'right') {
    const leftE = summary.leftExpectedEnergy ?? summary.leftEnergy;
    const rightE = summary.rightExpectedEnergy ?? summary.rightEnergy;
    const ratio =
      leftE > SEMANTIC_THRESHOLDS_V1.noiseFloor
        ? rightE / leftE
        : rightE > SEMANTIC_THRESHOLDS_V1.minTotalEnergy
          ? Number.POSITIVE_INFINITY
          : 0;
    if (ratio < SEMANTIC_THRESHOLDS_V1.minSideDominanceRatio) {
      violations.push(
        `side_dominance_right_below:${ratio.toFixed(4)}<${SEMANTIC_THRESHOLDS_V1.minSideDominanceRatio}`,
      );
    }
  }
  return violations;
}

/**
 * @param {import('@gltf-transform/core').Document} document
 * @param {{ profile: 'core-v1'|'full-v1'; anchorsPath: string; usableChannels: Set<string> }} opts
 */
export async function validateLiveActFaceSemanticQa(document, opts) {
  let raw;
  try {
    raw = JSON.parse(readFileSync(opts.anchorsPath, 'utf8'));
  } catch {
    return {
      contractVersion: SEMANTIC_QA_CONTRACT_VERSION,
      profileVersion: SEMANTIC_PROFILE_VERSION,
      pass: false,
      skipped: false,
      channels: {},
      combinations: {},
      violations: ['anchors_read_failed'],
    };
  }

  const envelope = parseManifestEnvelope(raw);
  if (!envelope.ok) {
    return {
      contractVersion: SEMANTIC_QA_CONTRACT_VERSION,
      profileVersion: SEMANTIC_PROFILE_VERSION,
      pass: false,
      skipped: false,
      channels: {},
      combinations: {},
      violations: envelope.errors,
    };
  }

  const anchorTopology = validateFaceAnchorsAgainstDocument(document, envelope.anchors);
  if (!anchorTopology.ok) {
    return {
      contractVersion: SEMANTIC_QA_CONTRACT_VERSION,
      profileVersion: SEMANTIC_PROFILE_VERSION,
      pass: false,
      skipped: false,
      channels: {},
      combinations: {},
      violations: anchorTopology.errors.map((e) => `anchor_topology:${e}`),
    };
  }

  const anchorPositions = resolveAnchorPositions(document, envelope.anchors);
  const vertexSamples = collectVertexSamples(document);
  if (vertexSamples.length === 0) {
    return {
      contractVersion: SEMANTIC_QA_CONTRACT_VERSION,
      profileVersion: SEMANTIC_PROFILE_VERSION,
      pass: false,
      skipped: false,
      channels: {},
      combinations: {},
      violations: ['no_mesh_vertices'],
    };
  }

  const regionModel = buildAnatomicalRegionClassifier(anchorPositions);
  if (!regionModel.ok) {
    return {
      contractVersion: SEMANTIC_QA_CONTRACT_VERSION,
      profileVersion: SEMANTIC_PROFILE_VERSION,
      pass: false,
      skipped: false,
      channels: {},
      combinations: {},
      violations: regionModel.missing.map((id) => `region_model_missing_anchor:${id}`),
    };
  }
  const classifyVertexRegion = regionModel.classify;

  const sampleMinY = vertexSamples.reduce((min, v) => Math.min(min, v.y), Number.POSITIVE_INFINITY);
  const sampleMaxY = vertexSamples.reduce((max, v) => Math.max(max, v.y), Number.NEGATIVE_INFINITY);
  const headYMin = sampleMaxY - 0.45;
  const applyHeadMask = sampleMinY < 0.25 && sampleMaxY > 1.35;
  const headMask = vertexSamples.map((v) => (applyHeadMask ? v.y >= headYMin : true));
  const regionBySampleIndex = vertexSamples.map((v, i) =>
    headMask[i] ? classifyVertexRegion(v) : 'jaw',
  );
  const sideSplit = resolveCharacterSideSplit(anchorPositions);
  const { byChannel, primKeys } = collectMorphDeltasByName(document);

  /** @type {Record<string, unknown>} */
  const channels = {};
  /** @type {string[]} */
  const violations = [];

  const channelIds = listSemanticChannelsForProfile(opts.profile);
  for (const channelId of channelIds) {
    if (!opts.usableChannels.has(channelId)) {
      channels[channelId] = { pass: false, skipped: true, reason: 'channel_not_usable' };
      violations.push(`channel_missing:${channelId}`);
      continue;
    }
    const rule = CORE_CHANNEL_SEMANTIC_RULES_V1[channelId];
    if (!rule) {
      channels[channelId] = { pass: true, skipped: true, reason: 'no_rule' };
      continue;
    }
    const primDeltas = byChannel.get(channelId);
    if (!primDeltas) {
      channels[channelId] = { pass: false, skipped: false, reason: 'no_delta' };
      violations.push(`channel_no_delta:${channelId}`);
      continue;
    }
    const mags = perVertexMagnitudes(primDeltas, primKeys, vertexSamples);
    const channelRegionBySampleIndex = vertexSamples.map((v, i) => {
      if (headMask[i] === false) return 'jaw';
      return classifyVertexRegion(v);
    });
    const summary = summarizeRegionEnergy(
      mags,
      channelRegionBySampleIndex,
      vertexSamples,
      rule.expectedRegions,
      rule.forbiddenRegions,
      sideSplit,
      headMask,
    );
    const channelViolations = evaluateChannelRule(rule, summary);
    channels[channelId] = {
      pass: channelViolations.length === 0,
      expectedEnergy: summary.expectedEnergy,
      forbiddenLeakageRatio: summary.forbiddenRatio,
      expectedEnergyRatio: summary.expectedRatio,
      side: {
        leftEnergy: summary.leftEnergy,
        rightEnergy: summary.rightEnergy,
      },
      violations: channelViolations,
    };
    for (const v of channelViolations) {
      violations.push(`${channelId}:${v}`);
    }
  }

  /** @type {Record<string, unknown>} */
  const combinations = {};
  const comboRules = listCombinationPosesForProfile(opts.profile);
  for (const combo of comboRules) {
    /** @type {Map<string, Float32Array>} */
    const combined = new Map();
    let missingWeight = false;
    for (const [channelId, weight] of Object.entries(combo.weights)) {
      if (!opts.usableChannels.has(channelId) || !byChannel.has(channelId)) {
        missingWeight = true;
        break;
      }
      const primDeltas = byChannel.get(channelId);
      for (const [primKey, delta] of primDeltas.entries()) {
        if (!combined.has(primKey)) {
          combined.set(primKey, new Float32Array(delta.length));
        }
        const acc = combined.get(primKey);
        for (let i = 0; i < delta.length; i += 1) {
          acc[i] += delta[i] * weight;
        }
      }
    }
    if (missingWeight) {
      combinations[combo.id] = { pass: false, skipped: true, reason: 'missing_channel' };
      violations.push(`combination_missing_channel:${combo.id}`);
      continue;
    }
    const mags = perVertexMagnitudes(combined, primKeys, vertexSamples);
    let maxForbiddenDisp = 0;
    for (let i = 0; i < mags.length; i += 1) {
      if (headMask[i] === false) continue;
      const region = regionBySampleIndex[i];
      if (!combo.forbiddenRegions.includes(region)) continue;
      const disp = Math.sqrt(mags[i]);
      if (disp > maxForbiddenDisp) maxForbiddenDisp = disp;
    }
    const comboPass =
      maxForbiddenDisp <= SEMANTIC_THRESHOLDS_V1.combinationMaxForbiddenDisplacement;
    combinations[combo.id] = {
      pass: comboPass,
      maxForbiddenDisplacement: maxForbiddenDisp,
      forbiddenRegions: combo.forbiddenRegions,
      violations: comboPass
        ? []
        : [
            `combination_forbidden_spike:${maxForbiddenDisp.toFixed(4)}>${SEMANTIC_THRESHOLDS_V1.combinationMaxForbiddenDisplacement}`,
          ],
    };
    if (!comboPass) {
      violations.push(`${combo.id}:combination_forbidden_spike`);
    }
  }

  return {
    contractVersion: SEMANTIC_QA_CONTRACT_VERSION,
    profileVersion: SEMANTIC_PROFILE_VERSION,
    pass: violations.length === 0,
    skipped: false,
    channels,
    combinations,
    violations: [...new Set(violations)].sort(),
  };
}

export function semanticQaSkippedResult(reason) {
  return {
    contractVersion: SEMANTIC_QA_CONTRACT_VERSION,
    profileVersion: SEMANTIC_PROFILE_VERSION,
    pass: true,
    skipped: true,
    skipReason: reason,
    channels: {},
    combinations: {},
    violations: [],
  };
}
