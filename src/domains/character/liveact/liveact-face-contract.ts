/**
 * LiveAct face channel contract — ARKit-style 52 blendshape semantics (pure domain).
 * Location: src/domains/character/liveact/liveact-face-contract.ts
 *
 * Does NOT collapse to the legacy emotion/viseme set. No React / Three / MediaPipe / DOM.
 */

export const LIVEACT_FACE_CONTRACT_VERSION = 'SagaDriveLiveActFaceV1' as const;

/**
 * Explicit Face Landmarker / ARKit blendshape channel ids (52 including `_neutral`).
 * Order matches common MediaPipe FaceLandmarker category names.
 */
export const LIVEACT_FACE_CHANNELS = [
  '_neutral',
  'browDownLeft',
  'browDownRight',
  'browInnerUp',
  'browOuterUpLeft',
  'browOuterUpRight',
  'cheekPuff',
  'cheekSquintLeft',
  'cheekSquintRight',
  'eyeBlinkLeft',
  'eyeBlinkRight',
  'eyeLookDownLeft',
  'eyeLookDownRight',
  'eyeLookInLeft',
  'eyeLookInRight',
  'eyeLookOutLeft',
  'eyeLookOutRight',
  'eyeLookUpLeft',
  'eyeLookUpRight',
  'eyeSquintLeft',
  'eyeSquintRight',
  'eyeWideLeft',
  'eyeWideRight',
  'jawForward',
  'jawLeft',
  'jawOpen',
  'jawRight',
  'mouthClose',
  'mouthDimpleLeft',
  'mouthDimpleRight',
  'mouthFrownLeft',
  'mouthFrownRight',
  'mouthFunnel',
  'mouthLeft',
  'mouthLowerDownLeft',
  'mouthLowerDownRight',
  'mouthPressLeft',
  'mouthPressRight',
  'mouthPucker',
  'mouthRight',
  'mouthRollLower',
  'mouthRollUpper',
  'mouthShrugLower',
  'mouthShrugUpper',
  'mouthSmileLeft',
  'mouthSmileRight',
  'mouthStretchLeft',
  'mouthStretchRight',
  'mouthUpperUpLeft',
  'mouthUpperUpRight',
  'noseSneerLeft',
  'noseSneerRight',
] as const;

export type LiveActFaceChannelId = (typeof LIVEACT_FACE_CHANNELS)[number];

export type LiveActFaceChannels = Readonly<Record<LiveActFaceChannelId, number>>;

export type LiveActFaceChannelPartial = Readonly<Partial<Record<LiveActFaceChannelId, number>>>;

export function isLiveActFaceChannelId(value: unknown): value is LiveActFaceChannelId {
  return typeof value === 'string' && (LIVEACT_FACE_CHANNELS as readonly string[]).includes(value);
}

/** Clamp a channel weight into 0..1; non-finite → 0. */
export function clampLiveActChannel(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

export function createNeutralLiveActFaceChannels(): LiveActFaceChannels {
  const out = {} as Record<LiveActFaceChannelId, number>;
  for (const id of LIVEACT_FACE_CHANNELS) {
    out[id] = id === '_neutral' ? 1 : 0;
  }
  return out;
}

/**
 * Merge partial channel scores onto a neutral base; unknown keys ignored.
 * Does not invent sibling exclusivity — LiveAct frames are atomic.
 */
export function mergeLiveActFaceChannels(
  partial: LiveActFaceChannelPartial | null | undefined,
): LiveActFaceChannels {
  const base = createNeutralLiveActFaceChannels() as Record<LiveActFaceChannelId, number>;
  if (!partial) return base;
  for (const id of LIVEACT_FACE_CHANNELS) {
    const raw = partial[id];
    if (typeof raw === 'number') {
      base[id] = clampLiveActChannel(raw);
    }
  }
  return base;
}

/** Assert payload never carries raw landmark / video blobs (privacy). */
export function assertLiveActFaceChannelsLocalOnly(channels: LiveActFaceChannels): void {
  const record = channels as LiveActFaceChannels & {
    landmarks?: unknown;
    video?: unknown;
    imageData?: unknown;
  };
  if (
    record.landmarks !== undefined ||
    record.video !== undefined ||
    record.imageData !== undefined
  ) {
    throw new Error('LiveAct-Face-Channels dürfen keine Rohvideo-/Landmark-Daten tragen.');
  }
}
