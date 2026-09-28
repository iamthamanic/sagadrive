/**
 * face-mapping-raycast — pointer → SagaDriveFaceAnchorsV1 triangle binding (#420/#421).
 * Location: src/infrastructure/character/avatar/face-mapping-raycast.ts
 *
 * Raycasts only allowlisted avatar surface meshes (no helpers/equipment/debug).
 * Produces nodeIdentity + primitiveIndex + triangleIndex + barycentric — never world-XYZ only.
 *
 * Returns ordered intersection candidates (near→far). Manual uses first hit; Auto may select
 * a later semantically allowed hit via the shared candidate list (no second binding engine).
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

/** One ordered intersection along the ray (near → far). Binding built like Manual Mapping. */
export interface FaceMappingRaycastCandidateV1 extends FaceMappingRaycastHitV1 {
  readonly order: number;
  readonly distance: number;
  readonly nodeIdentity: string;
  readonly triangleIndex: number;
}

function hitToCandidate(
  hit: THREE.Intersection,
  order: number,
): FaceMappingRaycastCandidateV1 | null {
  if (!(hit.object instanceof THREE.Mesh)) return null;
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

  mesh.getVertexPosition(ia, _a);
  mesh.getVertexPosition(ib, _b);
  mesh.getVertexPosition(ic, _c);

  _pointLocal.copy(hit.point);
  mesh.worldToLocal(_pointLocal);
  THREE.Triangle.getBarycoord(_pointLocal, _a, _b, _c, _bary);
  const barycentric = normalizeFaceMappingBarycentric(_bary.x, _bary.y, _bary.z);

  const triangleIndex = hit.faceIndex;
  const primitiveIndex = resolvePrimitiveIndex(geometry, triangleIndex);

  return {
    order,
    distance: hit.distance,
    nodeIdentity,
    triangleIndex,
    binding: {
      nodeIdentity,
      primitiveIndex,
      triangleIndex,
      barycentric,
    },
    worldPoint: { x: hit.point.x, y: hit.point.y, z: hit.point.z },
  };
}

/**
 * Ordered (near→far) allowlisted intersections for one canvas pointer.
 * Shared path for Manual (take [0]) and Auto (semantic select among candidates).
 */
export function listFaceMappingRaycastCandidates(input: {
  camera: THREE.Camera;
  root: THREE.Object3D;
  canvasWidth: number;
  canvasHeight: number;
  canvasX: number;
  canvasY: number;
}): FaceMappingRaycastCandidateV1[] {
  const { camera, root, canvasWidth, canvasHeight, canvasX, canvasY } = input;
  if (canvasWidth <= 0 || canvasHeight <= 0) return [];

  _pointerNdc.x = (canvasX / canvasWidth) * 2 - 1;
  _pointerNdc.y = -(canvasY / canvasHeight) * 2 + 1;
  _raycaster.setFromCamera(_pointerNdc, camera);

  const meshes = collectFaceMappingRaycastMeshes(root);
  if (meshes.length === 0) return [];

  const hits = _raycaster.intersectObjects(meshes, false);
  const out: FaceMappingRaycastCandidateV1[] = [];
  for (let i = 0; i < hits.length; i += 1) {
    const candidate = hitToCandidate(hits[i]!, i);
    if (candidate) out.push(candidate);
  }
  return out;
}

/**
 * Convert canvas-local pointer coords to a triangle binding on allowlisted meshes.
 * Default = first (nearest) hit — Manual Mapping behavior.
 */
export function raycastFaceMappingPointer(input: {
  camera: THREE.Camera;
  root: THREE.Object3D;
  canvasWidth: number;
  canvasHeight: number;
  canvasX: number;
  canvasY: number;
  /**
   * Optional Auto selector over ordered candidates.
   * Return the chosen candidate (or null to miss). Defaults to first hit.
   */
  selectCandidate?: (
    candidates: readonly FaceMappingRaycastCandidateV1[],
  ) => FaceMappingRaycastCandidateV1 | null;
}): FaceMappingRaycastHitV1 | null {
  const candidates = listFaceMappingRaycastCandidates(input);
  if (candidates.length === 0) return null;
  const selected = input.selectCandidate
    ? input.selectCandidate(candidates)
    : (candidates[0] ?? null);
  if (!selected) return null;
  return {
    binding: selected.binding,
    worldPoint: selected.worldPoint,
  };
}
