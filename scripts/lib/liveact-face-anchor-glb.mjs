/**
 * liveact-face-anchor-glb — glTF mesh primitive helpers for face anchor authoring (#399).
 * Location: scripts/lib/liveact-face-anchor-glb.mjs
 */

/**
 * @param {import('@gltf-transform/core').Document} document
 */
export function listMeshedNodeIdentities(document) {
  /** @type {string[]} */
  const names = [];
  for (const node of document.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const name = (node.getName() || '').trim();
    if (name) names.push(name);
  }
  return [...new Set(names)].sort();
}

/**
 * @param {import('@gltf-transform/core').Document} document
 * @param {string} nodeIdentity
 */
export function findNodeByIdentity(document, nodeIdentity) {
  const want = nodeIdentity.trim();
  for (const node of document.getRoot().listNodes()) {
    if ((node.getName() || '').trim() === want) return node;
  }
  return null;
}

/**
 * @param {import('@gltf-transform/core').Primitive} prim
 */
export function countPrimitiveTriangles(prim) {
  const indices = prim.getIndices();
  if (indices) return Math.floor(indices.getCount() / 3);
  const pos = prim.getAttribute('POSITION');
  if (!pos) return 0;
  return Math.floor(pos.getCount() / 3);
}

/**
 * @param {import('@gltf-transform/core').Node} node
 * @param {number} primitiveIndex
 */
export function countTrianglesForNodePrimitive(node, primitiveIndex) {
  const mesh = node.getMesh();
  if (!mesh) return 0;
  const prims = mesh.listPrimitives();
  if (primitiveIndex < 0 || primitiveIndex >= prims.length) return 0;
  return countPrimitiveTriangles(prims[primitiveIndex]);
}
