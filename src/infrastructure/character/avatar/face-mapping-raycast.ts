/**
 * face-mapping-raycast — pointer → SagaDriveFaceAnchorsV1 triangle binding (#420).
 * Location: src/infrastructure/character/avatar/face-mapping-raycast.ts
 *
 * Raycasts only allowlisted avatar surface meshes (no helpers/equipment/debug).
 * Produces nodeIdentity + primitiveIndex + triangleIndex + barycentric — never world-XYZ only.
 */

import * as THREE from 'three';
import type { SagaDriveFaceAnchorTriangleBinding } from '../../../domains/character/avatar/face-anchor-contract';

const _raycaster = new THREE.Raycaster();
const _pointerNdc = new THREE.Vector2();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _pointLocal = new THREE.Vector3();

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

function computeBarycentric(
  point: THREE.Vector3,
  a: THREE.Vector3,
  b: THREE.Vector3,
  c: THREE.Vector3,
): { u: number; v: number; w: number } {
  // From Real-Time Collision Detection (Ericson) — area method.
  const v0x = b.x - a.x;
  const v0y = b.y - a.y;
  const v0z = b.z - a.z;
  const v1x = c.x - a.x;
  const v1y = c.y - a.y;
  const v1z = c.z - a.z;
  const v2x = point.x - a.x;
  const v2y = point.y - a.y;
  const v2z = point.z - a.z;
  const d00 = v0x * v0x + v0y * v0y + v0z * v0z;
  const d01 = v0x * v1x + v0y * v1y + v0z * v1z;
  const d11 = v1x * v1x + v1y * v1y + v1z * v1z;
  const d20 = v0x * v2x + v0y * v2y + v0z * v2z;
  const d21 = v1x * v2x + v1y * v2y + v1z * v2z;
  const denom = d00 * d11 - d01 * d01;
  if (!Number.isFinite(denom) || Math.abs(denom) < 1e-12) {
    return { u: 1 / 3, v: 1 / 3, w: 1 / 3 };
  }
  const v = (d11 * d20 - d01 * d21) / denom;
  const w = (d00 * d21 - d01 * d20) / denom;
  const u = 1 - v - w;
  return { u, v, w };
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

  const position = geometry.getAttribute('position');
  if (!position) return null;

  const ia = hit.face.a;
  const ib = hit.face.b;
  const ic = hit.face.c;
  _a.fromBufferAttribute(position, ia);
  _b.fromBufferAttribute(position, ib);
  _c.fromBufferAttribute(position, ic);

  // Barycentric in local mesh space (same space as undeformed POSITION attribute).
  _pointLocal.copy(hit.point);
  mesh.worldToLocal(_pointLocal);
  const barycentric = computeBarycentric(_pointLocal, _a, _b, _c);

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
