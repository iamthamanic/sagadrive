/**
 * liveact-personal-calibration-contract — SagaDrive Personal Calibration Profile V2 (#449).
 * Location: src/domains/character/liveact/liveact-personal-calibration-contract.ts
 *
 * Versioned local actor profile. No MediaPipe/React/Three. No raw biometrics.
 * Personal calib ≠ temporal ≠ retarget ≠ #450 morphs.
 */

import { LIVEACT_DENSE_FACE_FEATURES_CONTRACT } from './liveact-dense-face-features-contract';
import { LIVEACT_HYBRID_FACE_CONTRACT } from './liveact-hybrid-face-contract';
import { LIVEACT_IRIS_GAZE_CONTRACT } from './liveact-iris-gaze-contract';
import {
  LIVEACT_TEMPORAL_CONTRACT,
  LIVEACT_TEMPORAL_POLICY_VERSION,
} from './liveact-temporal-contract';
import type { LiveActFaceChannelId } from './liveact-face-contract';

export const LIVEACT_PERSONAL_CALIBRATION_CONTRACT =
  'SagaDriveLiveActCalibrationProfileV2' as const;

export const LIVEACT_PERSONAL_CALIBRATION_POLICY_VERSION =
  'liveact-personal-calibration-policy-v1' as const;

export type LiveActPersonalCapability =
  | 'available'
  | 'weak'
  | 'skipped'
  | 'unsupported'
  | 'na'
  | 'requires450';

export type LiveActPersonalProfileStatus =
  | 'valid'
  | 'needsMigration'
  | 'needsRecalibration'
  | 'incompatible';

export interface LiveActSolverFingerprintV1 {
  readonly denseFaceFeatures: string;
  readonly irisGaze: string;
  readonly hybridFace: string;
  readonly temporalContract: string;
  readonly temporalPolicy: string;
  readonly calibrationProfile: string;
  readonly calibrationPolicy: string;
}

export function createLiveActSolverFingerprintV1(): LiveActSolverFingerprintV1 {
  return {
    denseFaceFeatures: LIVEACT_DENSE_FACE_FEATURES_CONTRACT,
    irisGaze: LIVEACT_IRIS_GAZE_CONTRACT,
    hybridFace: LIVEACT_HYBRID_FACE_CONTRACT,
    temporalContract: LIVEACT_TEMPORAL_CONTRACT,
    temporalPolicy: LIVEACT_TEMPORAL_POLICY_VERSION,
    calibrationProfile: LIVEACT_PERSONAL_CALIBRATION_CONTRACT,
    calibrationPolicy: LIVEACT_PERSONAL_CALIBRATION_POLICY_VERSION,
  };
}

export function liveActSolverFingerprintsEqual(
  a: LiveActSolverFingerprintV1,
  b: LiveActSolverFingerprintV1,
): boolean {
  return (
    a.denseFaceFeatures === b.denseFaceFeatures &&
    a.irisGaze === b.irisGaze &&
    a.hybridFace === b.hybridFace &&
    a.temporalContract === b.temporalContract &&
    a.temporalPolicy === b.temporalPolicy &&
    a.calibrationProfile === b.calibrationProfile &&
    a.calibrationPolicy === b.calibrationPolicy
  );
}

export interface LiveActPersonalChannelCalibV2 {
  readonly capability: LiveActPersonalCapability;
  readonly neutral: number;
  readonly usableMin: number;
  readonly usableMax: number;
  readonly noiseFloor: number;
  readonly confidence: number;
  /** Positive when right > left usable span for paired channels; else 0. */
  readonly asymmetry: number;
  /** Peak counterpart activation during intended unilateral action (0..1). */
  readonly counterpartCrossTalk: number;
}

export interface LiveActPersonalGazeCalibV2 {
  readonly neutralX: number;
  readonly neutralY: number;
  readonly rangeLeft: number;
  readonly rangeRight: number;
  readonly rangeUp: number;
  readonly rangeDown: number;
}

export interface LiveActPersonalHeadCalibV2 {
  readonly neutralYaw: number;
  readonly neutralPitch: number;
  readonly neutralRoll: number;
  readonly rangeYaw: number;
  readonly rangePitch: number;
  readonly rangeRoll: number;
  readonly headPoseSupported: boolean;
}

export interface LiveActPersonalSpeechEvidenceV2 {
  readonly amplitudeProxy: number;
  readonly velocityProxy: number;
  readonly saturationProxy: number;
  readonly sampleCount: number;
}

export interface LiveActCalibrationProfileV2 {
  readonly contractVersion: typeof LIVEACT_PERSONAL_CALIBRATION_CONTRACT;
  readonly policyVersion: typeof LIVEACT_PERSONAL_CALIBRATION_POLICY_VERSION;
  readonly solverFingerprint: LiveActSolverFingerprintV1;
  /** Local wall-clock ms when finalized (metadata only; not used in apply math). */
  readonly createdAtLocalMs: number;
  /** Non-biometric local handle (character id / slot). */
  readonly characterLocalId: string | null;
  readonly status: LiveActPersonalProfileStatus;
  readonly head: LiveActPersonalHeadCalibV2;
  readonly gaze: LiveActPersonalGazeCalibV2;
  readonly channels: Readonly<Partial<Record<LiveActFaceChannelId, LiveActPersonalChannelCalibV2>>>;
  readonly speech: LiveActPersonalSpeechEvidenceV2;
  readonly skippedPhaseIds: readonly string[];
}

/** Compact choreography — sum ≈ 34.5 s. */
export const LIVEACT_PERSONAL_CALIBRATION_PHASES = [
  {
    id: 'neutral',
    labelDe: 'Neutral entspannen',
    holdDe: 'Gesicht ruhig halten',
    durationMs: 4500,
    kind: 'neutral' as const,
    channels: [] as readonly LiveActFaceChannelId[],
    skipAllowed: false,
  },
  {
    id: 'headGaze',
    labelDe: 'Kopf und Blick',
    holdDe: 'Kopf L/R/U/D, Blick L/R/U/D',
    durationMs: 6500,
    kind: 'motion' as const,
    channels: [] as readonly LiveActFaceChannelId[],
    skipAllowed: true,
  },
  {
    id: 'eyesBrows',
    labelDe: 'Augen und Brauen',
    holdDe: 'Blinzeln, zwinkern L/R (oder überspringen), Brauen',
    durationMs: 5500,
    kind: 'motion' as const,
    channels: [
      'eyeBlinkLeft',
      'eyeBlinkRight',
      'browInnerUp',
      'browOuterUpLeft',
      'browOuterUpRight',
    ] as const satisfies readonly LiveActFaceChannelId[],
    skipAllowed: true,
  },
  {
    id: 'jawSmile',
    labelDe: 'Kiefer und Lächeln',
    holdDe: 'Mund öffnen, Lächeln links/rechts getrennt',
    durationMs: 5500,
    kind: 'motion' as const,
    channels: ['jawOpen', 'mouthSmileLeft', 'mouthSmileRight'] as const satisfies readonly LiveActFaceChannelId[],
    skipAllowed: true,
  },
  {
    id: 'lips',
    labelDe: 'Lippen',
    holdDe: 'Pucker, Funnel, Press, Roll, Ober-/Unterlippe',
    durationMs: 7000,
    kind: 'motion' as const,
    channels: [
      'mouthPucker',
      'mouthFunnel',
      'mouthPressLeft',
      'mouthPressRight',
      'mouthRollUpper',
      'mouthRollLower',
      'mouthUpperUpLeft',
      'mouthUpperUpRight',
      'mouthLowerDownLeft',
      'mouthLowerDownRight',
      'cheekPuff',
      'noseSneerLeft',
      'noseSneerRight',
    ] as const satisfies readonly LiveActFaceChannelId[],
    skipAllowed: true,
  },
  {
    id: 'speech',
    labelDe: 'Kurze Phrase',
    holdDe: 'Sag langsam: „Saga Drive testet Lippen“',
    durationMs: 5500,
    kind: 'speech' as const,
    channels: ['jawOpen', 'mouthPucker', 'mouthSmileLeft', 'mouthSmileRight'] as const satisfies readonly LiveActFaceChannelId[],
    skipAllowed: true,
  },
] as const;

export type LiveActPersonalCalibrationPhaseId =
  (typeof LIVEACT_PERSONAL_CALIBRATION_PHASES)[number]['id'];

export const LIVEACT_PERSONAL_CALIBRATION_DURATION_MS = LIVEACT_PERSONAL_CALIBRATION_PHASES.reduce(
  (sum, phase) => sum + phase.durationMs,
  0,
);

/** Spans below this after noise are weak — never gain-cap explode. */
export const LIVEACT_PERSONAL_MIN_USABLE_SPAN = 0.12 as const;
export const LIVEACT_PERSONAL_WEAK_SPAN = 0.06 as const;
export const LIVEACT_PERSONAL_MAX_GAIN = 4 as const;
export const LIVEACT_PERSONAL_NOISE_DEADZONE_MULT = 1.5 as const;
export const LIVEACT_PERSONAL_STORAGE_KEY_PREFIX = 'sagadrive.liveact.calibrationProfile.v2:' as const;

export function liveActPersonalCalibrationStorageKey(characterLocalId: string | null): string {
  const id = characterLocalId && characterLocalId.length > 0 ? characterLocalId : '_default';
  return `${LIVEACT_PERSONAL_STORAGE_KEY_PREFIX}${id}`;
}
