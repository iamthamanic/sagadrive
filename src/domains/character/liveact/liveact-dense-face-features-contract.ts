/**
 * liveact-dense-face-features-contract — SagaDrive Dense Face Features V1 (#445).
 * Location: src/domains/character/liveact/liveact-dense-face-features-contract.ts
 *
 * Provider-neutral geometric features. No provider landmark indices. No avatar morph names.
 * Does not inflate SagaDriveLiveActFrameV1.
 */

export const LIVEACT_DENSE_FACE_FEATURES_CONTRACT =
  'SagaDriveLiveActDenseFaceFeaturesV1' as const;

export const LIVEACT_DENSE_SEMANTIC_GEOMETRY_CONTRACT =
  'SagaDriveLiveActDenseSemanticGeometryV1' as const;

/** Named semantic geometry — domain input after provider adapter. */
export const DENSE_SEMANTIC_POINT_IDS = [
  'eyeOuterLeft',
  'eyeInnerLeft',
  'eyeUpperLeft',
  'eyeLowerLeft',
  'eyeOuterRight',
  'eyeInnerRight',
  'eyeUpperRight',
  'eyeLowerRight',
  'browInnerLeft',
  'browMidLeft',
  'browOuterLeft',
  'browInnerRight',
  'browMidRight',
  'browOuterRight',
  'mouthCornerLeft',
  'mouthCornerRight',
  'lipUpperOuterLeft',
  'lipUpperInnerLeft',
  'lipUpperCenter',
  'lipUpperInnerRight',
  'lipUpperOuterRight',
  'lipLowerOuterLeft',
  'lipLowerInnerLeft',
  'lipLowerCenter',
  'lipLowerInnerRight',
  'lipLowerOuterRight',
  'noseTip',
  'noseBridge',
  'noseAlarLeft',
  'noseAlarRight',
  'cheekLeft',
  'cheekRight',
  'nasolabialLeft',
  'nasolabialRight',
  'chin',
  'jawLeft',
  'jawRight',
  'forehead',
] as const;

export type DenseSemanticPointId = (typeof DENSE_SEMANTIC_POINT_IDS)[number];

export type DenseNormalizationStatus = 'ok' | 'unavailable' | 'degenerate';

/**
 * Scalar feature value.
 * unavailable → value null (never fake 0). confidence always finite in [0,1].
 */
export interface DenseScalarFeatureV1 {
  readonly available: boolean;
  readonly value: number | null;
  readonly confidence: number;
}

/** Fixed 5-station lip contour descriptor (L-outer … R-outer). */
export interface DenseContourStationsV1 {
  readonly available: boolean;
  readonly confidence: number;
  /** Face-local Y offsets relative to mouth center (normalized). */
  readonly stations: readonly [
    DenseScalarFeatureV1,
    DenseScalarFeatureV1,
    DenseScalarFeatureV1,
    DenseScalarFeatureV1,
    DenseScalarFeatureV1,
  ] | null;
}

export interface DenseLipsFeaturesV1 {
  readonly width: DenseScalarFeatureV1;
  readonly gapLeft: DenseScalarFeatureV1;
  readonly gapCenter: DenseScalarFeatureV1;
  readonly gapRight: DenseScalarFeatureV1;
  readonly upperContour: DenseContourStationsV1;
  readonly lowerContour: DenseContourStationsV1;
  /** Signed: corners above mouth center → positive (smile-like). */
  readonly curvature: DenseScalarFeatureV1;
  /** Geometric lip separation compression in [0,1]; not 1-jawOpen. */
  readonly compression: DenseScalarFeatureV1;
  /** Face-local depth proxy (monocular); not millimetres. */
  readonly protrusion: DenseScalarFeatureV1;
  readonly cornerLeft: DenseScalarFeatureV1;
  readonly cornerRight: DenseScalarFeatureV1;
  /** cornerLeft.y - cornerRight.y (anatomical). */
  readonly asymmetry: DenseScalarFeatureV1;
}

export interface DenseEyesFeaturesV1 {
  readonly eyeOpeningLeft: DenseScalarFeatureV1;
  readonly eyeOpeningRight: DenseScalarFeatureV1;
  readonly upperLidLeft: DenseScalarFeatureV1;
  readonly upperLidRight: DenseScalarFeatureV1;
  readonly lowerLidLeft: DenseScalarFeatureV1;
  readonly lowerLidRight: DenseScalarFeatureV1;
}

export interface DenseBrowsFeaturesV1 {
  readonly innerLeft: DenseScalarFeatureV1;
  readonly midLeft: DenseScalarFeatureV1;
  readonly outerLeft: DenseScalarFeatureV1;
  readonly innerRight: DenseScalarFeatureV1;
  readonly midRight: DenseScalarFeatureV1;
  readonly outerRight: DenseScalarFeatureV1;
}

export interface DenseCheeksFeaturesV1 {
  readonly raiseLeft: DenseScalarFeatureV1;
  readonly raiseRight: DenseScalarFeatureV1;
  readonly compressionLeft: DenseScalarFeatureV1;
  readonly compressionRight: DenseScalarFeatureV1;
  /** Geometric shape proxy — not physical volume. */
  readonly volumeProxyLeft: DenseScalarFeatureV1;
  readonly volumeProxyRight: DenseScalarFeatureV1;
}

export interface DenseNoseFeaturesV1 {
  readonly alarLeft: DenseScalarFeatureV1;
  readonly alarRight: DenseScalarFeatureV1;
  readonly nasolabialLeft: DenseScalarFeatureV1;
  readonly nasolabialRight: DenseScalarFeatureV1;
  readonly width: DenseScalarFeatureV1;
}

export interface DenseJawFeaturesV1 {
  readonly chinDrop: DenseScalarFeatureV1;
  /** Face-local depth proxy. */
  readonly chinForward: DenseScalarFeatureV1;
  readonly jawWidth: DenseScalarFeatureV1;
}

/** Provider-neutral dense feature frame (ephemeral / local-only). */
export interface LiveActDenseFaceFeaturesV1 {
  readonly contractVersion: typeof LIVEACT_DENSE_FACE_FEATURES_CONTRACT;
  readonly sequence: number;
  readonly timestampMs: number;
  readonly presence: boolean;
  readonly normalizationStatus: DenseNormalizationStatus;
  /** Face-level source confidence in [0,1]. */
  readonly faceConfidence: number;
  readonly lips: DenseLipsFeaturesV1;
  readonly eyes: DenseEyesFeaturesV1;
  readonly brows: DenseBrowsFeaturesV1;
  readonly cheeks: DenseCheeksFeaturesV1;
  readonly nose: DenseNoseFeaturesV1;
  readonly jaw: DenseJawFeaturesV1;
}

export interface DenseSemanticPoint3 {
  readonly available: boolean;
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** Transient provider-neutral geometry input (not networked / not persisted). */
export interface DenseSemanticGeometryV1 {
  readonly contractVersion: typeof LIVEACT_DENSE_SEMANTIC_GEOMETRY_CONTRACT;
  readonly points: Readonly<Record<DenseSemanticPointId, DenseSemanticPoint3>>;
  readonly faceConfidence: number;
}

export function unavailableDenseScalar(confidence = 0): DenseScalarFeatureV1 {
  const c = clamp01(confidence);
  return { available: false, value: null, confidence: c };
}

export function availableDenseScalar(value: number, confidence: number): DenseScalarFeatureV1 {
  if (!Number.isFinite(value)) return unavailableDenseScalar(confidence);
  return { available: true, value, confidence: clamp01(confidence) };
}

export function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n <= 0) return 0;
  if (n >= 1) return 1;
  return n;
}

export function assertDenseFaceFeaturesLocalOnly(frame: LiveActDenseFaceFeaturesV1): void {
  const record = frame as LiveActDenseFaceFeaturesV1 & {
    landmarks?: unknown;
    video?: unknown;
    imageData?: unknown;
    serialize?: unknown;
    mediapipe?: unknown;
  };
  if (
    record.landmarks !== undefined ||
    record.video !== undefined ||
    record.imageData !== undefined ||
    record.serialize !== undefined ||
    record.mediapipe !== undefined
  ) {
    throw new Error(
      'DenseFaceFeatures dürfen keine Rohlandmark-/Video-/Serialize-/Provider-Rohdaten tragen.',
    );
  }
}

export function createEmptyDenseFaceFeatures(input: {
  sequence: number;
  timestampMs: number;
  faceConfidence?: number;
  normalizationStatus?: DenseNormalizationStatus;
}): LiveActDenseFaceFeaturesV1 {
  const u = unavailableDenseScalar(0);
  const contour: DenseContourStationsV1 = {
    available: false,
    confidence: 0,
    stations: null,
  };
  return {
    contractVersion: LIVEACT_DENSE_FACE_FEATURES_CONTRACT,
    sequence: input.sequence,
    timestampMs: input.timestampMs,
    presence: false,
    normalizationStatus: input.normalizationStatus ?? 'unavailable',
    faceConfidence: clamp01(input.faceConfidence ?? 0),
    lips: {
      width: u,
      gapLeft: u,
      gapCenter: u,
      gapRight: u,
      upperContour: contour,
      lowerContour: contour,
      curvature: u,
      compression: u,
      protrusion: u,
      cornerLeft: u,
      cornerRight: u,
      asymmetry: u,
    },
    eyes: {
      eyeOpeningLeft: u,
      eyeOpeningRight: u,
      upperLidLeft: u,
      upperLidRight: u,
      lowerLidLeft: u,
      lowerLidRight: u,
    },
    brows: {
      innerLeft: u,
      midLeft: u,
      outerLeft: u,
      innerRight: u,
      midRight: u,
      outerRight: u,
    },
    cheeks: {
      raiseLeft: u,
      raiseRight: u,
      compressionLeft: u,
      compressionRight: u,
      volumeProxyLeft: u,
      volumeProxyRight: u,
    },
    nose: {
      alarLeft: u,
      alarRight: u,
      nasolabialLeft: u,
      nasolabialRight: u,
      width: u,
    },
    jaw: {
      chinDrop: u,
      chinForward: u,
      jawWidth: u,
    },
  };
}
