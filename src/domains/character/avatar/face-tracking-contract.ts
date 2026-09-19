/**
 * Avatar face-tracking contract — pure domain (no React / Three / MediaPipe / DOM).
 * Location: src/domains/character/avatar/face-tracking-contract.ts
 *
 * Maps local landmark/blendshape samples onto head pose + #11 facial weights.
 * Privacy: never persist raw video, landmarks, or blendshapes — only ephemeral drive.
 */

import {
  clampFacialWeight,
  createNeutralFacialWeights,
  type FacialCanonicalKey,
} from './facial-contract';

export const FACE_TRACKING_CONTRACT_VERSION = 'SagaDriveAvatarFaceTrackingV1' as const;

export const FACE_TRACKING_STATUSES = [
  'idle',
  'starting',
  'active',
  'paused',
  'lost',
  'denied',
  'unsupported',
  'stopped',
  'error',
] as const;

export type FaceTrackingStatus = (typeof FACE_TRACKING_STATUSES)[number];

/** Local-only sample from a detector. Never serialize to appearance / analytics. */
export interface FaceTrackingSample {
  /** 0..1 confidence that a face is present. */
  presence: number;
  /** Radians, viewer-relative (positive yaw = turn left from avatar view). */
  headYaw: number;
  headPitch: number;
  headRoll: number;
  /** -1..1 eye look. */
  eyeLookX: number;
  eyeLookY: number;
  blinkLeft: number;
  blinkRight: number;
  smile: number;
  browDown: number;
  jawOpen: number;
  /** Face index chosen by primary-face rule (V1: first / highest score). */
  faceIndex: number;
  faceCount: number;
}

export interface FaceTrackingHeadPose {
  yaw: number;
  pitch: number;
  roll: number;
}

export interface FaceTrackingDrive {
  contractVersion: typeof FACE_TRACKING_CONTRACT_VERSION;
  head: FaceTrackingHeadPose;
  eyeLookX: number;
  eyeLookY: number;
  facialWeights: Readonly<Partial<Record<FacialCanonicalKey, number>>>;
  /** True when presence dropped — caller should ease to neutral. */
  trackingLost: boolean;
}

export interface FaceTrackingLimits {
  maxYaw: number;
  maxPitch: number;
  maxRoll: number;
  presenceThreshold: number;
  /** Desktop target FPS. */
  desktopFps: number;
  /** Mobile / low-end target FPS. */
  mobileFps: number;
  smooth: number;
}

export const DEFAULT_FACE_TRACKING_LIMITS: FaceTrackingLimits = {
  maxYaw: 0.55,
  maxPitch: 0.4,
  maxRoll: 0.35,
  presenceThreshold: 0.45,
  desktopFps: 30,
  mobileFps: 15,
  smooth: 0.35,
};

/** Quality profile id — Desktop vs Mobile feature/FPS caps (#243). */
export type FaceTrackingQualityProfileId = 'desktop' | 'mobile';

/**
 * Desktop/Mobile quality profile.
 * Mobile reduces FPS and skips facial transformation matrices (lighter GPU path).
 */
export interface FaceTrackingQualityProfile {
  id: FaceTrackingQualityProfileId;
  labelDe: string;
  fpsCap: number;
  /** Head pose from transformation matrices. Mobile: false (eyes/blink/expr only). */
  enableHeadPose: boolean;
  outputFaceBlendshapes: boolean;
  outputFacialTransformationMatrixes: boolean;
}

export const FACE_TRACKING_QUALITY_PROFILES: Readonly<
  Record<FaceTrackingQualityProfileId, FaceTrackingQualityProfile>
> = {
  desktop: {
    id: 'desktop',
    labelDe: 'Desktop',
    fpsCap: DEFAULT_FACE_TRACKING_LIMITS.desktopFps,
    enableHeadPose: true,
    outputFaceBlendshapes: true,
    outputFacialTransformationMatrixes: true,
  },
  mobile: {
    id: 'mobile',
    labelDe: 'Mobile',
    fpsCap: DEFAULT_FACE_TRACKING_LIMITS.mobileFps,
    enableHeadPose: false,
    outputFaceBlendshapes: true,
    outputFacialTransformationMatrixes: false,
  },
};

export function isFaceTrackingStatus(value: unknown): value is FaceTrackingStatus {
  return typeof value === 'string' && (FACE_TRACKING_STATUSES as readonly string[]).includes(value);
}

/**
 * Resolve Desktop vs Mobile quality profile from device hints.
 * Same rule as FPS cap: mobile UA or maxTouchPoints > 1 → mobile.
 */
export function resolveFaceTrackingQualityProfile(input: {
  isMobile?: boolean;
  maxTouchPoints?: number;
  limits?: FaceTrackingLimits;
}): FaceTrackingQualityProfile {
  const limits = input.limits ?? DEFAULT_FACE_TRACKING_LIMITS;
  const useMobile =
    input.isMobile === true ||
    (typeof input.maxTouchPoints === 'number' && input.maxTouchPoints > 1);
  if (useMobile) {
    return {
      ...FACE_TRACKING_QUALITY_PROFILES.mobile,
      fpsCap: limits.mobileFps,
    };
  }
  return {
    ...FACE_TRACKING_QUALITY_PROFILES.desktop,
    fpsCap: limits.desktopFps,
  };
}

export function clampAngle(value: number, maxAbs: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value > maxAbs) return maxAbs;
  if (value < -maxAbs) return -maxAbs;
  return value;
}

export function clampUnit(value: number): number {
  return clampFacialWeight(value);
}

/**
 * V1 multi-face rule: pick the first face (index 0) when scores are equal,
 * otherwise the highest presence score. Never random.
 */
export function selectPrimaryFaceIndex(
  faces: readonly { presence: number }[],
): number {
  if (faces.length === 0) return -1;
  let best = 0;
  let bestScore = faces[0]?.presence ?? 0;
  for (let i = 1; i < faces.length; i += 1) {
    const score = faces[i]?.presence ?? 0;
    if (score > bestScore) {
      best = i;
      bestScore = score;
    }
  }
  return best;
}

export function resolveFaceTrackingFpsCap(input: {
  isMobile?: boolean;
  maxTouchPoints?: number;
  limits?: FaceTrackingLimits;
}): number {
  return resolveFaceTrackingQualityProfile(input).fpsCap;
}

export function createEmptyFaceTrackingSample(): FaceTrackingSample {
  return {
    presence: 0,
    headYaw: 0,
    headPitch: 0,
    headRoll: 0,
    eyeLookX: 0,
    eyeLookY: 0,
    blinkLeft: 0,
    blinkRight: 0,
    smile: 0,
    browDown: 0,
    jawOpen: 0,
    faceIndex: -1,
    faceCount: 0,
  };
}

/**
 * Map a detector sample onto runtime drive (clamped). Does not smooth —
 * callers keep previous drive and call smoothFaceTrackingDrive.
 */
export function mapFaceTrackingSample(
  sample: FaceTrackingSample,
  limits: FaceTrackingLimits = DEFAULT_FACE_TRACKING_LIMITS,
): FaceTrackingDrive {
  const lost = sample.presence < limits.presenceThreshold || sample.faceIndex < 0;
  if (lost) {
    return {
      contractVersion: FACE_TRACKING_CONTRACT_VERSION,
      head: { yaw: 0, pitch: 0, roll: 0 },
      eyeLookX: 0,
      eyeLookY: 0,
      facialWeights: createNeutralFacialWeights(),
      trackingLost: true,
    };
  }

  const blink = clampUnit(Math.max(sample.blinkLeft, sample.blinkRight));
  const smile = clampUnit(sample.smile);
  const brow = clampUnit(sample.browDown);
  const jaw = clampUnit(sample.jawOpen);

  const facialWeights: Partial<Record<FacialCanonicalKey, number>> = {
    ...createNeutralFacialWeights(),
    blink,
    happy: smile,
    angry: brow,
    sad: Math.max(0, brow * 0.35 - smile * 0.5),
    aa: jaw,
    ih: 0,
    ou: 0,
    ee: 0,
    oh: Math.max(0, jaw * 0.45 - smile * 0.2),
    neutral: clampUnit(1 - Math.max(smile, brow, jaw, blink) * 0.85),
  };

  return {
    contractVersion: FACE_TRACKING_CONTRACT_VERSION,
    head: {
      yaw: clampAngle(sample.headYaw, limits.maxYaw),
      pitch: clampAngle(sample.headPitch, limits.maxPitch),
      roll: clampAngle(sample.headRoll, limits.maxRoll),
    },
    eyeLookX: clampAngle(sample.eyeLookX, 1),
    eyeLookY: clampAngle(sample.eyeLookY, 1),
    facialWeights,
    trackingLost: false,
  };
}

export function smoothFaceTrackingDrive(
  previous: FaceTrackingDrive | null,
  next: FaceTrackingDrive,
  alpha: number = DEFAULT_FACE_TRACKING_LIMITS.smooth,
): FaceTrackingDrive {
  const t = clampUnit(alpha);
  if (!previous || next.trackingLost) {
    // Ease toward neutral when lost.
    if (!previous) return next;
    const ease = clampUnit(t * 0.65);
    return {
      contractVersion: FACE_TRACKING_CONTRACT_VERSION,
      head: {
        yaw: previous.head.yaw * (1 - ease),
        pitch: previous.head.pitch * (1 - ease),
        roll: previous.head.roll * (1 - ease),
      },
      eyeLookX: previous.eyeLookX * (1 - ease),
      eyeLookY: previous.eyeLookY * (1 - ease),
      facialWeights: createNeutralFacialWeights(),
      trackingLost: true,
    };
  }

  const lerp = (a: number, b: number) => a + (b - a) * t;
  const weights: Partial<Record<FacialCanonicalKey, number>> = {};
  const keys = new Set([
    ...Object.keys(previous.facialWeights),
    ...Object.keys(next.facialWeights),
  ]) as Set<FacialCanonicalKey>;
  for (const key of keys) {
    weights[key] = lerp(previous.facialWeights[key] ?? 0, next.facialWeights[key] ?? 0);
  }

  return {
    contractVersion: FACE_TRACKING_CONTRACT_VERSION,
    head: {
      yaw: lerp(previous.head.yaw, next.head.yaw),
      pitch: lerp(previous.head.pitch, next.head.pitch),
      roll: lerp(previous.head.roll, next.head.roll),
    },
    eyeLookX: lerp(previous.eyeLookX, next.eyeLookX),
    eyeLookY: lerp(previous.eyeLookY, next.eyeLookY),
    facialWeights: weights,
    trackingLost: false,
  };
}

export function faceTrackingStatusLabelDe(status: FaceTrackingStatus): string {
  switch (status) {
    case 'idle':
      return 'Face Tracking aus';
    case 'starting':
      return 'Kamera wird vorbereitet …';
    case 'active':
      return 'Face Tracking aktiv';
    case 'paused':
      return 'Face Tracking pausiert (Tab im Hintergrund)';
    case 'lost':
      return 'Gesicht verloren — weiche Rückkehr zu Neutral';
    case 'denied':
      return 'Kamerazugriff verweigert — bitte Browser-Berechtigung prüfen';
    case 'unsupported':
      return 'Face Tracking wird in diesem Browser nicht unterstützt';
    case 'stopped':
      return 'Face Tracking gestoppt';
    case 'error':
      return 'Face Tracking Fehler — bitte erneut starten';
    default:
      return 'Face Tracking';
  }
}

/** Assert drive payload never carries raw landmark arrays (privacy). */
export function assertFaceTrackingDriveLocalOnly(drive: FaceTrackingDrive): void {
  const record = drive as FaceTrackingDrive & {
    landmarks?: unknown;
    video?: unknown;
    imageData?: unknown;
  };
  if (record.landmarks !== undefined || record.video !== undefined || record.imageData !== undefined) {
    throw new Error('Face-Tracking-Drive darf keine Rohvideo-/Landmark-Daten tragen.');
  }
}
