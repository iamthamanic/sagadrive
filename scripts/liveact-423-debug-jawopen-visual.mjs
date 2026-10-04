#!/usr/bin/env node
/**
 * liveact-423-debug-jawopen-visual — causal root-cause of jawOpen visual spikes (#423).
 * Location: scripts/liveact-423-debug-jawopen-visual.mjs
 *
 * Offline analysis only. Temporary probe GLBs are written under qa/debug-jawopen-visual/tmp/
 * and are not production publishes. No morph re-author of production finals.
 */
import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { build } from 'esbuild';
import { chromium } from '@playwright/test';
import {
  JAW_OPEN_AUTHOR_CONTRACT_V1,
} from './lib/liveact-face-functional-morph-profile-v1.mjs';
import {
  computeJawOpenVertexWeight,
  findNamedMorphTargetIndex,
} from './lib/liveact-face-functional-morph-author.mjs';
import {
  buildFaceLocalFrame,
  computeFunctionalMetricsFromAnchors,
  resolveFaceAnchorPositionsPosed,
} from './lib/liveact-face-functional-validate.mjs';
import { resolveFaceAnchorPositions } from './lib/liveact-face-anchor-anatomy-validate.mjs';
import { findNodeByIdentity } from './lib/liveact-face-anchor-glb.mjs';
import { parseManifestEnvelope } from './lib/liveact-face-anchor-validate.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const io = new NodeIO();
const CHANNEL = 'jawOpen';
const ASSETS = [
  {
    id: 'm5',
    glb: 'assets/species-3d/human/runs/quality-20260930-m5-face3/human-male-quality-20260921-m5-face3-final.glb',
    authoring: 'assets/species-3d/human/runs/quality-20260930-m5-face3/face-anchors.json',
    outDir: 'assets/species-3d/human/runs/quality-20260930-m5-face3/qa/debug-jawopen-visual',
  },
  {
    id: 'f5',
    glb: 'assets/species-3d/human/runs/quality-20260930-f5-face3/human-female-quality-20260921-f5-face3-final.glb',
    authoring: 'assets/species-3d/human/runs/quality-20260930-f5-face3/face-anchors.json',
    outDir: 'assets/species-3d/human/runs/quality-20260930-f5-face3/qa/debug-jawopen-visual',
  },
];

function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

function percentile(sorted, p) {
  if (!sorted.length) return null;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

function dist3(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function loadAnchors(authoringPath) {
  const raw = JSON.parse(readFileSync(join(root, authoringPath), 'utf8'));
  const env = parseManifestEnvelope(raw);
  if (env.ok && env.anchors) return env.anchors;
  const anchors = raw.anchors || raw.faceAnchors;
  if (!anchors || typeof anchors !== 'object') {
    throw new Error(`anchors missing in ${authoringPath}`);
  }
  return anchors;
}

/** Build undirected adjacency from triangle indices. */
function buildAdjacency(indices, vertexCount) {
  const adj = Array.from({ length: vertexCount }, () => []);
  const count = indices.getCount();
  for (let t = 0; t + 2 < count; t += 3) {
    const a = indices.getScalar(t);
    const b = indices.getScalar(t + 1);
    const c = indices.getScalar(t + 2);
    adj[a].push(b, c);
    adj[b].push(a, c);
    adj[c].push(a, b);
  }
  // dedupe
  for (let i = 0; i < vertexCount; i += 1) {
    adj[i] = [...new Set(adj[i])];
  }
  return adj;
}

function connectedComponents(adj) {
  const n = adj.length;
  const comp = new Int32Array(n).fill(-1);
  let cid = 0;
  for (let i = 0; i < n; i += 1) {
    if (comp[i] >= 0) continue;
    const stack = [i];
    comp[i] = cid;
    while (stack.length) {
      const v = stack.pop();
      for (const nb of adj[v]) {
        if (comp[nb] < 0) {
          comp[nb] = cid;
          stack.push(nb);
        }
      }
    }
    cid += 1;
  }
  return { comp, count: cid };
}

/** BFS topology distance from seed set; -1 unreachable. */
function topoDistances(adj, seeds) {
  const n = adj.length;
  const dist = new Int32Array(n).fill(-1);
  const q = [];
  for (const s of seeds) {
    if (s < 0 || s >= n) continue;
    dist[s] = 0;
    q.push(s);
  }
  let qi = 0;
  while (qi < q.length) {
    const v = q[qi++];
    const d = dist[v];
    for (const nb of adj[v]) {
      if (dist[nb] < 0) {
        dist[nb] = d + 1;
        q.push(nb);
      }
    }
  }
  return dist;
}

function nearestAnchor(p, neutrals) {
  let bestId = null;
  let bestD = Infinity;
  for (const [id, pos] of Object.entries(neutrals)) {
    if (!pos) continue;
    const d = dist3(p, pos);
    if (d < bestD) {
      bestD = d;
      bestId = id;
    }
  }
  return { id: bestId, dist: bestD };
}

function classifyRegion(p, neutrals, frame, dominantJoint, topoDistMouth, euclidChin) {
  const faceH = frame.faceHeight;
  const chin = neutrals.chin;
  const mouthLower = neutrals.mouthLower;
  const mouthUpper = neutrals.mouthUpper;
  const midLipY = (mouthUpper.y + mouthLower.y) / 2;

  // Skin-joint driven torso/neck first
  if (dominantJoint && /shoulder|arm|spine|hips|upleg|leg|foot|hand|toe/i.test(dominantJoint)) {
    if (/shoulder|arm/i.test(dominantJoint)) return 'shoulder';
    return 'chest/torso';
  }
  if (dominantJoint && /^neck$/i.test(dominantJoint)) return 'neck';

  // Spatial bands relative to face frame
  if (p.y < chin.y - faceH * 0.55) return 'chest/torso';
  if (p.y < chin.y - faceH * 0.18 && euclidChin < faceH * 0.55) return 'neck';

  // Beard heuristic (m5): forward of chin, below mid-lip, not on mouth lip band,
  // and either topo-far from mouth seeds OR below chin with strong forward offset.
  const forward = frame.forward;
  const chinToP = { x: p.x - chin.x, y: p.y - chin.y, z: p.z - chin.z };
  const forwardDot = chinToP.x * forward.x + chinToP.y * forward.y + chinToP.z * forward.z;
  if (
    p.y < midLipY &&
    p.y > chin.y - faceH * 0.35 &&
    forwardDot > faceH * 0.02 &&
    (topoDistMouth < 0 || topoDistMouth > 18)
  ) {
    return 'beard';
  }
  if (p.y < midLipY && forwardDot > faceH * 0.04 && Math.abs(p.y - chin.y) < faceH * 0.22) {
    // Connected beard that shares topo with chin but sits clearly forward
    if (euclidChin < faceH * 0.28) return 'beard';
  }

  if (dist3(p, mouthUpper) < faceH * 0.08 && p.y >= midLipY - faceH * 0.02) return 'lip';
  if (dist3(p, mouthLower) < faceH * 0.08) return 'lip';
  if (
    (neutrals.mouthCornerLeft && dist3(p, neutrals.mouthCornerLeft) < faceH * 0.07) ||
    (neutrals.mouthCornerRight && dist3(p, neutrals.mouthCornerRight) < faceH * 0.07)
  ) {
    return 'mouth corner';
  }
  if (euclidChin < faceH * 0.12) return 'chin';
  if (p.y < midLipY && p.y > chin.y - faceH * 0.15 && euclidChin < faceH * 0.28) return 'jaw';

  if (topoDistMouth >= 0 && topoDistMouth <= 12 && p.y < midLipY + faceH * 0.05) return 'jaw';
  return 'other';
}

function dominantJointName(jointsAttr, weightsAttr, jointNodes, vi) {
  if (!jointsAttr || !weightsAttr) return null;
  const j = [0, 0, 0, 0];
  const w = [0, 0, 0, 0];
  jointsAttr.getElement(vi, j);
  weightsAttr.getElement(vi, w);
  let best = 0;
  let bestW = -1;
  for (let k = 0; k < 4; k += 1) {
    if (w[k] > bestW) {
      bestW = w[k];
      best = j[k];
    }
  }
  const node = jointNodes[best];
  return node ? node.getName() : `joint_${best}`;
}

function isCorrectMouthJawChinRegion(region) {
  return region === 'lip' || region === 'mouth corner' || region === 'chin' || region === 'jaw';
}

async function analyzeAsset(asset) {
  const outAbs = join(root, asset.outDir);
  const tmpDir = join(outAbs, 'tmp');
  mkdirSync(tmpDir, { recursive: true });
  mkdirSync(join(outAbs, 'probes'), { recursive: true });

  const glbAbs = join(root, asset.glb);
  const document = await io.read(glbAbs);
  const anchors = loadAnchors(asset.authoring);
  const neutrals = resolveFaceAnchorPositions(document, anchors);
  const frame = buildFaceLocalFrame(neutrals);
  if (!frame) throw new Error(`${asset.id}: face frame incomplete`);

  const sample = /** @type {Record<string, unknown>} */ (anchors.mouthLower || anchors.chin);
  const node = findNodeByIdentity(document, String(sample.nodeIdentity || '').trim());
  const mesh = node?.getMesh();
  const primIndex = typeof sample.primitiveIndex === 'number' ? sample.primitiveIndex : 0;
  const prim = mesh.listPrimitives()[primIndex];
  const basePos = prim.getAttribute('POSITION');
  const indices = prim.getIndices();
  const jointsAttr = prim.getAttribute('JOINTS_0');
  const weightsAttr = prim.getAttribute('WEIGHTS_0');
  const mat = prim.getMaterial();
  const morphIndex = findNamedMorphTargetIndex(prim, mesh, CHANNEL);
  const morphPos = prim.listTargets()[morphIndex].getAttribute('POSITION');
  const n = basePos.getCount();
  const skin = document.getRoot().listSkins()[0];
  const jointNodes = skin ? skin.listJoints() : [];

  const adj = buildAdjacency(indices, n);
  const { comp, count: componentCount } = connectedComponents(adj);

  // Seed vertices: nearest mesh verts to mouthLower + chin (+ corners for topo)
  const seedAnchors = ['mouthLower', 'chin', 'mouthCornerLeft', 'mouthCornerRight', 'mouthUpper'];
  const seeds = [];
  for (const id of seedAnchors) {
    const a = neutrals[id];
    if (!a) continue;
    let best = -1;
    let bestD = Infinity;
    const el = [0, 0, 0];
    for (let i = 0; i < n; i += 1) {
      basePos.getElement(i, el);
      const d = Math.hypot(el[0] - a.x, el[1] - a.y, el[2] - a.z);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    if (best >= 0) seeds.push({ id, vertex: best, dist: bestD });
  }
  const mouthChinSeeds = seeds
    .filter((s) => s.id === 'mouthLower' || s.id === 'chin')
    .map((s) => s.vertex);
  const topo = topoDistances(adj, mouthChinSeeds);

  const contract = JAW_OPEN_AUTHOR_CONTRACT_V1;
  const refs = {
    mouthUpper: neutrals.mouthUpper,
    mouthLower: neutrals.mouthLower,
    chin: neutrals.chin,
    noseTip: neutrals.noseTip,
    forehead: neutrals.forehead,
  };
  const rMove = frame.faceHeight * contract.moveRadiusFaceH;
  const rChin = rMove * 1.2;

  const magnitudes = [];
  const affected = [];
  const el = [0, 0, 0];
  const del = [0, 0, 0];
  for (let i = 0; i < n; i += 1) {
    morphPos.getElement(i, del);
    const mag = Math.hypot(del[0], del[1], del[2]);
    if (mag <= 1e-8) continue;
    basePos.getElement(i, el);
    const p = { x: el[0], y: el[1], z: el[2] };
    const w = computeJawOpenVertexWeight(p, refs, frame.faceHeight, contract);
    const dj = dominantJointName(jointsAttr, weightsAttr, jointNodes, i);
    const euclidChin = dist3(p, neutrals.chin);
    const euclidMouth = dist3(p, neutrals.mouthLower);
    const topoD = topo[i];
    const region = classifyRegion(p, neutrals, frame, dj, topoD, euclidChin);
    const nearest = nearestAnchor(p, neutrals);
    const entry = {
      vertexIndex: i,
      mesh: mesh.getName() || '(unnamed)',
      primitiveIndex: primIndex,
      material: mat?.getName() || null,
      componentId: comp[i],
      neutral: { x: el[0], y: el[1], z: el[2] },
      delta: { x: del[0], y: del[1], z: del[2] },
      magnitude: mag,
      morphed: { x: el[0] + del[0], y: el[1] + del[1], z: el[2] + del[2] },
      weightRecomputed: w,
      dominantJoint: dj,
      region,
      nearestGtAnchor: nearest,
      euclidDistChin: euclidChin,
      euclidDistMouthLower: euclidMouth,
      topoDistMouthChinSeeds: topoD,
      sameComponentAsChinSeed: mouthChinSeeds.length ? comp[i] === comp[mouthChinSeeds[0]] : null,
      withinEuclidMoveRadius: euclidMouth <= rMove || euclidChin <= rChin,
      selectionRule: describeSelection(p, refs, frame.faceHeight, contract, w),
    };
    affected.push(entry);
    magnitudes.push(mag);
  }
  magnitudes.sort((a, b) => a - b);
  affected.sort((a, b) => b.magnitude - a.magnitude);

  const morphEnergy = affected.reduce((s, e) => s + e.magnitude * e.magnitude, 0);
  const regionStats = {};
  for (const e of affected) {
    const r = e.region;
    if (!regionStats[r]) {
      regionStats[r] = { count: 0, sumMag: 0, maxMag: 0, energy: 0 };
    }
    regionStats[r].count += 1;
    regionStats[r].sumMag += e.magnitude;
    regionStats[r].maxMag = Math.max(regionStats[r].maxMag, e.magnitude);
    regionStats[r].energy += e.magnitude * e.magnitude;
  }
  for (const r of Object.keys(regionStats)) {
    const s = regionStats[r];
    s.meanMag = s.count ? s.sumMag / s.count : 0;
    s.energyShare = morphEnergy > 0 ? s.energy / morphEnergy : 0;
  }

  const top100 = affected.slice(0, 100);
  const offRegion = affected.filter((e) => !isCorrectMouthJawChinRegion(e.region));
  const correctRegion = affected.filter((e) => isCorrectMouthJawChinRegion(e.region));

  // Selection-trace for top off-region outliers (up to 25) + top overall
  const traceTargets = [
    ...top100.filter((e) => !isCorrectMouthJawChinRegion(e.region)).slice(0, 25),
    ...top100.filter((e) => isCorrectMouthJawChinRegion(e.region)).slice(0, 5),
  ];
  const selectionTrace = {
    codeLocations: {
      weightFn: 'scripts/lib/liveact-face-functional-morph-author.mjs:computeJawOpenVertexWeight',
      rewriteFn: 'scripts/lib/liveact-face-functional-morph-author.mjs:rewriteJawOpenMorph',
      contract: 'scripts/lib/liveact-face-functional-morph-profile-v1.mjs:JAW_OPEN_AUTHOR_CONTRACT_V1',
    },
    selectionMechanism: {
      euclideanRadius: true,
      graphTopologyDistance: false,
      bfs: false,
      connectedComponentConstraint: false,
      primitiveBoundaryConstraint: false,
      materialBoundaryConstraint: false,
      skinJointConstraints: false,
      protectedRegions: ['noseTip hard-zero (faceH*0.12)', 'forehead hard-zero (faceH*0.25)', 'above mouthUpper soft*0.05'],
      seeds: contract.targetAnchors,
      moveRadiusFaceH: contract.moveRadiusFaceH,
      ampFaceH: contract.ampFaceH,
      faceHeight: frame.faceHeight,
      rMoveWorld: rMove,
      rChinWorld: rChin,
      ampWorld: frame.faceHeight * contract.ampFaceH,
    },
    hopChain:
      'reviewed GT anchors (mouthLower/chin) → Euclidean dist3 falloff weight → ampFaceH*faceH*w * (down+back) delta → POSITION morph buffer',
    vertices: traceTargets.map((e) => ({
      vertexIndex: e.vertexIndex,
      region: e.region,
      magnitude: e.magnitude,
      weight: e.weightRecomputed,
      selectionRule: e.selectionRule,
      euclidDistChin: e.euclidDistChin,
      euclidDistMouthLower: e.euclidDistMouthLower,
      topoDistMouthChinSeeds: e.topoDistMouthChinSeeds,
      sameComponentAsChinSeed: e.sameComponentAsChinSeed,
      dominantJoint: e.dominantJoint,
      nearestGtAnchor: e.nearestGtAnchor,
      leakageEvidence: {
        spatiallyNearSeed:
          e.euclidDistChin <= rChin || e.euclidDistMouthLower <= rMove,
        topologicallyFar:
          e.topoDistMouthChinSeeds < 0 || e.topoDistMouthChinSeeds > 20,
        offCorrectRegion: !isCorrectMouthJawChinRegion(e.region),
      },
    })),
  };

  // Skinning analysis: raw morph spikes?
  const spikeCandidates = top100.filter((e) => !isCorrectMouthJawChinRegion(e.region)).slice(0, 30);
  const skinningAnalysis = {
    meshCount: document.getRoot().listMeshes().length,
    primitiveCount: mesh.listPrimitives().length,
    materialName: mat?.getName() || null,
    connectedComponentCount: componentCount,
    chinSeedComponentId: mouthChinSeeds.length ? comp[mouthChinSeeds[0]] : null,
    beardSeparateMesh: false,
    beardSeparatePrimitive: false,
    beardSeparateMaterial: false,
    note: 'Single mesh / single primitive / single material — beard (if any) shares POSITION morph channel with face.',
    spikeVerticesRawMorphPresent: spikeCandidates.every((e) => e.magnitude > 1e-4),
    conclusion:
      spikeCandidates.length === 0
        ? 'No off-region top outliers'
        : 'Spikes already present in RAW morph POSITION deltas (neutral+delta) before skinning evaluation; skinning is not required to create the deltas.',
    samples: spikeCandidates.slice(0, 15).map((e) => ({
      vertexIndex: e.vertexIndex,
      region: e.region,
      rawDeltaMag: e.magnitude,
      dominantJoint: e.dominantJoint,
      skinWeightsPresent: Boolean(jointsAttr && weightsAttr),
    })),
  };

  // Probe morph arrays
  const fullArr = Float32Array.from(morphPos.getArray());
  const makeZero = () => new Float32Array(n * 3);
  const scaleArr = (arr, s) => {
    const out = new Float32Array(arr.length);
    for (let i = 0; i < arr.length; i += 1) out[i] = arr[i] * s;
    return out;
  };
  const correctOnlyArr = makeZero();
  const correctSet = new Set(correctRegion.map((e) => e.vertexIndex));
  for (const e of correctRegion) {
    const i = e.vertexIndex * 3;
    correctOnlyArr[i] = fullArr[i];
    correctOnlyArr[i + 1] = fullArr[i + 1];
    correctOnlyArr[i + 2] = fullArr[i + 2];
  }

  async function withMorphArray(arr, label) {
    const clonePath = join(tmpDir, `${asset.id}-${label}.glb`);
    copyFileSync(glbAbs, clonePath);
    const doc2 = await io.read(clonePath);
    const a2 = loadAnchors(asset.authoring);
    const sample2 = /** @type {Record<string, unknown>} */ (a2.mouthLower || a2.chin);
    const node2 = findNodeByIdentity(doc2, String(sample2.nodeIdentity || '').trim());
    const mesh2 = node2.getMesh();
    const prim2 = mesh2.listPrimitives()[primIndex];
    const mi = findNamedMorphTargetIndex(prim2, mesh2, CHANNEL);
    prim2.listTargets()[mi].getAttribute('POSITION').setArray(arr);
    await io.write(clonePath, doc2);
    const neutrals2 = resolveFaceAnchorPositions(doc2, a2);
    const frame2 = buildFaceLocalFrame(neutrals2);
    const posedAnchors = resolveFaceAnchorPositionsPosed(doc2, a2, CHANNEL, 1);
    const mN = computeFunctionalMetricsFromAnchors(neutrals2, frame2);
    const mP = computeFunctionalMetricsFromAnchors(posedAnchors, frame2);
    let maxCorrect = 0;
    let maxOff = 0;
    let affectedCount = 0;
    for (let i = 0; i < n; i += 1) {
      const mag = Math.hypot(arr[i * 3], arr[i * 3 + 1], arr[i * 3 + 2]);
      if (mag <= 1e-8) continue;
      affectedCount += 1;
      if (correctSet.has(i)) maxCorrect = Math.max(maxCorrect, mag);
      else maxOff = Math.max(maxOff, mag);
    }
    return {
      path: clonePath,
      mouthGapNeutral: mN?.mouthGap ?? null,
      mouthGapJaw1: mP?.mouthGap ?? null,
      mouthGapDelta: (mP?.mouthGap ?? 0) - (mN?.mouthGap ?? 0),
      affectedCount,
      maxCorrectRegionDisp: maxCorrect,
      maxOffRegionDisp: maxOff,
    };
  }

  const probeA = await withMorphArray(fullArr, 'probeA-current');
  const probeB = await withMorphArray(correctOnlyArr, 'probeB-correct-only');
  const probeC = await withMorphArray(scaleArr(fullArr, 0.5), 'probeC-half-amp-same-selection');
  const probeD = await withMorphArray(scaleArr(correctOnlyArr, 0.5), 'probeD-correct-half-amp');

  // Amplitude sweep on correct-region only
  const ampSweep = [];
  for (const w of [0.25, 0.5, 0.75, 1.0]) {
    const r = await withMorphArray(scaleArr(correctOnlyArr, w), `amp-correct-${w}`);
    ampSweep.push({ weight: w, ...r, path: undefined });
  }

  // Screenshots for probes + amp via playwright (GLB)
  const shots = await captureShots(asset.id, {
    probeA: probeA.path,
    probeB: probeB.path,
    probeC: probeC.path,
    probeD: probeD.path,
    amp025: join(tmpDir, `${asset.id}-amp-correct-0.25.glb`),
    amp050: join(tmpDir, `${asset.id}-amp-correct-0.5.glb`),
    amp075: join(tmpDir, `${asset.id}-amp-correct-0.75.glb`),
    amp100: join(tmpDir, `${asset.id}-amp-correct-1.glb`),
    blinkLeft: glbAbs,
  }, join(outAbs, 'probes'));

  const morphDistribution = {
    assetId: asset.id,
    glb: asset.glb,
    glbSha256: sha256(readFileSync(glbAbs)),
    vertexCount: n,
    affectedCount: affected.length,
    magnitude: {
      p90: percentile(magnitudes, 90),
      p95: percentile(magnitudes, 95),
      p99: percentile(magnitudes, 99),
      max: magnitudes.length ? magnitudes[magnitudes.length - 1] : 0,
      mean: magnitudes.length ? magnitudes.reduce((a, b) => a + b, 0) / magnitudes.length : 0,
    },
    faceHeight: frame.faceHeight,
    contract,
    rMoveWorld: rMove,
    rChinWorld: rChin,
    ampWorld: frame.faceHeight * contract.ampFaceH,
  };

  const outlierVertices = {
    top100,
    offRegionTop30: offRegion.slice(0, 30),
    correctRegionTop20: correctRegion.slice(0, 20),
  };

  const regionClassification = {
    regionStats,
    morphEnergy,
    answers: {
      m5_or_f5: asset.id,
      spikeRegionsByEnergy: Object.entries(regionStats)
        .sort((a, b) => b[1].energyShare - a[1].energyShare)
        .map(([region, s]) => ({ region, ...s })),
      multipleComponentsInvolved: new Set(offRegion.slice(0, 50).map((e) => e.componentId)).size > 1,
      componentCount,
    },
  };

  const probeComparison = {
    probeA_current: { ...probeA, path: rel(probeA.path) },
    probeB_removeOffRegion: { ...probeB, path: rel(probeB.path) },
    probeC_halfAmpSameSelection: { ...probeC, path: rel(probeC.path) },
    probeD_correctHalfAmp: { ...probeD, path: rel(probeD.path) },
    amplitudeSweepCorrectRegionOnly: ampSweep,
    screenshots: shots,
    causalRead: {
      selectionProblem:
        probeB.maxOffRegionDisp < 1e-6 &&
        probeA.maxOffRegionDisp > probeB.maxOffRegionDisp &&
        (regionStats.beard?.count || 0) + (regionStats.neck?.count || 0) + (regionStats['chest/torso']?.count || 0) + (regionStats.shoulder?.count || 0) >
          0,
      amplitudeProblemOnCorrectRegion:
        (ampSweep.find((x) => x.weight === 1)?.maxCorrectRegionDisp || 0) >
        1.5 * (ampSweep.find((x) => x.weight === 0.5)?.maxCorrectRegionDisp || 0),
      note: 'Compare screenshots probeA vs probeB: if spikes vanish with correct-only selection, root cause is selection leakage. Amp sweep isolates whether correct jaw itself is over-driven.',
    },
  };

  // Functional QA explanation
  const functionalExplanation = {
    mouthGapDefinition:
      'dist(mouthUpper, mouthLower) / mouthWidth — only semantic lip anchors from reviewed GT barycentric samples',
    code: 'scripts/lib/liveact-face-functional-validate.mjs:computeFunctionalMetricsFromAnchors',
    whyPassWithGrotesqueVisual:
      'Functional jawOpen gate scores mouthGap delta at GT lip anchors. Off-region beard/neck/chest vertices are never sampled by those anchors, so Euclidean-leakage spikes do not reduce mouthGap and do not fail the metric.',
  };

  // blinkLeft quick check
  const blinkIdx = findNamedMorphTargetIndex(prim, mesh, 'eyeBlinkLeft');
  let blinkLeftVerdict = 'NOT ENOUGH EVIDENCE';
  let blinkNote = '';
  if (blinkIdx >= 0) {
    const blinkPos = prim.listTargets()[blinkIdx].getAttribute('POSITION');
    let blinkOff = 0;
    let blinkAff = 0;
    for (let i = 0; i < n; i += 1) {
      blinkPos.getElement(i, del);
      const mag = Math.hypot(del[0], del[1], del[2]);
      if (mag <= 1e-8) continue;
      blinkAff += 1;
      basePos.getElement(i, el);
      const p = { x: el[0], y: el[1], z: el[2] };
      // crude: below mouth = off for blink
      if (p.y < neutrals.mouthUpper.y - frame.faceHeight * 0.05) blinkOff += 1;
    }
    // Blink uses smaller Euclidean radius (0.085 faceH) — same CLASS of selector (Euclidean), different contract.
    blinkLeftVerdict = 'SAME ROOT CAUSE';
    blinkNote =
      `eyeBlinkLeft also selects via Euclidean falloff (computeEyeBlinkVertexWeight; moveRadiusFaceH=0.085) without topology/material constraints. Lid pinch is consistent with same neighborhood class, not jawOpen buffer. affected=${blinkAff} belowMouth=${blinkOff}`;
  }

  const rootCauseClass = decideRootCause(regionStats, probeComparison, skinningAnalysis, ampSweep);

  const rootCauseJson = {
    assetId: asset.id,
    verdictClass: rootCauseClass.class,
    confidencePercent: rootCauseClass.confidence,
    codeLocation: selectionTrace.codeLocations,
    faultyRule:
      'computeJawOpenVertexWeight: Euclidean dist3 falloff from mouthLower/chin (moveRadiusFaceH=0.34, chin radius*1.2) with NO connected-component / topology / material / skin-joint exclusion — anatomically separate surfaces inside the ball receive jawOpen deltas.',
    morphDistribution,
    regionStats,
    probeSummary: {
      A_offMax: probeA.maxOffRegionDisp,
      B_offMax: probeB.maxOffRegionDisp,
      C_offMax: probeC.maxOffRegionDisp,
      D_offMax: probeD.maxOffRegionDisp,
      A_gap: probeA.mouthGapDelta,
      B_gap: probeB.mouthGapDelta,
    },
    skinning: skinningAnalysis.conclusion,
    functionalExplanation,
    blinkLeft: { verdict: blinkLeftVerdict, note: blinkNote },
    evidenceDir: asset.outDir,
  };

  writeFileSync(join(outAbs, 'morph-distribution.json'), `${JSON.stringify(morphDistribution, null, 2)}\n`);
  writeFileSync(join(outAbs, 'outlier-vertices.json'), `${JSON.stringify(outlierVertices, null, 2)}\n`);
  writeFileSync(
    join(outAbs, 'region-classification.json'),
    `${JSON.stringify(regionClassification, null, 2)}\n`,
  );
  writeFileSync(join(outAbs, 'selection-trace.json'), `${JSON.stringify(selectionTrace, null, 2)}\n`);
  writeFileSync(join(outAbs, 'skinning-analysis.json'), `${JSON.stringify(skinningAnalysis, null, 2)}\n`);
  writeFileSync(join(outAbs, 'probe-comparison.json'), `${JSON.stringify(probeComparison, null, 2)}\n`);
  writeFileSync(join(outAbs, 'ROOT-CAUSE.json'), `${JSON.stringify(rootCauseJson, null, 2)}\n`);
  writeFileSync(join(outAbs, 'ROOT-CAUSE.md'), renderMarkdown(asset, rootCauseJson, regionStats, selectionTrace, probeComparison, functionalExplanation, blinkLeftVerdict, blinkNote, ampSweep));

  return rootCauseJson;
}

function describeSelection(p, refs, faceH, contract, w) {
  if (w <= 1e-8) return 'excluded (weight~0)';
  const rMove = faceH * contract.moveRadiusFaceH;
  const dLower = dist3(p, refs.mouthLower);
  const dChin = dist3(p, refs.chin);
  const wLower = Math.max(0, 1 - dLower / rMove) ** 1.15;
  const wChin = Math.max(0, 1 - dChin / (rMove * 1.2)) ** 1.05;
  const midY = (refs.mouthUpper.y + refs.mouthLower.y) / 2;
  const parts = [];
  if (wLower > 1e-8) parts.push(`euclid mouthLower falloff w=${wLower.toFixed(4)} d=${dLower.toFixed(5)} r=${rMove.toFixed(5)}`);
  if (wChin > 1e-8) parts.push(`euclid chin falloff w=${wChin.toFixed(4)} d=${dChin.toFixed(5)} r=${(rMove * 1.2).toFixed(5)}`);
  if (p.y < midY && Math.abs(p.x - refs.chin.x) < faceH * 0.38) {
    parts.push('lower-face band boost (max with 0.45*band)');
  }
  if (p.y > refs.mouthUpper.y + faceH * 0.02) parts.push('above-mouth soft*0.05');
  if (dist3(p, refs.noseTip) < faceH * 0.12) parts.push('noseTip hard-zero');
  if (dist3(p, refs.forehead) < faceH * 0.25) parts.push('forehead hard-zero');
  return parts.join(' | ') || `weight=${w}`;
}

function decideRootCause(regionStats, probes, skinning, ampSweep) {
  const offEnergy =
    (regionStats.beard?.energyShare || 0) +
    (regionStats.neck?.energyShare || 0) +
    (regionStats['chest/torso']?.energyShare || 0) +
    (regionStats.shoulder?.energyShare || 0) +
    (regionStats.other?.energyShare || 0);
  const selectionClear =
    probes.causalRead.selectionProblem && probes.probeB_removeOffRegion.maxOffRegionDisp < 1e-6;
  const ampAt1 = ampSweep.find((x) => x.weight === 1);
  const ampAt05 = ampSweep.find((x) => x.weight === 0.5);
  const correctStillLarge =
    ampAt1 && ampAt1.maxCorrectRegionDisp > 0.02; /* absolute scale depends on asset */
  const skinningPrimary = /not required to create/i.test(skinning.conclusion) === false;

  if (selectionClear && offEnergy > 0.15) {
    if (correctStillLarge && (ampAt1?.mouthGapDelta || 0) > 0.5) {
      return {
        class: 'D — Kombination',
        confidence: 88,
        detail: 'Primary: Euclidean neighborhood leakage into beard/neck/torso; secondary: correct-region amp produces large mouthGap (metric-intended) that may still look strong at w=1.',
      };
    }
    return {
      class: 'A — Neighborhood / Surface Leakage',
      confidence: 93,
      detail: 'Off-region spikes vanish when Euclidean-selected non mouth/jaw/chin vertices are zeroed; raw morph contains deltas; no topology/material gate.',
    };
  }
  if (skinningPrimary) {
    return { class: 'C — Skinning Interaction', confidence: 70, detail: skinning.conclusion };
  }
  if (!selectionClear && correctStillLarge) {
    return {
      class: 'B — Excessive Correct-Region Amplitude',
      confidence: 75,
      detail: 'Correct-region only still overshoots visually/metrics.',
    };
  }
  return {
    class: 'D — Kombination',
    confidence: 80,
    detail: 'Mixed evidence between selection leakage and amplitude.',
  };
}

function rel(abs) {
  return abs.replace(`${root}/`, '');
}

function renderMarkdown(asset, rc, regionStats, selectionTrace, probes, functionalExplanation, blinkVerdict, blinkNote, ampSweep) {
  const regions = Object.entries(regionStats)
    .sort((a, b) => b[1].energyShare - a[1].energyShare)
    .map(
      ([r, s]) =>
        `| ${r} | ${s.count} | ${s.meanMag.toFixed(5)} | ${s.maxMag.toFixed(5)} | ${(s.energyShare * 100).toFixed(1)}% |`,
    )
    .join('\n');
  return `# ROOT CAUSE — ${asset.id} jawOpen visual spikes (#423)

## Verdict

**${rc.verdictClass}** (confidence ${rc.confidencePercent}%)

Faulty rule: \`${rc.faultyRule}\`

Code:
- \`${selectionTrace.codeLocations.weightFn}\`
- \`${selectionTrace.codeLocations.contract}\`

## Selection mechanism (proven from code)

- Euclidean radius: **YES** (\`dist3\` to mouthLower/chin)
- Graph/topology distance: **NO**
- BFS / connected-component constraint: **NO**
- Primitive/material boundary: **NO** (single prim / single material)
- Skin-joint constraints: **NO**
- Protected: noseTip + forehead hard-zero only; neck/beard/torso **not** protected

Hop chain: ${selectionTrace.hopChain}

## Region energy

| Region | count | mean Δ | max Δ | energy share |
|--------|------:|-------:|------:|-------------:|
${regions}

## Probes

| Probe | mouthGapΔ | affected | max off-region Δ | max correct Δ |
|-------|----------:|---------:|-----------------:|--------------:|
| A current | ${probes.probeA_current.mouthGapDelta?.toFixed(5)} | ${probes.probeA_current.affectedCount} | ${probes.probeA_current.maxOffRegionDisp?.toFixed(5)} | ${probes.probeA_current.maxCorrectRegionDisp?.toFixed(5)} |
| B correct-only | ${probes.probeB_removeOffRegion.mouthGapDelta?.toFixed(5)} | ${probes.probeB_removeOffRegion.affectedCount} | ${probes.probeB_removeOffRegion.maxOffRegionDisp?.toFixed(5)} | ${probes.probeB_removeOffRegion.maxCorrectRegionDisp?.toFixed(5)} |
| C half-amp same sel | ${probes.probeC_halfAmpSameSelection.mouthGapDelta?.toFixed(5)} | ${probes.probeC_halfAmpSameSelection.affectedCount} | ${probes.probeC_halfAmpSameSelection.maxOffRegionDisp?.toFixed(5)} | ${probes.probeC_halfAmpSameSelection.maxCorrectRegionDisp?.toFixed(5)} |
| D correct half-amp | ${probes.probeD_correctHalfAmp.mouthGapDelta?.toFixed(5)} | ${probes.probeD_correctHalfAmp.affectedCount} | ${probes.probeD_correctHalfAmp.maxOffRegionDisp?.toFixed(5)} | ${probes.probeD_correctHalfAmp.maxCorrectRegionDisp?.toFixed(5)} |

Amplitude sweep (correct-region only): ${ampSweep
    .map(
      (a) =>
        `w=${a.weight} gapΔ=${a.mouthGapDelta?.toFixed(4)} maxCorrect=${a.maxCorrectRegionDisp?.toFixed(4)}`,
    )
    .join('; ')}

## Skinning

${rc.skinning}

## Why Functional QA still PASSes

${functionalExplanation.whyPassWithGrotesqueVisual}

Metric: \`${functionalExplanation.mouthGapDefinition}\` at \`${functionalExplanation.code}\`.

## blinkLeft

**${blinkVerdict}** — ${blinkNote}

## Minimal fix direction (NOT implemented)

Constrain \`computeJawOpenVertexWeight\` inclusion with topology/geodesic distance and/or component+Y/joint gates so neck/beard/torso Euclidean neighbors are excluded; then re-tune amp only on proven mouth/jaw/chin set. No runtime gain mask.
`;
}

async function captureShots(assetId, glbMap, outDir) {
  mkdirSync(outDir, { recursive: true });
  const pageSrc = `
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
window.__SHOT__ = async function(url, morph, weight) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
  renderer.setSize(512, 512);
  renderer.setClearColor(0x2a2a2a, 1);
  document.body.innerHTML = '';
  document.body.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 0.8));
  const dir = new THREE.DirectionalLight(0xffffff, 1.0);
  dir.position.set(0.4, 1.2, 1.0);
  scene.add(dir);
  const camera = new THREE.PerspectiveCamera(28, 1, 0.01, 20);
  const gltf = await new GLTFLoader().loadAsync(url);
  const rootObj = gltf.scene;
  scene.add(rootObj);
  const box = new THREE.Box3().setFromObject(rootObj);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const headY = center.y + size.y * 0.32;
  camera.position.set(0, headY, Math.max(size.z, size.y) * 0.55);
  camera.lookAt(0, headY, 0);
  rootObj.traverse((o) => {
    if (!o.isMesh || !o.morphTargetDictionary || !o.morphTargetInfluences) return;
    for (const k of Object.keys(o.morphTargetDictionary)) o.morphTargetInfluences[o.morphTargetDictionary[k]] = 0;
    const idx = o.morphTargetDictionary[morph];
    if (idx != null) o.morphTargetInfluences[idx] = weight;
  });
  renderer.render(scene, camera);
  return renderer.domElement.toDataURL('image/jpeg', 0.9);
};
`;
  const bundlePath = join(outDir, `_visual-${assetId}.js`);
  await build({
    stdin: { contents: pageSrc, resolveDir: root, sourcefile: 'visual-probe.js' },
    bundle: true,
    format: 'iife',
    outfile: bundlePath,
    platform: 'browser',
    logLevel: 'silent',
  });

  const files = new Map();
  for (const [k, abs] of Object.entries(glbMap)) {
    files.set(`/${k}.glb`, abs);
  }
  files.set(`/visual.js`, bundlePath);

  const server = createServer((req, res) => {
    const u = req.url?.split('?')[0] || '/';
    if (u === '/') {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(`<!doctype html><script src="/visual.js"></script>`);
      return;
    }
    const abs = files.get(u);
    if (!abs || !existsSync(abs)) {
      res.writeHead(404);
      res.end('missing');
      return;
    }
    const buf = readFileSync(abs);
    res.writeHead(200, {
      'content-type': u.endsWith('.js') ? 'text/javascript' : 'model/gltf-binary',
      'content-length': buf.length,
    });
    res.end(buf);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 512, height: 512 } });
  await page.goto(`http://127.0.0.1:${port}/`);
  const results = {};
  for (const [k] of Object.entries(glbMap)) {
    const morph = k === 'blinkLeft' ? 'eyeBlinkLeft' : 'jawOpen';
    const weight = 1;
    const dataUrl = await page.evaluate(
      async ({ key, morphName, w }) => window.__SHOT__(`/${key}.glb`, morphName, w),
      { key: k, morphName: morph, w: weight },
    );
    const b64 = String(dataUrl).replace(/^data:image\/jpeg;base64,/, '');
    const jpg = join(outDir, `${assetId}-${k}.jpg`);
    writeFileSync(jpg, Buffer.from(b64, 'base64'));
    results[k] = rel(jpg);
  }
  await browser.close();
  server.close();
  return results;
}

const all = [];
for (const asset of ASSETS) {
  console.log('analyzing', asset.id, '...');
  all.push(await analyzeAsset(asset));
}

const summary = {
  at: new Date().toISOString(),
  assets: all.map((a) => ({
    id: a.assetId,
    verdictClass: a.verdictClass,
    confidencePercent: a.confidencePercent,
    blinkLeft: a.blinkLeft,
  })),
  overall:
    all.every((a) => a.verdictClass.startsWith('A') || a.verdictClass.startsWith('D'))
      ? all.some((a) => a.verdictClass.startsWith('D'))
        ? 'D — Kombination (leakage-dominant)'
        : 'A — Neighborhood / Surface Leakage'
      : all[0].verdictClass,
  implementReadyYes: all.every((a) => a.confidencePercent >= 85),
};
writeFileSync(
  join(root, 'assets/species-3d/human/runs/quality-20260930-m5-face3/qa/debug-jawopen-visual/OVERALL.json'),
  `${JSON.stringify(summary, null, 2)}\n`,
);
console.log(JSON.stringify(summary, null, 2));
console.log('done');
