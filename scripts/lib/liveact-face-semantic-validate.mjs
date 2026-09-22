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
  QA_REGION_ANCHORS,
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

/**
 * @param {Partial<Record<string, { x: number; y: number; z: number }>>} anchorPositions
 */
function regionCentroids(anchorPositions) {
  /** @type {Partial<Record<string, { x: number; y: number; z: number; count: number }>>>} */
  const out = {};
  for (const [regionId, anchorIds] of Object.entries(QA_REGION_ANCHORS)) {
    let sx = 0;
    let sy = 0;
    let sz = 0;
    let count = 0;
    for (const anchorId of anchorIds) {
      const p = anchorPositions[anchorId];
      if (!p) continue;
      sx += p.x;
      sy += p.y;
      sz += p.z;
      count += 1;
    }
    if (count > 0) {
      out[regionId] = { x: sx / count, y: sy / count, z: sz / count, count };
    }
  }
  return out;
}

function dist3(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * @param {{ x: number; y: number; z: number }} vertex
 * @param {Partial<Record<string, { x: number; y: number; z: number; count: number }>>} centroids
 */
function classifyVertexRegion(vertex, centroids) {
  let best = 'mouth';
  let bestDist = Number.POSITIVE_INFINITY;
  for (const [regionId, c] of Object.entries(centroids)) {
    if (!c) continue;
    const d = dist3(vertex, c);
    if (d < bestDist) {
      bestDist = d;
      best = regionId;
    }
  }
  return best;
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
function summarizeRegionEnergy(
  mags,
  regionBySampleIndex,
  vertexSamples,
  expectedRegions,
  forbiddenRegions,
) {
  let total = 0;
  let expected = 0;
  let forbidden = 0;
  let left = 0;
  let right = 0;
  const midX =
    vertexSamples.reduce((s, v) => s + v.x, 0) / Math.max(vertexSamples.length, 1);
  for (let i = 0; i < mags.length; i += 1) {
    const e = mags[i];
    if (e <= SEMANTIC_THRESHOLDS_V1.noiseFloor) continue;
    total += e;
    const region = regionBySampleIndex[i];
    if (expectedRegions.includes(region)) expected += e;
    if (forbiddenRegions.includes(region)) forbidden += e;
    if (vertexSamples[i].x <= midX) left += e;
    else right += e;
  }
  return {
    totalEnergy: total,
    expectedEnergy: expected,
    forbiddenEnergy: forbidden,
    expectedRatio: total > 0 ? expected / total : 0,
    forbiddenRatio: total > 0 ? forbidden / total : 0,
    leftEnergy: left,
    rightEnergy: right,
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
    const ratio =
      summary.rightEnergy > SEMANTIC_THRESHOLDS_V1.noiseFloor
        ? summary.leftEnergy / summary.rightEnergy
        : summary.leftEnergy > SEMANTIC_THRESHOLDS_V1.minTotalEnergy
          ? Number.POSITIVE_INFINITY
          : 0;
    if (ratio < SEMANTIC_THRESHOLDS_V1.minSideDominanceRatio) {
      violations.push(
        `side_dominance_left_below:${ratio.toFixed(4)}<${SEMANTIC_THRESHOLDS_V1.minSideDominanceRatio}`,
      );
    }
  }
  if (rule.side === 'right') {
    const ratio =
      summary.leftEnergy > SEMANTIC_THRESHOLDS_V1.noiseFloor
        ? summary.rightEnergy / summary.leftEnergy
        : summary.rightEnergy > SEMANTIC_THRESHOLDS_V1.minTotalEnergy
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
  const centroids = regionCentroids(anchorPositions);
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

  const regionBySampleIndex = vertexSamples.map((v) => classifyVertexRegion(v, centroids));
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
    const summary = summarizeRegionEnergy(
      mags,
      regionBySampleIndex,
      vertexSamples,
      rule.expectedRegions,
      rule.forbiddenRegions,
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
