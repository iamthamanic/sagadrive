/**
 * liveact-face-anchor-morph-seed — place face anchors from ARKit morph displacement.
 * Location: scripts/lib/liveact-face-anchor-morph-seed.mjs
 *
 * Offline authoring only. Each anchor sits on the vertex that the matching ARKit morph moves
 * most (e.g. mouthSmileLeft → mouthCornerLeft), so overlay points show exactly where LiveAct
 * expressions deform the mesh. Works for any mesh with ARKit-named morph targets; no asset ids.
 * Output is auto/unreviewed — not Semantic QA ground truth (morph-seeded, therefore circular).
 */

import { SAGA_DRIVE_FACE_ANCHOR_IDS } from './liveact-face-anchor-ids.mjs';
import { bindingForVertex } from './liveact-face-anchor-heuristic.mjs';

/** Morphs required to seed the full set; missing ones fail loudly instead of guessing. */
export const ARKIT_SEED_MORPHS = [
  'eyeBlinkLeft',
  'eyeBlinkRight',
  'eyeSquintLeft',
  'eyeSquintRight',
  'mouthSmileLeft',
  'mouthSmileRight',
  'mouthUpperUpLeft',
  'mouthUpperUpRight',
  'mouthLowerDownLeft',
  'mouthLowerDownRight',
  'jawOpen',
  'browInnerUp',
  'browOuterUpLeft',
  'browOuterUpRight',
];

const REGION_THRESHOLD = 0.15;

/**
 * @param {import('@gltf-transform/core').Document} document
 * @returns {{ node: import('@gltf-transform/core').Node; prim: import('@gltf-transform/core').Primitive; primitiveIndex: number; targetNames: string[] } | null}
 */
export function findArkitMorphPrimitive(document) {
  for (const node of document.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const names = mesh.getExtras()?.targetNames;
    if (!Array.isArray(names)) continue;
    const prims = mesh.listPrimitives();
    for (let pi = 0; pi < prims.length; pi += 1) {
      if (prims[pi].listTargets().length !== names.length) continue;
      if (ARKIT_SEED_MORPHS.every((m) => names.includes(m))) {
        return { node, prim: prims[pi], primitiveIndex: pi, targetNames: names };
      }
    }
  }
  return null;
}

/**
 * @param {import('@gltf-transform/core').Primitive} prim
 * @param {string[]} targetNames
 * @param {string} name
 */
function displacement(prim, targetNames, name) {
  const idx = targetNames.indexOf(name);
  const arr = prim.listTargets()[idx]?.getAttribute('POSITION')?.getArray();
  if (!arr) throw new Error(`Morph target "${name}" has no POSITION deltas`);
  const out = new Float32Array(arr.length / 3);
  for (let vi = 0; vi < out.length; vi += 1) {
    out[vi] = Math.hypot(arr[vi * 3], arr[vi * 3 + 1], arr[vi * 3 + 2]);
  }
  return out;
}

/**
 * @param {Float32Array} disp
 * @param {(vi: number) => boolean} [filter]
 */
function argmax(disp, filter) {
  let best = -1;
  let bestD = 0;
  for (let vi = 0; vi < disp.length; vi += 1) {
    if (disp[vi] <= bestD) continue;
    if (filter && !filter(vi)) continue;
    bestD = disp[vi];
    best = vi;
  }
  return best;
}

/** @param {Float32Array} a @param {Float32Array} b */
function sum(a, b) {
  const out = new Float32Array(a.length);
  for (let i = 0; i < a.length; i += 1) out[i] = a[i] + b[i];
  return out;
}

/**
 * @param {import('@gltf-transform/core').Document} document
 * @returns {{ nodeIdentity: string; anchors: Record<string, unknown>; authoringMode: string }}
 */
export function authorMorphSeededFaceAnchorsManifest(document) {
  const found = findArkitMorphPrimitive(document);
  if (!found) {
    throw new Error(`No primitive with ARKit morphs: ${ARKIT_SEED_MORPHS.join(', ')}`);
  }
  const { node, prim, primitiveIndex, targetNames } = found;
  const nodeIdentity = (node.getName() || '').trim();
  if (!nodeIdentity) throw new Error('ARKit morph node has no name (runtime binds by node name)');
  const pos = prim.getAttribute('POSITION')?.getArray();
  if (!pos) throw new Error('ARKit morph primitive missing POSITION');

  const D = (name) => displacement(prim, targetNames, name);
  const x = (vi) => pos[vi * 3];
  const y = (vi) => pos[vi * 3 + 1];
  const z = (vi) => pos[vi * 3 + 2];

  /** @type {Record<string, number>} */
  const v = {};

  // Mouth corners define midline + scale for everything else.
  v.mouthCornerLeft = argmax(D('mouthSmileLeft'));
  v.mouthCornerRight = argmax(D('mouthSmileRight'));
  if (v.mouthCornerLeft < 0 || v.mouthCornerRight < 0) throw new Error('mouthSmile morphs move no vertices');
  // Contract: "Left" = character left = +X (see FACE_ANCHOR_HEAD_HINTS).
  if (x(v.mouthCornerLeft) < x(v.mouthCornerRight)) {
    [v.mouthCornerLeft, v.mouthCornerRight] = [v.mouthCornerRight, v.mouthCornerLeft];
  }
  const midX = (x(v.mouthCornerLeft) + x(v.mouthCornerRight)) * 0.5;
  const mouthW = Math.abs(x(v.mouthCornerLeft) - x(v.mouthCornerRight));
  const mouthY = (y(v.mouthCornerLeft) + y(v.mouthCornerRight)) * 0.5;
  if (!(mouthW > 0.005)) throw new Error(`Mouth corners collapse (width ${mouthW})`);
  const midline = (vi) => Math.abs(x(vi) - midX) < mouthW * 0.2;
  const leftSide = (vi) => x(vi) > midX;
  const rightSide = (vi) => x(vi) < midX;

  // Closed lips share one contact line — offset so upper/lower sit on the lip bodies.
  const lipGap = mouthW * 0.1;
  v.mouthUpper = argmax(
    sum(D('mouthUpperUpLeft'), D('mouthUpperUpRight')),
    (vi) => midline(vi) && y(vi) > mouthY + lipGap,
  );
  v.mouthLower = argmax(
    sum(D('mouthLowerDownLeft'), D('mouthLowerDownRight')),
    (vi) => midline(vi) && y(vi) < mouthY - lipGap,
  );

  // jawOpen peaks on the lower lip; chin = most forward midline point of the moving jaw below it.
  const jaw = D('jawOpen');
  const jawMax = jaw[argmax(jaw)] ?? 0;
  v.chin = -1;
  for (let vi = 0; vi < jaw.length; vi += 1) {
    if (jaw[vi] < jawMax * 0.5 || !midline(vi) || y(vi) > mouthY - mouthW * 0.5) continue;
    if (v.chin < 0 || z(vi) > z(v.chin)) v.chin = vi;
  }

  for (const side of /** @type {const} */ (['Left', 'Right'])) {
    const onSide = side === 'Left' ? leftSide : rightSide;
    const blink = D(`eyeBlink${side}`);
    const upper = argmax(blink, onSide);
    if (upper < 0) throw new Error(`eyeBlink${side} moves no vertices`);
    v[`eye${side}Upper`] = upper;

    // Blink region x-extent ≈ eye width; corners are its medial/lateral ends.
    const cut = blink[upper] * REGION_THRESHOLD;
    let inner = -1;
    let outer = -1;
    for (let vi = 0; vi < blink.length; vi += 1) {
      if (blink[vi] < cut || !onSide(vi)) continue;
      const d = Math.abs(x(vi) - midX);
      if (inner < 0 || d < Math.abs(x(inner) - midX)) inner = vi;
      if (outer < 0 || d > Math.abs(x(outer) - midX)) outer = vi;
    }
    v[`eye${side}Inner`] = inner;
    v[`eye${side}Outer`] = outer;
    const eyeCenterY = (y(inner) + y(outer)) * 0.5;
    v[`eye${side}Lower`] = argmax(D(`eyeSquint${side}`), (vi) => onSide(vi) && y(vi) < eyeCenterY);

    // Brow morphs also drag the upper lid crease — keep brows above the lid, split at eye center.
    const eyeW = Math.abs(x(outer) - x(inner));
    const eyeCenterAbsX = (Math.abs(x(inner) - midX) + Math.abs(x(outer) - midX)) * 0.5;
    const aboveLid = (vi) => onSide(vi) && y(vi) > y(upper) + eyeW * 0.3;
    v[`brow${side}Inner`] = argmax(
      D('browInnerUp'),
      (vi) => aboveLid(vi) && Math.abs(x(vi) - midX) < eyeCenterAbsX,
    );
    v[`brow${side}Outer`] = argmax(
      D(`browOuterUp${side}`),
      (vi) => aboveLid(vi) && Math.abs(x(vi) - midX) > eyeCenterAbsX,
    );
  }

  // Brow centers + nose tip + forehead: nearest surface vertex to derived targets.
  const nearest = (t, filter) => {
    let best = -1;
    let bestD = Infinity;
    for (let vi = 0; vi < pos.length / 3; vi += 1) {
      if (filter && !filter(vi)) continue;
      const d = (x(vi) - t.x) ** 2 + (y(vi) - t.y) ** 2 + (z(vi) - t.z) ** 2;
      if (d < bestD) {
        bestD = d;
        best = vi;
      }
    }
    return best;
  };
  const mid = (a, b) => ({ x: (x(a) + x(b)) / 2, y: (y(a) + y(b)) / 2, z: (z(a) + z(b)) / 2 });
  v.browLeftCenter = nearest(mid(v.browLeftInner, v.browLeftOuter), leftSide);
  v.browRightCenter = nearest(mid(v.browRightInner, v.browRightOuter), rightSide);

  const eyeY = (y(v.eyeLeftInner) + y(v.eyeRightInner)) * 0.5;
  let nose = -1;
  for (let vi = 0; vi < pos.length / 3; vi += 1) {
    if (!midline(vi) || y(vi) <= y(v.mouthUpper) || y(vi) >= eyeY) continue;
    if (nose < 0 || z(vi) > z(nose)) nose = vi;
  }
  v.noseTip = nose;

  // Forehead ≈ one mouth width above the brows; take the frontmost midline vertex at that height.
  const browY = Math.max(y(v.browLeftInner), y(v.browRightInner));
  const foreheadY = browY + mouthW;
  v.forehead = -1;
  for (let vi = 0; vi < pos.length / 3; vi += 1) {
    if (!midline(vi) || Math.abs(y(vi) - foreheadY) > mouthW * 0.3) continue;
    if (v.forehead < 0 || z(vi) > z(v.forehead)) v.forehead = vi;
  }

  /** @type {Record<string, unknown>} */
  const anchors = {};
  const missing = [];
  for (const anchorId of SAGA_DRIVE_FACE_ANCHOR_IDS) {
    const vi = v[anchorId];
    if (vi == null || vi < 0) {
      missing.push(anchorId);
      continue;
    }
    anchors[anchorId] = bindingForVertex(nodeIdentity, primitiveIndex, prim, vi);
  }
  if (missing.length) throw new Error(`Morph seed could not place: ${missing.join(', ')}`);

  return { nodeIdentity, anchors, authoringMode: 'arkit-morph-seed' };
}
