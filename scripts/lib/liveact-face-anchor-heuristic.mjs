/**
 * liveact-face-anchor-heuristic — anatomic head-normalized face anchors (#399/#hotfix).
 * Location: scripts/lib/liveact-face-anchor-heuristic.mjs
 *
 * Primary SoT: head-bbox proportional hints + local geometric refine.
 * Morph extrema are NOT used to place anchors (breaks circular Semantic QA).
 * Optional: QtMesh/ICT 13-marker world positions via opts.markerPositions.
 */

import { SAGA_DRIVE_FACE_ANCHOR_IDS } from './liveact-face-anchor-ids.mjs';
import { findNodeByIdentity, listMeshedNodeIdentities } from './liveact-face-anchor-glb.mjs';

/**
 * Normalized head-box hints (nx: character right→left, ny: chin→forehead, nz: back→front).
 * Tuned for adult humanoid Semi-real B proportions; not asset-specific magic.
 * @type {Record<string, { nx: number; ny: number; nz: number }>}
 */
export const FACE_ANCHOR_HEAD_HINTS = {
  forehead: { nx: 0.5, ny: 0.96, nz: 0.88 },
  chin: { nx: 0.5, ny: 0.04, nz: 0.9 },
  noseTip: { nx: 0.5, ny: 0.52, nz: 1 },
  mouthUpper: { nx: 0.5, ny: 0.36, nz: 0.97 },
  mouthLower: { nx: 0.5, ny: 0.3, nz: 0.96 },
  mouthCornerLeft: { nx: 0.72, ny: 0.33, nz: 0.94 },
  mouthCornerRight: { nx: 0.28, ny: 0.33, nz: 0.94 },
  eyeLeftInner: { nx: 0.58, ny: 0.68, nz: 0.97 },
  eyeLeftOuter: { nx: 0.78, ny: 0.68, nz: 0.96 },
  eyeLeftUpper: { nx: 0.68, ny: 0.72, nz: 0.97 },
  eyeLeftLower: { nx: 0.68, ny: 0.64, nz: 0.97 },
  eyeRightInner: { nx: 0.42, ny: 0.68, nz: 0.97 },
  eyeRightOuter: { nx: 0.22, ny: 0.68, nz: 0.96 },
  eyeRightUpper: { nx: 0.32, ny: 0.72, nz: 0.97 },
  eyeRightLower: { nx: 0.32, ny: 0.64, nz: 0.97 },
  browLeftInner: { nx: 0.58, ny: 0.8, nz: 0.94 },
  browLeftOuter: { nx: 0.8, ny: 0.8, nz: 0.92 },
  browLeftCenter: { nx: 0.7, ny: 0.82, nz: 0.94 },
  browRightInner: { nx: 0.42, ny: 0.8, nz: 0.94 },
  browRightOuter: { nx: 0.2, ny: 0.8, nz: 0.92 },
  browRightCenter: { nx: 0.3, ny: 0.82, nz: 0.94 },
};

/** QtMesh MARKER_SIM / ICT-style marker names → SagaDriveFaceAnchorsV1 ids. */
export const QTMESH_MARKER_TO_ANCHOR = {
  Forehead: 'forehead',
  Chin: 'chin',
  'Nose tip': 'noseTip',
  'Upper lip': 'mouthUpper',
  'Lower lip': 'mouthLower',
  'Left mouth corner': 'mouthCornerLeft',
  'Right mouth corner': 'mouthCornerRight',
  'Left eye outer': 'eyeLeftOuter',
  'Left eye inner': 'eyeLeftInner',
  'Right eye outer': 'eyeRightOuter',
  'Right eye inner': 'eyeRightInner',
  'Left brow': 'browLeftCenter',
  'Right brow': 'browRightCenter',
};

/**
 * @param {import('@gltf-transform/core').Document} document
 * @param {string | undefined} preferredNodeIdentity
 */
export function pickPrimaryMeshedNode(document, preferredNodeIdentity) {
  if (preferredNodeIdentity) {
    const node = findNodeByIdentity(document, preferredNodeIdentity);
    if (node?.getMesh()) return node;
  }
  let best = null;
  let bestCount = 0;
  for (const node of document.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    let count = 0;
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION');
      if (pos) count += pos.getCount();
    }
    if (count > bestCount) {
      bestCount = count;
      best = node;
    }
  }
  if (!best) {
    const names = listMeshedNodeIdentities(document);
    throw new Error(`No meshed nodes found (identities: ${names.join(', ') || 'none'})`);
  }
  return best;
}

/**
 * @param {import('@gltf-transform/core').Primitive} prim
 */
export const DEFAULT_HEAD_CROP_HEIGHT = 0.42;

function headVertexIndices(prim, headCropHeight = DEFAULT_HEAD_CROP_HEIGHT) {
  const pos = prim.getAttribute('POSITION');
  if (!pos) return [];
  const arr = pos.getArray();
  if (!arr) return [];
  let maxY = -Infinity;
  for (let i = 1; i < arr.length; i += 3) maxY = Math.max(maxY, arr[i]);
  const yCut = maxY - headCropHeight;
  /** @type {number[]} */
  const indices = [];
  for (let vi = 0; vi < pos.getCount(); vi += 1) {
    if (arr[vi * 3 + 1] >= yCut) indices.push(vi);
  }
  return indices;
}

/**
 * @param {Float32Array | Int32Array} arr
 * @param {number[]} headVertexSet
 */
function headBounds(arr, headVertexSet) {
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const vi of headVertexSet) {
    const z = arr[vi * 3 + 2];
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  }
  const zCut = minZ + 0.5 * (maxZ - minZ);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let fMinZ = Infinity;
  let fMaxZ = -Infinity;
  /** @type {number[]} */
  const forward = [];
  for (const vi of headVertexSet) {
    const z = arr[vi * 3 + 2];
    if (z < zCut) continue;
    forward.push(vi);
    const x = arr[vi * 3];
    const y = arr[vi * 3 + 1];
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    fMinZ = Math.min(fMinZ, z);
    fMaxZ = Math.max(fMaxZ, z);
  }
  return {
    minX,
    maxX,
    minY,
    maxY,
    minZ: fMinZ,
    maxZ: fMaxZ,
    forwardVertexSet: forward.length ? forward : headVertexSet,
  };
}

function hintToWorld(hint, bounds) {
  const { minX, maxX, minY, maxY, minZ, maxZ } = bounds;
  return {
    x: minX + hint.nx * (maxX - minX),
    y: minY + hint.ny * (maxY - minY),
    z: minZ + hint.nz * (maxZ - minZ),
  };
}

function distSq(ax, ay, az, bx, by, bz) {
  const dx = ax - bx;
  const dy = ay - by;
  const dz = az - bz;
  return dx * dx + dy * dy + dz * dz;
}

function vertPos(arr, vi) {
  return { x: arr[vi * 3], y: arr[vi * 3 + 1], z: arr[vi * 3 + 2] };
}

/**
 * @param {import('@gltf-transform/core').Primitive} prim
 * @param {number} vertexIndex
 */
function triangleBindingForVertex(prim, vertexIndex) {
  const indices = prim.getIndices();
  const triCount = indices
    ? Math.floor(indices.getCount() / 3)
    : Math.floor((prim.getAttribute('POSITION')?.getCount() ?? 0) / 3);
  for (let ti = 0; ti < triCount; ti += 1) {
    let i0;
    let i1;
    let i2;
    if (indices) {
      const idxArr = indices.getArray();
      if (!idxArr) continue;
      const base = ti * 3;
      i0 = idxArr[base];
      i1 = idxArr[base + 1];
      i2 = idxArr[base + 2];
    } else {
      const base = ti * 3;
      i0 = base;
      i1 = base + 1;
      i2 = base + 2;
    }
    if (i0 === vertexIndex) {
      return { triangleIndex: ti, barycentric: { u: 1, v: 0, w: 0 } };
    }
    if (i1 === vertexIndex) {
      return { triangleIndex: ti, barycentric: { u: 0, v: 1, w: 0 } };
    }
    if (i2 === vertexIndex) {
      return { triangleIndex: ti, barycentric: { u: 0, v: 0, w: 1 } };
    }
  }
  return { triangleIndex: 0, barycentric: { u: 1 / 3, v: 1 / 3, w: 1 / 3 } };
}

export function bindingForVertex(nodeIdentity, primitiveIndex, prim, vertexIndex) {
  const tri = triangleBindingForVertex(prim, vertexIndex);
  return {
    nodeIdentity,
    primitiveIndex,
    triangleIndex: tri.triangleIndex,
    barycentric: tri.barycentric,
  };
}

/**
 * @param {number[]} verts
 * @param {Float32Array | Int32Array} arr
 * @param {{ x: number; y: number; z: number }} target
 * @param {(vi: number) => boolean} [filter]
 */
function nearestVertex(verts, arr, target, filter) {
  let bestVi = -1;
  let bestD = Number.POSITIVE_INFINITY;
  for (const vi of verts) {
    if (filter && !filter(vi)) continue;
    const d = distSq(arr[vi * 3], arr[vi * 3 + 1], arr[vi * 3 + 2], target.x, target.y, target.z);
    if (d < bestD) {
      bestD = d;
      bestVi = vi;
    }
  }
  return bestVi;
}

/**
 * Local refine: among verts near a center, pick extremum along axis.
 * @param {'maxY'|'minY'|'maxX'|'minX'|'maxZ'} mode
 */
function pickLocalExtremum(verts, arr, center, radius, mode, filter) {
  const r2 = radius * radius;
  let bestVi = -1;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const vi of verts) {
    if (filter && !filter(vi)) continue;
    const p = vertPos(arr, vi);
    if (distSq(p.x, p.y, p.z, center.x, center.y, center.z) > r2) continue;
    let score;
    if (mode === 'maxY') score = p.y;
    else if (mode === 'minY') score = -p.y;
    else if (mode === 'maxX') score = p.x;
    else if (mode === 'minX') score = -p.x;
    else score = p.z;
    if (score > bestScore) {
      bestScore = score;
      bestVi = vi;
    }
  }
  return bestVi;
}

function midXGuess(bounds) {
  return (bounds.minX + bounds.maxX) * 0.5;
}

/**
 * Place eye upper/lower from inner/outer using local aperture geometry (no morphs).
 * @param {Float32Array | Int32Array} arr
 * @param {number[]} verts
 * @param {number} innerVi
 * @param {number} outerVi
 * @param {'left'|'right'} side
 * @param {number} [maxUpperY]
 */
function placeEyeLids(arr, verts, innerVi, outerVi, side, maxUpperY) {
  const inner = vertPos(arr, innerVi);
  const outer = vertPos(arr, outerVi);
  const mid = {
    x: (inner.x + outer.x) * 0.5,
    y: (inner.y + outer.y) * 0.5,
    z: (inner.z + outer.z) * 0.5,
  };
  const eyeW = Math.hypot(inner.x - outer.x, inner.y - outer.y, inner.z - outer.z);
  const radius = Math.max(eyeW * 0.55, 0.01);
  const xLo = Math.min(inner.x, outer.x) + eyeW * 0.08;
  const xHi = Math.max(inner.x, outer.x) - eyeW * 0.08;
  const yCap = maxUpperY != null ? maxUpperY : mid.y + eyeW * 0.55;
  const inEyeX = (vi) => {
    const x = arr[vi * 3];
    return x >= xLo && x <= xHi;
  };
  const upper = pickLocalExtremum(verts, arr, mid, radius, 'maxY', (vi) => {
    if (!inEyeX(vi)) return false;
    const y = arr[vi * 3 + 1];
    return y >= mid.y - eyeW * 0.05 && y <= yCap;
  });
  const lower = pickLocalExtremum(verts, arr, mid, radius, 'minY', (vi) => {
    if (!inEyeX(vi)) return false;
    return arr[vi * 3 + 1] <= mid.y + eyeW * 0.1;
  });
  const upperVi =
    upper >= 0
      ? upper
      : nearestVertex(verts, arr, { x: mid.x, y: Math.min(mid.y + eyeW * 0.25, yCap), z: mid.z }, inEyeX);
  const lowerVi =
    lower >= 0
      ? lower
      : nearestVertex(verts, arr, { x: mid.x, y: mid.y - eyeW * 0.25, z: mid.z }, inEyeX);
  void side;
  return { upperVi, lowerVi, mid, eyeW };
}

/**
 * Place brow triad above an eye mid using interocular scale (no morphs).
 */
function placeBrowTriad(arr, verts, eyeMid, eyeW, side, midX) {
  const up = eyeW * 0.55;
  const zPush = eyeW * 0.05;
  const centerTarget = {
    x: eyeMid.x,
    y: eyeMid.y + up,
    z: eyeMid.z + zPush,
  };
  const lateralSign = side === 'left' ? 1 : -1;
  const innerTarget = {
    x: eyeMid.x - lateralSign * eyeW * 0.35,
    y: eyeMid.y + up * 0.95,
    z: eyeMid.z + zPush,
  };
  const outerTarget = {
    x: eyeMid.x + lateralSign * eyeW * 0.55,
    y: eyeMid.y + up * 0.9,
    z: eyeMid.z + zPush * 0.5,
  };
  const onSide = (vi) =>
    side === 'left' ? arr[vi * 3] >= midX - eyeW * 0.05 : arr[vi * 3] <= midX + eyeW * 0.05;
  const aboveEye = (vi) => arr[vi * 3 + 1] >= eyeMid.y + eyeW * 0.12;
  const filter = (vi) => onSide(vi) && aboveEye(vi);
  return {
    centerVi: nearestVertex(verts, arr, centerTarget, filter),
    innerVi: nearestVertex(verts, arr, innerTarget, filter),
    outerVi: nearestVertex(verts, arr, outerTarget, filter),
  };
}

/**
 * @param {Record<string, { x: number; y: number; z: number }>} markerPositions
 * @returns {Partial<Record<string, { x: number; y: number; z: number }>>}
 */
export function mapQtMeshMarkersToTargets(markerPositions) {
  /** @type {Partial<Record<string, { x: number; y: number; z: number }>>} */
  const out = {};
  for (const [markerName, anchorId] of Object.entries(QTMESH_MARKER_TO_ANCHOR)) {
    const p = markerPositions[markerName];
    if (p && Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z)) {
      out[anchorId] = { x: p.x, y: p.y, z: p.z };
    }
  }
  return out;
}

/**
 * @param {import('@gltf-transform/core').Document} document
 * @param {{
 *   nodeIdentity?: string;
 *   markerPositions?: Record<string, { x: number; y: number; z: number }>;
 *   headCropHeight?: number;
 * }} opts
 *
 * headCropHeight: metres below the mesh top treated as head (default 0.42). Lower it for
 * single-mesh full bodies whose shoulders/chest fall inside the default crop.
 */
export function authorHeuristicFaceAnchorsManifest(document, opts = {}) {
  const node = pickPrimaryMeshedNode(document, opts.nodeIdentity);
  const nodeIdentity = (node.getName() || '').trim() || 'node';
  const mesh = node.getMesh();
  if (!mesh) throw new Error('Primary node has no mesh');
  const primitiveIndex = 0;
  const prim = mesh.listPrimitives()[primitiveIndex];
  if (!prim) throw new Error('No mesh primitive for heuristic anchors');

  const pos = prim.getAttribute('POSITION');
  const arr = pos?.getArray();
  if (!arr) throw new Error('Mesh missing POSITION');

  const headCropHeight = opts.headCropHeight ?? DEFAULT_HEAD_CROP_HEIGHT;
  if (!(headCropHeight > 0.05 && headCropHeight < 2)) {
    throw new Error(`headCropHeight out of range (0.05–2 m): ${headCropHeight}`);
  }
  const headVerts = headVertexIndices(prim, headCropHeight);
  if (headVerts.length < 100) {
    throw new Error(`Head vertex sample too small: ${headVerts.length}`);
  }
  const bounds = headBounds(arr, headVerts);
  const placementVerts = bounds.forwardVertexSet;

  const markerTargets = opts.markerPositions
    ? mapQtMeshMarkersToTargets(opts.markerPositions)
    : {};

  /** @type {Record<string, number>} */
  const vertexByAnchor = {};

  // Pass 1: midline landmarks from markers/hints.
  for (const anchorId of ['forehead', 'chin', 'noseTip']) {
    const markerTarget = markerTargets[anchorId];
    const hint = FACE_ANCHOR_HEAD_HINTS[anchorId];
    const target = markerTarget || (hint ? hintToWorld(hint, bounds) : null);
    if (!target) continue;
    const vi = nearestVertex(placementVerts, arr, target, (v) => Math.abs(arr[v * 3] - midXGuess(bounds)) < (bounds.maxX - bounds.minX) * 0.15);
    if (vi >= 0) vertexByAnchor[anchorId] = vi;
  }

  const noseVi = vertexByAnchor.noseTip;
  const foreheadVi = vertexByAnchor.forehead;
  const chinVi = vertexByAnchor.chin;
  const midX = noseVi != null ? arr[noseVi * 3] : (bounds.minX + bounds.maxX) * 0.5;
  const faceH =
    foreheadVi != null && chinVi != null
      ? Math.max(0.05, arr[foreheadVi * 3 + 1] - arr[chinVi * 3 + 1])
      : Math.max(0.05, bounds.maxY - bounds.minY);
  const nose = noseVi != null ? vertPos(arr, noseVi) : { x: midX, y: bounds.minY + faceH * 0.52, z: bounds.maxZ };
  // Adult facial proportions relative to nose / face height — independent of ear-inflated head bbox width.
  const iod = faceH * 0.3;
  const eyeY = nose.y + faceH * 0.16;
  const eyeZ = nose.z - faceH * 0.02;
  const mouthY = nose.y - faceH * 0.14;
  const mouthZ = nose.z - faceH * 0.01;
  const mouthHalf = iod * 0.65;

  /** @type {Record<string, { x: number; y: number; z: number }>} */
  const anatomicTargets = {
    eyeLeftOuter: { x: midX + iod * 0.95, y: eyeY, z: eyeZ },
    eyeLeftInner: { x: midX + iod * 0.28, y: eyeY, z: eyeZ + faceH * 0.01 },
    eyeRightOuter: { x: midX - iod * 0.95, y: eyeY, z: eyeZ },
    eyeRightInner: { x: midX - iod * 0.28, y: eyeY, z: eyeZ + faceH * 0.01 },
    mouthCornerLeft: { x: midX + mouthHalf, y: mouthY, z: mouthZ },
    mouthCornerRight: { x: midX - mouthHalf, y: mouthY, z: mouthZ },
    mouthUpper: { x: midX, y: mouthY + faceH * 0.018, z: mouthZ + faceH * 0.005 },
    mouthLower: { x: midX, y: mouthY - faceH * 0.018, z: mouthZ },
    browLeftCenter: { x: midX + iod * 0.62, y: eyeY + faceH * 0.09, z: eyeZ },
    browRightCenter: { x: midX - iod * 0.62, y: eyeY + faceH * 0.09, z: eyeZ },
    browLeftInner: { x: midX + iod * 0.32, y: eyeY + faceH * 0.085, z: eyeZ },
    browRightInner: { x: midX - iod * 0.32, y: eyeY + faceH * 0.085, z: eyeZ },
    browLeftOuter: { x: midX + iod * 0.95, y: eyeY + faceH * 0.08, z: eyeZ - faceH * 0.01 },
    browRightOuter: { x: midX - iod * 0.95, y: eyeY + faceH * 0.08, z: eyeZ - faceH * 0.01 },
  };

  // Prefer QtMesh markers when provided; else anatomic targets.
  for (const [id, target] of Object.entries(anatomicTargets)) {
    const markerTarget = markerTargets[id];
    const t = markerTarget || target;
    const half = id.includes('Left')
      ? (vi) => arr[vi * 3] >= midX - iod * 0.05
      : id.includes('Right')
        ? (vi) => arr[vi * 3] <= midX + iod * 0.05
        : undefined;
    // Keep facial features on the front half and within ~1.4 iod of midline.
    const filter = (vi) => {
      if (half && !half(vi)) return false;
      if (Math.abs(arr[vi * 3] - midX) > iod * 1.35) return false;
      if (arr[vi * 3 + 2] < nose.z - faceH * 0.12) return false;
      return true;
    };
    const vi = nearestVertex(placementVerts, arr, t, filter);
    if (vi >= 0) vertexByAnchor[id] = vi;
  }

  // Ensure outer is more lateral than inner.
  if (vertexByAnchor.eyeLeftOuter != null && vertexByAnchor.eyeLeftInner != null) {
    if (arr[vertexByAnchor.eyeLeftOuter * 3] < arr[vertexByAnchor.eyeLeftInner * 3]) {
      const t = vertexByAnchor.eyeLeftOuter;
      vertexByAnchor.eyeLeftOuter = vertexByAnchor.eyeLeftInner;
      vertexByAnchor.eyeLeftInner = t;
    }
  }
  if (vertexByAnchor.eyeRightOuter != null && vertexByAnchor.eyeRightInner != null) {
    if (arr[vertexByAnchor.eyeRightOuter * 3] > arr[vertexByAnchor.eyeRightInner * 3]) {
      const t = vertexByAnchor.eyeRightOuter;
      vertexByAnchor.eyeRightOuter = vertexByAnchor.eyeRightInner;
      vertexByAnchor.eyeRightInner = t;
    }
  }

  // Eye lids from local aperture (geometry only) — clamp upper below brow band.
  if (vertexByAnchor.eyeLeftInner != null && vertexByAnchor.eyeLeftOuter != null) {
    const lids = placeEyeLids(
      arr,
      placementVerts,
      vertexByAnchor.eyeLeftInner,
      vertexByAnchor.eyeLeftOuter,
      'left',
      eyeY + faceH * 0.07,
    );
    if (lids.upperVi >= 0) vertexByAnchor.eyeLeftUpper = lids.upperVi;
    if (lids.lowerVi >= 0) vertexByAnchor.eyeLeftLower = lids.lowerVi;
  }
  if (vertexByAnchor.eyeRightInner != null && vertexByAnchor.eyeRightOuter != null) {
    const lids = placeEyeLids(
      arr,
      placementVerts,
      vertexByAnchor.eyeRightInner,
      vertexByAnchor.eyeRightOuter,
      'right',
      eyeY + faceH * 0.07,
    );
    if (lids.upperVi >= 0) vertexByAnchor.eyeRightUpper = lids.upperVi;
    if (lids.lowerVi >= 0) vertexByAnchor.eyeRightLower = lids.lowerVi;
  }

  // Re-place brows strictly above eye uppers.
  for (const side of /** @type {const} */ (['Left', 'Right'])) {
    const innerId = `eye${side}Inner`;
    const outerId = `eye${side}Outer`;
    const upperId = `eye${side}Upper`;
    if (vertexByAnchor[innerId] == null || vertexByAnchor[outerId] == null) continue;
    const inner = vertPos(arr, vertexByAnchor[innerId]);
    const outer = vertPos(arr, vertexByAnchor[outerId]);
    const eyeMid = {
      x: (inner.x + outer.x) * 0.5,
      y: (inner.y + outer.y) * 0.5,
      z: (inner.z + outer.z) * 0.5,
    };
    const eyeW = Math.hypot(inner.x - outer.x, inner.y - outer.y, inner.z - outer.z);
    const upperY =
      vertexByAnchor[upperId] != null ? arr[vertexByAnchor[upperId] * 3 + 1] : eyeMid.y + eyeW * 0.2;
    const browFloor = Math.max(upperY + faceH * 0.02, eyeMid.y + eyeW * 0.35);
    const sideKey = side === 'Left' ? 'left' : 'right';
    const brow = placeBrowTriad(arr, placementVerts, { ...eyeMid, y: browFloor }, eyeW, sideKey, midX);
    if (brow.centerVi >= 0) vertexByAnchor[`brow${side}Center`] = brow.centerVi;
    if (brow.innerVi >= 0) vertexByAnchor[`brow${side}Inner`] = brow.innerVi;
    if (brow.outerVi >= 0) vertexByAnchor[`brow${side}Outer`] = brow.outerVi;
  }

  // Mouth refine between corners.
  if (vertexByAnchor.mouthCornerLeft != null && vertexByAnchor.mouthCornerRight != null) {
    const lc = vertPos(arr, vertexByAnchor.mouthCornerLeft);
    const rc = vertPos(arr, vertexByAnchor.mouthCornerRight);
    const midM = { x: (lc.x + rc.x) * 0.5, y: (lc.y + rc.y) * 0.5, z: (lc.z + rc.z) * 0.5 };
    const mouthW = Math.hypot(lc.x - rc.x, lc.y - rc.y, lc.z - rc.z);
    const xLo = Math.min(lc.x, rc.x) + mouthW * 0.15;
    const xHi = Math.max(lc.x, rc.x) - mouthW * 0.15;
    const inMouthX = (vi) => arr[vi * 3] >= xLo && arr[vi * 3] <= xHi;
    const noseY = nose.y;
    const chinY = chinVi != null ? arr[chinVi * 3 + 1] : midM.y - faceH * 0.2;
    const upper = pickLocalExtremum(
      placementVerts,
      arr,
      { x: midM.x, y: midM.y + mouthW * 0.12, z: midM.z },
      mouthW * 0.45,
      'maxY',
      (vi) =>
        inMouthX(vi) &&
        arr[vi * 3 + 1] < noseY - faceH * 0.04 &&
        arr[vi * 3 + 1] > chinY + faceH * 0.05 &&
        arr[vi * 3 + 1] >= midM.y - mouthW * 0.05,
    );
    const lower = pickLocalExtremum(
      placementVerts,
      arr,
      { x: midM.x, y: midM.y - mouthW * 0.12, z: midM.z },
      mouthW * 0.45,
      'minY',
      (vi) =>
        inMouthX(vi) &&
        arr[vi * 3 + 1] < noseY - faceH * 0.05 &&
        arr[vi * 3 + 1] > chinY + faceH * 0.04 &&
        arr[vi * 3 + 1] <= midM.y + mouthW * 0.05,
    );
    if (upper >= 0) vertexByAnchor.mouthUpper = upper;
    if (lower >= 0) vertexByAnchor.mouthLower = lower;
  }

  // Forehead above brows.
  {
    const browY = Math.max(
      vertexByAnchor.browLeftCenter != null ? arr[vertexByAnchor.browLeftCenter * 3 + 1] : nose.y,
      vertexByAnchor.browRightCenter != null ? arr[vertexByAnchor.browRightCenter * 3 + 1] : nose.y,
    );
    const target = {
      x: midX,
      y: Math.max(browY + faceH * 0.06, nose.y + faceH * 0.38),
      z: nose.z - faceH * 0.08,
    };
    const vi = nearestVertex(
      placementVerts,
      arr,
      target,
      (v) => Math.abs(arr[v * 3] - midX) < iod * 0.45 && arr[v * 3 + 1] > browY,
    );
    if (vi >= 0) vertexByAnchor.forehead = vi;
  }

  /** @type {Record<string, unknown>} */
  const anchors = {};
  for (const anchorId of SAGA_DRIVE_FACE_ANCHOR_IDS) {
    const vertexIndex = vertexByAnchor[anchorId];
    if (vertexIndex == null || vertexIndex < 0) {
      const hint = FACE_ANCHOR_HEAD_HINTS[anchorId];
      if (!hint) continue;
      const target = hintToWorld(hint, bounds);
      const vi = nearestVertex(placementVerts, arr, target);
      if (vi < 0) continue;
      anchors[anchorId] = bindingForVertex(nodeIdentity, primitiveIndex, prim, vi);
      continue;
    }
    anchors[anchorId] = bindingForVertex(nodeIdentity, primitiveIndex, prim, vertexIndex);
  }

  return {
    nodeIdentity,
    anchors,
    headBounds: bounds,
    headVertexCount: headVerts.length,
    forwardVertexCount: placementVerts.length,
    authoringMode: opts.markerPositions ? 'qtmesh-markers+anatomic-refine' : 'head-normalized+anatomic-refine',
  };
}
