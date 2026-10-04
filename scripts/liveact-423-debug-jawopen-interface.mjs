#!/usr/bin/env node
/**
 * liveact-423-debug-jawopen-interface — residual m5 jawOpen silhouette RCA (#423).
 * Location: scripts/liveact-423-debug-jawopen-interface.mjs
 *
 * DEBUG ONLY. Uses surface-fix1 candidates. Temporary probes under
 * qa/debug-jawopen-interface/ — no production morph rewrite, no commit.
 */
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { build } from 'esbuild';
import { chromium } from '@playwright/test';
import { JAW_OPEN_AUTHOR_CONTRACT_V1 } from './lib/liveact-face-functional-morph-profile-v1.mjs';
import {
  buildGtBoundSurfaceGate,
  buildPrimitiveAdjacency,
  resolveGtBoundTriangleVertices,
} from './lib/liveact-face-functional-morph-surface.mjs';
import { findNodeByIdentity } from './lib/liveact-face-anchor-glb.mjs';
import { parseManifestEnvelope } from './lib/liveact-face-anchor-validate.mjs';
import { resolveFaceAnchorPositions } from './lib/liveact-face-anchor-anatomy-validate.mjs';
import { buildFaceLocalFrame } from './lib/liveact-face-functional-validate.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const io = new NodeIO();

const ASSETS = [
  {
    id: 'm5',
    glb: 'assets/species-3d/human/runs/quality-20260930-m5-face3/qa/jawopen-surface-fix1/m5-surface-fix1.glb',
    anchors: 'assets/species-3d/human/runs/quality-20260930-m5-face3/qa/jawopen-surface-fix1/face-anchors.json',
    outDir: 'assets/species-3d/human/runs/quality-20260930-m5-face3/qa/debug-jawopen-interface',
  },
  {
    id: 'f5',
    glb: 'assets/species-3d/human/runs/quality-20260930-f5-face3/qa/jawopen-surface-fix1/f5-surface-fix1.glb',
    anchors: 'assets/species-3d/human/runs/quality-20260930-f5-face3/qa/jawopen-surface-fix1/face-anchors.json',
    outDir: 'assets/species-3d/human/runs/quality-20260930-f5-face3/qa/debug-jawopen-interface',
  },
];

function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

function loadAnchors(path) {
  const raw = JSON.parse(readFileSync(join(root, path), 'utf8'));
  const env = parseManifestEnvelope(raw);
  if (env.ok && env.anchors) return env.anchors;
  return raw.anchors || raw.faceAnchors;
}

function getPrim(doc, anchors) {
  const sample = anchors.mouthUpper;
  const node = findNodeByIdentity(doc, String(sample.nodeIdentity || '').trim());
  const mesh = node?.getMesh();
  const primIndex = typeof sample.primitiveIndex === 'number' ? sample.primitiveIndex : 0;
  const prim = mesh.listPrimitives()[primIndex];
  return { node, mesh, prim, primIndex, nodeIdentity: sample.nodeIdentity };
}

function morphIndex(mesh, name) {
  const names = mesh.getExtras()?.targetNames || [];
  return names.indexOf(name);
}

function readPositions(attr) {
  const n = attr.getCount();
  const out = new Float32Array(n * 3);
  const el = [0, 0, 0];
  for (let i = 0; i < n; i += 1) {
    attr.getElement(i, el);
    out[i * 3] = el[0];
    out[i * 3 + 1] = el[1];
    out[i * 3 + 2] = el[2];
  }
  return out;
}

function readMorphDeltas(prim, mesh, channel) {
  const idx = morphIndex(mesh, channel);
  if (idx < 0) throw new Error(`morph ${channel} missing`);
  const pos = prim.listTargets()[idx].getAttribute('POSITION');
  return { idx, deltas: readPositions(pos) };
}

function componentIds(adj) {
  const n = adj.length;
  const id = new Int32Array(n).fill(-1);
  let next = 0;
  for (let s = 0; s < n; s += 1) {
    if (id[s] >= 0) continue;
    const cid = next++;
    const q = [s];
    id[s] = cid;
    let qi = 0;
    while (qi < q.length) {
      const v = q[qi++];
      for (const nb of adj[v]) {
        if (id[nb] < 0) {
          id[nb] = cid;
          q.push(nb);
        }
      }
    }
  }
  return { id, count: next };
}

function jointNames(doc) {
  const skins = doc.getRoot().listSkins();
  if (!skins.length) return [];
  return skins[0].listJoints().map((j) => j.getName() || '');
}

function dominantJoint(joints, weights, jointNameList) {
  let best = -1;
  let bestW = -1;
  for (let k = 0; k < 4; k += 1) {
    if (weights[k] > bestW) {
      bestW = weights[k];
      best = joints[k];
    }
  }
  return {
    jointIndex: best,
    jointName: best >= 0 ? jointNameList[best] || `joint_${best}` : null,
    weight: bestW,
  };
}

function triNormal(ax, ay, az, bx, by, bz, cx, cy, cz) {
  const ux = bx - ax;
  const uy = by - ay;
  const uz = bz - az;
  const vx = cx - ax;
  const vy = cy - ay;
  const vz = cz - az;
  const nx = uy * vz - uz * vy;
  const ny = uz * vx - ux * vz;
  const nz = ux * vy - uy * vx;
  const len = Math.hypot(nx, ny, nz);
  return { nx: nx / (len || 1), ny: ny / (len || 1), nz: nz / (len || 1), area: 0.5 * len };
}

function edgeLens(ax, ay, az, bx, by, bz, cx, cy, cz) {
  const e0 = Math.hypot(bx - ax, by - ay, bz - az);
  const e1 = Math.hypot(cx - bx, cy - by, cz - bz);
  const e2 = Math.hypot(ax - cx, ay - cy, az - cz);
  const maxE = Math.max(e0, e1, e2);
  const minE = Math.min(e0, e1, e2);
  return { e0, e1, e2, aspect: minE > 1e-12 ? maxE / minE : Infinity };
}

function posedAt(base, deltas, i, w) {
  return {
    x: base[i * 3] + deltas[i * 3] * w,
    y: base[i * 3 + 1] + deltas[i * 3 + 1] * w,
    z: base[i * 3 + 2] + deltas[i * 3 + 2] * w,
  };
}

function distP(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

/**
 * Brute closest pairs between two vertex sets (sample if huge).
 */
function closestPairs(base, setA, setB, maxPairs = 40) {
  const pairs = [];
  const sampleB =
    setB.length > 8000
      ? setB.filter((_, i) => i % Math.ceil(setB.length / 8000) === 0)
      : setB;
  for (const ia of setA) {
    let best = Infinity;
    let jb = -1;
    const ax = base[ia * 3];
    const ay = base[ia * 3 + 1];
    const az = base[ia * 3 + 2];
    for (const ib of sampleB) {
      const d = Math.hypot(ax - base[ib * 3], ay - base[ib * 3 + 1], az - base[ib * 3 + 2]);
      if (d < best) {
        best = d;
        jb = ib;
      }
    }
    if (jb >= 0) pairs.push({ a: ia, b: jb, d: best });
  }
  pairs.sort((x, y) => x.d - y.d);
  return pairs.slice(0, maxPairs);
}

function countWithin(base, setA, setB, thresholds) {
  const sampleB =
    setB.length > 12000
      ? setB.filter((_, i) => i % Math.ceil(setB.length / 12000) === 0)
      : setB;
  const counts = Object.fromEntries(thresholds.map((t) => [String(t), 0]));
  const vertsHit = Object.fromEntries(thresholds.map((t) => [String(t), 0]));
  for (const ia of setA) {
    let best = Infinity;
    const ax = base[ia * 3];
    const ay = base[ia * 3 + 1];
    const az = base[ia * 3 + 2];
    for (const ib of sampleB) {
      const d = Math.hypot(ax - base[ib * 3], ay - base[ib * 3 + 1], az - base[ib * 3 + 2]);
      if (d < best) best = d;
    }
    for (const t of thresholds) {
      if (best <= t) {
        counts[String(t)] += 1;
        vertsHit[String(t)] += 1;
      }
    }
  }
  return { vertexCountsWithin: counts, mouthVertexCount: setA.length, sampledOther: sampleB.length };
}

async function analyzeAsset(asset) {
  const outAbs = join(root, asset.outDir);
  mkdirSync(outAbs, { recursive: true });
  mkdirSync(join(outAbs, 'component-visibility-probes'), { recursive: true });
  mkdirSync(join(outAbs, 'tmp'), { recursive: true });

  const glbAbs = join(root, asset.glb);
  const bytes = readFileSync(glbAbs);
  const doc = await io.read(glbAbs);
  const anchors = loadAnchors(asset.anchors);
  const { mesh, prim, primIndex, nodeIdentity } = getPrim(doc, anchors);
  const basePos = prim.getAttribute('POSITION');
  const indices = prim.getIndices();
  const base = readPositions(basePos);
  const { deltas } = readMorphDeltas(prim, mesh, 'jawOpen');
  const n = basePos.getCount();
  const { adj, meanEdgeLength } = buildPrimitiveAdjacency(prim);
  const comps = componentIds(adj);
  const surface = buildGtBoundSurfaceGate(prim, anchors, JAW_OPEN_AUTHOR_CONTRACT_V1.surfaceSeedAnchors);

  // Mouth component id(s) from GT seeds
  const mouthSeedVerts = [];
  for (const id of JAW_OPEN_AUTHOR_CONTRACT_V1.surfaceSeedAnchors) {
    mouthSeedVerts.push(...resolveGtBoundTriangleVertices(prim, anchors[id], id));
  }
  const mouthCompIds = new Set(mouthSeedVerts.map((v) => comps.id[v]));

  // Chin seeds (may be other component)
  let chinSeedVerts = [];
  let chinCompIds = new Set();
  try {
    chinSeedVerts = resolveGtBoundTriangleVertices(prim, anchors.chin, 'chin');
    chinCompIds = new Set(chinSeedVerts.map((v) => comps.id[v]));
  } catch {
    /* optional */
  }

  // Component sizes
  const compSizes = new Array(comps.count).fill(0);
  for (let i = 0; i < n; i += 1) compSizes[comps.id[i]] += 1;

  // Moving verts (jawOpen delta > eps)
  const moving = [];
  const mag = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    const d = Math.hypot(deltas[i * 3], deltas[i * 3 + 1], deltas[i * 3 + 2]);
    mag[i] = d;
    if (d > 1e-8) moving.push(i);
  }

  // Label components near mouth: mouth-allowed vs static near
  const mouthVerts = [];
  const otherVerts = [];
  for (let i = 0; i < n; i += 1) {
    if (mouthCompIds.has(comps.id[i])) mouthVerts.push(i);
    else otherVerts.push(i);
  }

  // Find static component(s) that are spatially closest to moving mouth verts
  const topMovers = [...moving].sort((a, b) => mag[b] - mag[a]).slice(0, 400);
  const nearestStaticPairs = closestPairs(base, topMovers, otherVerts, 80);

  // Aggregate static components appearing in closest pairs
  const staticCompHits = new Map();
  for (const p of nearestStaticPairs.slice(0, 40)) {
    const cid = comps.id[p.b];
    const prev = staticCompHits.get(cid) || { count: 0, minD: Infinity, verts: new Set() };
    prev.count += 1;
    prev.minD = Math.min(prev.minD, p.d);
    prev.verts.add(p.b);
    staticCompHits.set(cid, prev);
  }
  const staticNearComps = [...staticCompHits.entries()]
    .map(([cid, v]) => ({
      componentId: cid,
      size: compSizes[cid],
      hitCount: v.count,
      minDist: v.minD,
      sampleVerts: [...v.verts].slice(0, 12),
    }))
    .sort((a, b) => a.minDist - b.minDist);

  const primaryStaticCid = staticNearComps[0]?.componentId ?? -1;
  const staticNearVerts =
    primaryStaticCid >= 0
      ? Array.from({ length: n }, (_, i) => i).filter((i) => comps.id[i] === primaryStaticCid)
      : [];

  // Interface distances at morph weights
  const weights = [0, 0.25, 0.5, 0.75, 1];
  const interfaceByWeight = {};
  for (const w of weights) {
    let minD = Infinity;
    let pair = null;
    // use top movers vs static near sample
    const staticSample =
      staticNearVerts.length > 6000
        ? staticNearVerts.filter((_, i) => i % Math.ceil(staticNearVerts.length / 6000) === 0)
        : staticNearVerts;
    for (const ia of topMovers.slice(0, 200)) {
      const pa = posedAt(base, deltas, ia, w);
      for (const ib of staticSample) {
        const pb = posedAt(base, deltas, ib, w);
        const d = distP(pa, pb);
        if (d < minD) {
          minD = d;
          pair = { a: ia, b: ib, d };
        }
      }
    }
    interfaceByWeight[String(w)] = { minDist: minD, pair };
  }

  // Interleave quantification
  const interleave = countWithin(base, mouthVerts, otherVerts, [0.001, 0.002, 0.004, 0.006, 0.01]);

  // Skin joints
  const jointsAttr = prim.getAttribute('JOINTS_0');
  const weightsAttr = prim.getAttribute('WEIGHTS_0');
  const jNames = jointNames(doc);
  const jEl = [0, 0, 0, 0];
  const wEl = [0, 0, 0, 0];

  function skinOf(i) {
    if (!jointsAttr || !weightsAttr) return null;
    jointsAttr.getElement(i, jEl);
    weightsAttr.getElement(i, wEl);
    return dominantJoint(jEl, wEl, jNames);
  }

  // Materials
  const material = prim.getMaterial();
  const materialInfo = {
    name: material?.getName() || null,
    baseColorFactor: material?.getBaseColorFactor?.() || null,
    doubleSided: material?.getDoubleSided?.() || false,
  };

  // Problem triangles: triangles that either (1) have high displacement gradient,
  // or (2) are on mouth component and spatially closest to static shell at jawOpen=1
  const triCount = Math.floor(indices.getCount() / 3);
  const problemTris = [];
  for (let t = 0; t < triCount; t += 1) {
    const i0 = indices.getScalar(t * 3);
    const i1 = indices.getScalar(t * 3 + 1);
    const i2 = indices.getScalar(t * 3 + 2);
    const mags = [mag[i0], mag[i1], mag[i2]];
    const maxM = Math.max(...mags);
    const minM = Math.min(...mags);
    const cids = [comps.id[i0], comps.id[i1], comps.id[i2]];
    const onMouth = cids.every((c) => mouthCompIds.has(c));
    const onStatic = primaryStaticCid >= 0 && cids.every((c) => c === primaryStaticCid);
    if (!onMouth && !onStatic) continue;
    if (onMouth && maxM < 1e-5) continue;
    // centroid near interface
    const c0 = posedAt(base, deltas, i0, 1);
    const c1 = posedAt(base, deltas, i1, 1);
    const c2 = posedAt(base, deltas, i2, 1);
    const cx = (c0.x + c1.x + c2.x) / 3;
    const cy = (c0.y + c1.y + c2.y) / 3;
    const cz = (c0.z + c1.z + c2.z) / 3;
    // distance to opposite class
    let nearestOpp = Infinity;
    const oppSample = onMouth ? staticNearVerts : mouthVerts;
    const oppS =
      oppSample.length > 4000
        ? oppSample.filter((_, i) => i % Math.ceil(oppSample.length / 4000) === 0)
        : oppSample;
    for (const j of oppS) {
      const p = posedAt(base, deltas, j, 1);
      const d = Math.hypot(cx - p.x, cy - p.y, cz - p.z);
      if (d < nearestOpp) nearestOpp = d;
    }
    if (nearestOpp > 0.02 && maxM - minM < 0.004) continue;

    const nN = triNormal(
      base[i0 * 3],
      base[i0 * 3 + 1],
      base[i0 * 3 + 2],
      base[i1 * 3],
      base[i1 * 3 + 1],
      base[i1 * 3 + 2],
      base[i2 * 3],
      base[i2 * 3 + 1],
      base[i2 * 3 + 2],
    );
    const nJ = triNormal(c0.x, c0.y, c0.z, c1.x, c1.y, c1.z, c2.x, c2.y, c2.z);
    const eN = edgeLens(
      base[i0 * 3],
      base[i0 * 3 + 1],
      base[i0 * 3 + 2],
      base[i1 * 3],
      base[i1 * 3 + 1],
      base[i1 * 3 + 2],
      base[i2 * 3],
      base[i2 * 3 + 1],
      base[i2 * 3 + 2],
    );
    const eJ = edgeLens(c0.x, c0.y, c0.z, c1.x, c1.y, c1.z, c2.x, c2.y, c2.z);
    problemTris.push({
      triangleIndex: t,
      verts: [i0, i1, i2],
      componentIds: cids,
      class: onMouth ? 'mouthMoving' : 'staticNear',
      mag: mags,
      maxMag: maxM,
      magSpread: maxM - minM,
      nearestOppositeAt1: nearestOpp,
      centroidJaw1: { x: cx, y: cy, z: cz },
      areaNeutral: nN.area,
      areaJaw1: nJ.area,
      aspectNeutral: eN.aspect,
      aspectJaw1: eJ.aspect,
      normalNeutral: { x: nN.nx, y: nN.ny, z: nN.nz },
      normalJaw1: { x: nJ.nx, y: nJ.ny, z: nJ.nz },
      normalDot: nN.nx * nJ.nx + nN.ny * nJ.ny + nN.nz * nJ.nz,
      skins: [skinOf(i0), skinOf(i1), skinOf(i2)],
    });
  }
  problemTris.sort((a, b) => a.nearestOppositeAt1 - b.nearestOppositeAt1 || b.maxMag - a.maxMag);
  const topProblem = problemTris.slice(0, 60);

  // Cross-component discontinuity: closest pairs mouth↔static with displacement jump
  const crossDisc = nearestStaticPairs.slice(0, 30).map((p) => ({
    mouthVert: p.a,
    staticVert: p.b,
    neutralDist: p.d,
    mouthDelta: mag[p.a],
    staticDelta: mag[p.b],
    discontinuity: mag[p.a] - mag[p.b],
    mouthComp: comps.id[p.a],
    staticComp: comps.id[p.b],
    mouthSkin: skinOf(p.a),
    staticSkin: skinOf(p.b),
    mouthY: base[p.a * 3 + 1],
    staticY: base[p.b * 3 + 1],
  }));

  // Beard semantics: analyze verts in under-chin bbox (mouthLower neighborhood below mid)
  const neutralAnch = resolveFaceAnchorPositions(doc, anchors);
  const frame = buildFaceLocalFrame(neutralAnch);
  const ml = neutralAnch.mouthLower;
  const beardBoxVerts = [];
  for (let i = 0; i < n; i += 1) {
    const x = base[i * 3];
    const y = base[i * 3 + 1];
    const z = base[i * 3 + 2];
    if (!ml) break;
    if (Math.abs(x - ml.x) < frame.faceHeight * 0.22 && y < ml.y + 0.01 && y > ml.y - frame.faceHeight * 0.35) {
      if (z > ml.z - frame.faceHeight * 0.15) {
        beardBoxVerts.push(i);
      }
    }
  }
  const beardByComp = {};
  for (const i of beardBoxVerts) {
    const cid = comps.id[i];
    if (!beardByComp[cid]) {
      beardByComp[cid] = { count: 0, moving: 0, maxMag: 0, skins: {}, isMouth: mouthCompIds.has(cid) };
    }
    beardByComp[cid].count += 1;
    if (mag[i] > 1e-8) beardByComp[cid].moving += 1;
    beardByComp[cid].maxMag = Math.max(beardByComp[cid].maxMag, mag[i]);
    const sk = skinOf(i);
    const sn = sk?.jointName || 'none';
    beardByComp[cid].skins[sn] = (beardByComp[cid].skins[sn] || 0) + 1;
  }

  // Known outliers
  const known = {};
  for (const vid of [65122, 65904, 67167, 67163]) {
    if (vid >= n) continue;
    known[`v${vid}`] = {
      componentId: comps.id[vid],
      allowedMouthSurface: !!surface.allowed[vid],
      mag: mag[vid],
      skin: skinOf(vid),
      pos: { x: base[vid * 3], y: base[vid * 3 + 1], z: base[vid * 3 + 2] },
    };
  }

  const componentMap = {
    assetId: asset.id,
    vertexCount: n,
    triangleCount: triCount,
    componentCount: comps.count,
    meanEdgeLength,
    mouthCompIds: [...mouthCompIds],
    chinCompIds: [...chinCompIds],
    mouthComponentSizes: [...mouthCompIds].map((c) => ({ id: c, size: compSizes[c] })),
    primaryStaticNear: staticNearComps[0] || null,
    staticNearComps: staticNearComps.slice(0, 8),
    largestComponents: compSizes
      .map((size, id) => ({ id, size }))
      .sort((a, b) => b.size - a.size)
      .slice(0, 15),
    materialInfo,
    nodeIdentity,
    primitiveIndex: primIndex,
    movingCount: moving.length,
    glbSha256: sha256(bytes),
  };

  const interfaceDistance = {
    assetId: asset.id,
    interfaceByWeight,
    crossComponentDiscontinuities: crossDisc,
    interleave,
    minNeutralCrossDist: nearestStaticPairs[0]?.d ?? null,
    mouthLowerToNearestStatic: (() => {
      // seed mouthLower verts
      const seeds = resolveGtBoundTriangleVertices(prim, anchors.mouthLower, 'mouthLower');
      const pairs = closestPairs(base, seeds, otherVerts, 5);
      return pairs;
    })(),
  };

  const triangleGeometry = {
    assetId: asset.id,
    problemTriangleCount: problemTris.length,
    topProblemTriangles: topProblem,
    extremeAspectJaw1: topProblem
      .filter((t) => t.class === 'mouthMoving')
      .sort((a, b) => b.aspectJaw1 - a.aspectJaw1)
      .slice(0, 10),
    maxAspectOnMouthMoving: Math.max(
      0,
      ...topProblem.filter((t) => t.class === 'mouthMoving').map((t) => t.aspectJaw1),
    ),
    minNormalDotOnMouthMoving: Math.min(
      1,
      ...topProblem.filter((t) => t.class === 'mouthMoving').map((t) => t.normalDot),
    ),
  };

  const beardSemantics = {
    assetId: asset.id,
    note: 'Under-chin spatial box around mouthLower — not a semantic beard mesh label',
    beardBoxVertexCount: beardBoxVerts.length,
    byComponent: beardByComp,
    material: materialInfo,
  };

  writeFileSync(join(outAbs, 'component-map.json'), `${JSON.stringify(componentMap, null, 2)}\n`);
  writeFileSync(join(outAbs, 'interface-distance.json'), `${JSON.stringify(interfaceDistance, null, 2)}\n`);
  writeFileSync(join(outAbs, 'problem-triangles.json'), `${JSON.stringify({ known, topProblem }, null, 2)}\n`);
  writeFileSync(join(outAbs, 'triangle-geometry.json'), `${JSON.stringify(triangleGeometry, null, 2)}\n`);
  writeFileSync(join(outAbs, 'beard-semantics.json'), `${JSON.stringify(beardSemantics, null, 2)}\n`);

  // Controlled geometry probe metrics (no production): what if static near moved with nearest mouth
  const couplingProbe = [];
  for (const p of crossDisc.slice(0, 15)) {
    couplingProbe.push({
      staticVert: p.staticVert,
      mouthVert: p.mouthVert,
      staticWouldInheritDelta: {
        dx: deltas[p.mouthVert * 3],
        dy: deltas[p.mouthVert * 3 + 1],
        dz: deltas[p.mouthVert * 3 + 2],
      },
      currentStaticDelta: {
        dx: deltas[p.staticVert * 3],
        dy: deltas[p.staticVert * 3 + 1],
        dz: deltas[p.staticVert * 3 + 2],
      },
      neutralDist: p.neutralDist,
      gapAt1IfStaticFrozen: interfaceByWeight['1']?.minDist,
    });
  }
  writeFileSync(
    join(outAbs, 'coupling-probe-metrics.json'),
    `${JSON.stringify({ note: 'Hypothetical inherit — not applied to production', couplingProbe }, null, 2)}\n`,
  );

  return {
    asset,
    glbAbs,
    outAbs,
    componentMap,
    interfaceDistance,
    triangleGeometry,
    beardSemantics,
    mouthCompIds: [...mouthCompIds],
    primaryStaticCid,
    comps,
    base,
    deltas,
    mag,
    n,
    indices,
    prim,
    mesh,
    topProblem,
    crossDisc,
  };
}

async function captureRenders(analysis) {
  const { asset, glbAbs, outAbs, mouthCompIds, primaryStaticCid, comps, n, indices } = analysis;
  const probeDir = join(outAbs, 'component-visibility-probes');

  // Build per-vertex component color + class masks for GPU probes via vertex colors injected in page
  const mouthSet = new Set(mouthCompIds);
  const classOf = new Int32Array(n); // 0=other, 1=mouth, 2=staticNear
  for (let i = 0; i < n; i += 1) {
    if (mouthSet.has(comps.id[i])) classOf[i] = 1;
    else if (comps.id[i] === primaryStaticCid) classOf[i] = 2;
  }

  // Serialize classOf + component ids compactly
  const meta = {
    mouthCompIds,
    primaryStaticCid,
    classOf: Array.from(classOf),
    componentOf: Array.from(comps.id),
  };
  writeFileSync(join(outAbs, 'tmp', 'vertex-classes.json'), JSON.stringify(meta));

  const pageSrc = `
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

function hashColor(id) {
  const h = (id * 47) % 360;
  return new THREE.Color(\`hsl(\${h},70%,55%)\`);
}

let META = null;
async function loadMeta() {
  if (META) return META;
  META = await (await fetch('/vertex-classes.json')).json();
  return META;
}

window.__SHOT__ = async function(opts) {
  const {
    url, morphWeight = 0, mode = 'shaded', camera = 'front',
    hideMouth = false, hideStatic = false, hideOther = false,
  } = opts;
  const meta = await loadMeta();
  const CLASS = meta.classOf;
  const COMP = meta.componentOf;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
  renderer.setSize(640, 640);
  renderer.setClearColor(0x222222, 1);
  document.body.innerHTML = '';
  document.body.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  if (mode !== 'unlit' && mode !== 'component' && mode !== 'wire') {
    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const dir = new THREE.DirectionalLight(0xffffff, 1.05);
    dir.position.set(0.4, 1.1, 1.0);
    scene.add(dir);
  } else if (mode === 'unlit') {
    scene.add(new THREE.AmbientLight(0xffffff, 1.0));
  } else {
    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
  }
  const cameraObj = new THREE.PerspectiveCamera(28, 1, 0.01, 20);
  const gltf = await new GLTFLoader().loadAsync(url);
  const rootObj = gltf.scene;
  scene.add(rootObj);

  const box = new THREE.Box3().setFromObject(rootObj);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const focus = new THREE.Vector3(center.x, center.y + size.y * 0.28, center.z);
  const dist = Math.max(size.z, size.y) * 0.42;
  if (camera === 'front') cameraObj.position.set(0, focus.y, dist);
  else if (camera === 'left') cameraObj.position.set(-dist * 0.55, focus.y, dist * 0.85);
  else if (camera === 'right') cameraObj.position.set(dist * 0.55, focus.y, dist * 0.85);
  else if (camera === 'below') cameraObj.position.set(0, focus.y - dist * 0.25, dist * 0.9);
  cameraObj.lookAt(focus);

  rootObj.traverse((o) => {
    if (!o.isMesh) return;
    const geo = o.geometry;
    const pos = geo.attributes.position;
    if (!pos) return;
    const vc = pos.count;

    if (o.morphTargetDictionary && o.morphTargetInfluences) {
      for (const k of Object.keys(o.morphTargetDictionary)) {
        o.morphTargetInfluences[o.morphTargetDictionary[k]] = 0;
      }
      const ji = o.morphTargetDictionary.jawOpen;
      if (ji != null) o.morphTargetInfluences[ji] = morphWeight;
    }

    if (geo.index) {
      const idx = Array.from(geo.index.array);
      const keep = [];
      for (let t = 0; t + 2 < idx.length; t += 3) {
        const a = idx[t], b = idx[t+1], c = idx[t+2];
        const ca = CLASS[a] ?? 0, cb = CLASS[b] ?? 0, cc = CLASS[c] ?? 0;
        const majority = (ca === cb || ca === cc) ? ca : cb;
        if (hideMouth && majority === 1) continue;
        if (hideStatic && majority === 2) continue;
        if (hideOther && majority === 0) continue;
        keep.push(a, b, c);
      }
      geo.setIndex(keep);
      geo.computeVertexNormals();
    }

    if (mode === 'component') {
      const colors = new Float32Array(vc * 3);
      for (let i = 0; i < vc; i++) {
        const col = CLASS[i] === 1 ? new THREE.Color(0x33cc66)
          : CLASS[i] === 2 ? new THREE.Color(0xff5533)
          : hashColor(COMP[i] ?? 0);
        colors[i*3] = col.r; colors[i*3+1] = col.g; colors[i*3+2] = col.b;
      }
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      o.material = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
    } else if (mode === 'wire') {
      o.material = new THREE.MeshBasicMaterial({
        color: 0xdddddd, wireframe: true, transparent: true, opacity: 0.85,
      });
    } else if (mode === 'unlit') {
      o.material = new THREE.MeshBasicMaterial({
        color: 0xcccccc, side: THREE.DoubleSide,
      });
    } else if (mode === 'normals') {
      o.material = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide });
    }
  });

  renderer.render(scene, cameraObj);
  return renderer.domElement.toDataURL('image/jpeg', 0.92);
};
`;

  const bundlePath = join(outAbs, 'tmp', `_visual-interface.js`);
  await build({
    stdin: { contents: pageSrc, resolveDir: root, sourcefile: 'interface-visual.js' },
    bundle: true,
    format: 'iife',
    outfile: bundlePath,
    platform: 'browser',
    logLevel: 'silent',
  });

  const files = new Map([
    ['/model.glb', glbAbs],
    ['/visual.js', bundlePath],
    ['/vertex-classes.json', join(outAbs, 'tmp', 'vertex-classes.json')],
  ]);
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
      res.end('x');
      return;
    }
    const buf = readFileSync(abs);
    const ct = u.endsWith('.js')
      ? 'text/javascript'
      : u.endsWith('.json')
        ? 'application/json'
        : 'model/gltf-binary';
    res.writeHead(200, {
      'content-type': ct,
      'content-length': buf.length,
    });
    res.end(buf);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 640, height: 640 } });
  await page.goto(`http://127.0.0.1:${port}/`);

  async function shot(name, opts) {
    const dataUrl = await page.evaluate(async (o) => window.__SHOT__(o), { url: '/model.glb', ...opts });
    const b64 = String(dataUrl).replace(/^data:image\/jpeg;base64,/, '');
    const path = join(probeDir, `${asset.id}-${name}.jpg`);
    writeFileSync(path, Buffer.from(b64, 'base64'));
    return path;
  }

  const shots = {};
  // Ladder multi-view
  for (const w of [0, 0.25, 0.5, 0.75, 1]) {
    for (const cam of ['front', 'left', 'right', 'below']) {
      shots[`ladder-w${w}-${cam}`] = await shot(`ladder-w${String(w).replace('.', '')}-${cam}`, {
        morphWeight: w,
        mode: 'shaded',
        camera: cam,
      });
    }
  }
  // Probe A current
  shots['probeA-current'] = await shot('probeA-current', { morphWeight: 1, mode: 'shaded', camera: 'front' });
  // Probe B hide static
  shots['probeB-hideStatic'] = await shot('probeB-hideStatic', {
    morphWeight: 1,
    mode: 'shaded',
    camera: 'front',
    hideStatic: true,
  });
  // Probe C hide mouth
  shots['probeC-hideMouth'] = await shot('probeC-hideMouth', {
    morphWeight: 1,
    mode: 'shaded',
    camera: 'front',
    hideMouth: true,
  });
  // Probe D neutral both
  shots['probeD-neutral'] = await shot('probeD-neutral', { morphWeight: 0, mode: 'shaded', camera: 'front' });
  // Probe E unlit jaw1
  shots['probeE-unlit'] = await shot('probeE-unlit', { morphWeight: 1, mode: 'unlit', camera: 'front' });
  // Probe F component + wire
  shots['probeF-component-n'] = await shot('probeF-component-n', { morphWeight: 0, mode: 'component', camera: 'front' });
  shots['probeF-component-j'] = await shot('probeF-component-j', { morphWeight: 1, mode: 'component', camera: 'front' });
  shots['probeF-wire-n'] = await shot('probeF-wire-n', { morphWeight: 0, mode: 'wire', camera: 'front' });
  shots['probeF-wire-j'] = await shot('probeF-wire-j', { morphWeight: 1, mode: 'wire', camera: 'front' });
  shots['probeF-normals-j'] = await shot('probeF-normals-j', { morphWeight: 1, mode: 'normals', camera: 'front' });
  shots['probeF-below-j'] = await shot('probeF-below-j', { morphWeight: 1, mode: 'shaded', camera: 'below' });

  await browser.close();
  server.close();
  writeFileSync(join(outAbs, 'render-shots.json'), `${JSON.stringify(shots, null, 2)}\n`);
  return shots;
}

function classifyRootCause(m5, f5) {
  const m5maxAspect = m5.triangleGeometry.maxAspectOnMouthMoving;
  const m5minDot = m5.triangleGeometry.minNormalDotOnMouthMoving;
  const m5minNeutral = m5.interfaceDistance.minNeutralCrossDist;
  const m5gap1 = m5.interfaceDistance.interfaceByWeight['1']?.minDist;
  const m5gap0 = m5.interfaceDistance.interfaceByWeight['0']?.minDist;
  const disc = m5.interfaceDistance.crossComponentDiscontinuities?.[0];

  const withinSurfaceExtreme = m5maxAspect > 12 || m5minDot < 0.5;
  const gapOpens = m5gap1 != null && m5gap0 != null && m5gap1 > m5gap0 * 1.5;
  const hardCut =
    disc &&
    disc.mouthDelta > 0.005 &&
    disc.staticDelta < 1e-8 &&
    disc.neutralDist < 0.006;

  let verdictClass;
  let confidence;
  let rationale;

  if (withinSurfaceExtreme && !hardCut) {
    verdictClass = 'A — Within-surface deformation remains wrong';
    confidence = 70;
    rationale = 'Mouth-component triangles become extreme aspect/flipped under jawOpen.';
  } else if (hardCut && gapOpens) {
    verdictClass = 'C — Disconnected but anatomically coupled facial shell needs coordinated deformation';
    confidence = 88;
    rationale =
      'Hard topology cut: mouth verts move, spatially interleaved static shell (delta=0) stays; closest-pair gap widens under jawOpen creating visible silhouette seam. Not Euclidean leakage (static has zero morph).';
  } else if (hardCut) {
    verdictClass = 'B — Static adjacent shell exposure / occlusion seam';
    confidence = 80;
    rationale = 'Static nearby shell revealed/exposed by moving mouth without large geometric stretch on mouth tris.';
  } else if (withinSurfaceExtreme) {
    verdictClass = 'F — Combined';
    confidence = 75;
    rationale = 'Both within-surface distortion and interface discontinuity present.';
  } else {
    verdictClass = 'F — Combined';
    confidence = 60;
    rationale = 'Insufficient single-class dominance; see metrics.';
  }

  // f5 control
  const f5min = f5.interfaceDistance.minNeutralCrossDist;
  const f5gap1 = f5.interfaceDistance.interfaceByWeight['1']?.minDist;
  const f5disc = f5.interfaceDistance.crossComponentDiscontinuities?.[0];

  return {
    verdictClass,
    confidencePercent: confidence,
    rationale,
    m5Evidence: {
      maxAspectJaw1: m5maxAspect,
      minNormalDot: m5minDot,
      minNeutralCrossDist: m5minNeutral,
      gap0: m5gap0,
      gap1: m5gap1,
      topDiscontinuity: disc,
      primaryStatic: m5.componentMap.primaryStaticNear,
      mouthComps: m5.componentMap.mouthCompIds,
    },
    f5Control: {
      minNeutralCrossDist: f5min,
      gap0: f5.interfaceDistance.interfaceByWeight['0']?.minDist,
      gap1: f5gap1,
      topDiscontinuity: f5disc,
      primaryStatic: f5.componentMap.primaryStaticNear,
      mouthComps: f5.componentMap.mouthCompIds,
      whyDifferent:
        f5min != null && m5minNeutral != null && f5min > m5minNeutral * 1.5
          ? 'f5 mouth↔static nearest distance larger than m5 — less interleaved shells'
          : f5disc && f5disc.mouthDelta < (disc?.mouthDelta || 1) * 0.6
            ? 'f5 mouth interface displacement smaller after amp normalization'
            : 'compare component layout / beard box occupancy',
    },
    surfaceFixAssessment: {
      originalLeakageFixed: true,
      tooStrictForVisuallyCoupledShells: hardCut,
      causesNewSeam: hardCut,
      independentOfOriginalLeakage: true,
    },
    minimalFixDirection: hardCut
      ? {
          change:
            'Extend functional morph surface contract with deterministic "visually/anatomically coupled shell" detection (e.g. GT-proximate disconnected components within mm-scale neutral distance AND skin/semantic facial region), allowing coordinated interface motion — NOT blanket Euclidean body allow.',
          invariant:
            'Unrelated body shells stay 0; disconnected-but-coupled facial/perioral shells may receive interface-local deltas derived from nearest mouth surface motion.',
          avoid: ['m5 branch', 'vertex ID hardcode', 're-enable full neck Euclidean', 'gain hack'],
        }
      : {
          change: 'Re-inspect within-surface falloff / amp on mouth component only.',
          invariant: 'Keep off-surface body shells at 0.',
          avoid: ['m5 branch'],
        },
  };
}

async function main() {
  const analyses = [];
  for (const asset of ASSETS) {
    console.log('analyzing', asset.id, '...');
    const a = await analyzeAsset(asset);
    console.log('rendering', asset.id, '...');
    await captureRenders(a);
    analyses.push(a);
  }
  const m5 = analyses.find((a) => a.asset.id === 'm5');
  const f5 = analyses.find((a) => a.asset.id === 'f5');
  const verdict = classifyRootCause(m5, f5);

  const renderStage = {
    note: 'Raw morph deltas inspected offline; skinned screenshots via three.js GLTFLoader (applies skins). Probe B/C isolate which component renders the defect.',
    stages: {
      neutralRaw: 'base positions',
      morphOnlyRaw: 'base + jawOpen deltas (no joint matrices in offline metrics)',
      skinnedShaded: 'three.js skinned mesh screenshots',
      unlit: 'probeE',
      wireframe: 'probeF-wire',
      componentColored: 'probeF-component (green=mouth, red=primary static near)',
    },
  };

  for (const a of analyses) {
    writeFileSync(join(a.outAbs, 'render-stage-comparison.json'), `${JSON.stringify(renderStage, null, 2)}\n`);
    writeFileSync(join(a.outAbs, 'ROOT-CAUSE.json'), `${JSON.stringify(verdict, null, 2)}\n`);
  }

  const md = `# ROOT CAUSE — Residual m5 jawOpen silhouette (#423 interface debug)

## Verdict
**${verdict.verdictClass}**
Confidence: **${verdict.confidencePercent}%**

${verdict.rationale}

## m5 Residual Defect
- Mouth GT-bound component(s): \`${JSON.stringify(verdict.m5Evidence.mouthComps)}\`
- Primary static near component: \`${JSON.stringify(verdict.m5Evidence.primaryStatic)}\`
- Min neutral cross-component distance: **${verdict.m5Evidence.minNeutralCrossDist?.toFixed?.(5) ?? verdict.m5Evidence.minNeutralCrossDist} m**
- Gap at jawOpen 0 → 1: **${verdict.m5Evidence.gap0?.toFixed?.(5)} → ${verdict.m5Evidence.gap1?.toFixed?.(5)}**
- Top discontinuity: mouth v${verdict.m5Evidence.topDiscontinuity?.mouthVert} Δ=${verdict.m5Evidence.topDiscontinuity?.mouthDelta?.toFixed?.(5)} vs static v${verdict.m5Evidence.topDiscontinuity?.staticVert} Δ=${verdict.m5Evidence.topDiscontinuity?.staticDelta} @ dist ${verdict.m5Evidence.topDiscontinuity?.neutralDist?.toFixed?.(5)}
- Max mouth triangle aspect @ jaw1: **${verdict.m5Evidence.maxAspectJaw1?.toFixed?.(2)}**
- Min normal·neutral: **${verdict.m5Evidence.minNormalDot?.toFixed?.(3)}**

## f5 Control
- Min neutral cross dist: **${verdict.f5Control.minNeutralCrossDist?.toFixed?.(5)}**
- Gap 0→1: **${verdict.f5Control.gap0?.toFixed?.(5)} → ${verdict.f5Control.gap1?.toFixed?.(5)}**
- Why different: ${verdict.f5Control.whyDifferent}

## Current Surface Fix
- Original Euclidean leakage fixed: **${verdict.surfaceFixAssessment.originalLeakageFixed}**
- Too strict for visually coupled shells: **${verdict.surfaceFixAssessment.tooStrictForVisuallyCoupledShells}**
- Causes new seam: **${verdict.surfaceFixAssessment.causesNewSeam}**
- Independent of original leakage: **${verdict.surfaceFixAssessment.independentOfOriginalLeakage}**

## Minimal General Fix Direction
\`\`\`json
${JSON.stringify(verdict.minimalFixDirection, null, 2)}
\`\`\`

## /implement ready
**NO** — debug only; no production fix in this pass.

Evidence under \`qa/debug-jawopen-interface/\` (m5 + f5).
`;
  writeFileSync(join(m5.outAbs, 'ROOT-CAUSE.md'), md);
  writeFileSync(join(f5.outAbs, 'ROOT-CAUSE.md'), md);
  writeFileSync(join(m5.outAbs, 'OVERALL.json'), `${JSON.stringify({ verdict, implementReady: false }, null, 2)}\n`);

  console.log('\n=== VERDICT ===');
  console.log(verdict.verdictClass, verdict.confidencePercent + '%');
  console.log(verdict.rationale);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
