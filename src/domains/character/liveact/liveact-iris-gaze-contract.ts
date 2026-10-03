/**
 * liveact-iris-gaze-contract — SagaDrive Iris Gaze V1 (#446).
 * Location: src/domains/character/liveact/liveact-iris-gaze-contract.ts
 *
 * Provider-neutral per-eye geometric gaze. No provider landmark indices. No raw iris points.
 * Does not inflate SagaDriveLiveActFrameV1. Not Personal Calibration V2 (#449).
 */

export const LIVEACT_IRIS_GAZE_CONTRACT = 'SagaDriveLiveActIrisGazeV1' as const;

export const LIVEACT_IRIS_EYE_GEOMETRY_CONTRACT =
  'SagaDriveLiveActIrisEyeGeometryV1' as const;

/** Degrees of eye rotation corresponding to normalized gaze ±1. */
export const LIVEACT_IRIS_GAZE_MAX_YAW_DEG = 35 as const;
export const LIVEACT_IRIS_GAZE_MAX_PITCH_DEG = 30 as const;

/** Minimum confidence to prefer iris over blendshape fallback. */
export const LIVEACT_IRIS_GAZE_MIN_CONFIDENCE = 0.55 as const;

export type LiveActIrisGazeFallbackState =
  | 'iris'
  | 'blendshape'
  | 'mixed'
  | 'unavailable';

export interface LiveActIrisEyeGazeV1 {
  readonly available: boolean;
  /** Head-relative yaw degrees (+ = anatomical left). */
  readonly yawDeg: number | null;
  /** Head-relative pitch degrees (+ = up). */
  readonly pitchDeg: number | null;
  /** Normalized −1..1 for LiveActEyeGaze.x (same sign as yaw). */
  readonly x: number | null;
  /** Normalized −1..1 for LiveActEyeGaze.y (same sign as pitch). */
  readonly y: number | null;
  readonly confidence: number;
}

export interface LiveActIrisGazeV1 {
  readonly contractVersion: typeof LIVEACT_IRIS_GAZE_CONTRACT;
  readonly sequence: number;
  readonly timestampMs: number;
  readonly left: LiveActIrisEyeGazeV1;
  readonly right: LiveActIrisEyeGazeV1;
  readonly fallbackState: LiveActIrisGazeFallbackState;
  /** Absolute L/R yaw disagreement in degrees when both available. */
  readonly binocularYawDisagreementDeg: number | null;
  readonly binocularPitchDisagreementDeg: number | null;
  readonly faceNormalizationOk: boolean;
}

export interface IrisPoint3 {
  readonly available: boolean;
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** Provider-neutral single-eye geometry (transient). */
export interface IrisEyeGeometryV1 {
  readonly innerCorner: IrisPoint3;
  readonly outerCorner: IrisPoint3;
  readonly upperLid: IrisPoint3;
  readonly lowerLid: IrisPoint3;
  /** Centroid of iris contour (4 points) — not a raw landmark array. */
  readonly irisCenter: IrisPoint3;
  readonly irisContourAvailableCount: number;
}

export interface IrisBinocularGeometryV1 {
  readonly contractVersion: typeof LIVEACT_IRIS_EYE_GEOMETRY_CONTRACT;
  readonly left: IrisEyeGeometryV1;
  readonly right: IrisEyeGeometryV1;
  /** Upper-face anchors for #445 face-local frame. */
  readonly forehead: IrisPoint3;
  readonly noseBridge: IrisPoint3;
  readonly noseTip: IrisPoint3;
  readonly faceConfidence: number;
}

/** Minimal solver-local neutral offsets — not #449 personal profile. */
export interface LiveActIrisGazeNeutralOffsetV1 {
  readonly leftX: number;
  readonly leftY: number;
  readonly rightX: number;
  readonly rightY: number;
}

export const LIVEACT_IRIS_GAZE_NEUTRAL_ZERO: LiveActIrisGazeNeutralOffsetV1 = {
  leftX: 0,
  leftY: 0,
  rightX: 0,
  rightY: 0,
};

export function unavailableIrisEyeGaze(confidence = 0): LiveActIrisEyeGazeV1 {
  const c =
    typeof confidence === 'number' && Number.isFinite(confidence)
      ? Math.min(1, Math.max(0, confidence))
      : 0;
  return {
    available: false,
    yawDeg: null,
    pitchDeg: null,
    x: null,
    y: null,
    confidence: c,
  };
}

export function createEmptyIrisGaze(input: {
  sequence: number;
  timestampMs: number;
}): LiveActIrisGazeV1 {
  return {
    contractVersion: LIVEACT_IRIS_GAZE_CONTRACT,
    sequence: input.sequence,
    timestampMs: input.timestampMs,
    left: unavailableIrisEyeGaze(0),
    right: unavailableIrisEyeGaze(0),
    fallbackState: 'unavailable',
    binocularYawDisagreementDeg: null,
    binocularPitchDisagreementDeg: null,
    faceNormalizationOk: false,
  };
}

export function assertIrisGazeLocalOnly(gaze: LiveActIrisGazeV1): void {
  const record = gaze as LiveActIrisGazeV1 & {
    landmarks?: unknown;
    irisContour?: unknown;
    video?: unknown;
    serialize?: unknown;
  };
  if (
    record.landmarks !== undefined ||
    record.irisContour !== undefined ||
    record.video !== undefined ||
    record.serialize !== undefined
  ) {
    throw new Error(
      'IrisGaze darf keine Rohlandmark-/IrisContour-/Video-/Serialize-Daten tragen.',
    );
  }
}

export function yawPitchToNormalizedGaze(
  yawDeg: number,
  pitchDeg: number,
): { x: number; y: number } {
  const x = clampGaze(yawDeg / LIVEACT_IRIS_GAZE_MAX_YAW_DEG);
  const y = clampGaze(pitchDeg / LIVEACT_IRIS_GAZE_MAX_PITCH_DEG);
  return { x, y };
}

export function normalizedGazeToYawPitch(
  x: number,
  y: number,
): { yawDeg: number; pitchDeg: number } {
  return {
    yawDeg: clampGaze(x) * LIVEACT_IRIS_GAZE_MAX_YAW_DEG,
    pitchDeg: clampGaze(y) * LIVEACT_IRIS_GAZE_MAX_PITCH_DEG,
  };
}

function clampGaze(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n <= -1) return -1;
  if (n >= 1) return 1;
  return n;
}
