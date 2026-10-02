/**
 * liveact-face-functional-morph-surface — GT-bound surface topology helpers (#423).
 * Location: scripts/lib/liveact-face-functional-morph-surface.mjs
 *
 * Primary surface identity = reviewed GT triangle binding → connected component(s).
 * Skin joints are NOT used as the primary gate (perioral may be neck-weighted).
 */
/**
 * @param {import('@gltf-transform/core').Primitive} prim
 */
export function buildPrimitiveAdjacency(prim) {
  const pos = prim.getAttribute('POSITION');
  const indices = prim.getIndices();
  if (!pos || !indices) {
    throw new Error('surface_topology: POSITION/indices missing');
  }
  const n = pos.getCount();
  /** @type {number[][]} */
  const adj = Array.from({ length: n }, () => []);
  let edgeLenSum = 0;
  let edgeCount = 0;
  const a = [0, 0, 0];
  const b = [0, 0, 0];
  for (let t = 0; t + 2 < indices.getCount(); t += 3) {
    const i0 = indices.getScalar(t);
    const i1 = indices.getScalar(t + 1);
    const i2 = indices.getScalar(t + 2);
    adj[i0].push(i1, i2);
    adj[i1].push(i0, i2);
    adj[i2].push(i0, i1);
    pos.getElement(i0, a);
    pos.getElement(i1, b);
    edgeLenSum += Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    edgeCount += 1;
    pos.getElement(i2, b);
    edgeLenSum += Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    edgeCount += 1;
    pos.getElement(i1, a);
    pos.getElement(i2, b);
    edgeLenSum += Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    edgeCount += 1;
  }
  for (let i = 0; i < n; i += 1) {
    adj[i] = [...new Set(adj[i])];
  }
  return {
    vertexCount: n,
    adj,
    meanEdgeLength: edgeCount > 0 ? edgeLenSum / edgeCount : 0,
  };
}

/**
 * Resolve GT binding → triangle vertex indices. Fail closed on missing/stale topology.
 * @param {import('@gltf-transform/core').Primitive} prim
 * @param {unknown} bindingRaw
 * @param {string} anchorId
 */
export function resolveGtBoundTriangleVertices(prim, bindingRaw, anchorId) {
  if (!bindingRaw || typeof bindingRaw !== 'object') {
    throw new Error(`gt_binding_missing:${anchorId}`);
  }
  const binding = /** @type {Record<string, unknown>} */ (bindingRaw);
  const primIndex = typeof binding.primitiveIndex === 'number' ? binding.primitiveIndex : 0;
  // Caller must already have selected the correct primitive; still validate index=0 typical.
  if (primIndex < 0) throw new Error(`gt_binding_bad_primitive:${anchorId}`);
  const tri = typeof binding.triangleIndex === 'number' ? binding.triangleIndex : -1;
  const indices = prim.getIndices();
  if (!indices) throw new Error(`gt_binding_no_indices:${anchorId}`);
  const triCount = Math.floor(indices.getCount() / 3);
  if (tri < 0 || tri >= triCount) {
    throw new Error(`gt_binding_stale_triangle:${anchorId}:${tri}`);
  }
  const base = tri * 3;
  return [indices.getScalar(base), indices.getScalar(base + 1), indices.getScalar(base + 2)];
}

/**
 * Connected component mask from seed vertices (undirected BFS).
 * @param {number[][]} adj
 * @param {number[]} seeds
 */
export function connectedComponentMask(adj, seeds) {
  const n = adj.length;
  const allowed = new Uint8Array(n);
  const q = [];
  for (const s of seeds) {
    if (s < 0 || s >= n || allowed[s]) continue;
    allowed[s] = 1;
    q.push(s);
  }
  let qi = 0;
  while (qi < q.length) {
    const v = q[qi++];
    for (const nb of adj[v]) {
      if (!allowed[nb]) {
        allowed[nb] = 1;
        q.push(nb);
      }
    }
  }
  return allowed;
}

/**
 * Topology hop distances from seeds, restricted to an allowed mask (1=traversable).
 * Unreachable / disallowed → -1.
 * @param {number[][]} adj
 * @param {number[]} seeds
 * @param {Uint8Array} allowed
 */
export function topologyDistancesOnAllowed(adj, seeds, allowed) {
  const n = adj.length;
  const dist = new Int32Array(n).fill(-1);
  /** @type {Int32Array} nearest seed index for each reached vertex (-1 if unreachable) */
  const nearestSeed = new Int32Array(n).fill(-1);
  const q = [];
  for (const s of seeds) {
    if (s < 0 || s >= n || !allowed[s] || dist[s] >= 0) continue;
    dist[s] = 0;
    nearestSeed[s] = s;
    q.push(s);
  }
  let qi = 0;
  while (qi < q.length) {
    const v = q[qi++];
    const d = dist[v];
    const seed = nearestSeed[v];
    for (const nb of adj[v]) {
      if (!allowed[nb] || dist[nb] >= 0) continue;
      dist[nb] = d + 1;
      nearestSeed[nb] = seed;
      q.push(nb);
    }
  }
  return { dist, nearestSeed };
}

/**
 * Build authoritative mouth/perioral allowed surface from GT-bound mouth triangles.
 * Chin may be on a separate body shell — use only as spatial falloff reference when outside.
 *
 * @param {import('@gltf-transform/core').Primitive} prim
 * @param {Record<string, unknown>} anchors
 * @param {readonly string[]} surfaceSeedAnchorIds
 */
export function buildGtBoundSurfaceGate(prim, anchors, surfaceSeedAnchorIds) {
  const { adj, meanEdgeLength, vertexCount } = buildPrimitiveAdjacency(prim);
  /** @type {number[]} */
  const seedVerts = [];
  /** @type {Record<string, number[]>} */
  const seedsByAnchor = {};
  for (const id of surfaceSeedAnchorIds) {
    const verts = resolveGtBoundTriangleVertices(prim, anchors[id], id);
    seedsByAnchor[id] = verts;
    seedVerts.push(...verts);
  }
  if (!seedVerts.length) throw new Error('gt_surface_gate: no seed vertices');

  // Union of connected components of each seed vertex (mouth patches may be fragmented).
  const allowed = new Uint8Array(vertexCount);
  for (const s of seedVerts) {
    if (allowed[s]) continue;
    const comp = connectedComponentMask(adj, [s]);
    for (let i = 0; i < vertexCount; i += 1) {
      if (comp[i]) allowed[i] = 1;
    }
  }

  const { dist: topoDist } = topologyDistancesOnAllowed(adj, seedVerts, allowed);
  let allowedCount = 0;
  for (let i = 0; i < vertexCount; i += 1) if (allowed[i]) allowedCount += 1;

  return {
    adj,
    meanEdgeLength,
    vertexCount,
    seedVerts: [...new Set(seedVerts)],
    seedsByAnchor,
    allowed,
    topoDist,
    allowedCount,
  };
}

/**
 * Max topology hops from seeds for local neighborhood (derived from Euclidean radius).
 * @param {number} meanEdgeLength
 * @param {number} euclidRadiusWorld
 */
export function maxTopologyHopsForRadius(meanEdgeLength, euclidRadiusWorld) {
  if (!(meanEdgeLength > 1e-12) || !(euclidRadiusWorld > 0)) return 8;
  return Math.max(4, Math.ceil((euclidRadiusWorld * 1.35) / meanEdgeLength));
}

/** Body-family joints — secondary veto only (never primary ownership). */
export const COUPLED_SHELL_BODY_JOINT_RE =
  /spine|shoulder|clavicle|chest|torso|upperchest|abdomen|arm|hand/i;

/**
 * Coupled Facial Shell Contract thresholds (geometry-normalized, shared m5/f5).
 * Location: scripts/lib/liveact-face-functional-morph-surface.mjs
 *
 * Skin joints are NEVER the primary allowlist. `neck`-only shells (m5 comp 292) remain valid.
 * Body-family majority is a secondary veto only.
 *
 * @param {number} faceH
 * @param {number} meanEdgeLength
 */
export function coupledFacialShellThresholds(faceH, meanEdgeLength) {
  const edge = Math.max(meanEdgeLength, 1e-9);
  const fh = Math.max(faceH, 1e-6);
  const tauCoincide = edge * 0.12;
  // Near band must always cover the coincide band (geometry-normalized).
  const tauNear = Math.max(tauCoincide, Math.min(fh * 0.012, edge * 1.25));
  return {
    tauCoincide,
    tauNear,
    tauGtLocal: fh * 0.18,
    minCoincidePairs: 10,
    minMeanNormalDot: 0.55,
    maxWholeCompBodyFrac: 0.35,
    maxPatchBodyFrac: 0.12,
    maxPatchHops: Math.max(3, Math.ceil(tauNear / edge) + 1),
    topoFalloffExp: 1.15,
  };
}

/**
 * @param {number[][]} adj
 */
function labelConnectedComponents(adj) {
  const n = adj.length;
  const id = new Int32Array(n).fill(-1);
  let next = 0;
  for (let s = 0; s < n; s += 1) {
    if (id[s] >= 0) continue;
    const cid = next;
    next += 1;
    const q = [s];
    id[s] = cid;
    for (let qi = 0; qi < q.length; qi += 1) {
      for (const nb of adj[q[qi]]) {
        if (id[nb] < 0) {
          id[nb] = cid;
          q.push(nb);
        }
      }
    }
  }
  return { componentOf: id, componentCount: next };
}

/**
 * Dominant skin joint name for a vertex (secondary veto input only).
 * @param {import('@gltf-transform/core').Accessor|null|undefined} jointsAttr
 * @param {import('@gltf-transform/core').Accessor|null|undefined} weightsAttr
 * @param {readonly string[]} jointNames
 * @param {number} i
 */
export function dominantSkinJointName(jointsAttr, weightsAttr, jointNames, i) {
  if (!jointsAttr || !weightsAttr || !jointNames.length) return null;
  const j = [0, 0, 0, 0];
  const w = [0, 0, 0, 0];
  jointsAttr.getElement(i, j);
  weightsAttr.getElement(i, w);
  let bi = 0;
  for (let k = 1; k < 4; k += 1) if (w[k] > w[bi]) bi = k;
  const idx = j[bi];
  return typeof jointNames[idx] === 'string' ? jointNames[idx] : null;
}

/**
 * Resolve directly-coupled secondary facial seam patches for a GT-bound primary surface.
 *
 * PRIMARY gates: coincide, normals, GT locality.
 * SECONDARY veto only: whole-component / patch body-family skin fraction.
 * Does NOT require Head/Jaw weights — `neck`-only patches are valid.
 *
 * HARD: secondary patches never recurse to couple further components.
 *
 * @param {{
 *   prim: import('@gltf-transform/core').Primitive;
 *   surface: ReturnType<typeof buildGtBoundSurfaceGate>;
 *   primaryVerts: number[];
 *   faceHeight: number;
 *   gtRefs: Array<{ x: number; y: number; z: number }>;
 *   jointNames?: readonly string[];
 * }} opts
 */
export function resolveCoupledFacialPatches(opts) {
  const {
    prim,
    surface,
    primaryVerts,
    faceHeight,
    gtRefs,
    jointNames = [],
  } = opts;
  const pos = prim.getAttribute('POSITION');
  const indices = prim.getIndices();
  if (!pos || !indices) throw new Error('coupled_shell: POSITION/indices missing');
  const n = pos.getCount();
  const thr = coupledFacialShellThresholds(faceHeight, surface.meanEdgeLength);
  const { adj } = surface;
  const { componentOf, componentCount } = labelConnectedComponents(adj);
  const jointsAttr = prim.getAttribute('JOINTS_0');
  const weightsAttr = prim.getAttribute('WEIGHTS_0');

  const base = new Float32Array(n * 3);
  const el = [0, 0, 0];
  for (let i = 0; i < n; i += 1) {
    pos.getElement(i, el);
    base[i * 3] = el[0];
    base[i * 3 + 1] = el[1];
    base[i * 3 + 2] = el[2];
  }

  // Vertex normals (area-weighted average of adjacent tris)
  const vN = new Float32Array(n * 3);
  const vC = new Float32Array(n);
  for (let t = 0; t + 2 < indices.getCount(); t += 3) {
    const i0 = indices.getScalar(t);
    const i1 = indices.getScalar(t + 1);
    const i2 = indices.getScalar(t + 2);
    const ax = base[i0 * 3];
    const ay = base[i0 * 3 + 1];
    const az = base[i0 * 3 + 2];
    const bx = base[i1 * 3];
    const by = base[i1 * 3 + 1];
    const bz = base[i1 * 3 + 2];
    const cx = base[i2 * 3];
    const cy = base[i2 * 3 + 1];
    const cz = base[i2 * 3 + 2];
    let nx = (by - ay) * (cz - az) - (bz - az) * (cy - ay);
    let ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);
    let nz = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len;
    ny /= len;
    nz /= len;
    for (const i of [i0, i1, i2]) {
      vN[i * 3] += nx;
      vN[i * 3 + 1] += ny;
      vN[i * 3 + 2] += nz;
      vC[i] += 1;
    }
  }
  for (let i = 0; i < n; i += 1) {
    const c = vC[i] || 1;
    let x = vN[i * 3] / c;
    let y = vN[i * 3 + 1] / c;
    let z = vN[i * 3 + 2] / c;
    const l = Math.hypot(x, y, z) || 1;
    vN[i * 3] = x / l;
    vN[i * 3 + 1] = y / l;
    vN[i * 3 + 2] = z / l;
  }

  const primarySet = new Uint8Array(n);
  /** @type {number[]} */
  const contact = [];
  for (const i of primaryVerts) {
    if (i < 0 || i >= n) continue;
    primarySet[i] = 1;
    contact.push(i);
  }
  contact.sort((a, b) => a - b);
  const contactSample =
    contact.length > 4500
      ? contact.filter((_, i) => i % Math.ceil(contact.length / 4500) === 0)
      : contact;

  const sizes = new Int32Array(componentCount);
  const bodyCount = new Int32Array(componentCount);
  for (let i = 0; i < n; i += 1) {
    const cid = componentOf[i];
    sizes[cid] += 1;
    const jn = dominantSkinJointName(jointsAttr, weightsAttr, jointNames, i);
    if (jn && COUPLED_SHELL_BODY_JOINT_RE.test(jn)) bodyCount[cid] += 1;
  }

  function nearestContact(i) {
    const x = base[i * 3];
    const y = base[i * 3 + 1];
    const z = base[i * 3 + 2];
    let best = Infinity;
    let bj = -1;
    for (const j of contactSample) {
      const d = Math.hypot(x - base[j * 3], y - base[j * 3 + 1], z - base[j * 3 + 2]);
      if (d < best) {
        best = d;
        bj = j;
      }
    }
    return { d: best, j: bj };
  }

  function gtDist(i) {
    let best = Infinity;
    const x = base[i * 3];
    const y = base[i * 3 + 1];
    const z = base[i * 3 + 2];
    for (const g of gtRefs) {
      if (!g) continue;
      best = Math.min(best, Math.hypot(x - g.x, y - g.y, z - g.z));
    }
    return best;
  }

  /** @type {Map<number, { coincide: Array<{i:number;j:number;d:number}>; near: number; nDots: number[]; gt: number[] }>} */
  const byComp = new Map();
  for (let i = 0; i < n; i += 1) {
    if (primarySet[i]) continue;
    const { d, j } = nearestContact(i);
    if (!(d <= thr.tauNear) || j < 0) continue;
    const cid = componentOf[i];
    let rec = byComp.get(cid);
    if (!rec) {
      rec = { coincide: [], near: 0, nDots: [], gt: [] };
      byComp.set(cid, rec);
    }
    rec.near += 1;
    rec.nDots.push(
      vN[i * 3] * vN[j * 3] + vN[i * 3 + 1] * vN[j * 3 + 1] + vN[i * 3 + 2] * vN[j * 3 + 2],
    );
    rec.gt.push(gtDist(i));
    if (d <= thr.tauCoincide) rec.coincide.push({ i, j, d });
  }

  /** @type {Array<Record<string, unknown>>} */
  const rejected = [];
  /** @type {Array<{
   *   componentId: number;
   *   componentSize: number;
   *   coincideCount: number;
   *   meanNormalDot: number;
   *   medianGtDist: number;
   *   wholeCompBodyFrac: number;
   *   patchBodyFrac: number;
   *   maxPatchHops: number;
   *   seamPairs: Array<{ secondary: number; primary: number; neutralDist: number }>;
   *   patchVerts: number[];
   *   patchHops: Int32Array;
   * }>} */
  const patches = [];

  const sortedCids = [...byComp.keys()].sort((a, b) => a - b);
  for (const cid of sortedCids) {
    const rec = byComp.get(cid);
    if (!rec) continue;
    const wholeBodyFrac = sizes[cid] > 0 ? bodyCount[cid] / sizes[cid] : 1;
    if (wholeBodyFrac > thr.maxWholeCompBodyFrac) {
      rejected.push({
        componentId: cid,
        reason: 'whole_comp_body',
        wholeCompBodyFrac: wholeBodyFrac,
        coincideCount: rec.coincide.length,
      });
      continue;
    }
    if (rec.coincide.length < thr.minCoincidePairs) {
      rejected.push({
        componentId: cid,
        reason: 'low_coincide',
        coincideCount: rec.coincide.length,
      });
      continue;
    }
    const meanNormalDot =
      rec.nDots.reduce((a, b) => a + b, 0) / Math.max(1, rec.nDots.length);
    if (meanNormalDot < thr.minMeanNormalDot) {
      rejected.push({ componentId: cid, reason: 'normal_incompatible', meanNormalDot });
      continue;
    }
    const gtSorted = [...rec.gt].sort((a, b) => a - b);
    const medianGtDist = gtSorted[Math.floor(gtSorted.length / 2)] ?? Infinity;
    if (medianGtDist > thr.tauGtLocal) {
      rejected.push({ componentId: cid, reason: 'gt_far', medianGtDist });
      continue;
    }

    // Deterministic seam seed order
    const seeds = [...rec.coincide].sort((a, b) => a.i - b.i || a.j - b.j).map((p) => p.i);
    const allowed = new Uint8Array(n);
    for (let i = 0; i < n; i += 1) if (componentOf[i] === cid) allowed[i] = 1;
    const { dist: hops, nearestSeed } = topologyDistancesOnAllowed(adj, seeds, allowed);
    /** @type {number[]} */
    const patchVerts = [];
    let patchBody = 0;
    for (let i = 0; i < n; i += 1) {
      if (hops[i] < 0 || hops[i] > thr.maxPatchHops) continue;
      patchVerts.push(i);
      const jn = dominantSkinJointName(jointsAttr, weightsAttr, jointNames, i);
      if (jn && COUPLED_SHELL_BODY_JOINT_RE.test(jn)) patchBody += 1;
    }
    const patchBodyFrac = patchVerts.length ? patchBody / patchVerts.length : 1;
    if (patchBodyFrac > thr.maxPatchBodyFrac) {
      rejected.push({
        componentId: cid,
        reason: 'patch_body',
        patchBodyFrac,
        patchSize: patchVerts.length,
      });
      continue;
    }

    patches.push({
      componentId: cid,
      componentSize: sizes[cid],
      coincideCount: rec.coincide.length,
      meanNormalDot,
      medianGtDist,
      wholeCompBodyFrac: wholeBodyFrac,
      patchBodyFrac,
      maxPatchHops: thr.maxPatchHops,
      seamPairs: [...rec.coincide]
        .sort((a, b) => a.i - b.i || a.j - b.j)
        .map((p) => ({ secondary: p.i, primary: p.j, neutralDist: p.d })),
      patchVerts: patchVerts.sort((a, b) => a - b),
      patchHops: hops,
      nearestSeamSeed: nearestSeed,
    });
  }

  patches.sort((a, b) => a.componentId - b.componentId);

  return {
    thresholds: thr,
    componentCount,
    primaryContactCount: contact.length,
    patches,
    rejected,
    /** Flat map secondaryVert → { primaryVert, hops, componentId } for transfer */
    secondaryBindings: (() => {
      /** @type {Map<number, { primary: number; hops: number; componentId: number; falloff: number }>} */
      const map = new Map();
      for (const p of patches) {
        /** @type {Map<number, number>} */
        const seedPrimary = new Map();
        for (const sp of p.seamPairs) seedPrimary.set(sp.secondary, sp.primary);
        const nearestSeamSeed = p.nearestSeamSeed;
        for (const v of p.patchVerts) {
          const h = p.patchHops[v];
          if (h < 0 || h > thr.maxPatchHops) continue;
          // Exact seam seed, else BFS-nearest seam seed on the secondary patch.
          let primary = seedPrimary.get(v);
          if (primary == null && nearestSeamSeed) {
            const seed = nearestSeamSeed[v];
            if (seed >= 0) primary = seedPrimary.get(seed);
          }
          if (primary == null) continue;
          const falloff = Math.max(0, 1 - h / Math.max(1, thr.maxPatchHops)) ** thr.topoFalloffExp;
          if (falloff <= 1e-8) continue;
          map.set(v, {
            primary,
            hops: h,
            componentId: p.componentId,
            falloff,
          });
        }
      }
      return map;
    })(),
  };
}
