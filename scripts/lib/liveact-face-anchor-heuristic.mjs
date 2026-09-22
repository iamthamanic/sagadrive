/**
 * liveact-face-anchor-heuristic — head-bbox anchor placement for human face GLBs (#402).
 * Location: scripts/lib/liveact-face-anchor-heuristic.mjs
 *
 * Offline mesh analysis only; domain stays provider-neutral.
 */

import { SAGA_DRIVE_FACE_ANCHOR_IDS } from './liveact-face-anchor-ids.mjs';
import { findNodeByIdentity, listMeshedNodeIdentities } from './liveact-face-anchor-glb.mjs';

/**
 * Normalized head-box hints (nx: character right→left, ny: chin→forehead, nz: back→front).
 * @type {Record<string, { nx: number; ny: number; nz: number }>}
 */
export const FACE_ANCHOR_HEAD_HINTS = {
  forehead: { nx: 0.5, ny: 1, nz: 1 },
  chin: { nx: 0.5, ny: 0.02, nz: 0.88 },
  noseTip: { nx: 0.5, ny: 0.62, nz: 1 },
  mouthUpper: { nx: 0.5, ny: 0.4, nz: 0.96 },
  mouthLower: { nx: 0.5, ny: 0.32, nz: 0.94 },
  mouthCornerLeft: { nx: 0.84, ny: 0.36, nz: 0.92 },
  mouthCornerRight: { nx: 0.16, ny: 0.36, nz: 0.92 },
  eyeLeftInner: { nx: 0.56, ny: 0.72, nz: 0.98 },
  eyeLeftOuter: { nx: 0.74, ny: 0.73, nz: 0.98 },
  eyeLeftUpper: { nx: 0.68, ny: 0.76, nz: 0.98 },
  eyeLeftLower: { nx: 0.68, ny: 0.68, nz: 0.98 },
  eyeRightInner: { nx: 0.44, ny: 0.72, nz: 0.98 },
  eyeRightOuter: { nx: 0.26, ny: 0.73, nz: 0.98 },
  eyeRightUpper: { nx: 0.32, ny: 0.76, nz: 0.98 },
  eyeRightLower: { nx: 0.32, ny: 0.68, nz: 0.98 },
  browLeftInner: { nx: 0.56, ny: 0.84, nz: 0.94 },
  browLeftOuter: { nx: 0.84, ny: 0.86, nz: 0.9 },
  browLeftCenter: { nx: 0.7, ny: 0.86, nz: 0.94 },
  browRightInner: { nx: 0.44, ny: 0.84, nz: 0.94 },
  browRightOuter: { nx: 0.16, ny: 0.86, nz: 0.9 },
  browRightCenter: { nx: 0.3, ny: 0.86, nz: 0.94 },
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
function headVertexIndices(prim) {
  const pos = prim.getAttribute('POSITION');
  if (!pos) return [];
  const arr = pos.getArray();
  if (!arr) return [];
  let maxY = -Infinity;
  for (let i = 1; i < arr.length; i += 3) maxY = Math.max(maxY, arr[i]);
  const yCut = maxY - 0.42;
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
  return { triangleIndex: 0, barycentric: { u: 1 / 3, v: 0, w: 0 } };
}

/**
 * @param {import('@gltf-transform/core').Mesh} mesh
 * @param {import('@gltf-transform/core').Primitive} prim
 * @param {string} channelName
 */
function morphDeltaArray(mesh, prim, channelName) {
  const meshExtras = mesh.getExtras() || {};
  const primExtras = prim.getExtras() || {};
  const names = Array.isArray(primExtras.targetNames)
    ? primExtras.targetNames
    : Array.isArray(meshExtras.targetNames)
      ? meshExtras.targetNames
      : [];
  const ti = names.indexOf(channelName);
  if (ti < 0) return null;
  const acc = prim.listTargets()[ti]?.getAttribute('POSITION');
  const arr = acc?.getArray();
  return arr ?? null;
}

function morphMag(delta, vi) {
  const b = vi * 3;
  return Math.hypot(delta[b] ?? 0, delta[b + 1] ?? 0, delta[b + 2] ?? 0);
}

/**
 * @param {number[]} vertexIndices
 * @param {Float32Array | Int32Array} posArr
 * @param {Float32Array | Int32Array | null} delta
 * @param {'maxMag'|'maxX'|'minX'|'maxY'|'minY'|'maxZ'} mode
 * @param {(vi: number) => boolean} [filter]
 */
function pickVertex(vertexIndices, posArr, delta, mode, filter) {
  let bestVi = vertexIndices[0];
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const vi of vertexIndices) {
    if (filter && !filter(vi)) continue;
    const mag = delta ? morphMag(delta, vi) : 0;
    if (delta && mag < 1e-7) continue;
    const x = posArr[vi * 3];
    const y = posArr[vi * 3 + 1];
    const z = posArr[vi * 3 + 2];
    let score;
    if (mode === 'maxMag') score = mag;
    else if (mode === 'maxX') score = x;
    else if (mode === 'minX') score = -x;
    else if (mode === 'maxY') score = y;
    else if (mode === 'minY') score = -y;
    else score = z;
    if (score > bestScore) {
      bestScore = score;
      bestVi = vi;
    }
  }
  return bestVi;
}

/**
 * @param {import('@gltf-transform/core').Mesh} mesh
 * @param {import('@gltf-transform/core').Primitive} prim
 * @param {number[]} placementVerts
 * @param {Float32Array | Int32Array} posArr
 */
function headYMinFromPositions(posArr) {
  let maxY = -Infinity;
  for (let i = 1; i < posArr.length; i += 3) maxY = Math.max(maxY, posArr[i]);
  return maxY - 0.45;
}

function morphSeededVertexOverrides(mesh, prim, placementVerts, posArr) {
  /** @type {Partial<Record<string, number>>} */
  const overrides = {};
  const headYMin = headYMinFromPositions(posArr);
  const onHead = (vi) => posArr[vi * 3 + 1] >= headYMin;
  const blinkL = morphDeltaArray(mesh, prim, 'eyeBlinkLeft');
  const blinkR = morphDeltaArray(mesh, prim, 'eyeBlinkRight');
  const jawOpen = morphDeltaArray(mesh, prim, 'jawOpen');
  const smileL = morphDeltaArray(mesh, prim, 'mouthSmileLeft');
  const smileR = morphDeltaArray(mesh, prim, 'mouthSmileRight');
  const browUp = morphDeltaArray(mesh, prim, 'browInnerUp');

  if (!blinkL || !blinkR) return overrides;

  const activeBlinkL = placementVerts.filter((vi) => onHead(vi) && morphMag(blinkL, vi) > 1e-7);
  const activeBlinkR = placementVerts.filter((vi) => onHead(vi) && morphMag(blinkR, vi) > 1e-7);
  if (activeBlinkL.length < 4 || activeBlinkR.length < 4) return overrides;

  const midX =
    (activeBlinkL.reduce((s, vi) => s + posArr[vi * 3], 0) / activeBlinkL.length +
      activeBlinkR.reduce((s, vi) => s + posArr[vi * 3], 0) / activeBlinkR.length) /
    2;
  const leftIsPositiveX =
    activeBlinkL.reduce((s, vi) => s + posArr[vi * 3], 0) / activeBlinkL.length >
    activeBlinkR.reduce((s, vi) => s + posArr[vi * 3], 0) / activeBlinkR.length;
  const onLeft = (vi) => (leftIsPositiveX ? posArr[vi * 3] >= midX : posArr[vi * 3] <= midX);
  const onRight = (vi) => !onLeft(vi);

  overrides.eyeLeftInner = pickVertex(activeBlinkL, posArr, blinkL, 'minX', onLeft);
  overrides.eyeLeftOuter = pickVertex(activeBlinkL, posArr, blinkL, 'maxX', onLeft);
  overrides.eyeLeftUpper = pickVertex(activeBlinkL, posArr, blinkL, 'maxY', onLeft);
  overrides.eyeLeftLower = pickVertex(activeBlinkL, posArr, blinkL, 'minY', onLeft);
  overrides.eyeRightInner = pickVertex(activeBlinkR, posArr, blinkR, 'maxX', onRight);
  overrides.eyeRightOuter = pickVertex(activeBlinkR, posArr, blinkR, 'minX', onRight);
  overrides.eyeRightUpper = pickVertex(activeBlinkR, posArr, blinkR, 'maxY', onRight);
  overrides.eyeRightLower = pickVertex(activeBlinkR, posArr, blinkR, 'minY', onRight);

  const shrugUpper = morphDeltaArray(mesh, prim, 'mouthShrugUpper');
  const pucker = morphDeltaArray(mesh, prim, 'mouthPucker');

  if (jawOpen) {
    const jawActive = placementVerts.filter((vi) => onHead(vi) && morphMag(jawOpen, vi) > 1e-7);
    if (jawActive.length > 4) {
      overrides.mouthLower = pickVertex(jawActive, posArr, jawOpen, 'maxMag');
      overrides.chin = pickVertex(jawActive, posArr, jawOpen, 'minY');
    }
  }
  if (smileL && smileR) {
    overrides.mouthCornerLeft = pickVertex(placementVerts, posArr, smileL, 'maxMag', (vi) =>
      onHead(vi) && onLeft(vi),
    );
    overrides.mouthCornerRight = pickVertex(placementVerts, posArr, smileR, 'maxMag', (vi) =>
      onHead(vi) && onRight(vi),
    );
  }
  if (shrugUpper) {
    const shrugActive = placementVerts.filter((vi) => onHead(vi) && morphMag(shrugUpper, vi) > 1e-7);
    if (shrugActive.length > 4) {
      overrides.mouthUpper = pickVertex(shrugActive, posArr, shrugUpper, 'maxMag', (vi) =>
        Math.abs(posArr[vi * 3]) < 0.12,
      );
    }
  }
  if (pucker) {
    const puckerActive = placementVerts.filter((vi) => onHead(vi) && morphMag(pucker, vi) > 1e-7);
    if (puckerActive.length > 4 && overrides.mouthUpper == null) {
      overrides.mouthUpper = pickVertex(puckerActive, posArr, pucker, 'maxMag', (vi) =>
        Math.abs(posArr[vi * 3]) < 0.12,
      );
    }
  }
  if (browUp) {
    const browActive = placementVerts.filter((vi) => onHead(vi) && morphMag(browUp, vi) > 1e-7);
    if (browActive.length > 4) {
      overrides.browLeftCenter = pickVertex(browActive, posArr, browUp, 'maxMag', onLeft);
      overrides.browRightCenter = pickVertex(browActive, posArr, browUp, 'maxMag', onRight);
      overrides.browLeftInner = pickVertex(browActive, posArr, browUp, 'minX', onLeft);
      overrides.browRightInner = pickVertex(browActive, posArr, browUp, 'maxX', onRight);
      overrides.browLeftOuter = pickVertex(browActive, posArr, browUp, 'maxX', onLeft);
      overrides.browRightOuter = pickVertex(browActive, posArr, browUp, 'minX', onRight);
    }
  }
  overrides.noseTip = pickVertex(placementVerts, posArr, null, 'maxZ', (vi) =>
    onHead(vi) && Math.abs(posArr[vi * 3]) < 0.12 && posArr[vi * 3 + 1] > headYMin + 0.12,
  );
  overrides.forehead = pickVertex(placementVerts, posArr, null, 'maxY', (vi) =>
    onHead(vi) && Math.abs(posArr[vi * 3]) < 0.12,
  );

  return overrides;
}

function bindingForVertex(nodeIdentity, primitiveIndex, prim, vertexIndex) {
  const tri = triangleBindingForVertex(prim, vertexIndex);
  return {
    nodeIdentity,
    primitiveIndex,
    triangleIndex: tri.triangleIndex,
    barycentric: tri.barycentric,
  };
}

/**
 * @param {import('@gltf-transform/core').Document} document
 * @param {{ nodeIdentity?: string }} opts
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

  const headVerts = headVertexIndices(prim);
  if (headVerts.length < 100) {
    throw new Error(`Head vertex sample too small: ${headVerts.length}`);
  }
  const bounds = headBounds(arr, headVerts);
  const placementVerts = bounds.forwardVertexSet;
  const morphOverrides = morphSeededVertexOverrides(mesh, prim, placementVerts, arr);

  /** @type {Record<string, unknown>} */
  const anchors = {};
  for (const anchorId of SAGA_DRIVE_FACE_ANCHOR_IDS) {
    let vertexIndex = morphOverrides[anchorId];
    if (vertexIndex == null) {
      const hint = FACE_ANCHOR_HEAD_HINTS[anchorId];
      if (!hint) continue;
      const target = hintToWorld(hint, bounds);
      vertexIndex = placementVerts[0];
      let bestD = Number.POSITIVE_INFINITY;
      for (const vi of placementVerts) {
        const d = distSq(
          arr[vi * 3],
          arr[vi * 3 + 1],
          arr[vi * 3 + 2],
          target.x,
          target.y,
          target.z,
        );
        if (d < bestD) {
          bestD = d;
          vertexIndex = vi;
        }
      }
    }
    anchors[anchorId] = bindingForVertex(nodeIdentity, primitiveIndex, prim, vertexIndex);
  }

  return {
    nodeIdentity,
    anchors,
    headBounds: bounds,
    headVertexCount: headVerts.length,
    forwardVertexCount: placementVerts.length,
  };
}
