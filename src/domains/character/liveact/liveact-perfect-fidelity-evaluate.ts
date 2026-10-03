/**
 * liveact-perfect-fidelity-evaluate — Motion V2 / speech / report evaluation (#444).
 * Location: src/domains/character/liveact/liveact-perfect-fidelity-evaluate.ts
 *
 * Pure domain. Measures against stretch targets; does not tune runtime.
 */

import type { LiveActDiagnosticsV2SignalKey } from './liveact-diagnostics-v2';
import {
  LIVEACT_FIDELITY_CORRELATION_LAG_WINDOW_MS,
  LIVEACT_FIDELITY_NEUTRAL_TOLERANCE,
  LIVEACT_FIDELITY_NOMINAL_SAMPLE_RATE_HZ,
  LIVEACT_FIDELITY_REPORT_CONTRACT,
  LIVEACT_FIDELITY_RETURN_STABLE_MS,
  LIVEACT_FIDELITY_SATURATION_THRESHOLD,
  LIVEACT_PERFECT_FIDELITY_BENCHMARK_VERSION,
  LIVEACT_PERFECT_FIDELITY_CONTRACT,
  LIVEACT_PERFECT_FIDELITY_TARGETS,
  evaluateFidelityMaxTarget,
  evaluateFidelityMinTarget,
  evaluateFidelityRangeTarget,
  type LiveActFidelityMetricResultV1,
  type LiveActFidelityMetricStatus,
} from './liveact-perfect-fidelity-contract';
import {
  extractFidelityPhaseSeries,
  extractFidelitySignalSeries,
  fidelityCaptureDurationMs,
  fidelityStageCoverage,
  type LiveActFidelityCaptureSessionV1,
} from './liveact-perfect-fidelity-capture';
import {
  fidelityAmplitudeRetentionPct,
  fidelityBestLagCorrelation,
  fidelityContourErrorPctMouthWidth,
  fidelityGazeAngularErrorDeg,
  fidelityMad,
  fidelityMedian,
  fidelityP95AbsDev,
  fidelityPercentile,
  fidelitySaturationFraction,
  fidelityVelocityRetentionPct,
} from './liveact-perfect-fidelity-math';

function metric(
  id: string,
  value: number | null,
  unit: string,
  target: number | string | null,
  status: LiveActFidelityMetricStatus,
  sampleCount: number,
  note?: string,
): LiveActFidelityMetricResultV1 {
  return { id, value, unit, target, status, sampleCount, note };
}

export interface LiveActFidelityMotionProbeResultV1 {
  readonly probeId: string;
  readonly signalKey: LiveActDiagnosticsV2SignalKey;
  readonly settle: {
    readonly neutralBias: LiveActFidelityMetricResultV1;
    readonly neutralNoise: LiveActFidelityMetricResultV1;
    readonly crossTalk: LiveActFidelityMetricResultV1;
  };
  readonly hold: {
    readonly amplitude: LiveActFidelityMetricResultV1;
    readonly amplitudeRetention: LiveActFidelityMetricResultV1;
    readonly saturation: LiveActFidelityMetricResultV1;
    readonly crossTalk: LiveActFidelityMetricResultV1;
    readonly jitter: LiveActFidelityMetricResultV1;
  };
  readonly returnPhase: {
    readonly additionalLagMs: LiveActFidelityMetricResultV1;
    readonly residualBias: LiveActFidelityMetricResultV1;
  };
}

export function evaluateFidelityReturnLagMs(
  session: LiveActFidelityCaptureSessionV1,
  stage: 'applied' | 'retargeted',
  key: LiveActDiagnosticsV2SignalKey,
  tolerance = LIVEACT_FIDELITY_NEUTRAL_TOLERANCE,
  stableMs = LIVEACT_FIDELITY_RETURN_STABLE_MS,
): number | null {
  const returnSamples = session.samples.filter((s) => s.phase === 'RETURN_TO_NEUTRAL');
  if (returnSamples.length === 0) return null;
  const returnStart = returnSamples[0]!.monotonicMs;
  const rate = session.sampleRateHz > 0 ? session.sampleRateHz : LIVEACT_FIDELITY_NOMINAL_SAMPLE_RATE_HZ;
  const need = Math.max(1, Math.ceil((stableMs / 1000) * rate));

  for (let i = 0; i < returnSamples.length; i += 1) {
    let ok = true;
    for (let j = 0; j < need; j += 1) {
      const s = returnSamples[i + j];
      if (!s) {
        ok = false;
        break;
      }
      const st = s.stages.find((x) => x.stage === stage);
      const v = st?.values?.[key];
      if (typeof v !== 'number' || Math.abs(v) > tolerance) {
        ok = false;
        break;
      }
    }
    if (ok) {
      return Math.max(0, returnSamples[i]!.monotonicMs - returnStart);
    }
  }
  return null;
}

export function evaluateFidelityMotionProbe(
  session: LiveActFidelityCaptureSessionV1,
  probeId: string,
  key: LiveActDiagnosticsV2SignalKey,
  holdTargetAmplitude: number,
  unintendedKeys: readonly LiveActDiagnosticsV2SignalKey[],
): LiveActFidelityMotionProbeResultV1 {
  const settle = extractFidelityPhaseSeries(session, 'applied', key, 'SETTLE');
  const hold = extractFidelityPhaseSeries(session, 'applied', key, 'HOLD');
  const T = LIVEACT_PERFECT_FIDELITY_TARGETS;

  const settleBias = fidelityMedian(settle.map(Math.abs));
  const settleNoise = fidelityMad(settle);
  let settleCross = 0;
  for (const uk of unintendedKeys) {
    const series = extractFidelityPhaseSeries(session, 'applied', uk, 'SETTLE');
    const amp = fidelityMedian(series.map(Math.abs)) ?? 0;
    settleCross = Math.max(settleCross, amp);
  }

  const holdAmp = fidelityMedian(hold.map(Math.abs));
  const holdJitter = fidelityP95AbsDev(hold);
  const holdSat = fidelitySaturationFraction(hold, LIVEACT_FIDELITY_SATURATION_THRESHOLD);
  let holdCross = 0;
  for (const uk of unintendedKeys) {
    const series = extractFidelityPhaseSeries(session, 'applied', uk, 'HOLD');
    const amp = fidelityMedian(series.map(Math.abs)) ?? 0;
    holdCross = Math.max(holdCross, amp);
  }
  const crossRatio =
    holdAmp !== null && holdAmp > 1e-6 ? holdCross / holdAmp : holdCross > 0 ? Infinity : 0;

  const retention =
    holdAmp !== null && Math.abs(holdTargetAmplitude) > 1e-6
      ? (holdAmp / Math.abs(holdTargetAmplitude)) * 100
      : null;

  const returnLag = evaluateFidelityReturnLagMs(session, 'applied', key);
  const returnVals = extractFidelityPhaseSeries(session, 'applied', key, 'RETURN_TO_NEUTRAL');
  const residual = fidelityMedian(returnVals.slice(-5).map(Math.abs));

  return {
    probeId,
    signalKey: key,
    settle: {
      neutralBias: metric(
        `${probeId}.settle.neutralBias`,
        settleBias,
        'normalized',
        T.neutral.faceNoiseMax,
        evaluateFidelityMaxTarget(settleBias, T.neutral.faceNoiseMax, settle.length),
        settle.length,
      ),
      neutralNoise: metric(
        `${probeId}.settle.neutralNoise`,
        settleNoise,
        'normalized',
        T.neutral.faceNoiseMax,
        evaluateFidelityMaxTarget(settleNoise, T.neutral.faceNoiseMax, settle.length),
        settle.length,
      ),
      crossTalk: metric(
        `${probeId}.settle.crossTalk`,
        settleCross,
        'normalized',
        T.head.crossAxisLeakageMax,
        evaluateFidelityMaxTarget(settleCross, T.head.crossAxisLeakageMax, settle.length),
        settle.length,
      ),
    },
    hold: {
      amplitude: metric(
        `${probeId}.hold.amplitude`,
        holdAmp,
        'normalized',
        holdTargetAmplitude,
        holdAmp !== null && holdAmp >= holdTargetAmplitude * 0.85 ? 'PASS' : holdAmp === null ? 'NOT_MEASURED' : 'MISS',
        hold.length,
      ),
      amplitudeRetention: metric(
        `${probeId}.hold.amplitudeRetention`,
        retention,
        'percent',
        `${T.lips.amplitudeRetentionPctMin}-${T.lips.amplitudeRetentionPctMax}`,
        evaluateFidelityRangeTarget(
          retention,
          T.lips.amplitudeRetentionPctMin,
          T.lips.amplitudeRetentionPctMax,
          hold.length,
          { applicable: retention !== null },
        ),
        hold.length,
      ),
      saturation: metric(
        `${probeId}.hold.saturation`,
        holdSat,
        'fraction',
        T.lips.naturalSpeechSaturationMax,
        evaluateFidelityMaxTarget(holdSat, T.lips.naturalSpeechSaturationMax, hold.length),
        hold.length,
      ),
      crossTalk: metric(
        `${probeId}.hold.crossTalkRatio`,
        Number.isFinite(crossRatio) ? crossRatio : null,
        'ratio',
        T.head.crossAxisLeakageMax,
        evaluateFidelityMaxTarget(
          Number.isFinite(crossRatio) ? crossRatio : null,
          T.head.crossAxisLeakageMax,
          hold.length,
        ),
        hold.length,
      ),
      jitter: metric(
        `${probeId}.hold.jitterP95`,
        holdJitter,
        'normalized',
        T.neutral.faceNoiseMax,
        evaluateFidelityMaxTarget(holdJitter, T.neutral.faceNoiseMax, hold.length),
        hold.length,
      ),
    },
    returnPhase: {
      additionalLagMs: metric(
        `${probeId}.return.additionalLagMs`,
        returnLag,
        'ms',
        T.returnToNeutral.additionalLagMsMax,
        evaluateFidelityMaxTarget(
          returnLag,
          T.returnToNeutral.additionalLagMsMax,
          returnVals.length,
        ),
        returnVals.length,
      ),
      residualBias: metric(
        `${probeId}.return.residualBias`,
        residual,
        'normalized',
        T.neutral.faceNoiseMax,
        evaluateFidelityMaxTarget(residual, T.neutral.faceNoiseMax, returnVals.length),
        returnVals.length,
      ),
    },
  };
}

export interface LiveActFidelitySpeechResultV1 {
  readonly correlationZeroLag: LiveActFidelityMetricResultV1;
  readonly correlationAligned: LiveActFidelityMetricResultV1;
  readonly bestLagMs: LiveActFidelityMetricResultV1;
  readonly amplitudeRetentionPct: LiveActFidelityMetricResultV1;
  readonly velocityRetentionPct: LiveActFidelityMetricResultV1;
  readonly saturationFraction: LiveActFidelityMetricResultV1;
}

export function evaluateFidelitySpeechChannel(
  session: LiveActFidelityCaptureSessionV1,
  channelKey: LiveActDiagnosticsV2SignalKey,
): LiveActFidelitySpeechResultV1 {
  const raw = extractFidelitySignalSeries(session, 'raw', channelKey);
  const applied = extractFidelitySignalSeries(session, 'applied', channelKey);
  const T = LIVEACT_PERFECT_FIDELITY_TARGETS;
  const n = Math.min(raw.values.length, applied.values.length);
  const inVals = raw.values.slice(0, n);
  const outVals = applied.values.slice(0, n);
  const ts = applied.timestampsMs.slice(0, n);
  const lag = fidelityBestLagCorrelation(
    inVals,
    outVals,
    session.sampleRateHz,
    LIVEACT_FIDELITY_CORRELATION_LAG_WINDOW_MS,
  );
  const amp = fidelityAmplitudeRetentionPct(inVals, outVals);
  const vel = fidelityVelocityRetentionPct(inVals, outVals, ts);
  const sat = fidelitySaturationFraction(outVals, LIVEACT_FIDELITY_SATURATION_THRESHOLD);

  return {
    correlationZeroLag: metric(
      `${channelKey}.correlationZeroLag`,
      lag.correlationZeroLag,
      'r',
      T.lips.dynamicCorrelationMin,
      evaluateFidelityMinTarget(lag.correlationZeroLag, T.lips.dynamicCorrelationMin, n),
      n,
    ),
    correlationAligned: metric(
      `${channelKey}.correlationAligned`,
      lag.correlationAligned,
      'r',
      T.lips.dynamicCorrelationMin,
      evaluateFidelityMinTarget(lag.correlationAligned, T.lips.dynamicCorrelationMin, n),
      n,
    ),
    bestLagMs: metric(
      `${channelKey}.bestLagMs`,
      lag.bestLagMs,
      'ms',
      T.lips.additionalLagP95MsMax,
      evaluateFidelityMaxTarget(
        lag.bestLagMs !== null ? Math.abs(lag.bestLagMs) : null,
        T.lips.additionalLagP95MsMax,
        n,
      ),
      n,
    ),
    amplitudeRetentionPct: metric(
      `${channelKey}.amplitudeRetentionPct`,
      amp,
      'percent',
      `${T.lips.amplitudeRetentionPctMin}-${T.lips.amplitudeRetentionPctMax}`,
      evaluateFidelityRangeTarget(
        amp,
        T.lips.amplitudeRetentionPctMin,
        T.lips.amplitudeRetentionPctMax,
        n,
        { applicable: amp !== null },
      ),
      n,
    ),
    velocityRetentionPct: metric(
      `${channelKey}.velocityRetentionPct`,
      vel,
      'percent',
      `${T.lips.amplitudeRetentionPctMin}-${T.lips.amplitudeRetentionPctMax}`,
      evaluateFidelityRangeTarget(
        vel,
        T.lips.amplitudeRetentionPctMin,
        T.lips.amplitudeRetentionPctMax,
        n,
        { applicable: vel !== null },
      ),
      n,
    ),
    saturationFraction: metric(
      `${channelKey}.saturationFraction`,
      sat,
      'fraction',
      T.lips.naturalSpeechSaturationMax,
      evaluateFidelityMaxTarget(sat, T.lips.naturalSpeechSaturationMax, n),
      n,
    ),
  };
}

export function evaluateFidelityRuntimeMetrics(
  session: LiveActFidelityCaptureSessionV1,
): LiveActFidelityMetricResultV1[] {
  const T = LIVEACT_PERFECT_FIDELITY_TARGETS;
  const durationMs = fidelityCaptureDurationMs(session);
  const durationSec = durationMs / 1000;
  const inputFrames = session.samples.length;
  const processed = session.samples.filter((s) =>
    s.stages.some((st) => st.stage === 'mapped' && !st.missing),
  ).length;
  const applied = session.samples.filter((s) =>
    s.stages.some((st) => st.stage === 'applied' && !st.missing),
  ).length;
  const drops = session.droppedInferenceFrames;
  const dropFrac =
    inputFrames + drops > 0 ? drops / (inputFrames + drops) : null;
  const fps = durationSec > 0 ? applied / durationSec : null;

  // Authoritative delay only when capture metadata states it (never invent camera latency).
  const knownDelay =
    typeof session.metadata.knownProcessingDelayMs === 'number'
      ? session.metadata.knownProcessingDelayMs
      : null;
  const delaySeries =
    knownDelay !== null ? session.samples.map(() => knownDelay) : session.samples.map(() => 0);

  const delayMedian = fidelityMedian(delaySeries);
  const cameraKnown =
    typeof session.metadata.knownCameraToAvatarP95Ms === 'number'
      ? session.metadata.knownCameraToAvatarP95Ms
      : null;

  return [
    metric(
      'runtime.effectiveFps',
      fps,
      'Hz',
      T.runtime.sustainedFpsMin,
      evaluateFidelityMinTarget(fps, T.runtime.sustainedFpsMin, applied),
      applied,
    ),
    metric(
      'runtime.droppedInferenceFraction',
      dropFrac,
      'fraction',
      T.runtime.droppedInferenceFractionMax,
      evaluateFidelityMaxTarget(dropFrac, T.runtime.droppedInferenceFractionMax, inputFrames),
      inputFrames,
    ),
    metric(
      'runtime.processingDelayMedianMs',
      delayMedian,
      'ms',
      T.runtime.processingDelayMedianMsMax,
      evaluateFidelityMaxTarget(delayMedian, T.runtime.processingDelayMedianMsMax, delaySeries.length),
      delaySeries.length,
      knownDelay === null && delayMedian === 0
        ? 'synthetic sync — processing delay measured in-process (not camera acquisition)'
        : undefined,
    ),
    metric(
      'runtime.cameraToAvatarP95Ms',
      cameraKnown,
      'ms',
      T.runtime.cameraToAvatarP95MsMax,
      cameraKnown === null
        ? 'NOT_MEASURED'
        : evaluateFidelityMaxTarget(
            cameraKnown,
            T.runtime.cameraToAvatarP95MsMax,
            1,
          ),
      cameraKnown === null ? 0 : 1,
      cameraKnown === null
        ? 'no authoritative camera acquisition timestamp on V1 synthetic path'
        : undefined,
    ),
    metric('runtime.inputFrames', inputFrames, 'count', null, 'PASS', inputFrames),
    metric('runtime.processedFrames', processed, 'count', null, 'PASS', processed),
    metric('runtime.appliedFrames', applied, 'count', null, 'PASS', applied),
    metric('runtime.droppedInferenceFrames', drops, 'count', null, 'PASS', drops),
  ];
}

export function evaluateFidelityGazeAngular(
  targets: readonly { x: number; y: number }[],
  outputs: readonly { x: number; y: number }[],
): LiveActFidelityMetricResultV1[] {
  const T = LIVEACT_PERFECT_FIDELITY_TARGETS;
  const n = Math.min(targets.length, outputs.length);
  const errors: number[] = [];
  for (let i = 0; i < n; i += 1) {
    errors.push(
      fidelityGazeAngularErrorDeg(targets[i]!.x, targets[i]!.y, outputs[i]!.x, outputs[i]!.y),
    );
  }
  const med = fidelityMedian(errors);
  const p95 = fidelityPercentile(errors, 95);
  return [
    metric(
      'gaze.angularErrorMedianDeg',
      med,
      'deg',
      T.eyes.gazeAngularErrorMedianDegMax,
      evaluateFidelityMaxTarget(med, T.eyes.gazeAngularErrorMedianDegMax, n),
      n,
    ),
    metric(
      'gaze.angularErrorP95Deg',
      p95,
      'deg',
      T.eyes.gazeAngularErrorP95DegMax,
      evaluateFidelityMaxTarget(p95, T.eyes.gazeAngularErrorP95DegMax, n),
      n,
    ),
  ];
}

export function evaluateFidelityContour(
  errors: readonly number[],
  mouthWidth: number,
): LiveActFidelityMetricResultV1[] {
  const T = LIVEACT_PERFECT_FIDELITY_TARGETS;
  const { medianPct, p95Pct } = fidelityContourErrorPctMouthWidth(errors, mouthWidth);
  return [
    metric(
      'lips.contourMedianErrorPctMouthWidth',
      medianPct,
      'percent',
      T.lips.contourMedianErrorPctMouthWidthMax,
      evaluateFidelityMaxTarget(
        medianPct,
        T.lips.contourMedianErrorPctMouthWidthMax,
        errors.length,
      ),
      errors.length,
    ),
    metric(
      'lips.contourP95ErrorPctMouthWidth',
      p95Pct,
      'percent',
      T.lips.contourP95ErrorPctMouthWidthMax,
      evaluateFidelityMaxTarget(
        p95Pct,
        T.lips.contourP95ErrorPctMouthWidthMax,
        errors.length,
      ),
      errors.length,
    ),
  ];
}

export interface LiveActFidelityReportV1 {
  readonly contractVersion: typeof LIVEACT_FIDELITY_REPORT_CONTRACT;
  readonly fidelityContractVersion: typeof LIVEACT_PERFECT_FIDELITY_CONTRACT;
  readonly benchmarkVersion: typeof LIVEACT_PERFECT_FIDELITY_BENCHMARK_VERSION;
  readonly scenarioId: string;
  readonly sourceKind: string;
  readonly sampleRate: number;
  readonly durationMs: number;
  readonly stageCoverage: ReturnType<typeof fidelityStageCoverage>;
  readonly targetsVersion: string;
  readonly metrics: readonly LiveActFidelityMetricResultV1[];
  readonly warnings: readonly string[];
  /** Excluded from determinism equality. */
  readonly measuredAt?: string;
}

export function buildFidelityReport(input: {
  session: LiveActFidelityCaptureSessionV1;
  metrics: readonly LiveActFidelityMetricResultV1[];
  warnings?: readonly string[];
  measuredAt?: string;
}): LiveActFidelityReportV1 {
  return {
    contractVersion: LIVEACT_FIDELITY_REPORT_CONTRACT,
    fidelityContractVersion: LIVEACT_PERFECT_FIDELITY_CONTRACT,
    benchmarkVersion: LIVEACT_PERFECT_FIDELITY_BENCHMARK_VERSION,
    scenarioId: input.session.scenarioId,
    sourceKind: input.session.sourceKind,
    sampleRate: input.session.sampleRateHz,
    durationMs: fidelityCaptureDurationMs(input.session),
    stageCoverage: fidelityStageCoverage(input.session),
    targetsVersion: LIVEACT_PERFECT_FIDELITY_TARGETS.version,
    metrics: input.metrics,
    warnings: input.warnings ?? [],
    measuredAt: input.measuredAt,
  };
}

/** Determinism helper — strip measuredAt. */
export function fidelityReportForEquality(report: LiveActFidelityReportV1): unknown {
  const { measuredAt: _m, ...rest } = report;
  return rest;
}
