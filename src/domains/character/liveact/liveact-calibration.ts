/**
 * LiveAct neutral calibration — ephemeral baseline for head/gaze/face (pure domain).
 * Location: src/domains/character/liveact/liveact-calibration.ts
 *
 * Collects averaged samples; applies relative neutralization to outgoing LiveAct frames.
 */

import {
  LIVEACT_FACE_CHANNELS,
  clampLiveActChannel,
  createNeutralLiveActFaceChannels,
  type LiveActFaceChannels,
} from './liveact-face-contract';
import {
  clampLiveActAngle,
  clampLiveActGaze,
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
