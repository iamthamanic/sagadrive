/**
 * saga-human-canonical-v1/assemble — build one canonical human from parsed MakeHuman CC0 data.
 * Location: scripts/lib/saga-human-canonical-v1/assemble.mjs
 *
 * identity target → joint positions → pruned VRM-named rig + merged skin weights (top-4) →
 * proxy fitting (eyes / teeth / tongue / lashes / brows) → faceunit morphs propagated to every
 * part → triangulation with UV splits → smooth normals + normal deltas.
 * Output: meters, Y-up, +Z front, feet at y = 0; plain typed arrays for write-glb.mjs.
 */

import { deriveCanonicalFaceLandmarks } from './face-landmarks.mjs';

const DM_TO_M = 0.1;
const NORMAL_DELTA_EPSILON = 1e-4;
const JAW_MORPHS = ['jawOpen', 'jawLeft', 'jawRight', 'jawForward'];

/** Kept joints: VRM humanoid id (= glTF node name) ← MakeHuman bone. Order = skin joint order. */
export const CANONICAL_RIG_V1 = Object.freeze([
  { id: 'hips', source: 'root', parent: null },
  { id: 'spine', source: 'spine04', parent: 'hips' },
  { id: 'chest', source: 'spine02', parent: 'spine' },
  { id: 'neck', source: 'neck01', parent: 'chest' },
  { id: 'head', source: 'head', parent: 'neck' },
  { id: 'jaw', source: 'jaw', parent: 'head' },
  { id: 'leftEye', source: 'eye.L', parent: 'head' },
  { id: 'rightEye', source: 'eye.R', parent: 'head' },
  { id: 'leftShoulder', source: 'clavicle.L', parent: 'chest' },
  { id: 'leftUpperArm', source: 'upperarm01.L', parent: 'leftShoulder' },
  { id: 'leftLowerArm', source: 'lowerarm01.L', parent: 'leftUpperArm' },
  { id: 'leftHand', source: 'wrist.L', parent: 'leftLowerArm' },
  { id: 'rightShoulder', source: 'clavicle.R', parent: 'chest' },
  { id: 'rightUpperArm', source: 'upperarm01.R', parent: 'rightShoulder' },
  { id: 'rightLowerArm', source: 'lowerarm01.R', parent: 'rightUpperArm' },
  { id: 'rightHand', source: 'wrist.R', parent: 'rightLowerArm' },
  { id: 'leftUpperLeg', source: 'upperleg01.L', parent: 'hips' },
  { id: 'leftLowerLeg', source: 'lowerleg01.L', parent: 'leftUpperLeg' },
  { id: 'leftFoot', source: 'foot.L', parent: 'leftLowerLeg' },
  { id: 'rightUpperLeg', source: 'upperleg01.R', parent: 'hips' },
  { id: 'rightLowerLeg', source: 'lowerleg01.R', parent: 'rightUpperLeg' },
  { id: 'rightFoot', source: 'foot.R', parent: 'rightLowerLeg' },
]);

/** VRM humanoid map — `jaw` stays in the skin but is never a humanoid bone (morph owns the jaw). */
export function canonicalHumanoidRigBones() {
  const bones = {};
  for (const j of CANONICAL_RIG_V1) {
    if (j.id !== 'jaw') bones[j.id] = j.id;
  }
  return bones;
}

// ---------------------------------------------------------------------------
// Rig + weights
// ---------------------------------------------------------------------------

/**
 * @param {ReturnType<import('./makehuman-formats.mjs').parseMhskel>} skeleton
 * @returns {Map<string, number>} MakeHuman bone → index into CANONICAL_RIG_V1
 */
export function buildBoneMergeMap(skeleton) {
  const keptBySource = new Map(CANONICAL_RIG_V1.map((j, i) => [j.source, i]));
  for (const j of CANONICAL_RIG_V1) {
    if (!skeleton.bones[j.source]) throw new Error(`rig: MakeHuman bone ${j.source} missing`);
  }
  const merge = new Map();
  for (const name of Object.keys(skeleton.bones)) {
    let cur = name;
    while (cur != null && !keptBySource.has(cur)) cur = skeleton.bones[cur].parent ?? null;
    if (cur == null) throw new Error(`rig: bone ${name} has no kept ancestor`);
    merge.set(name, keptBySource.get(cur));
  }
  // Declared parents must equal the nearest kept MakeHuman ancestor (hierarchy stays truthful).
  for (const j of CANONICAL_RIG_V1) {
    const parentSource = skeleton.bones[j.source].parent;
    const actual = parentSource == null ? null : CANONICAL_RIG_V1[merge.get(parentSource)].id;
    if (actual !== j.parent) throw new Error(`rig: ${j.id} parent is ${actual}, declared ${j.parent}`);
  }
  return merge;
}

/**
 * Merge raw bone weights into kept joints, keep the 4 largest, renormalize.
 * @param {Map<number, number>} raw joint index → weight (may contain tiny negatives from barycentric transfer)
 * @returns {{ joints: number[]; weights: number[] } | null}
 */
export function finalizeSkinWeights(raw) {
  const entries = [...raw.entries()].filter(([, w]) => w > 0).sort((a, b) => b[1] - a[1] || a[0] - b[0]);
  const top = entries.slice(0, 4);
  const sum = top.reduce((s, [, w]) => s + w, 0);
  if (!(sum > 0)) return null;
  const joints = top.map(([j]) => j);
  const weights = top.map(([, w]) => w / sum);
  // Unused slots: joint 0 with weight 0 (Khronos warns on non-zero joints with zero weight).
  while (joints.length < 4) {
    joints.push(0);
    weights.push(0);
  }
  return { joints, weights };
}

function baseVertexWeights(vertexCount, mhw, merge) {
  /** @type {(Map<number, number> | undefined)[]} */
  const out = new Array(vertexCount);
  for (const [bone, list] of Object.entries(mhw)) {
    const jointIndex = merge.get(bone);
    if (jointIndex == null) throw new Error(`weights: bone ${bone} not in skeleton`);
    for (const [v, w] of list) {
      if (v < 0 || v >= vertexCount) throw new Error(`weights: vertex ${v} out of range for ${bone}`);
      const m = out[v] ?? (out[v] = new Map());
      m.set(jointIndex, (m.get(jointIndex) ?? 0) + w);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

/** Fan-triangulate polygons (hm08 is all quads; proxies are quads/triangles). */
function triangulate(faces) {
  const tris = [];
  for (const f of faces) {
    for (let k = 1; k + 1 < f.v.length; k += 1) {
      tris.push([
        [f.v[0], f.vt ? f.vt[0] : -1],
        [f.v[k], f.vt ? f.vt[k] : -1],
        [f.v[k + 1], f.vt ? f.vt[k + 1] : -1],
      ]);
    }
  }
  return tris;
}

/** Area-weighted smooth normals over source vertices (UV seams share normals). */
function sourceNormals(positions, sourceTris, count) {
  const n = new Float64Array(count * 3);
  for (const [a, b, c] of sourceTris) {
    const ax = positions[a * 3];
    const ay = positions[a * 3 + 1];
    const az = positions[a * 3 + 2];
    const ux = positions[b * 3] - ax;
    const uy = positions[b * 3 + 1] - ay;
    const uz = positions[b * 3 + 2] - az;
    const vx = positions[c * 3] - ax;
    const vy = positions[c * 3 + 1] - ay;
    const vz = positions[c * 3 + 2] - az;
    const cx = uy * vz - uz * vy;
    const cy = uz * vx - ux * vz;
    const cz = ux * vy - uy * vx;
    for (const i of [a, b, c]) {
      n[i * 3] += cx;
      n[i * 3 + 1] += cy;
      n[i * 3 + 2] += cz;
    }
  }
  for (let i = 0; i < count; i += 1) {
    const len = Math.hypot(n[i * 3], n[i * 3 + 1], n[i * 3 + 2]);
    if (len > 0) {
      n[i * 3] /= len;
      n[i * 3 + 1] /= len;
      n[i * 3 + 2] /= len;
    } else {
      n[i * 3 + 2] = 1;
    }
  }
  return n;
}

/**
 * Build one glTF-ready part over a local source vertex space.
 * @param {{
 *   name: string;
 *   faces: { v: number[]; vt: number[] | null }[];
 *   uvs: Float64Array;
 *   sourceCount: number;
 *   positions: Float64Array;
 *   weights: (i: number) => Map<number, number> | undefined;
 *   morphs: { name: string; deltas: Float64Array }[];
 * }} spec positions/deltas in meters over the local source space
 */
function buildPart(spec) {
  const { name, faces, uvs, sourceCount, positions } = spec;
  const tris = triangulate(faces);
  const pairIndex = new Map();
  const srcOf = [];
  const uvOf = [];
  const indices = new Uint32Array(tris.length * 3);
  const sourceTris = [];
  let t = 0;
  for (const tri of tris) {
    const st = [];
    for (const [v, vt] of tri) {
      if (vt < 0) throw new Error(`${name}: face without UVs`);
      const key = v * 1048576 + vt;
      let idx = pairIndex.get(key);
      if (idx == null) {
        idx = srcOf.length;
        pairIndex.set(key, idx);
        srcOf.push(v);
        uvOf.push(vt);
      }
      indices[t] = idx;
      t += 1;
      st.push(v);
    }
    sourceTris.push(st);
  }

  const n = srcOf.length;
  const outPos = new Float32Array(n * 3);
  const outUv = new Float32Array(n * 2);
  const outJoints = new Uint8Array(n * 4);
  const outWeights = new Float32Array(n * 4);
  const restNormals = sourceNormals(positions, sourceTris, sourceCount);
  const outNrm = new Float32Array(n * 3);
  let unweighted = 0;
  const finalized = new Map();
  for (let i = 0; i < n; i += 1) {
    const s = srcOf[i];
    for (let k = 0; k < 3; k += 1) {
      outPos[i * 3 + k] = positions[s * 3 + k];
      outNrm[i * 3 + k] = restNormals[s * 3 + k];
    }
    outUv[i * 2] = uvs[uvOf[i] * 2];
    outUv[i * 2 + 1] = 1 - uvs[uvOf[i] * 2 + 1];
    let sw = finalized.get(s);
    if (sw === undefined) {
      const raw = spec.weights(s);
      sw = raw ? finalizeSkinWeights(raw) : null;
      finalized.set(s, sw);
    }
    if (!sw) {
      unweighted += 1;
      continue;
    }
    for (let k = 0; k < 4; k += 1) {
      outJoints[i * 4 + k] = sw.joints[k];
      outWeights[i * 4 + k] = sw.weights[k];
    }
  }
  if (unweighted) throw new Error(`${name}: ${unweighted} vertices without skin weights`);

  const morphs = [];
  const moved = new Float64Array(sourceCount * 3);
  // Only this part's vertices count: a target that moves other groups (e.g. tongue helpers) is dropped.
  const usedSources = [...new Set(srcOf)];
  for (const m of spec.morphs) {
    let maxM = 0;
    let movedCount = 0;
    for (const s of usedSources) {
      const d = Math.hypot(m.deltas[s * 3], m.deltas[s * 3 + 1], m.deltas[s * 3 + 2]);
      if (d > 0) movedCount += 1;
      if (d > maxM) maxM = d;
    }
    if (movedCount === 0) continue;
    for (let k = 0; k < moved.length; k += 1) moved[k] = positions[k] + m.deltas[k];
    const morphedNormals = sourceNormals(moved, sourceTris, sourceCount);
    const dPos = new Float32Array(n * 3);
    const dNrm = new Float32Array(n * 3);
    for (let i = 0; i < n; i += 1) {
      const s = srcOf[i];
      for (let k = 0; k < 3; k += 1) {
        dPos[i * 3 + k] = m.deltas[s * 3 + k];
        const dn = morphedNormals[s * 3 + k] - restNormals[s * 3 + k];
        dNrm[i * 3 + k] = Math.abs(dn) < NORMAL_DELTA_EPSILON ? 0 : dn;
      }
    }
    morphs.push({ name: m.name, position: dPos, normal: dNrm, maxDisplacementM: maxM, sourceVerticesMoved: movedCount });
  }

  return {
    name,
    positions: outPos,
    normals: outNrm,
    uvs: outUv,
    indices,
    joints: outJoints,
    weights: outWeights,
    morphs,
    sourceIndexOfVertex: Int32Array.from(srcOf),
    sourceCount,
    triangleCount: tris.length,
  };
}

// ---------------------------------------------------------------------------
// Proxies (MHCLO)
// ---------------------------------------------------------------------------

function proxyScale(mhclo, P) {
  const axisScale = (ref, axis) =>
    ref ? Math.abs(P[ref.a * 3 + axis] - P[ref.b * 3 + axis]) / ref.den : 1;
  return [axisScale(mhclo.scale.x, 0), axisScale(mhclo.scale.y, 1), axisScale(mhclo.scale.z, 2)];
}

/** Fitted proxy positions in decimeters on the identity mesh. */
export function fitProxyPositions(mhclo, P) {
  const scale = proxyScale(mhclo, P);
  const out = new Float64Array(mhclo.refs.length * 3);
  mhclo.refs.forEach((r, i) => {
    for (let k = 0; k < 3; k += 1) {
      out[i * 3 + k] =
        r.w[0] * P[r.idx[0] * 3 + k] +
        r.w[1] * P[r.idx[1] * 3 + k] +
        r.w[2] * P[r.idx[2] * 3 + k] +
        r.offset[k] * scale[k];
    }
  });
  return out;
}

/** Δproxy = Σ wᵢ·Δbase(refᵢ); the offset scale is held at the identity fit. */
export function propagateProxyDeltas(mhclo, baseDeltas) {
  const out = new Float64Array(mhclo.refs.length * 3);
  mhclo.refs.forEach((r, i) => {
    for (let k = 0; k < 3; k += 1) {
      out[i * 3 + k] =
        r.w[0] * baseDeltas[r.idx[0] * 3 + k] +
        r.w[1] * baseDeltas[r.idx[1] * 3 + k] +
        r.w[2] * baseDeltas[r.idx[2] * 3 + k];
    }
  });
  return out;
}

function transferProxyWeights(ref, baseWeights) {
  const out = new Map();
  for (let k = 0; k < 3; k += 1) {
    if (ref.w[k] === 0) continue;
    const src = baseWeights[ref.idx[k]];
    if (!src) continue;
    for (const [j, w] of src) out.set(j, (out.get(j) ?? 0) + ref.w[k] * w);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

function vertexGroups(obj) {
  const groupOf = new Array(obj.positions.length / 3);
  for (const f of obj.faces) {
    for (const v of f.v) if (groupOf[v] === undefined) groupOf[v] = f.group;
  }
  return groupOf;
}

function denseDeltas(target, vertexCount) {
  const d = new Float64Array(vertexCount * 3);
  for (let i = 0; i < target.indices.length; i += 1) {
    const v = target.indices[i];
    if (v >= vertexCount) throw new Error(`target vertex ${v} out of range`);
    for (let k = 0; k < 3; k += 1) d[v * 3 + k] = target.deltas[i * 3 + k] * DM_TO_M;
  }
  return d;
}

/**
 * @param {{
 *   base: ReturnType<import('./makehuman-formats.mjs').parseObj>;
 *   identity: ReturnType<import('./makehuman-formats.mjs').parseTarget>;
 *   skeleton: ReturnType<import('./makehuman-formats.mjs').parseMhskel>;
 *   weights: ReturnType<import('./makehuman-formats.mjs').parseMhw>;
 *   faceunits: { name: string; target: ReturnType<import('./makehuman-formats.mjs').parseTarget> }[];
 *   proxies: Record<'eyes' | 'teeth' | 'tongue' | 'eyelashes' | 'eyebrows', { mhclo: ReturnType<import('./makehuman-formats.mjs').parseMhclo>; obj: ReturnType<import('./makehuman-formats.mjs').parseObj> }>;
 * }} input
 */
export function assembleCanonicalHuman(input) {
  const { base, identity, skeleton, weights, faceunits, proxies } = input;
  const nBase = base.positions.length / 3;

  // Identity: base mesh + one macro target at weight 1 (decimeters).
  const P = Float64Array.from(base.positions);
  for (let i = 0; i < identity.indices.length; i += 1) {
    const v = identity.indices[i];
    for (let k = 0; k < 3; k += 1) P[v * 3 + k] += identity.deltas[i * 3 + k];
  }

  const bodyFaces = base.faces.filter((f) => f.group === 'body');
  if (!bodyFaces.length) throw new Error('base mesh has no "body" group');
  let floorDm = Infinity;
  for (const f of bodyFaces) for (const v of f.v) floorDm = Math.min(floorDm, P[v * 3 + 1]);
  const toMeters = (src) => {
    const out = new Float64Array(src.length);
    for (let i = 0; i < src.length; i += 3) {
      out[i] = src[i] * DM_TO_M;
      out[i + 1] = (src[i + 1] - floorDm) * DM_TO_M;
      out[i + 2] = src[i + 2] * DM_TO_M;
    }
    return out;
  };
  const Pm = toMeters(P);

  // Joints at MakeHuman bone heads (vertex-group means on the identity mesh).
  const jointWorld = (jointName) => {
    const vs = skeleton.joints[jointName];
    const p = [0, 0, 0];
    for (const v of vs) for (let k = 0; k < 3; k += 1) p[k] += Pm[v * 3 + k] / vs.length;
    return p;
  };
  const merge = buildBoneMergeMap(skeleton);
  const joints = CANONICAL_RIG_V1.map((j) => ({
    id: j.id,
    source: j.source,
    parent: j.parent,
    world: jointWorld(skeleton.bones[j.source].head),
  }));
  const jointIndex = new Map(joints.map((j, i) => [j.id, i]));
  for (const j of joints) {
    const parentWorld = j.parent ? joints[jointIndex.get(j.parent)].world : [0, 0, 0];
    j.local = j.world.map((v, k) => v - parentWorld[k]);
  }

  const baseWeights = baseVertexWeights(nBase, weights, merge);
  const groupOf = vertexGroups(base);
  const baseMorphs = faceunits.map((fu) => ({ name: fu.name, deltas: denseDeltas(fu.target, nBase) }));

  const parts = [];
  parts.push(
    buildPart({
      name: 'Body',
      faces: bodyFaces,
      uvs: base.uvs,
      sourceCount: nBase,
      positions: Pm,
      weights: (i) => baseWeights[i],
      morphs: baseMorphs,
    }),
  );

  const proxyPart = (name, proxy, weightsOverride = null) => {
    const { mhclo, obj } = proxy;
    const count = obj.positions.length / 3;
    if (count !== mhclo.refs.length) {
      throw new Error(`${name}: obj has ${count} vertices, mhclo ${mhclo.refs.length}`);
    }
    const fitted = toMeters(fitProxyPositions(mhclo, P));
    return buildPart({
      name,
      faces: obj.faces,
      uvs: obj.uvs,
      sourceCount: count,
      positions: fitted,
      weights: weightsOverride ?? ((i) => transferProxyWeights(mhclo.refs[i], baseWeights)),
      morphs: baseMorphs.map((m) => ({ name: m.name, deltas: propagateProxyDeltas(mhclo, m.deltas) })),
    });
  };

  // Eyeballs are rigid on their eye bone: upstream edge vertices carry 1–3 % lid-muscle weight
  // (orbicularis03 / oculi01) that the pruned rig would fold into `head` and bend the eyeball.
  const eyeJointOfRef = (ref) => {
    const groups = new Set(ref.idx.map((v) => groupOf[v]));
    if (groups.size !== 1) throw new Error('eyes: proxy vertex mixes helper groups');
    const g = [...groups][0];
    if (g === 'helper-l-eye') return jointIndex.get('leftEye');
    if (g === 'helper-r-eye') return jointIndex.get('rightEye');
    throw new Error(`eyes: unexpected helper ${g}`);
  };
  parts.push(
    proxyPart('Eyes', proxies.eyes, (i) => new Map([[eyeJointOfRef(proxies.eyes.mhclo.refs[i]), 1]])),
  );

  // Teeth rows: each proxy vertex hangs on either upper or lower teeth helpers (never mixed).
  // Upstream topology is kept: the gum body joins both rows behind the molars (bridge faces).
  const teeth = proxies.teeth;
  const teethRowOfSource = teeth.mhclo.refs.map((r) => {
    const groups = new Set(r.idx.map((v) => groupOf[v]));
    if (groups.size !== 1) throw new Error('teeth: proxy vertex mixes helper groups');
    const g = [...groups][0];
    if (g !== 'helper-upper-teeth' && g !== 'helper-lower-teeth') throw new Error(`teeth: unexpected helper ${g}`);
    return g === 'helper-upper-teeth' ? 'upper' : 'lower';
  });
  const teethBridgeFaces = teeth.obj.faces.filter(
    (f) => new Set(f.v.map((v) => teethRowOfSource[v])).size > 1,
  ).length;
  parts.push(proxyPart('Teeth', teeth));
  parts.push(proxyPart('Tongue', proxies.tongue));
  parts.push(proxyPart('Eyelashes', proxies.eyelashes));
  parts.push(proxyPart('Eyebrows', proxies.eyebrows));

  // Default-rig lip chains: upper lip hangs on the head (oris05), lower lip on the jaw (oris01).
  const lipContactHeightM =
    (jointWorld(skeleton.bones.oris05.tail)[1] + jointWorld(skeleton.bones.oris01.tail)[1]) / 2;
  const landmarks = deriveCanonicalFaceLandmarks({
    Pm,
    groupOf,
    chinHeightM: jointWorld(skeleton.bones.jaw.tail)[1],
    lipContactHeightM,
    body: parts[0],
    eyebrows: parts.find((p) => p.name === 'Eyebrows'),
  });
  const helperCenter = (group) => {
    const c = [0, 0, 0];
    let count = 0;
    for (let s = 0; s < nBase; s += 1) {
      if (groupOf[s] !== group) continue;
      for (let k = 0; k < 3; k += 1) c[k] += Pm[s * 3 + k];
      count += 1;
    }
    return c.map((x) => x / count);
  };

  return {
    joints,
    parts,
    landmarks,
    floorM: floorDm * DM_TO_M,
    qa: structuralFacts(joints, parts, jointIndex, {
      teethRowOfSource,
      teethBridgeFaces,
      eyeHelperCenters: { leftEye: helperCenter('helper-l-eye'), rightEye: helperCenter('helper-r-eye') },
      landmarks,
    }),
  };
}

// ---------------------------------------------------------------------------
// Structural facts (measured, reported as-is)
// ---------------------------------------------------------------------------

function weightOn(part, jointIds, include = () => true) {
  let min = Infinity;
  const n = part.positions.length / 3;
  for (let i = 0; i < n; i += 1) {
    if (!include(i)) continue;
    let w = 0;
    for (let k = 0; k < 4; k += 1) {
      if (jointIds.includes(part.joints[i * 4 + k])) w += part.weights[i * 4 + k];
    }
    min = Math.min(min, w);
  }
  return Number(min.toFixed(4));
}

/** Max / min displacement (mm) of a part's vertices for the given morphs, filtered by vertex. */
function morphRange(part, names, include) {
  let max = 0;
  let min = Infinity;
  const n = part.positions.length / 3;
  for (let i = 0; i < n; i += 1) {
    if (!include(i)) continue;
    let best = 0;
    for (const m of part.morphs) {
      if (!names.includes(m.name)) continue;
      best = Math.max(best, Math.hypot(m.position[i * 3], m.position[i * 3 + 1], m.position[i * 3 + 2]));
    }
    max = Math.max(max, best);
    min = Math.min(min, best);
  }
  return { maxMm: Number((max * 1000).toFixed(2)), minMm: Number((min * 1000).toFixed(2)) };
}

function structuralFacts(joints, parts, jointIndex, extra) {
  const byName = new Map(parts.map((p) => [p.name, p]));
  const j = (id) => jointIndex.get(id);
  const teethPart = byName.get('Teeth');
  const isUpper = (i) => extra.teethRowOfSource[teethPart.sourceIndexOfVertex[i]] === 'upper';
  const countRows = (row) => {
    let n = 0;
    for (let i = 0; i < teethPart.sourceIndexOfVertex.length; i += 1) {
      if ((row === 'upper') === isUpper(i)) n += 1;
    }
    return n;
  };
  const mm = (v) => Number((v * 1000).toFixed(2));
  const morphTable = {};
  for (const p of parts) {
    morphTable[p.name] = Object.fromEntries(p.morphs.map((m) => [m.name, mm(m.maxDisplacementM)]));
  }
  const eyes = byName.get('Eyes');
  // Eyeball box: open back + dense cornea make vertex means useless; x/y box center is robust.
  const eyeballBoxOffsetMm = (sign, joint) => {
    const lo = [Infinity, Infinity, Infinity];
    const hi = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < eyes.positions.length / 3; i += 1) {
      if (Math.sign(eyes.positions[i * 3]) !== sign) continue;
      for (let k = 0; k < 3; k += 1) {
        lo[k] = Math.min(lo[k], eyes.positions[i * 3 + k]);
        hi[k] = Math.max(hi[k], eyes.positions[i * 3 + k]);
      }
    }
    return { x: mm((lo[0] + hi[0]) / 2 - joint[0]), y: mm((lo[1] + hi[1]) / 2 - joint[1]), widthMm: mm(hi[0] - lo[0]) };
  };
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const body = byName.get('Body');
  const landmarkMm = Object.fromEntries(
    Object.entries(extra.landmarks).map(([id, i]) => [id, [0, 1, 2].map((k) => mm(body.positions[i * 3 + k]))]),
  );
  let maxWeightSumError = 0;
  for (const p of parts) {
    for (let i = 0; i < p.weights.length; i += 4) {
      const s = p.weights[i] + p.weights[i + 1] + p.weights[i + 2] + p.weights[i + 3];
      maxWeightSumError = Math.max(maxWeightSumError, Math.abs(1 - s));
    }
  }
  return {
    jointCount: joints.length,
    joints: joints.map((x) => ({ id: x.id, source: x.source, parent: x.parent, worldMm: x.world.map(mm) })),
    parts: parts.map((p) => ({
      name: p.name,
      vertices: p.positions.length / 3,
      triangles: p.triangleCount,
      morphTargets: p.morphs.length,
    })),
    morphMaxDisplacementMm: morphTable,
    minWeight: {
      eyesOnEyeBones: weightOn(eyes, [j('leftEye'), j('rightEye')]),
      teethUpperRowOnHead: weightOn(teethPart, [j('head')], isUpper),
      teethLowerRowOnJaw: weightOn(teethPart, [j('jaw')], (i) => !isUpper(i)),
      tongueOnJaw: weightOn(byName.get('Tongue'), [j('jaw')]),
    },
    teeth: {
      upperRowVertices: countRows('upper'),
      lowerRowVertices: countRows('lower'),
      bridgeFacesBetweenRows: extra.teethBridgeFaces,
      upperRowJawMorphMm: morphRange(teethPart, JAW_MORPHS, isUpper),
      lowerRowJawOpenMm: morphRange(teethPart, ['jawOpen'], (i) => !isUpper(i)),
    },
    eyePivot: Object.fromEntries(
      [
        ['leftEye', 1],
        ['rightEye', -1],
      ].map(([id, sign]) => {
        const joint = joints[j(id)].world;
        return [
          id,
          {
            jointToHelperSphereCenterMm: mm(dist(joint, extra.eyeHelperCenters[id])),
            eyeballBox: eyeballBoxOffsetMm(sign, joint),
          },
        ];
      }),
    ),
    faceLandmarksMm: landmarkMm,
    maxWeightSumError: Number(maxWeightSumError.toExponential(2)),
  };
}
