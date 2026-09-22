/**
 * face-anchor-runtime — evaluate SagaDriveFaceAnchorsV1 on deformed Three.js meshes (#399).
 * Location: src/infrastructure/character/avatar/face-anchor-runtime.ts
 *
 * Reads skinned + morphed vertex positions; missing/invalid bindings → unavailable (no synthetic fallback).
 */

import * as THREE from 'three';
import type {
  SagaDriveFaceAnchorId,
  SagaDriveFaceAnchorTriangleBinding,
  SagaDriveFaceAnchorsManifestV1,
} from '../../../domains/character/avatar/face-anchor-contract';
import { validateFaceAnchorTriangleBinding } from '../../../domains/character/avatar/face-anchor-contract';

export type FaceAnchorEvaluationStatus = 'available' | 'unavailable';

export interface FaceAnchorWorldPositionV1 {
  readonly status: 'available';
  readonly anchorId: SagaDriveFaceAnchorId;
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface FaceAnchorUnavailableV1 {
  readonly status: 'unavailable';
  readonly anchorId: SagaDriveFaceAnchorId;
}

export type FaceAnchorEvaluationV1 = FaceAnchorWorldPositionV1 | FaceAnchorUnavailableV1;

export interface FaceAnchorRuntimeSnapshotV1 {
  readonly evaluations: Readonly<Partial<Record<SagaDriveFaceAnchorId, FaceAnchorEvaluationV1>>>;
}

const _vertex = new THREE.Vector3();
const _vertexB = new THREE.Vector3();
const _vertexC = new THREE.Vector3();
const _morphDelta = new THREE.Vector3();
const _world = new THREE.Vector3();

/** Index mesh/skinned nodes by stable node name (first match wins; deterministic traversal order). */
export function buildFaceAnchorNodeIndex(root: THREE.Object3D): ReadonlyMap<string, THREE.Object3D> {
  const map = new Map<string, THREE.Object3D>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const name = object.name.trim();
    if (!name || map.has(name)) return;
    map.set(name, object);
  });
  return map;
}

interface PrimitiveIndexRange {
  readonly triangleCount: number;
  readonly indexOffset: number;
  readonly nonIndexedVertexOffset: number;
}

function resolvePrimitiveRange(
  geometry: THREE.BufferGeometry,
  primitiveIndex: number,
): PrimitiveIndexRange | null {
  const groups = geometry.groups;
  if (groups && groups.length > 0) {
    if (primitiveIndex < 0 || primitiveIndex >= groups.length) return null;
    const group = groups[primitiveIndex];
    const triangleCount = Math.floor(group.count / 3);
    return {
      triangleCount,
      indexOffset: group.start,
      nonIndexedVertexOffset: group.start,
    };
  }
  if (primitiveIndex !== 0) return null;
  const index = geometry.index;
  if (index) {
    return { triangleCount: Math.floor(index.count / 3), indexOffset: 0, nonIndexedVertexOffset: 0 };
  }
  const position = geometry.getAttribute('position');
  if (!position) return null;
  return {
    triangleCount: Math.floor(position.count / 3),
    indexOffset: 0,
    nonIndexedVertexOffset: 0,
  };
}

function triangleVertexIndices(
  geometry: THREE.BufferGeometry,
  primitiveIndex: number,
  triangleIndex: number,
): [number, number, number] | null {
  const range = resolvePrimitiveRange(geometry, primitiveIndex);
  if (!range || triangleIndex < 0 || triangleIndex >= range.triangleCount) return null;

  const index = geometry.index;
  if (index) {
    const base = range.indexOffset + triangleIndex * 3;
    if (base + 2 >= index.count) return null;
    return [index.getX(base), index.getX(base + 1), index.getX(base + 2)];
  }
  const position = geometry.getAttribute('position');
  if (!position) return null;
  const base = range.nonIndexedVertexOffset + triangleIndex * 3;
  if (base + 2 >= position.count) return null;
  return [base, base + 1, base + 2];
}

function readDeformedVertex(mesh: THREE.Mesh, vertexIndex: number, target: THREE.Vector3): void {
  const geometry = mesh.geometry;
  const position = geometry.getAttribute('position');
  if (!position || vertexIndex < 0 || vertexIndex >= position.count) {
    target.set(0, 0, 0);
    return;
  }
  target.fromBufferAttribute(position, vertexIndex);

  const morphPositions = geometry.morphAttributes.position;
  const influences = mesh.morphTargetInfluences;
  if (morphPositions?.length && influences?.length) {
    for (let i = 0; i < morphPositions.length; i += 1) {
      const weight = influences[i] ?? 0;
      if (weight === 0) continue;
      const morphAttr = morphPositions[i];
      if (!morphAttr) continue;
      _morphDelta.fromBufferAttribute(morphAttr, vertexIndex);
      target.addScaledVector(_morphDelta, weight);
    }
  }

  if (mesh instanceof THREE.SkinnedMesh) {
    mesh.applyBoneTransform(vertexIndex, target);
  }
}

function resolveMeshForBinding(
  nodeIndex: ReadonlyMap<string, THREE.Object3D>,
  binding: SagaDriveFaceAnchorTriangleBinding,
): THREE.Mesh | null {
  const node = nodeIndex.get(binding.nodeIdentity.trim());
  if (!node || !(node instanceof THREE.Mesh)) return null;
  return node;
}

/**
 * Evaluate one anchor in world space from the current deformed mesh state.
 * Caller must have updated skeleton/morphs and called updateMatrixWorld on the graph.
 */
export function evaluateFaceAnchorWorldPosition(
  nodeIndex: ReadonlyMap<string, THREE.Object3D>,
  anchorId: SagaDriveFaceAnchorId,
  binding: SagaDriveFaceAnchorTriangleBinding,
  target?: THREE.Vector3,
): FaceAnchorEvaluationV1 {
  const validated = validateFaceAnchorTriangleBinding(binding, anchorId);
  if (!validated.ok) {
    return { status: 'unavailable', anchorId };
  }

  const mesh = resolveMeshForBinding(nodeIndex, binding);
  if (!mesh) {
    return { status: 'unavailable', anchorId };
  }

  const geometry = mesh.geometry;
  if (!geometry) {
    return { status: 'unavailable', anchorId };
  }

  const indices = triangleVertexIndices(geometry, binding.primitiveIndex, binding.triangleIndex);
  if (!indices) {
    return { status: 'unavailable', anchorId };
  }

  readDeformedVertex(mesh, indices[0], _vertex);
  readDeformedVertex(mesh, indices[1], _vertexB);
  readDeformedVertex(mesh, indices[2], _vertexC);

  const { u, v, w } = binding.barycentric;
  _world.copy(_vertex).multiplyScalar(u);
  _world.addScaledVector(_vertexB, v);
  _world.addScaledVector(_vertexC, w);

  mesh.localToWorld(_world);

  const out = target ?? new THREE.Vector3();
  out.copy(_world);

  return {
    status: 'available',
    anchorId,
    x: out.x,
    y: out.y,
    z: out.z,
  };
}

export function evaluateFaceAnchorsManifest(
  root: THREE.Object3D,
  manifest: SagaDriveFaceAnchorsManifestV1,
): FaceAnchorRuntimeSnapshotV1 {
  root.updateMatrixWorld(true);
  const nodeIndex = buildFaceAnchorNodeIndex(root);
  const evaluations: Partial<Record<SagaDriveFaceAnchorId, FaceAnchorEvaluationV1>> = {};

  for (const [id, binding] of Object.entries(manifest.anchors)) {
    if (!binding) continue;
    const anchorId = id as SagaDriveFaceAnchorId;
    evaluations[anchorId] = evaluateFaceAnchorWorldPosition(nodeIndex, anchorId, binding);
  }

  return { evaluations };
}
