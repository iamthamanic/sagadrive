/**
 * liveact-perfect-fidelity-capture — benchmark capture session contract (#444).
 * Location: src/domains/character/liveact/liveact-perfect-fidelity-capture.ts
 *
 * Separate from production LiveActFrameV1 — no landmark arrays persisted.
 */

import type { LiveActDiagnosticsV2SignalKey } from './liveact-diagnostics-v2';
import {
  LIVEACT_FIDELITY_CAPTURE_CONTRACT,
  LIVEACT_PERFECT_FIDELITY_BENCHMARK_VERSION,
  LIVEACT_PERFECT_FIDELITY_STAGES,
  type LiveActFidelityMotionPhase,
  type LiveActPerfectFidelityStageId,
} from './liveact-perfect-fidelity-contract';
import { fidelityCountSequenceGaps } from './liveact-perfect-fidelity-math';

export type LiveActFidelitySourceKind =
  | 'synthetic'
  | 'synthetic_speech'
  | 'browser_fixture'
  | 'local_webcam_ephemeral';

export interface LiveActFidelityDerivedGeometryV1 {
  readonly mouthWidth?: number;
  readonly lipGap?: number;
  readonly contourMedianErrorPct?: number;
  readonly contourP95ErrorPct?: number;
}

export interface LiveActFidelityStageSampleV1 {
  readonly stage: LiveActPerfectFidelityStageId;
  /** Present when stage recorded for this sequence; absent = missing. */
  readonly values: Readonly<Partial<Record<LiveActDiagnosticsV2SignalKey, number | null>>> | null;
  readonly missing: boolean;
}

export interface LiveActFidelityTimeSampleV1 {
  readonly sequence: number;
  /** Monotonic ms — never wall-clock for lag math. */
  readonly monotonicMs: number;
  readonly phase?: LiveActFidelityMotionPhase;
  readonly stages: readonly LiveActFidelityStageSampleV1[];
  readonly geometry?: LiveActFidelityDerivedGeometryV1;
}

export interface LiveActFidelityCaptureSessionV1 {
  readonly contractVersion: typeof LIVEACT_FIDELITY_CAPTURE_CONTRACT;
  readonly benchmarkVersion: typeof LIVEACT_PERFECT_FIDELITY_BENCHMARK_VERSION;
  readonly scenarioId: string;
  readonly sourceKind: LiveActFidelitySourceKind;
  readonly sampleRateHz: number;
  readonly startMonotonicMs: number;
  readonly endMonotonicMs: number;
  readonly samples: readonly LiveActFidelityTimeSampleV1[];
  readonly droppedInferenceFrames: number;
  readonly metadata: Readonly<Record<string, string | number | boolean>>;
}

export function createEmptyFidelityStageSamples(
  present: Partial<
    Record<
      LiveActPerfectFidelityStageId,
      Readonly<Partial<Record<LiveActDiagnosticsV2SignalKey, number | null>>>
    >
  >,
): LiveActFidelityStageSampleV1[] {
  return LIVEACT_PERFECT_FIDELITY_STAGES.map((stage) => {
    const values = present[stage];
    if (values === undefined) {
      return { stage, values: null, missing: true };
    }
    return { stage, values, missing: false };
  });
}

export function buildFidelityCaptureSession(input: {
  scenarioId: string;
  sourceKind: LiveActFidelitySourceKind;
  sampleRateHz: number;
  samples: readonly LiveActFidelityTimeSampleV1[];
  droppedInferenceFrames?: number;
  metadata?: Readonly<Record<string, string | number | boolean>>;
}): LiveActFidelityCaptureSessionV1 {
  const sequences = input.samples.map((s) => s.sequence);
  const gapDrops = fidelityCountSequenceGaps(sequences);
  const start = input.samples[0]?.monotonicMs ?? 0;
  const end = input.samples[input.samples.length - 1]?.monotonicMs ?? start;
  return {
    contractVersion: LIVEACT_FIDELITY_CAPTURE_CONTRACT,
    benchmarkVersion: LIVEACT_PERFECT_FIDELITY_BENCHMARK_VERSION,
    scenarioId: input.scenarioId,
    sourceKind: input.sourceKind,
    sampleRateHz: input.sampleRateHz,
    startMonotonicMs: start,
    endMonotonicMs: end,
    samples: input.samples,
    droppedInferenceFrames: input.droppedInferenceFrames ?? gapDrops,
    metadata: input.metadata ?? {},
  };
}

export function fidelityCaptureDurationMs(session: LiveActFidelityCaptureSessionV1): number {
  return Math.max(0, session.endMonotonicMs - session.startMonotonicMs);
}

export function fidelityStageCoverage(
  session: LiveActFidelityCaptureSessionV1,
): Record<LiveActPerfectFidelityStageId, { present: number; missing: number }> {
  const out = {} as Record<
    LiveActPerfectFidelityStageId,
    { present: number; missing: number }
  >;
  for (const stage of LIVEACT_PERFECT_FIDELITY_STAGES) {
    out[stage] = { present: 0, missing: 0 };
  }
  for (const sample of session.samples) {
    for (const st of sample.stages) {
      if (st.missing) out[st.stage].missing += 1;
      else out[st.stage].present += 1;
    }
  }
  return out;
}

/** Extract parallel series for a signal across stages (null holes omitted for series math). */
export function extractFidelitySignalSeries(
  session: LiveActFidelityCaptureSessionV1,
  stage: LiveActPerfectFidelityStageId,
  key: LiveActDiagnosticsV2SignalKey,
): { values: number[]; timestampsMs: number[]; sequences: number[] } {
  const values: number[] = [];
  const timestampsMs: number[] = [];
  const sequences: number[] = [];
  for (const sample of session.samples) {
    const st = sample.stages.find((s) => s.stage === stage);
    if (!st || st.missing || !st.values) continue;
    const v = st.values[key];
    if (typeof v !== 'number' || !Number.isFinite(v)) continue;
    values.push(v);
    timestampsMs.push(sample.monotonicMs);
    sequences.push(sample.sequence);
  }
  return { values, timestampsMs, sequences };
}

export function extractFidelityPhaseSeries(
  session: LiveActFidelityCaptureSessionV1,
  stage: LiveActPerfectFidelityStageId,
  key: LiveActDiagnosticsV2SignalKey,
  phase: LiveActFidelityMotionPhase,
): number[] {
  const values: number[] = [];
  for (const sample of session.samples) {
    if (sample.phase !== phase) continue;
    const st = sample.stages.find((s) => s.stage === stage);
    if (!st || st.missing || !st.values) continue;
    const v = st.values[key];
    if (typeof v === 'number' && Number.isFinite(v)) values.push(v);
  }
  return values;
}
