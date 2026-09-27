/**
 * LiveAct calibration — ephemeral neutral baseline + per-channel range gains (pure domain).
 * Location: src/domains/character/liveact/liveact-calibration.ts
 *
 * Step 1 averages a neutral pose. Each max-pass expression is Start → hold → review peaks →
 * Wiederholen / Weiter. Peaks across all range steps become gains so a fully exercised
 * expression reaches 1.0. Both apply to outgoing LiveAct frames only.
 */

import {
  LIVEACT_FACE_CHANNELS,
  clampLiveActChannel,
  createNeutralLiveActFaceChannels,
  type LiveActFaceChannelId,
  type LiveActFaceChannels,
} from './liveact-face-contract';
import {
  clampLiveActAngle,
  clampLiveActGaze,
  smoothLiveActFrame,
  type LiveActFrameV1,
  type LiveActLimits,
  type LiveActSourceSample,
  DEFAULT_LIVEACT_LIMITS,
} from './liveact-contract';

export const LIVEACT_CALIBRATION_FRAME_TARGET = 30 as const;
export const LIVEACT_CALIBRATION_TIMEOUT_MS = 2000 as const;

export interface LiveActNeutralBaselineV1 {
  head: { yaw: number; pitch: number; roll: number };
  eyeLeft: { x: number; y: number };
  eyeRight: { x: number; y: number };
  face: LiveActFaceChannels;
  /** False when mobile profile omitted transformation matrices. */
  headPoseSupported: boolean;
}

export interface LiveActCalibrationAccumulator {
  count: number;
  headYawSum: number;
  headPitchSum: number;
  headRollSum: number;
  eyeLeftXSum: number;
  eyeLeftYSum: number;
  eyeRightXSum: number;
  eyeRightYSum: number;
  faceSums: Record<string, number>;
  headPoseSupported: boolean;
}

export function createLiveActCalibrationAccumulator(): LiveActCalibrationAccumulator {
  const faceSums: Record<string, number> = {};
  for (const id of LIVEACT_FACE_CHANNELS) {
    if (id === '_neutral') continue;
    faceSums[id] = 0;
  }
  return {
    count: 0,
    headYawSum: 0,
    headPitchSum: 0,
    headRollSum: 0,
    eyeLeftXSum: 0,
    eyeLeftYSum: 0,
    eyeRightXSum: 0,
    eyeRightYSum: 0,
    faceSums,
    headPoseSupported: true,
  };
}

export function isValidLiveActCalibrationSample(
  sample: LiveActSourceSample,
  limits: LiveActLimits = DEFAULT_LIVEACT_LIMITS,
): boolean {
  return sample.faceIndex >= 0 && sample.presence >= limits.presenceThreshold;
}

/**
 * Push one valid tracking sample into the accumulator.
 * Returns false when the sample must abort calibration (face lost).
 */
export function pushLiveActCalibrationSample(
  acc: LiveActCalibrationAccumulator,
  sample: LiveActSourceSample,
  options: { headPoseSupported: boolean; limits?: LiveActLimits },
): boolean {
  const limits = options.limits ?? DEFAULT_LIVEACT_LIMITS;
  if (!isValidLiveActCalibrationSample(sample, limits)) {
    return false;
  }
  acc.count += 1;
  acc.headYawSum += sample.headYaw;
  acc.headPitchSum += sample.headPitch;
  acc.headRollSum += sample.headRoll;
  acc.eyeLeftXSum += sample.eyeLeftX;
  acc.eyeLeftYSum += sample.eyeLeftY;
  acc.eyeRightXSum += sample.eyeRightX;
  acc.eyeRightYSum += sample.eyeRightY;
  acc.headPoseSupported = options.headPoseSupported;
  for (const id of LIVEACT_FACE_CHANNELS) {
    if (id === '_neutral') continue;
    const value = sample.face[id];
    if (typeof value === 'number' && Number.isFinite(value)) {
      acc.faceSums[id] = (acc.faceSums[id] ?? 0) + value;
    }
  }
  return true;
}

export function finalizeLiveActCalibration(
  acc: LiveActCalibrationAccumulator,
): LiveActNeutralBaselineV1 | null {
  if (acc.count < LIVEACT_CALIBRATION_FRAME_TARGET) {
    return null;
  }
  const n = acc.count;
  const face = createNeutralLiveActFaceChannels() as Record<
    keyof LiveActFaceChannels,
    number
  >;
  for (const id of LIVEACT_FACE_CHANNELS) {
    if (id === '_neutral') continue;
    const sum = acc.faceSums[id] ?? 0;
    face[id] = clampLiveActChannel(sum / n);
  }
  return {
    head: {
      yaw: acc.headYawSum / n,
      pitch: acc.headPitchSum / n,
      roll: acc.headRollSum / n,
    },
    eyeLeft: { x: acc.eyeLeftXSum / n, y: acc.eyeLeftYSum / n },
    eyeRight: { x: acc.eyeRightXSum / n, y: acc.eyeRightYSum / n },
    face: face as LiveActFaceChannels,
    headPoseSupported: acc.headPoseSupported,
  };
}

export function applyLiveActNeutralBaseline(
  frame: LiveActFrameV1,
  baseline: LiveActNeutralBaselineV1 | null,
  limits: LiveActLimits = DEFAULT_LIVEACT_LIMITS,
): LiveActFrameV1 {
  if (!baseline || frame.trackingLost) {
    return frame;
  }

  const face = createNeutralLiveActFaceChannels() as Record<keyof LiveActFaceChannels, number>;
  for (const id of LIVEACT_FACE_CHANNELS) {
    if (id === '_neutral') {
      face._neutral = frame.face._neutral;
      continue;
    }
    const raw = (frame.face[id] ?? 0) - (baseline.face[id] ?? 0);
    face[id] = clampLiveActChannel(raw);
  }

  const head = baseline.headPoseSupported
    ? {
        yaw: clampLiveActAngle(frame.head.yaw - baseline.head.yaw, limits.maxYaw),
        pitch: clampLiveActAngle(frame.head.pitch - baseline.head.pitch, limits.maxPitch),
        roll: clampLiveActAngle(frame.head.roll - baseline.head.roll, limits.maxRoll),
      }
    : frame.head;

  return {
    ...frame,
    head,
    eyeLeft: {
      x: clampLiveActGaze(frame.eyeLeft.x - baseline.eyeLeft.x),
      y: clampLiveActGaze(frame.eyeLeft.y - baseline.eyeLeft.y),
    },
    eyeRight: {
      x: clampLiveActGaze(frame.eyeRight.x - baseline.eyeRight.x),
      y: clampLiveActGaze(frame.eyeRight.y - baseline.eyeRight.y),
    },
    face: face as LiveActFaceChannels,
  };
}

/**
 * Max-pass expressions in order. Neutral is step 1 outside this list.
 * Each step: Start → hold (countdown) → review peaks → Wiederholen or Weiter.
 * `channels` are the RAW face keys shown after the hold.
 */
export const LIVEACT_RANGE_CALIBRATION_STEPS = [
  {
    id: 'jawOpen',
    labelDe: 'Mund weit auf',
    holdDe: 'Mund weit öffnen',
    holdMs: 3000,
    channels: ['jawOpen'],
  },
  {
    id: 'eyesClosed',
    labelDe: 'Augen fest zu',
    holdDe: 'Augen zu bis der Ton kommt',
    holdMs: 3000,
    channels: ['eyeBlinkLeft', 'eyeBlinkRight'],
  },
  {
    id: 'browsUp',
    labelDe: 'Brauen hoch',
    holdDe: 'Brauen hochziehen',
    holdMs: 3000,
    channels: ['browInnerUp', 'browOuterUpLeft', 'browOuterUpRight'],
  },
  {
    id: 'smile',
    labelDe: 'Breit lächeln',
    holdDe: '2–3× breit lächeln',
    holdMs: 6000,
    channels: ['mouthSmileLeft', 'mouthSmileRight'],
  },
  {
    id: 'rollUpper',
    labelDe: 'Oberlippe einrollen',
    holdDe: 'Oberlippe nach innen — 2–3×',
    holdMs: 6000,
    channels: ['mouthRollUpper'],
  },
  {
    id: 'rollLower',
    labelDe: 'Unterlippe einrollen',
    holdDe: 'Unterlippe nach innen — 2–3×',
    holdMs: 6000,
    channels: ['mouthRollLower'],
  },
  {
    id: 'press',
    labelDe: 'Lippen zusammenpressen',
    holdDe: 'Lippen fest pressen — 2–3×',
    holdMs: 6000,
    channels: ['mouthPressLeft', 'mouthPressRight'],
  },
  {
    id: 'mouthClose',
    labelDe: 'Zähne zeigen, Lippen zukneifen',
    holdDe: 'Mund etwas offen, Lippen zukneifen — 2–3×',
    holdMs: 6000,
    channels: ['mouthClose', 'jawOpen'],
  },
  {
    id: 'upperUp',
    labelDe: 'Oberlippe hochziehen',
    holdDe: 'wie Naserümpfen — 2–3×',
    holdMs: 6000,
    channels: ['mouthUpperUpLeft', 'mouthUpperUpRight'],
  },
  {
    id: 'lowerDown',
    labelDe: 'Unterlippe herunterziehen',
    holdDe: 'Unterlippe runter — 2–3×',
    holdMs: 6000,
    channels: ['mouthLowerDownLeft', 'mouthLowerDownRight'],
  },
  {
    id: 'funnel',
    labelDe: 'Starkes O / Funnel',
    holdDe: 'rundes O — 2–3×',
    holdMs: 6000,
    channels: ['mouthFunnel'],
  },
  {
    id: 'pucker',
    labelDe: 'Kussmund / Pucker',
    holdDe: 'Lippen spitzen — 2–3×',
    holdMs: 6000,
    channels: ['mouthPucker'],
  },
  {
    id: 'shrug',
    labelDe: 'Schmollmund',
    holdDe: 'Schmollen — 2–3×',
    holdMs: 6000,
    channels: ['mouthShrugUpper', 'mouthShrugLower'],
  },
  {
    id: 'mouthLeft',
    labelDe: 'Mund zur linken Wange',
    holdDe: 'Mund zu deiner linken Wange — 2–3×',
    holdMs: 6000,
    channels: ['mouthLeft'],
  },
  {
    id: 'mouthRight',
    labelDe: 'Mund zur rechten Wange',
    holdDe: 'Mund zu deiner rechten Wange — 2–3×',
    holdMs: 6000,
    channels: ['mouthRight'],
  },
] as const satisfies ReadonlyArray<{
  id: string;
  labelDe: string;
  holdDe: string;
  holdMs: number;
  channels: readonly LiveActFaceChannelId[];
}>;

export type LiveActRangeCalibrationStepId =
  (typeof LIVEACT_RANGE_CALIBRATION_STEPS)[number]['id'];

export type LiveActRangeStepPhase = 'armed' | 'holding' | 'review';

export interface LiveActCalibrationStepPeakV1 {
  channel: LiveActFaceChannelId;
  /** Peak RAW score during the hold (0..1). */
  max: number;
}

/** Minimum hold frames before a step can complete (~0.7 s at 30 fps). */
export const LIVEACT_RANGE_STEP_MIN_FRAMES = 20 as const;
/** Default hold when a step omits holdMs. */
export const LIVEACT_RANGE_STEP_MIN_MS = 3000 as const;

/**
 * @deprecated Prefer per-step holdMs — kept as the sum of step floors for older checks.
 */
export const LIVEACT_RANGE_CALIBRATION_DURATION_MS = LIVEACT_RANGE_CALIBRATION_STEPS.reduce(
  (sum, step) => sum + step.holdMs,
  0,
);

export const LIVEACT_RANGE_CALIBRATION_MIN_FRAMES = 30 as const;
/** Channels whose peak stays this close to neutral were not exercised and stay 1:1. */
export const LIVEACT_RANGE_MIN_SPAN = 0.1 as const;
/** Amplification cap so tracker noise on barely exercised channels cannot explode. */
export const LIVEACT_RANGE_MAX_GAIN = 4 as const;
/** Robust peak — single-frame spikes must not define the range. */
const LIVEACT_RANGE_PEAK_QUANTILE = 0.95;

export function liveActCalibrationStepTotal(): number {
  return LIVEACT_RANGE_CALIBRATION_STEPS.length + 1;
}

export function liveActNeutralCalibrationPrompt(): string {
  return `Schritt 1/${liveActCalibrationStepTotal()}: Neutral halten …`;
}

/** Hold duration for a max-pass step (countdown length). */
export function liveActRangeStepHoldMs(stepIndex: number): number {
  const step = LIVEACT_RANGE_CALIBRATION_STEPS[stepIndex];
  return step?.holdMs ?? LIVEACT_RANGE_STEP_MIN_MS;
}

export function liveActRangeStepChannels(stepIndex: number): readonly LiveActFaceChannelId[] {
  return LIVEACT_RANGE_CALIBRATION_STEPS[stepIndex]?.channels ?? [];
}

/** Human-readable max-pass prompt; phase-specific UI adds Start / Werte / Weiter. */
export function liveActRangeCalibrationStepPrompt(stepIndex: number): string {
  const steps = LIVEACT_RANGE_CALIBRATION_STEPS;
  const total = liveActCalibrationStepTotal();
  const step = steps[stepIndex];
  if (!step) return `Schritt ${total}/${total}: Fertig`;
  const ordinal = stepIndex + 2;
  const seconds = Math.round(liveActRangeStepHoldMs(stepIndex) / 1000);
  return `Schritt ${ordinal}/${total}: ${step.labelDe} — ${step.holdDe} (${seconds} s)`;
}

export interface LiveActRangeCalibrationV1 {
  /** Multiplier applied after neutral subtraction; channels without entry stay 1:1. */
  gain: Partial<Record<LiveActFaceChannelId, number>>;
}

export interface LiveActRangeCalibrationAccumulator {
  count: number;
  values: Partial<Record<LiveActFaceChannelId, number[]>>;
}

export function createLiveActRangeCalibrationAccumulator(): LiveActRangeCalibrationAccumulator {
  return { count: 0, values: {} };
}

/**
 * Push one sample of the max pass. Invalid samples return false and are skipped
 * (brief dropouts while grimacing must not abort the pass).
 */
export function pushLiveActRangeCalibrationSample(
  acc: LiveActRangeCalibrationAccumulator,
  sample: LiveActSourceSample,
  limits: LiveActLimits = DEFAULT_LIVEACT_LIMITS,
): boolean {
  if (!isValidLiveActCalibrationSample(sample, limits)) {
    return false;
  }
  acc.count += 1;
  for (const id of LIVEACT_FACE_CHANNELS) {
    if (id === '_neutral') continue;
    const value = sample.face[id];
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;
    const bucket = acc.values[id] ?? [];
    bucket.push(value);
    acc.values[id] = bucket;
  }
  return true;
}

function liveActQuantile(values: readonly number[], q: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * (sorted.length - 1)))] ?? 0;
}

/** Null when too few frames or no channel moved beyond {@link LIVEACT_RANGE_MIN_SPAN}. */
export function finalizeLiveActRangeCalibration(
  acc: LiveActRangeCalibrationAccumulator,
  baseline: LiveActNeutralBaselineV1,
): LiveActRangeCalibrationV1 | null {
  if (acc.count < LIVEACT_RANGE_CALIBRATION_MIN_FRAMES) {
    return null;
  }
  const gain: Partial<Record<LiveActFaceChannelId, number>> = {};
  for (const id of LIVEACT_FACE_CHANNELS) {
    if (id === '_neutral') continue;
    const values = acc.values[id];
    if (!values || values.length < LIVEACT_RANGE_CALIBRATION_MIN_FRAMES) continue;
    const span = liveActQuantile(values, LIVEACT_RANGE_PEAK_QUANTILE) - (baseline.face[id] ?? 0);
    if (span < LIVEACT_RANGE_MIN_SPAN) continue;
    gain[id] = Math.min(LIVEACT_RANGE_MAX_GAIN, 1 / span);
  }
  return Object.keys(gain).length > 0 ? { gain } : null;
}

export function applyLiveActRangeCalibration(
  frame: LiveActFrameV1,
  range: LiveActRangeCalibrationV1 | null,
): LiveActFrameV1 {
  if (!range || frame.trackingLost) {
    return frame;
  }
  const face = { ...frame.face } as Record<LiveActFaceChannelId, number>;
  for (const id of Object.keys(range.gain) as LiveActFaceChannelId[]) {
    const gain = range.gain[id];
    if (typeof gain !== 'number') continue;
    face[id] = clampLiveActChannel((face[id] ?? 0) * gain);
  }
  return { ...frame, face: face as LiveActFaceChannels };
}

export interface LiveActCalibrationSetV1 {
  neutral: LiveActNeutralBaselineV1 | null;
  range: LiveActRangeCalibrationV1 | null;
}

export function applyLiveActCalibration(
  frame: LiveActFrameV1,
  calibration: LiveActCalibrationSetV1,
  limits: LiveActLimits = DEFAULT_LIVEACT_LIMITS,
): LiveActFrameV1 {
  return applyLiveActRangeCalibration(
    applyLiveActNeutralBaseline(frame, calibration.neutral, limits),
    calibration.range,
  );
}

export interface LiveActCalibratedStepV1 {
  /** Temporal filter state on uncalibrated values (Diagnostics V2 "smoothed"). */
  smoothed: LiveActFrameV1;
  /** Neutral + range applied — retarget input (Diagnostics V2 "calibrated"). */
  calibrated: LiveActFrameV1;
}

/** Inverse of the neutral subtraction for a lost (face-neutral) frame. */
function liveActUncalibratedLostPose(
  calibrated: LiveActFrameV1,
  neutral: LiveActNeutralBaselineV1 | null,
  limits: LiveActLimits,
): LiveActFrameV1 {
  if (!neutral) return calibrated;
  return {
    ...calibrated,
    head: neutral.headPoseSupported
      ? {
          yaw: clampLiveActAngle(calibrated.head.yaw + neutral.head.yaw, limits.maxYaw),
          pitch: clampLiveActAngle(calibrated.head.pitch + neutral.head.pitch, limits.maxPitch),
          roll: clampLiveActAngle(calibrated.head.roll + neutral.head.roll, limits.maxRoll),
        }
      : calibrated.head,
    eyeLeft: {
      x: clampLiveActGaze(calibrated.eyeLeft.x + neutral.eyeLeft.x),
      y: clampLiveActGaze(calibrated.eyeLeft.y + neutral.eyeLeft.y),
    },
    eyeRight: {
      x: clampLiveActGaze(calibrated.eyeRight.x + neutral.eyeRight.x),
      y: clampLiveActGaze(calibrated.eyeRight.y + neutral.eyeRight.y),
    },
    face: neutral.face,
  };
}

/**
 * One engine tick after mapping. Smoothing keeps its own uncalibrated state: feeding the
 * calibrated frame back would subtract the baseline again every tick (steady state ≈ raw − b/α).
 * While tracking is lost the last calibrated output eases to neutral, and the smoothing state
 * moves to the matching uncalibrated pose so re-acquisition blends instead of jumping.
 */
export function stepLiveActCalibratedFrame(
  previous: LiveActCalibratedStepV1 | null,
  mapped: LiveActFrameV1,
  calibration: LiveActCalibrationSetV1,
  limits: LiveActLimits = DEFAULT_LIVEACT_LIMITS,
): LiveActCalibratedStepV1 {
  if (mapped.trackingLost && previous) {
    const calibrated = smoothLiveActFrame(previous.calibrated, mapped, limits.smooth);
    return {
      smoothed: liveActUncalibratedLostPose(calibrated, calibration.neutral, limits),
      calibrated,
    };
  }
  const smoothed = smoothLiveActFrame(previous?.smoothed ?? null, mapped, limits.smooth);
  return { smoothed, calibrated: applyLiveActCalibration(smoothed, calibration, limits) };
}
