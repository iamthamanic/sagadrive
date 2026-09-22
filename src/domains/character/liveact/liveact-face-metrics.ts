/**
 * liveact-face-metrics — normalized geometric face metrics from landmarks (pure domain).
 * Location: src/domains/character/liveact/liveact-face-metrics.ts
 *
 * Distances are dimensionless ratios (not raw pixels). MediaPipe Face Landmarker indices.
 */

import type { SagaDriveFaceAnchorId } from '../avatar/face-anchor-contract';
import type { LiveActFaceLandmark2d } from './liveact-face-diagnostics';

/** Canonical MediaPipe Face Landmarker indices for metric pairs. */
export const LIVEACT_FACE_METRIC_LANDMARK_INDICES = {
  upperLip: 13,
  lowerLip: 14,
  mouthLeft: 61,
  mouthRight: 291,
  leftUpperLid: 159,
  leftLowerLid: 145,
  leftEyeInner: 133,
  leftEyeOuter: 33,
  rightUpperLid: 386,
  rightLowerLid: 374,
  rightEyeInner: 362,
  rightEyeOuter: 263,
  leftBrow: 105,
  rightBrow: 334,
} as const;

export interface LiveActFaceMetricsV1 {
  available: boolean;
  mouthGap: number | null;
  eyeOpenLeft: number | null;
  eyeOpenRight: number | null;
  browLiftLeft: number | null;
  browLiftRight: number | null;
  /** Normalized face bbox in landmark space (0..1). */
  bbox: { minX: number; minY: number; maxX: number; maxY: number } | null;
}

function dist(a: LiveActFaceLandmark2d, b: LiveActFaceLandmark2d): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function at(
  landmarks: readonly LiveActFaceLandmark2d[],
  index: number,
): LiveActFaceLandmark2d | null {
  const p = landmarks[index];
  if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return null;
  return p;
}

function ratio(numer: number, denom: number): number | null {
  if (!(denom > 1e-8) || !Number.isFinite(numer) || !Number.isFinite(denom)) return null;
  return numer / denom;
}

function mid(a: LiveActFaceLandmark2d, b: LiveActFaceLandmark2d): LiveActFaceLandmark2d {
  return { x: (a.x + b.x) * 0.5, y: (a.y + b.y) * 0.5 };
}

/** Maps deformed mesh anchor ids → MediaPipe landmark slots for shared metric math (#400). */
const FACE_ANCHOR_TO_LANDMARK_INDEX: Partial<Record<SagaDriveFaceAnchorId, number>> = {
  mouthUpper: LIVEACT_FACE_METRIC_LANDMARK_INDICES.upperLip,
  mouthLower: LIVEACT_FACE_METRIC_LANDMARK_INDICES.lowerLip,
  mouthCornerLeft: LIVEACT_FACE_METRIC_LANDMARK_INDICES.mouthLeft,
  mouthCornerRight: LIVEACT_FACE_METRIC_LANDMARK_INDICES.mouthRight,
  eyeLeftUpper: LIVEACT_FACE_METRIC_LANDMARK_INDICES.leftUpperLid,
  eyeLeftLower: LIVEACT_FACE_METRIC_LANDMARK_INDICES.leftLowerLid,
  eyeLeftInner: LIVEACT_FACE_METRIC_LANDMARK_INDICES.leftEyeInner,
  eyeLeftOuter: LIVEACT_FACE_METRIC_LANDMARK_INDICES.leftEyeOuter,
  eyeRightUpper: LIVEACT_FACE_METRIC_LANDMARK_INDICES.rightUpperLid,
  eyeRightLower: LIVEACT_FACE_METRIC_LANDMARK_INDICES.rightLowerLid,
  eyeRightInner: LIVEACT_FACE_METRIC_LANDMARK_INDICES.rightEyeInner,
  eyeRightOuter: LIVEACT_FACE_METRIC_LANDMARK_INDICES.rightEyeOuter,
  browLeftCenter: LIVEACT_FACE_METRIC_LANDMARK_INDICES.leftBrow,
  browRightCenter: LIVEACT_FACE_METRIC_LANDMARK_INDICES.rightBrow,
};

/**
 * Build a sparse 478-point landmark buffer from normalized character anchor positions.
 * Reuses {@link computeLiveActFaceMetrics} — same ratios as camera overlay (#398).
 */
export function buildLiveActFaceLandmarksFromAnchorScreenPoints(
  points: Readonly<Partial<Record<SagaDriveFaceAnchorId, LiveActFaceLandmark2d>>>,
): readonly LiveActFaceLandmark2d[] {
  const landmarks: LiveActFaceLandmark2d[] = Array.from({ length: 478 }, () => ({
    x: Number.NaN,
    y: Number.NaN,
  }));
  for (const [anchorId, landmarkIndex] of Object.entries(FACE_ANCHOR_TO_LANDMARK_INDEX)) {
    if (landmarkIndex == null) continue;
    const p = points[anchorId as SagaDriveFaceAnchorId];
    if (!p) continue;
    landmarks[landmarkIndex] = { x: p.x, y: p.y };
  }
  return landmarks;
}

export function computeLiveActFaceMetrics(
  landmarks: readonly LiveActFaceLandmark2d[],
): LiveActFaceMetricsV1 {
  if (landmarks.length < 300) {
    return {
      available: false,
      mouthGap: null,
      eyeOpenLeft: null,
      eyeOpenRight: null,
      browLiftLeft: null,
      browLiftRight: null,
      bbox: null,
    };
  }

  const I = LIVEACT_FACE_METRIC_LANDMARK_INDICES;
  const upperLip = at(landmarks, I.upperLip);
  const lowerLip = at(landmarks, I.lowerLip);
  const mouthLeft = at(landmarks, I.mouthLeft);
  const mouthRight = at(landmarks, I.mouthRight);
  const lUp = at(landmarks, I.leftUpperLid);
  const lLo = at(landmarks, I.leftLowerLid);
  const lIn = at(landmarks, I.leftEyeInner);
  const lOut = at(landmarks, I.leftEyeOuter);
  const rUp = at(landmarks, I.rightUpperLid);
  const rLo = at(landmarks, I.rightLowerLid);
  const rIn = at(landmarks, I.rightEyeInner);
  const rOut = at(landmarks, I.rightEyeOuter);
  const lBrow = at(landmarks, I.leftBrow);
  const rBrow = at(landmarks, I.rightBrow);

  const mouthGap =
    upperLip && lowerLip && mouthLeft && mouthRight
      ? ratio(dist(upperLip, lowerLip), dist(mouthLeft, mouthRight))
      : null;

  const eyeOpenLeft =
    lUp && lLo && lIn && lOut ? ratio(dist(lUp, lLo), dist(lIn, lOut)) : null;
  const eyeOpenRight =
    rUp && rLo && rIn && rOut ? ratio(dist(rUp, rLo), dist(rIn, rOut)) : null;

  const leftEyeCenter = lIn && lOut ? mid(lIn, lOut) : null;
  const rightEyeCenter = rIn && rOut ? mid(rIn, rOut) : null;
  const leftEyeWidth = lIn && lOut ? dist(lIn, lOut) : 0;
  const rightEyeWidth = rIn && rOut ? dist(rIn, rOut) : 0;

  const browLiftLeft =
    lBrow && leftEyeCenter ? ratio(dist(lBrow, leftEyeCenter), leftEyeWidth) : null;
  const browLiftRight =
    rBrow && rightEyeCenter ? ratio(dist(rBrow, rightEyeCenter), rightEyeWidth) : null;

  let minX = 1;
  let maxX = 0;
  let minY = 1;
  let maxY = 0;
  for (const p of landmarks) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const bbox =
    maxX > minX && maxY > minY ? { minX, minY, maxX, maxY } : null;

  return {
    available: true,
    mouthGap,
    eyeOpenLeft,
    eyeOpenRight,
    browLiftLeft,
    browLiftRight,
    bbox,
  };
}

export function formatLiveActMetric(value: number | null, digits = 2): string {
  if (value === null || !Number.isFinite(value)) return '—';
  return value.toFixed(digits);
}

/** Radians → degrees for HUD. */
export function liveActRadiansToDegrees(rad: number): number {
  return (rad * 180) / Math.PI;
}
