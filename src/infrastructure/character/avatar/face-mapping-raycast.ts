/**
 * face-mapping-raycast — pointer → SagaDriveFaceAnchorsV1 triangle binding (#420).
 * Location: src/infrastructure/character/avatar/face-mapping-raycast.ts
 *
 * Raycasts only allowlisted avatar surface meshes (no helpers/equipment/debug).
 * Produces nodeIdentity + primitiveIndex + triangleIndex + barycentric — never world-XYZ only.
 *
 * Barycentric is computed against the same deformed vertex positions Three.js uses for
 * the hit (Mesh.getVertexPosition), then clamped so draft validation never drops the point.
 */

import * as THREE from 'three';
import type { SagaDriveFaceAnchorTriangleBinding } from '../../../domains/character/avatar/face-anchor-contract';

const _raycaster = new THREE.Raycaster();
const _pointerNdc = new THREE.Vector2();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _pointLocal = new THREE.Vector3();
const _bary = new THREE.Vector3();

const EXCLUDE_NAME_RE =
  /hair|weapon|sword|shield|helper|debug|grid|floor|axis|gizmo|outline|equipment|wearable|prop/i;

export function isFaceMappingAllowlistedMesh(object: THREE.Object3D): object is THREE.Mesh {
  if (!(object instanceof THREE.Mesh)) return false;
  if (!object.visible) return false;
  if (!(object instanceof THREE.SkinnedMesh) && !(object instanceof THREE.Mesh)) return false;
  const name = object.name.trim();
  if (!name) return false;
  if (EXCLUDE_NAME_RE.test(name)) return false;
  if (object.userData?.sagadriveExcludeFaceMapping === true) return false;
  if (object.userData?.isHelper === true) return false;
  const geom = object.geometry;
  if (!(geom instanceof THREE.BufferGeometry)) return false;
  if (!geom.getAttribute('position')) return false;
  return true;
}

/** Collect raycast targets under the avatar model root. */
export function collectFaceMappingRaycastMeshes(root: THREE.Object3D): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  root.traverse((object) => {
    if (isFaceMappingAllowlistedMesh(object)) meshes.push(object);
  });
  return meshes;
}

function resolvePrimitiveIndex(geometry: THREE.BufferGeometry, faceIndex: number): number {
  const groups = geometry.groups;
  if (!groups || groups.length === 0) return 0;
  const triStart = faceIndex * 3;
  for (let i = 0; i < groups.length; i += 1) {
    const g = groups[i];
    if (triStart >= g.start && triStart < g.start + g.count) return i;
  }
  return 0;
}

/**
 * Clamp + renormalize so bindings always pass SagaDriveFaceAnchorsV1 barycentric validation.
 * Numerical noise from skinned hits must not make markers vanish as "ungültig".
 */
export function normalizeFaceMappingBarycentric(
  u: number,
  v: number,
  w: number,
): { u: number; v: number; w: number } {
  let uu = Number.isFinite(u) ? Math.max(0, u) : 0;
  let vv = Number.isFinite(v) ? Math.max(0, v) : 0;
  let ww = Number.isFinite(w) ? Math.max(0, w) : 0;
  const sum = uu + vv + ww;
  if (!(sum > 1e-8)) {
    return { u: 1 / 3, v: 1 / 3, w: 1 / 3 };
  }
  return { u: uu / sum, v: vv / sum, w: ww / sum };
}

export interface FaceMappingRaycastHitV1 {
  readonly binding: SagaDriveFaceAnchorTriangleBinding;
  readonly worldPoint: { readonly x: number; readonly y: number; readonly z: number };
}

/**
 * Convert canvas-local pointer coords to a triangle binding on allowlisted meshes.
 * @param canvasX CSS pixel X relative to canvas left
 * @param canvasY CSS pixel Y relative to canvas top
 */
export function raycastFaceMappingPointer(input: {
  camera: THREE.Camera;
  root: THREE.Object3D;
  canvasWidth: number;
  canvasHeight: number;
  canvasX: number;
  canvasY: number;
}): FaceMappingRaycastHitV1 | null {
  const { camera, root, canvasWidth, canvasHeight, canvasX, canvasY } = input;
  if (canvasWidth <= 0 || canvasHeight <= 0) return null;

  _pointerNdc.x = (canvasX / canvasWidth) * 2 - 1;
  _pointerNdc.y = -(canvasY / canvasHeight) * 2 + 1;
  _raycaster.setFromCamera(_pointerNdc, camera);

  const meshes = collectFaceMappingRaycastMeshes(root);
  if (meshes.length === 0) return null;

  const hits = _raycaster.intersectObjects(meshes, false);
  const hit = hits[0];
  if (!hit || !(hit.object instanceof THREE.Mesh)) return null;
  if (typeof hit.faceIndex !== 'number' || hit.faceIndex < 0 || !hit.face) return null;

  const mesh = hit.object;
  const nodeIdentity = mesh.name.trim();
  if (!nodeIdentity) return null;

  const geometry = mesh.geometry;
  if (!(geometry instanceof THREE.BufferGeometry)) return null;
  if (!geometry.getAttribute('position')) return null;

  const ia = hit.face.a;
  const ib = hit.face.b;
  const ic = hit.face.c;

  // Same space as the raycast hit: deformed / skinned vertex positions.
  mesh.getVertexPosition(ia, _a);
  mesh.getVertexPosition(ib, _b);
  mesh.getVertexPosition(ic, _c);

  // hit.point is world-space; barycentric needs the same local/morph space as getVertexPosition.
  _pointLocal.copy(hit.point);
  mesh.worldToLocal(_pointLocal);
  THREE.Triangle.getBarycoord(_pointLocal, _a, _b, _c, _bary);
  const barycentric = normalizeFaceMappingBarycentric(_bary.x, _bary.y, _bary.z);

  const triangleIndex = hit.faceIndex;
  const primitiveIndex = resolvePrimitiveIndex(geometry, triangleIndex);

  return {
    binding: {
      nodeIdentity,
      primitiveIndex,
      triangleIndex,
      barycentric,
    },
    worldPoint: { x: hit.point.x, y: hit.point.y, z: hit.point.z },
  };
}
