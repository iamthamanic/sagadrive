/**
 * MediaPipe Face Landmarker → SagaDriveFaceAnchorsV1 mapping table (#421).
 * Location: src/infrastructure/character/liveact/mediapipe-sagadrive-face-anchor-map-v1.ts
 *
 * Provider-specific indices stay in infrastructure. Domain only sees SagaDriveFaceAnchorId.
 * Left/Right = anatomical (subject's left/right), matching LiveAct RAW / face-metrics.
 *
 * Known V1 limits (not solved here — Epic #442): no full lip/lid/cheek/nasolabial/iris curves.
 */

import type { SagaDriveFaceAnchorId } from '../../../domains/character/avatar/face-anchor-contract';
import { LIVEACT_FACE_METRIC_LANDMARK_INDICES } from '../../../domains/character/liveact/liveact-face-metrics';

export const MEDIAPIPE_SAGADRIVE_FACE_ANCHOR_MAP_VERSION =
  'MediaPipeSagaDriveFaceAnchorMapV1' as const;

export type MediaPipeFaceAnchorSampleKind = 'single' | 'centroid';

export interface MediaPipeFaceAnchorMapEntryV1 {
  readonly anchorId: SagaDriveFaceAnchorId;
  /** MediaPipe Face Mesh / Face Landmarker landmark index(es). */
  readonly landmarkIndices: readonly number[];
  readonly kind: MediaPipeFaceAnchorSampleKind;
  /** Anatomical / authoring rationale (DE/EN ok). */
  readonly rationale: string;
  /** Expected surface region for QA. */
  readonly expectedRegion:
    | 'mouth'
    | 'eye_left'
    | 'eye_right'
    | 'brow_left'
    | 'brow_right'
    | 'midline';
  /** Anatomical laterality relative to the subject (not screen). */
  readonly laterality: 'left' | 'right' | 'center';
}

const I = LIVEACT_FACE_METRIC_LANDMARK_INDICES;

/**
 * Versioned table: exactly the 21 SagaDriveFaceAnchorsV1 slots.
 * Reuses metric indices where they already encode mouth/eye L/R; brows use Face Mesh topology.
 */
export const MEDIAPIPE_SAGADRIVE_FACE_ANCHOR_MAP_V1: readonly MediaPipeFaceAnchorMapEntryV1[] = [
  {
    anchorId: 'noseTip',
    landmarkIndices: [1],
    kind: 'single',
    rationale: 'Face Mesh tip of nose (stable midline).',
    expectedRegion: 'midline',
    laterality: 'center',
  },
  {
    anchorId: 'chin',
    landmarkIndices: [152],
    kind: 'single',
    rationale: 'Face Mesh chin bottom midpoint.',
    expectedRegion: 'midline',
    laterality: 'center',
  },
  {
    anchorId: 'forehead',
    landmarkIndices: [10],
    kind: 'single',
    rationale: 'Face Mesh mid-forehead / upper face oval (not iris).',
    expectedRegion: 'midline',
    laterality: 'center',
  },
  {
    anchorId: 'mouthUpper',
    landmarkIndices: [I.upperLip],
    kind: 'single',
    rationale: 'Upper lip outer center — same index as LiveAct mouthGap metric.',
    expectedRegion: 'mouth',
    laterality: 'center',
  },
  {
    anchorId: 'mouthLower',
    landmarkIndices: [I.lowerLip],
    kind: 'single',
    rationale: 'Lower lip outer center — same index as LiveAct mouthGap metric.',
    expectedRegion: 'mouth',
    laterality: 'center',
  },
  {
    anchorId: 'mouthCornerLeft',
    landmarkIndices: [I.mouthLeft],
    kind: 'single',
    rationale: "Subject's left mouth corner (MediaPipe mouthLeft=61).",
    expectedRegion: 'mouth',
    laterality: 'left',
  },
  {
    anchorId: 'mouthCornerRight',
    landmarkIndices: [I.mouthRight],
    kind: 'single',
    rationale: "Subject's right mouth corner (MediaPipe mouthRight=291).",
    expectedRegion: 'mouth',
    laterality: 'right',
  },
  {
    anchorId: 'eyeLeftInner',
    landmarkIndices: [I.leftEyeInner],
    kind: 'single',
    rationale: "Subject's left eye inner canthus (toward nose).",
    expectedRegion: 'eye_left',
    laterality: 'left',
  },
  {
    anchorId: 'eyeLeftOuter',
    landmarkIndices: [I.leftEyeOuter],
    kind: 'single',
    rationale: "Subject's left eye outer canthus (toward temple).",
    expectedRegion: 'eye_left',
    laterality: 'left',
  },
  {
    anchorId: 'eyeLeftUpper',
    landmarkIndices: [I.leftUpperLid, 158, 157],
    kind: 'centroid',
    rationale: 'Upper lid center + neighbors — single lid index alone jitters.',
    expectedRegion: 'eye_left',
    laterality: 'left',
  },
  {
    anchorId: 'eyeLeftLower',
    landmarkIndices: [I.leftLowerLid, 144, 153],
    kind: 'centroid',
    rationale: 'Lower lid center + neighbors for stability.',
    expectedRegion: 'eye_left',
    laterality: 'left',
  },
  {
    anchorId: 'eyeRightInner',
    landmarkIndices: [I.rightEyeInner],
    kind: 'single',
    rationale: "Subject's right eye inner canthus.",
    expectedRegion: 'eye_right',
    laterality: 'right',
  },
  {
    anchorId: 'eyeRightOuter',
    landmarkIndices: [I.rightEyeOuter],
    kind: 'single',
    rationale: "Subject's right eye outer canthus.",
    expectedRegion: 'eye_right',
    laterality: 'right',
  },
  {
    anchorId: 'eyeRightUpper',
    landmarkIndices: [I.rightUpperLid, 385, 387],
    kind: 'centroid',
    rationale: 'Right upper lid centroid.',
    expectedRegion: 'eye_right',
    laterality: 'right',
  },
  {
    anchorId: 'eyeRightLower',
    landmarkIndices: [I.rightLowerLid, 380, 373],
    kind: 'centroid',
    rationale: 'Right lower lid centroid.',
    expectedRegion: 'eye_right',
    laterality: 'right',
  },
  {
    anchorId: 'browLeftInner',
    landmarkIndices: [107],
    kind: 'single',
    rationale: "Subject's left brow near glabella.",
    expectedRegion: 'brow_left',
    laterality: 'left',
  },
  {
    anchorId: 'browLeftCenter',
    landmarkIndices: [I.leftBrow],
    kind: 'single',
    rationale: 'Left brow mid — same index as LiveAct browLiftLeft.',
    expectedRegion: 'brow_left',
    laterality: 'left',
  },
  {
    anchorId: 'browLeftOuter',
    landmarkIndices: [70],
    kind: 'single',
    rationale: "Subject's left brow temple end.",
    expectedRegion: 'brow_left',
    laterality: 'left',
  },
  {
    anchorId: 'browRightInner',
    landmarkIndices: [336],
    kind: 'single',
    rationale: "Subject's right brow near glabella.",
    expectedRegion: 'brow_right',
    laterality: 'right',
  },
  {
    anchorId: 'browRightCenter',
    landmarkIndices: [I.rightBrow],
    kind: 'single',
    rationale: 'Right brow mid — same index as LiveAct browLiftRight.',
    expectedRegion: 'brow_right',
    laterality: 'right',
  },
  {
    anchorId: 'browRightOuter',
    landmarkIndices: [300],
    kind: 'single',
    rationale: "Subject's right brow temple end.",
    expectedRegion: 'brow_right',
    laterality: 'right',
  },
] as const;

export const FACE_ANCHOR_MAP_V1_LIMITATIONS = [
  'no_full_upper_lip_curve',
  'no_full_lower_lip_curve',
  'no_detailed_cheek_surface',
  'no_nasolabial_curve',
  'no_iris_pupil_representation',
  'no_detailed_lid_curve',
] as const;

export interface NormalizedLandmark2dLike {
  readonly x: number;
  readonly y: number;
  readonly z?: number;
}

export interface ResolvedMediaPipeAnchorSampleV1 {
  readonly anchorId: SagaDriveFaceAnchorId;
  readonly available: boolean;
  readonly x: number;
  readonly y: number;
  /** Fraction of required landmarks present (0..1). */
  readonly availability: number;
  readonly laterality: 'left' | 'right' | 'center';
}

function at(
  landmarks: readonly NormalizedLandmark2dLike[],
  index: number,
): NormalizedLandmark2dLike | null {
  const p = landmarks[index];
  if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return null;
  if (p.x < -0.05 || p.x > 1.05 || p.y < -0.05 || p.y > 1.05) return null;
  return p;
}

/** Resolve one map entry to a normalized image-space point (or unavailable). */
export function resolveMediaPipeAnchorSample(
  landmarks: readonly NormalizedLandmark2dLike[],
  entry: MediaPipeFaceAnchorMapEntryV1,
): ResolvedMediaPipeAnchorSampleV1 {
  const points: NormalizedLandmark2dLike[] = [];
  for (const index of entry.landmarkIndices) {
    const p = at(landmarks, index);
    if (p) points.push(p);
  }
  const availability =
    entry.landmarkIndices.length === 0 ? 0 : points.length / entry.landmarkIndices.length;
  if (points.length === 0) {
    return {
      anchorId: entry.anchorId,
      available: false,
      x: Number.NaN,
      y: Number.NaN,
      availability: 0,
      laterality: entry.laterality,
    };
  }
  let x = 0;
  let y = 0;
  for (const p of points) {
    x += p.x;
    y += p.y;
  }
  x /= points.length;
  y /= points.length;
  return {
    anchorId: entry.anchorId,
    available: true,
    x,
    y,
    availability,
    laterality: entry.laterality,
  };
}

export function resolveAllMediaPipeAnchorSamples(
  landmarks: readonly NormalizedLandmark2dLike[],
): readonly ResolvedMediaPipeAnchorSampleV1[] {
  return MEDIAPIPE_SAGADRIVE_FACE_ANCHOR_MAP_V1.map((entry) =>
    resolveMediaPipeAnchorSample(landmarks, entry),
  );
}

/** Structural integrity: 21 unique anchors covering the contract set. */
export function assertMediaPipeSagaDriveFaceAnchorMapComplete(): void {
  const ids = new Set(MEDIAPIPE_SAGADRIVE_FACE_ANCHOR_MAP_V1.map((e) => e.anchorId));
  if (ids.size !== 21) {
    throw new Error(`MediaPipe map must cover 21 unique anchors (got ${ids.size}).`);
  }
}
