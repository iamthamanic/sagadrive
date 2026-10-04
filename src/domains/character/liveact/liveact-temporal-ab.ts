/**
 * liveact-temporal-ab — fair A/B V1 fixed EMA vs adaptive temporal (#448 / #444).
 * Location: src/domains/character/liveact/liveact-temporal-ab.ts
 *
 * V1 = smoothLiveActFrame(α=0.35). Adaptive = stepAdaptiveTemporal.
 * Same inputs + timestamps. No baseline sabotage.
 */

import {
  DEFAULT_LIVEACT_LIMITS,
  smoothLiveActFrame,
  type LiveActFrameV1,
} from './liveact-contract';
import { LIVEACT_FIDELITY_SATURATION_THRESHOLD } from './liveact-perfect-fidelity-contract';
import {
  fidelityAmplitudeRetentionPct,
  fidelityBestLagCorrelation,
  fidelityMedian,
  fidelityOvershoot,
  fidelityP95AbsDev,
  fidelityPearson,
  fidelityPercentile,
  fidelitySaturationFraction,
  fidelityVelocityRetentionPct,
} from './liveact-perfect-fidelity-math';
import {
  LIVEACT_TEMPORAL_CONTRACT,
  LIVEACT_TEMPORAL_POLICY_VERSION,
  LIVEACT_TEMPORAL_TARGETS,
} from './liveact-temporal-contract';
import {
  buildBlinkSequence,
  buildDroppedFrameLipSequence,
  buildGazeStepSequence,
  buildHeadJitterSequence,
  buildHeadYawStepSequence,
  buildLipSineSequence,
  buildLostReacquireSmileSequence,
  buildTemporalSpeechSequence,
  type TemporalMappedSequence,
} from './liveact-temporal-fixtures';
import {
  readTemporalScalar,
  stepAdaptiveTemporal,
  type StepAdaptiveTemporalResult,
} from './liveact-temporal-solve';
import type { LiveActTemporalScalarKey } from './liveact-temporal-contract';
import type { LiveActTemporalStateV1 } from './liveact-temporal-contract';

export type TemporalAbPath = 'v1-fixed' | 'adaptive';

function primaryScalarKey(seq: TemporalMappedSequence): LiveActTemporalScalarKey {
  if (seq.primaryKey === 'speech.composite') return 'face.jawOpen';
  return seq.primaryKey as LiveActTemporalScalarKey;
}

function runPath(
  seq: TemporalMappedSequence,
  path: TemporalAbPath,
): { outputs: number[]; frames: LiveActFrameV1[]; timestampsMs: number[] } {
  const outputs: number[] = [];
  const frames: LiveActFrameV1[] = [];
  const timestampsMs: number[] = [];
  let prevFrame: LiveActFrameV1 | null = null;
  let temporal: LiveActTemporalStateV1 | null = null;
  const key = primaryScalarKey(seq);

  for (const mapped of seq.frames) {
    timestampsMs.push(mapped.timestampMs);
    if (path === 'v1-fixed') {
      const out = smoothLiveActFrame(prevFrame, mapped, DEFAULT_LIVEACT_LIMITS.smooth);
      prevFrame = out;
      frames.push(out);
      if (seq.primaryKey === 'speech.composite') {
        outputs.push(
          ((out.face.jawOpen ?? 0) +
            ((out.face.mouthSmileLeft ?? 0) + (out.face.mouthSmileRight ?? 0)) / 2 +
            (out.face.mouthPucker ?? 0)) /
            3,
        );
      } else {
        outputs.push(readTemporalScalar(out, key));
      }
    } else {
      const step: StepAdaptiveTemporalResult = stepAdaptiveTemporal(temporal, mapped);
      temporal = step.state;
      frames.push(step.frame);
      if (seq.primaryKey === 'speech.composite') {
        const out = step.frame;
        outputs.push(
          ((out.face.jawOpen ?? 0) +
            ((out.face.mouthSmileLeft ?? 0) + (out.face.mouthSmileRight ?? 0)) / 2 +
            (out.face.mouthPucker ?? 0)) /
            3,
        );
      } else {
        outputs.push(readTemporalScalar(step.frame, key));
      }
    }
  }
  return { outputs, frames, timestampsMs };
}

function lagP95Ms(
  truth: readonly number[],
  pred: readonly number[],
  timestampsMs: readonly number[],
): number | null {
  if (timestampsMs.length < 2) return null;
  const dt = timestampsMs[1]! - timestampsMs[0]!;
  const hz = dt > 0 ? 1000 / dt : 60;
  const lag = fidelityBestLagCorrelation(truth, pred, hz, 120);
  return lag.bestLagMs !== null ? Math.abs(lag.bestLagMs) : null;
}

function returnLagMs(
  truth: readonly number[],
  pred: readonly number[],
  timestampsMs: readonly number[],
  eps = 0.08,
): number | null {
  // Find when truth returns near 0 at end; measure when pred follows.
  let truthNeutral = -1;
  for (let i = truth.length - 1; i >= 0; i -= 1) {
    if (Math.abs(truth[i]!) > eps) {
      truthNeutral = i + 1;
      break;
    }
  }
  if (truthNeutral < 0 || truthNeutral >= truth.length) return 0;
  for (let i = truthNeutral; i < pred.length; i += 1) {
    if (Math.abs(pred[i]!) <= eps) {
      return Math.max(0, timestampsMs[i]! - timestampsMs[truthNeutral]!);
    }
  }
  return timestampsMs[timestampsMs.length - 1]! - timestampsMs[truthNeutral]!;
}

export interface TemporalAbChannelMetrics {
  readonly jitterP95: number | null;
  readonly lagMs: number | null;
  readonly overshoot: number | null;
  readonly amplitudeRetentionPct: number | null;
  readonly velocityRetentionPct: number | null;
  readonly saturation: number | null;
  readonly returnLagMs: number | null;
  readonly correlation: number | null;
  readonly peak: number | null;
}

function metricsFor(
  seq: TemporalMappedSequence,
  path: TemporalAbPath,
  stepTarget?: number,
): TemporalAbChannelMetrics {
  const { outputs, timestampsMs } = runPath(seq, path);
  const truth = seq.truth;
  return {
    jitterP95: fidelityP95AbsDev(outputs),
    lagMs: lagP95Ms(truth, outputs, timestampsMs),
    overshoot:
      stepTarget !== undefined
        ? fidelityOvershoot(truth, outputs, stepTarget)
        : fidelityOvershoot(truth, outputs, Math.max(...truth)),
    amplitudeRetentionPct: fidelityAmplitudeRetentionPct(truth, outputs),
    velocityRetentionPct: fidelityVelocityRetentionPct(truth, outputs, timestampsMs),
    saturation: fidelitySaturationFraction(outputs, LIVEACT_FIDELITY_SATURATION_THRESHOLD),
    returnLagMs: returnLagMs(truth, outputs, timestampsMs),
    correlation: fidelityPearson(truth, outputs),
    peak: fidelityPercentile(outputs, 100) ?? Math.max(...outputs, 0),
  };
}

export interface TemporalAbReportV1 {
  readonly contractVersion: typeof LIVEACT_TEMPORAL_CONTRACT;
  readonly policyVersion: typeof LIVEACT_TEMPORAL_POLICY_VERSION;
  readonly v1Fixed: {
    readonly headJitterP95: number | null;
    readonly headLagMs: number | null;
    readonly headOvershoot: number | null;
    readonly headReturnLagMs: number | null;
    readonly gazeLagMs: number | null;
    readonly gazeOvershoot: number | null;
    readonly blinkPeak: number | null;
    readonly blinkCrossTalk: number | null;
    readonly lip: Record<string, TemporalAbChannelMetrics>;
    readonly speech: TemporalAbChannelMetrics;
  };
  readonly adaptive: {
    readonly headJitterP95: number | null;
    readonly headLagMs: number | null;
    readonly headOvershoot: number | null;
    readonly headReturnLagMs: number | null;
    readonly gazeLagMs: number | null;
    readonly gazeOvershoot: number | null;
    readonly blinkPeak: number | null;
    readonly blinkCrossTalk: number | null;
    readonly lip: Record<string, TemporalAbChannelMetrics>;
    readonly speech: TemporalAbChannelMetrics;
  };
  readonly frequencySweep: Record<
    string,
    { readonly v1: TemporalAbChannelMetrics; readonly adaptive: TemporalAbChannelMetrics }
  >;
  readonly fps: {
    readonly hz30: TemporalAbChannelMetrics;
    readonly hz60: TemporalAbChannelMetrics;
    readonly comparable: boolean;
  };
  readonly lifecycle: {
    readonly lostReacquireMaxSmileAfter: number;
    readonly droppedFinite: boolean;
    readonly droppedOvershoot: number | null;
  };
  readonly targets: typeof LIVEACT_TEMPORAL_TARGETS;
  readonly success: boolean;
  readonly privacy: { readonly committedRawLandmarks: 0; readonly committedWebcam: 0 };
}

function blinkCrossTalk(path: TemporalAbPath): number {
  const seq = buildBlinkSequence(60);
  const { frames } = runPath(seq, path);
  let maxR = 0;
  for (const f of frames) {
    maxR = Math.max(maxR, f.face.eyeBlinkRight ?? 0);
  }
  return maxR;
}

function lipSweep(path: TemporalAbPath): Record<string, TemporalAbChannelMetrics> {
  const out: Record<string, TemporalAbChannelMetrics> = {};
  for (const freq of [1, 2, 3, 5] as const) {
    out[`${freq}Hz`] = metricsFor(buildLipSineSequence(freq, 60, 2), path);
  }
  return out;
}

export function runTemporalAbBenchmark(): TemporalAbReportV1 {
  const headStep = buildHeadYawStepSequence(60);
  const headJitter = buildHeadJitterSequence(60);
  const gaze = buildGazeStepSequence(60);
  const blink = buildBlinkSequence(60);
  const speech = buildTemporalSpeechSequence(60, 60);
  const lost = buildLostReacquireSmileSequence(60);
  const dropped = buildDroppedFrameLipSequence();

  const v1HeadJ = metricsFor(headJitter, 'v1-fixed');
  const adHeadJ = metricsFor(headJitter, 'adaptive');
  const v1HeadS = metricsFor(headStep, 'v1-fixed', 0.4);
  const adHeadS = metricsFor(headStep, 'adaptive', 0.4);
  const v1Gaze = metricsFor(gaze, 'v1-fixed', 0.6);
  const adGaze = metricsFor(gaze, 'adaptive', 0.6);
  const v1Blink = metricsFor(blink, 'v1-fixed');
  const adBlink = metricsFor(blink, 'adaptive');
  const v1Speech = metricsFor(speech, 'v1-fixed');
  const adSpeech = metricsFor(speech, 'adaptive');
  const v1Lips = lipSweep('v1-fixed');
  const adLips = lipSweep('adaptive');

  const lip30 = metricsFor(buildLipSineSequence(3, 30, 2), 'adaptive');
  const lip60 = metricsFor(buildLipSineSequence(3, 60, 2), 'adaptive');
  const amp30 = lip30.amplitudeRetentionPct ?? 0;
  const amp60 = lip60.amplitudeRetentionPct ?? 0;
  const fpsComparable =
    Math.abs(amp30 - amp60) / Math.max(1, Math.max(amp30, amp60)) <=
    LIVEACT_TEMPORAL_TARGETS.fpsInvarianceTol;

  const lostAd = runPath(lost, 'adaptive');
  // After reacquire (last 20 frames) smile must stay low
  const after = lostAd.outputs.slice(-20);
  const lostMax = Math.max(...after, 0);

  const dropAd = runPath(dropped, 'adaptive');
  const droppedFinite = dropAd.outputs.every((v) => Number.isFinite(v));
  const dropOver = fidelityOvershoot(dropped.truth, dropAd.outputs, 0.7);

  const lipOk = ([1, 2, 3, 5] as const).every((f) => {
    const m = adLips[`${f}Hz`]!;
    const amp = m.amplitudeRetentionPct ?? 0;
    const lag = m.lagMs ?? 999;
    return (
      amp >= LIVEACT_TEMPORAL_TARGETS.lipAmplitudeRetentionMinPct &&
      amp <= LIVEACT_TEMPORAL_TARGETS.lipAmplitudeRetentionMaxPct &&
      lag <= LIVEACT_TEMPORAL_TARGETS.lipLagP95MsMax
    );
  });
  const returnOk =
    (adSpeech.returnLagMs ?? 999) <= LIVEACT_TEMPORAL_TARGETS.lipReturnLagMsMax;
  const satOk =
    (adSpeech.saturation ?? 1) < LIVEACT_TEMPORAL_TARGETS.lipSaturationMax;
  const blinkOk = (adBlink.peak ?? 0) >= LIVEACT_TEMPORAL_TARGETS.blinkPeakMin;
  const gazeOk =
    (adGaze.lagMs ?? 999) <=
    (v1Gaze.lagMs ?? 0) + LIVEACT_TEMPORAL_TARGETS.gazeLagSlackMsVsV1;
  const headJitterOk =
    (adHeadJ.jitterP95 ?? 1) <= (v1HeadJ.jitterP95 ?? 1) + 1e-9;
  const headLagOk =
    (adHeadS.lagMs ?? 999) <=
    (v1HeadS.lagMs ?? 0) + LIVEACT_TEMPORAL_TARGETS.headLagSlackMsVsV1;
  const overshootOk =
    (adHeadS.overshoot ?? 1) <= (v1HeadS.overshoot ?? 0) + 0.02 &&
    (adGaze.overshoot ?? 1) <= (v1Gaze.overshoot ?? 0) + 0.02;
  const lifecycleOk = lostMax <= 0.08 && droppedFinite && (dropOver ?? 0) <= 0.05;

  const success =
    lipOk &&
    returnOk &&
    satOk &&
    blinkOk &&
    gazeOk &&
    headJitterOk &&
    headLagOk &&
    overshootOk &&
    fpsComparable &&
    lifecycleOk;

  const frequencySweep: TemporalAbReportV1['frequencySweep'] = {};
  for (const f of [1, 2, 3, 5] as const) {
    frequencySweep[`${f}Hz`] = { v1: v1Lips[`${f}Hz`]!, adaptive: adLips[`${f}Hz`]! };
  }

  return {
    contractVersion: LIVEACT_TEMPORAL_CONTRACT,
    policyVersion: LIVEACT_TEMPORAL_POLICY_VERSION,
    v1Fixed: {
      headJitterP95: v1HeadJ.jitterP95,
      headLagMs: v1HeadS.lagMs,
      headOvershoot: v1HeadS.overshoot,
      headReturnLagMs: v1HeadS.returnLagMs,
      gazeLagMs: v1Gaze.lagMs,
      gazeOvershoot: v1Gaze.overshoot,
      blinkPeak: v1Blink.peak,
      blinkCrossTalk: blinkCrossTalk('v1-fixed'),
      lip: v1Lips,
      speech: v1Speech,
    },
    adaptive: {
      headJitterP95: adHeadJ.jitterP95,
      headLagMs: adHeadS.lagMs,
      headOvershoot: adHeadS.overshoot,
      headReturnLagMs: adHeadS.returnLagMs,
      gazeLagMs: adGaze.lagMs,
      gazeOvershoot: adGaze.overshoot,
      blinkPeak: adBlink.peak,
      blinkCrossTalk: blinkCrossTalk('adaptive'),
      lip: adLips,
      speech: adSpeech,
    },
    frequencySweep,
    fps: { hz30: lip30, hz60: lip60, comparable: fpsComparable },
    lifecycle: {
      lostReacquireMaxSmileAfter: lostMax,
      droppedFinite,
      droppedOvershoot: dropOver,
    },
    targets: LIVEACT_TEMPORAL_TARGETS,
    success,
    privacy: { committedRawLandmarks: 0, committedWebcam: 0 },
  };
}

void fidelityMedian;
