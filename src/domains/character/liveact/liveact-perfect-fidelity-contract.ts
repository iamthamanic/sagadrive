/**
 * liveact-perfect-fidelity-contract — SagaDrive Perfect Fidelity V2 measurement contract (#444).
 * Location: src/domains/character/liveact/liveact-perfect-fidelity-contract.ts
 *
 * Measurement only. Stretch targets are versioned; never silently weakened.
 * Does not inflate SagaDriveLiveActFrameV1 with landmarks.
 */

import { LIVEACT_DIAGNOSTICS_V2_STAGES } from './liveact-diagnostics-v2';

export const LIVEACT_PERFECT_FIDELITY_CONTRACT =
  'SagaDriveLiveActPerfectFidelityV1' as const;

export const LIVEACT_FIDELITY_CAPTURE_CONTRACT =
  'SagaDriveLiveActFidelityCaptureV1' as const;

export const LIVEACT_FIDELITY_REPORT_CONTRACT =
  'SagaDriveLiveActFidelityReportV1' as const;

/** Target set version — bump only with evidence + docs. */
export const LIVEACT_PERFECT_FIDELITY_TARGETS_VERSION = 'pf-targets-v1' as const;

/** Benchmark harness / fixture schema version. */
export const LIVEACT_PERFECT_FIDELITY_BENCHMARK_VERSION = 'pf-benchmark-v1' as const;

/** Pipeline stages — same order as Diagnostics V2. */
export const LIVEACT_PERFECT_FIDELITY_STAGES = LIVEACT_DIAGNOSTICS_V2_STAGES;

export type LiveActPerfectFidelityStageId =
  (typeof LIVEACT_PERFECT_FIDELITY_STAGES)[number];

export const LIVEACT_FIDELITY_METRIC_STATUSES = [
  'PASS',
  'MISS',
  'NOT_MEASURED',
  'NOT_APPLICABLE',
] as const;

export type LiveActFidelityMetricStatus =
  (typeof LIVEACT_FIDELITY_METRIC_STATUSES)[number];

export const LIVEACT_FIDELITY_MOTION_PHASES = [
  'SETTLE',
  'HOLD',
  'RETURN_TO_NEUTRAL',
  'RAMP',
] as const;

export type LiveActFidelityMotionPhase =
  (typeof LIVEACT_FIDELITY_MOTION_PHASES)[number];

/** Nominal synthetic sample rate (Hz). */
export const LIVEACT_FIDELITY_NOMINAL_SAMPLE_RATE_HZ = 30 as const;

/** Samples per 500 ms phase at 30 Hz. */
export const LIVEACT_FIDELITY_PHASE_SAMPLES_500MS = 15 as const;

/** Best-lag Pearson search window (±ms). */
export const LIVEACT_FIDELITY_CORRELATION_LAG_WINDOW_MS = 200 as const;

/** Return-to-neutral stability window (ms). */
export const LIVEACT_FIDELITY_RETURN_STABLE_MS = 100 as const;

/** Saturation clamp threshold for normalized controls. */
export const LIVEACT_FIDELITY_SATURATION_THRESHOLD = 0.98 as const;

/** Neutral tolerance for return-to-neutral entry. */
export const LIVEACT_FIDELITY_NEUTRAL_TOLERANCE = 0.03 as const;

/**
 * Versioned stretch targets (SagaDrive-internal, not industry standards).
 * Change only with evidence + contract version bump.
 */
export const LIVEACT_PERFECT_FIDELITY_TARGETS = {
  version: LIVEACT_PERFECT_FIDELITY_TARGETS_VERSION,
  runtime: {
    sustainedFpsMin: 30,
    droppedInferenceFractionMax: 0.01,
    processingDelayMedianMsMax: 50,
    cameraToAvatarP95MsMax: 100,
  },
  head: {
    neutralBiasDegMax: 1.5,
    crossAxisLeakageMax: 0.05,
    crossAxisLeakageStretchMax: 0.03,
  },
  eyes: {
    gazeAngularErrorMedianDegMax: 3,
    gazeAngularErrorP95DegMax: 5,
    neutralEyeOffsetMax: 0.03,
    fullBlinkMin: 0.95,
    winkCounterpartMax: 0.15,
  },
  neutral: {
    faceNoiseMax: 0.03,
  },
  lips: {
    dynamicCorrelationMin: 0.95,
    amplitudeRetentionPctMin: 90,
    amplitudeRetentionPctMax: 110,
    additionalLagP95MsMax: 66,
    contourMedianErrorPctMouthWidthMax: 3,
    contourP95ErrorPctMouthWidthMax: 5,
    naturalSpeechSaturationMax: 0.05,
  },
  returnToNeutral: {
    additionalLagMsMax: 70,
  },
} as const;

export type LiveActPerfectFidelityTargets =
  typeof LIVEACT_PERFECT_FIDELITY_TARGETS;

export interface LiveActFidelityMetricResultV1 {
  readonly id: string;
  readonly value: number | null;
  readonly unit: string;
  readonly target: number | string | null;
  readonly status: LiveActFidelityMetricStatus;
  readonly sampleCount: number;
  readonly note?: string;
}

/** Compare value against max target (lower is better). */
export function evaluateFidelityMaxTarget(
  value: number | null,
  targetMax: number,
  sampleCount: number,
  options?: { measured?: boolean },
): LiveActFidelityMetricStatus {
  if (options?.measured === false || value === null || !Number.isFinite(value)) {
    return 'NOT_MEASURED';
  }
  if (sampleCount <= 0) return 'NOT_MEASURED';
  return value <= targetMax ? 'PASS' : 'MISS';
}

/** Compare value against min target (higher is better). */
export function evaluateFidelityMinTarget(
  value: number | null,
  targetMin: number,
  sampleCount: number,
  options?: { measured?: boolean },
): LiveActFidelityMetricStatus {
  if (options?.measured === false || value === null || !Number.isFinite(value)) {
    return 'NOT_MEASURED';
  }
  if (sampleCount <= 0) return 'NOT_MEASURED';
  return value >= targetMin ? 'PASS' : 'MISS';
}

/** Inclusive range check. */
export function evaluateFidelityRangeTarget(
  value: number | null,
  min: number,
  max: number,
  sampleCount: number,
  options?: { measured?: boolean; applicable?: boolean },
): LiveActFidelityMetricStatus {
  if (options?.applicable === false) return 'NOT_APPLICABLE';
  if (options?.measured === false || value === null || !Number.isFinite(value)) {
    return 'NOT_MEASURED';
  }
  if (sampleCount <= 0) return 'NOT_MEASURED';
  return value >= min && value <= max ? 'PASS' : 'MISS';
}
