/**
 * mediapipe-dense-semantic-points-v1 — MediaPipe indices → dense semantic geometry (#445).
 * Location: src/infrastructure/character/liveact/mediapipe-dense-semantic-points-v1.ts
 *
 * Provider-specific indices stay here. Reuses MediaPipeSagaDriveFaceAnchorMapV1 for shared
 * eye/brow/mouth/nose/chin/forehead slots. Extension table only for denser lip/cheek/nasolabial/jaw.
 */

import {
  DENSE_SEMANTIC_POINT_IDS,
  LIVEACT_DENSE_SEMANTIC_GEOMETRY_CONTRACT,
  type DenseSemanticGeometryV1,
  type DenseSemanticPoint3,
  type DenseSemanticPointId,
} from '../../../domains/character/liveact/liveact-dense-face-features-contract';
import type { SagaDriveFaceAnchorId } from '../../../domains/character/avatar/face-anchor-contract';
import {
  MEDIAPIPE_SAGADRIVE_FACE_ANCHOR_MAP_V1,
  type MediaPipeFaceAnchorMapEntryV1,
  type NormalizedLandmark2dLike,
  resolveMediaPipeAnchorSample,
} from './mediapipe-sagadrive-face-anchor-map-v1';

export const MEDIAPIPE_DENSE_SEMANTIC_POINTS_VERSION =
  'MediaPipeDenseSemanticPointsV1' as const;

/** AnchorId → DenseSemanticPointId for shared #421 map entries. */
const ANCHOR_TO_DENSE: Readonly<
  Partial<Record<SagaDriveFaceAnchorId, DenseSemanticPointId>>
> = {
  eyeLeftOuter: 'eyeOuterLeft',
  eyeLeftInner: 'eyeInnerLeft',
  eyeLeftUpper: 'eyeUpperLeft',
  eyeLeftLower: 'eyeLowerLeft',
  eyeRightOuter: 'eyeOuterRight',
  eyeRightInner: 'eyeInnerRight',
  eyeRightUpper: 'eyeUpperRight',
  eyeRightLower: 'eyeLowerRight',
  browLeftInner: 'browInnerLeft',
  browLeftCenter: 'browMidLeft',
  browLeftOuter: 'browOuterLeft',
  browRightInner: 'browInnerRight',
  browRightCenter: 'browMidRight',
  browRightOuter: 'browOuterRight',
  mouthCornerLeft: 'mouthCornerLeft',
  mouthCornerRight: 'mouthCornerRight',
  mouthUpper: 'lipUpperCenter',
  mouthLower: 'lipLowerCenter',
  noseTip: 'noseTip',
  chin: 'chin',
  forehead: 'forehead',
};

/**
 * Dense-only extension — indices not covered by the 21-slot face-anchor map.
 * Topology: FaceLandmarker FACE_LANDMARKS_LIPS / cheeks / jaw (anatomical L/R).
 */
export interface MediaPipeDenseExtensionEntryV1 {
  readonly pointId: DenseSemanticPointId;
  readonly landmarkIndices: readonly number[];
  readonly kind: MediaPipeFaceAnchorMapEntryV1['kind'];
}

export const MEDIAPIPE_DENSE_EXTENSION_MAP_V1: readonly MediaPipeDenseExtensionEntryV1[] = [
  // Upper lip stations (anatomical left → right)
  { pointId: 'lipUpperOuterLeft', landmarkIndices: [291, 312], kind: 'midpoint' },
  { pointId: 'lipUpperInnerLeft', landmarkIndices: [311, 312], kind: 'midpoint' },
  { pointId: 'lipUpperInnerRight', landmarkIndices: [81, 82], kind: 'midpoint' },
  { pointId: 'lipUpperOuterRight', landmarkIndices: [61, 82], kind: 'midpoint' },
  // Lower lip stations
  { pointId: 'lipLowerOuterLeft', landmarkIndices: [291, 321], kind: 'midpoint' },
  { pointId: 'lipLowerInnerLeft', landmarkIndices: [321, 405], kind: 'midpoint' },
  { pointId: 'lipLowerInnerRight', landmarkIndices: [91, 181], kind: 'midpoint' },
  { pointId: 'lipLowerOuterRight', landmarkIndices: [61, 91], kind: 'midpoint' },
  // Nose bridge / alar (tip already from anchors)
  { pointId: 'noseBridge', landmarkIndices: [6, 168], kind: 'midpoint' },
  { pointId: 'noseAlarLeft', landmarkIndices: [129, 358], kind: 'midpoint' },
  { pointId: 'noseAlarRight', landmarkIndices: [102, 49], kind: 'midpoint' },
  // Cheeks
  { pointId: 'cheekLeft', landmarkIndices: [425, 427], kind: 'midpoint' },
  { pointId: 'cheekRight', landmarkIndices: [205, 207], kind: 'midpoint' },
  // Nasolabial proxies
  { pointId: 'nasolabialLeft', landmarkIndices: [410, 287], kind: 'midpoint' },
  { pointId: 'nasolabialRight', landmarkIndices: [186, 57], kind: 'midpoint' },
  // Jaw
  { pointId: 'jawLeft', landmarkIndices: [397, 365], kind: 'midpoint' },
  { pointId: 'jawRight', landmarkIndices: [172, 136], kind: 'midpoint' },
] as const;

function emptyPoint(): DenseSemanticPoint3 {
  return { available: false, x: Number.NaN, y: Number.NaN, z: Number.NaN };
}

function resolveExtension(
  landmarks: readonly NormalizedLandmark2dLike[],
  entry: MediaPipeDenseExtensionEntryV1,
): DenseSemanticPoint3 {
  // Reuse anchor resolver shape via a temporary entry
  const fake: MediaPipeFaceAnchorMapEntryV1 = {
    anchorId: 'noseTip',
    landmarkIndices: entry.landmarkIndices,
    kind: entry.kind,
    rationale: 'dense extension',
    expectedRegion: 'mouth',
    laterality: 'center',
  };
  const sample = resolveMediaPipeAnchorSample(landmarks, fake);
  if (!sample.available) return emptyPoint();
  // z from first available landmark when present
  let z = 0;
  let zCount = 0;
  for (const index of entry.landmarkIndices) {
    const lm = landmarks[index];
    if (lm && typeof lm.z === 'number' && Number.isFinite(lm.z)) {
      z += lm.z;
      zCount += 1;
    }
  }
  return {
    available: true,
    x: sample.x,
    y: sample.y,
    z: zCount > 0 ? z / zCount : 0,
  };
}

function resolveAnchorPoint(
  landmarks: readonly NormalizedLandmark2dLike[],
  entry: MediaPipeFaceAnchorMapEntryV1,
): DenseSemanticPoint3 {
  const sample = resolveMediaPipeAnchorSample(landmarks, entry);
  if (!sample.available) return emptyPoint();
  let z = 0;
  let zCount = 0;
  for (const index of entry.landmarkIndices) {
    const lm = landmarks[index];
    if (lm && typeof lm.z === 'number' && Number.isFinite(lm.z)) {
      z += lm.z;
      zCount += 1;
    }
  }
  return {
    available: true,
    x: sample.x,
    y: sample.y,
    z: zCount > 0 ? z / zCount : 0,
  };
}

/**
 * Map raw MediaPipe landmarks → provider-neutral semantic geometry.
 * Landmarks remain caller-owned / transient — not embedded in the return type beyond named points.
 */
export function mapMediaPipeLandmarksToDenseSemanticGeometry(input: {
  landmarks: readonly NormalizedLandmark2dLike[] | undefined;
  faceConfidence?: number;
}): DenseSemanticGeometryV1 {
  const points = {} as Record<DenseSemanticPointId, DenseSemanticPoint3>;
  for (const id of DENSE_SEMANTIC_POINT_IDS) {
    points[id] = emptyPoint();
  }

  const landmarks = input.landmarks;
  if (!landmarks || landmarks.length === 0) {
    return {
      contractVersion: LIVEACT_DENSE_SEMANTIC_GEOMETRY_CONTRACT,
      points,
      faceConfidence: 0,
    };
  }

  for (const entry of MEDIAPIPE_SAGADRIVE_FACE_ANCHOR_MAP_V1) {
    const denseId = ANCHOR_TO_DENSE[entry.anchorId];
    if (!denseId) continue;
    points[denseId] = resolveAnchorPoint(landmarks, entry);
  }

  for (const entry of MEDIAPIPE_DENSE_EXTENSION_MAP_V1) {
    points[entry.pointId] = resolveExtension(landmarks, entry);
  }

  const faceConfidence =
    typeof input.faceConfidence === 'number' && Number.isFinite(input.faceConfidence)
      ? Math.min(1, Math.max(0, input.faceConfidence))
      : 1;

  return {
    contractVersion: LIVEACT_DENSE_SEMANTIC_GEOMETRY_CONTRACT,
    points,
    faceConfidence,
  };
}
