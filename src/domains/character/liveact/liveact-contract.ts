/**
 * LiveAct core contract — provider-neutral performance-capture frames (pure domain).
 * Location: src/domains/character/liveact/liveact-contract.ts
 *
 * No React / Three / MediaPipe / DOM. Frames are ephemeral; never persist.
 */

import {
  LIVEACT_FACE_CONTRACT_VERSION,
  assertLiveActFaceChannelsLocalOnly,
  clampLiveActChannel,
  createNeutralLiveActFaceChannels,
  mergeLiveActFaceChannels,
  type LiveActFaceChannelPartial,
  type LiveActFaceChannels,
} from './liveact-face-contract';

export const LIVEACT_CONTRACT_VERSION = 'SagaDriveLiveActFrameV1' as const;

export const LIVEACT_STATUSES = [
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

export type LiveActStatus = (typeof LIVEACT_STATUSES)[number];

export interface LiveActHeadPose {
  yaw: number;
  pitch: number;
  roll: number;
}

/** Per-eye gaze in normalized -1..1 (viewer-relative). */
export interface LiveActEyeGaze {
  x: number;
  y: number;
}

export interface LiveActFrameV1 {
  contractVersion: typeof LIVEACT_CONTRACT_VERSION;
  faceContractVersion: typeof LIVEACT_FACE_CONTRACT_VERSION;
  /** Wall-or-performance clock ms from the source tick. */
  timestampMs: number;
  /** Monotone per-engine sequence (starts at 1). */
  sequence: number;
  /** 0..1 face presence / tracking confidence. */
  confidence: number;
  trackingLost: boolean;
  head: LiveActHeadPose;
  eyeLeft: LiveActEyeGaze;
  eyeRight: LiveActEyeGaze;
  face: LiveActFaceChannels;
}

export interface LiveActLimits {
  maxYaw: number;
  maxPitch: number;
  maxRoll: number;
  presenceThreshold: number;
  desktopFps: number;
  mobileFps: number;
  smooth: number;
}

export const DEFAULT_LIVEACT_LIMITS: LiveActLimits = {
  maxYaw: 0.55,
  maxPitch: 0.4,
  maxRoll: 0.35,
  presenceThreshold: 0.45,
  desktopFps: 30,
  mobileFps: 15,
  smooth: 0.35,
};

export type LiveActQualityProfileId = 'desktop' | 'mobile';

export interface LiveActQualityProfile {
  id: LiveActQualityProfileId;
  labelDe: string;
  fpsCap: number;
  enableHeadPose: boolean;
  outputFaceBlendshapes: boolean;
  outputFacialTransformationMatrixes: boolean;
}

export const LIVEACT_QUALITY_PROFILES: Readonly<
  Record<LiveActQualityProfileId, LiveActQualityProfile>
> = {
  desktop: {
    id: 'desktop',
    labelDe: 'Desktop',
    fpsCap: DEFAULT_LIVEACT_LIMITS.desktopFps,
    enableHeadPose: true,
    outputFaceBlendshapes: true,
    outputFacialTransformationMatrixes: true,
  },
  mobile: {
    id: 'mobile',
    labelDe: 'Mobile',
    fpsCap: DEFAULT_LIVEACT_LIMITS.mobileFps,
    enableHeadPose: false,
    outputFaceBlendshapes: true,
    outputFacialTransformationMatrixes: false,
  },
};

/** Raw source sample before clamp/smooth — still no landmark arrays. */
export interface LiveActSourceSample {
  presence: number;
  headYaw: number;
  headPitch: number;
  headRoll: number;
  eyeLeftX: number;
  eyeLeftY: number;
  eyeRightX: number;
  eyeRightY: number;
  face: LiveActFaceChannelPartial;
  faceIndex: number;
  faceCount: number;
}

export function isLiveActStatus(value: unknown): value is LiveActStatus {
  return typeof value === 'string' && (LIVEACT_STATUSES as readonly string[]).includes(value);
}

export function resolveLiveActQualityProfile(input: {
  isMobile?: boolean;
  maxTouchPoints?: number;
  limits?: LiveActLimits;
}): LiveActQualityProfile {
  const limits = input.limits ?? DEFAULT_LIVEACT_LIMITS;
  const useMobile =
    input.isMobile === true ||
    (typeof input.maxTouchPoints === 'number' && input.maxTouchPoints > 1);
  if (useMobile) {
    return {
      ...LIVEACT_QUALITY_PROFILES.mobile,
      fpsCap: limits.mobileFps,
    };
  }
  return {
    ...LIVEACT_QUALITY_PROFILES.desktop,
    fpsCap: limits.desktopFps,
  };
}

export function clampLiveActAngle(value: number, maxAbs: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value > maxAbs) return maxAbs;
  if (value < -maxAbs) return -maxAbs;
  return value;
}

export function clampLiveActGaze(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value > 1) return 1;
  if (value < -1) return -1;
  return value;
}

export function selectPrimaryLiveActFaceIndex(
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

export function createEmptyLiveActSourceSample(): LiveActSourceSample {
  return {
    presence: 0,
    headYaw: 0,
    headPitch: 0,
    headRoll: 0,
    eyeLeftX: 0,
    eyeLeftY: 0,
    eyeRightX: 0,
    eyeRightY: 0,
    face: {},
    faceIndex: -1,
    faceCount: 0,
  };
}

export function createNeutralLiveActFrame(input: {
  timestampMs: number;
  sequence: number;
  trackingLost?: boolean;
}): LiveActFrameV1 {
  return {
    contractVersion: LIVEACT_CONTRACT_VERSION,
    faceContractVersion: LIVEACT_FACE_CONTRACT_VERSION,
    timestampMs: input.timestampMs,
    sequence: input.sequence,
    confidence: 0,
    trackingLost: input.trackingLost ?? true,
    head: { yaw: 0, pitch: 0, roll: 0 },
    eyeLeft: { x: 0, y: 0 },
    eyeRight: { x: 0, y: 0 },
    face: createNeutralLiveActFaceChannels(),
  };
}

/**
 * Map a detector sample onto an atomic LiveAct frame (clamped, no smooth).
 */
export function mapLiveActSourceSample(
  sample: LiveActSourceSample,
  input: {
    timestampMs: number;
    sequence: number;
    limits?: LiveActLimits;
  },
): LiveActFrameV1 {
  const limits = input.limits ?? DEFAULT_LIVEACT_LIMITS;
  const lost =
    sample.presence < limits.presenceThreshold || sample.faceIndex < 0;
  if (lost) {
    return createNeutralLiveActFrame({
      timestampMs: input.timestampMs,
      sequence: input.sequence,
      trackingLost: true,
    });
  }

  const face = mergeLiveActFaceChannels(sample.face);
  assertLiveActFaceChannelsLocalOnly(face);

  return {
    contractVersion: LIVEACT_CONTRACT_VERSION,
    faceContractVersion: LIVEACT_FACE_CONTRACT_VERSION,
    timestampMs: input.timestampMs,
    sequence: input.sequence,
    confidence: clampLiveActChannel(sample.presence),
    trackingLost: false,
    head: {
      yaw: clampLiveActAngle(sample.headYaw, limits.maxYaw),
      pitch: clampLiveActAngle(sample.headPitch, limits.maxPitch),
      roll: clampLiveActAngle(sample.headRoll, limits.maxRoll),
    },
    eyeLeft: {
      x: clampLiveActGaze(sample.eyeLeftX),
      y: clampLiveActGaze(sample.eyeLeftY),
    },
    eyeRight: {
      x: clampLiveActGaze(sample.eyeRightX),
      y: clampLiveActGaze(sample.eyeRightY),
    },
    face,
  };
}

export function smoothLiveActFrame(
  previous: LiveActFrameV1 | null,
  next: LiveActFrameV1,
  alpha: number = DEFAULT_LIVEACT_LIMITS.smooth,
): LiveActFrameV1 {
  const t = clampLiveActChannel(alpha);
  if (!previous || next.trackingLost) {
    if (!previous) return next;
    const ease = clampLiveActChannel(t * 0.65);
    return {
      ...createNeutralLiveActFrame({
        timestampMs: next.timestampMs,
        sequence: next.sequence,
        trackingLost: true,
      }),
      head: {
        yaw: previous.head.yaw * (1 - ease),
        pitch: previous.head.pitch * (1 - ease),
        roll: previous.head.roll * (1 - ease),
      },
      eyeLeft: {
        x: previous.eyeLeft.x * (1 - ease),
        y: previous.eyeLeft.y * (1 - ease),
      },
      eyeRight: {
        x: previous.eyeRight.x * (1 - ease),
        y: previous.eyeRight.y * (1 - ease),
      },
    };
  }

  const lerp = (a: number, b: number) => a + (b - a) * t;
  const face = createNeutralLiveActFaceChannels() as Record<
    keyof LiveActFaceChannels,
    number
  >;
  for (const key of Object.keys(face) as (keyof LiveActFaceChannels)[]) {
    face[key] = lerp(previous.face[key] ?? 0, next.face[key] ?? 0);
  }

  return {
    contractVersion: LIVEACT_CONTRACT_VERSION,
    faceContractVersion: LIVEACT_FACE_CONTRACT_VERSION,
    timestampMs: next.timestampMs,
    sequence: next.sequence,
    confidence: lerp(previous.confidence, next.confidence),
    trackingLost: false,
    head: {
      yaw: lerp(previous.head.yaw, next.head.yaw),
      pitch: lerp(previous.head.pitch, next.head.pitch),
      roll: lerp(previous.head.roll, next.head.roll),
    },
    eyeLeft: {
      x: lerp(previous.eyeLeft.x, next.eyeLeft.x),
      y: lerp(previous.eyeLeft.y, next.eyeLeft.y),
    },
    eyeRight: {
      x: lerp(previous.eyeRight.x, next.eyeRight.x),
      y: lerp(previous.eyeRight.y, next.eyeRight.y),
    },
    face,
  };
}

export function liveActStatusLabelDe(status: LiveActStatus): string {
  switch (status) {
    case 'idle':
      return 'LiveAct aus';
    case 'starting':
      return 'Kamera wird vorbereitet …';
    case 'active':
      return 'LiveAct aktiv';
    case 'paused':
      return 'LiveAct pausiert (Tab im Hintergrund)';
    case 'lost':
      return 'Gesicht verloren — weiche Rückkehr zu Neutral';
    case 'denied':
      return 'Kamerazugriff verweigert — bitte Browser-Berechtigung prüfen';
    case 'unsupported':
      return 'LiveAct wird in diesem Browser nicht unterstützt';
    case 'stopped':
      return 'LiveAct gestoppt';
    case 'error':
      return 'LiveAct Fehler — bitte erneut starten';
    default:
      return 'LiveAct';
  }
}

/** Privacy: frame must never carry raw video / landmark arrays. */
export function assertLiveActFrameLocalOnly(frame: LiveActFrameV1): void {
  const record = frame as LiveActFrameV1 & {
    landmarks?: unknown;
    video?: unknown;
    imageData?: unknown;
    serialize?: unknown;
  };
  if (
    record.landmarks !== undefined ||
    record.video !== undefined ||
    record.imageData !== undefined ||
    record.serialize !== undefined
  ) {
    throw new Error('LiveActFrame darf keine Rohvideo-/Landmark-/Serialize-Daten tragen.');
  }
  assertLiveActFaceChannelsLocalOnly(frame.face);
}
