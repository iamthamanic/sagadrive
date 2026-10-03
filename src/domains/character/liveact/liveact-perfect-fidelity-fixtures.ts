/**
 * liveact-perfect-fidelity-fixtures — deterministic synthetic benchmark fixtures (#444).
 * Location: src/domains/character/liveact/liveact-perfect-fidelity-fixtures.ts
 *
 * Sample-index timelines at 30 Hz. No webcam / landmark persistence.
 */

import type { LiveActDiagnosticsV2SignalKey } from './liveact-diagnostics-v2';
import {
  LIVEACT_FIDELITY_NOMINAL_SAMPLE_RATE_HZ,
  LIVEACT_FIDELITY_PHASE_SAMPLES_500MS,
  type LiveActFidelityMotionPhase,
} from './liveact-perfect-fidelity-contract';
import {
  buildFidelityCaptureSession,
  createEmptyFidelityStageSamples,
  type LiveActFidelityCaptureSessionV1,
  type LiveActFidelityTimeSampleV1,
} from './liveact-perfect-fidelity-capture';

const HZ = LIVEACT_FIDELITY_NOMINAL_SAMPLE_RATE_HZ;
const PHASE = LIVEACT_FIDELITY_PHASE_SAMPLES_500MS;
const DT = 1000 / HZ;

function keyFace(id: string): LiveActDiagnosticsV2SignalKey {
  return `face.${id}` as LiveActDiagnosticsV2SignalKey;
}

function stagesWithAppliedDelay(
  values: Readonly<Partial<Record<LiveActDiagnosticsV2SignalKey, number | null>>>,
  appliedValues: Readonly<Partial<Record<LiveActDiagnosticsV2SignalKey, number | null>>>,
) {
  return createEmptyFidelityStageSamples({
    raw: values,
    mapped: values,
    smoothed: values,
    calibrated: values,
    retargeted: appliedValues,
    applied: appliedValues,
  });
}

/** Motion probe: settle 500ms → hold 500ms → return 500ms at 30 Hz. */
export function buildFidelityMotionProbeFixture(input: {
  scenarioId: string;
  signalKey: LiveActDiagnosticsV2SignalKey;
  holdValue: number;
  /** Applied hold value (default = holdValue for identity). */
  appliedHoldValue?: number;
  unintendedKey?: LiveActDiagnosticsV2SignalKey;
  unintendedHoldValue?: number;
  /** Extra lag samples on return before applied reaches neutral. */
  returnLagSamples?: number;
  jitterAmp?: number;
  saturateHold?: boolean;
}): LiveActFidelityCaptureSessionV1 {
  const samples: LiveActFidelityTimeSampleV1[] = [];
  let seq = 0;
  const appliedHold = input.appliedHoldValue ?? input.holdValue;
  const returnLag = input.returnLagSamples ?? 0;
  const jitter = input.jitterAmp ?? 0;

  const push = (
    phase: LiveActFidelityMotionPhase,
    rawV: number,
    appliedV: number,
    unintendedRaw = 0,
    unintendedApplied = 0,
  ) => {
    const values: Partial<Record<LiveActDiagnosticsV2SignalKey, number | null>> = {
      [input.signalKey]: rawV,
    };
    const applied: Partial<Record<LiveActDiagnosticsV2SignalKey, number | null>> = {
      [input.signalKey]: appliedV + (jitter > 0 ? ((seq % 3) - 1) * jitter : 0),
    };
    if (input.unintendedKey) {
      values[input.unintendedKey] = unintendedRaw;
      applied[input.unintendedKey] = unintendedApplied;
    }
    samples.push({
      sequence: seq,
      monotonicMs: seq * DT,
      phase,
      stages: stagesWithAppliedDelay(values, applied),
    });
    seq += 1;
  };

  for (let i = 0; i < PHASE; i += 1) push('SETTLE', 0, 0);
  for (let i = 0; i < PHASE; i += 1) {
    const hold = input.saturateHold ? 1 : input.holdValue;
    const aHold = input.saturateHold ? 1 : appliedHold;
    push(
      'HOLD',
      hold,
      aHold,
      input.unintendedHoldValue ?? 0,
      input.unintendedHoldValue ?? 0,
    );
  }
  for (let i = 0; i < PHASE; i += 1) {
    const stillHigh = i < returnLag;
    push('RETURN_TO_NEUTRAL', 0, stillHigh ? appliedHold : 0);
  }

  return buildFidelityCaptureSession({
    scenarioId: input.scenarioId,
    sourceKind: 'synthetic',
    sampleRateHz: HZ,
    samples,
    metadata: { fixture: input.scenarioId },
  });
}

/** Identity perfect motion for jawOpen. */
export function fixturePerfectIdentityJaw(): LiveActFidelityCaptureSessionV1 {
  return buildFidelityMotionProbeFixture({
    scenarioId: 'perfect-identity-jawOpen',
    signalKey: keyFace('jawOpen'),
    holdValue: 0.7,
  });
}

/** Known ~66.67 ms processing delay (2 samples @ 30 Hz). */
export function fixtureKnownLatency(): LiveActFidelityCaptureSessionV1 {
  const delaySamples = 2;
  const delayMs = delaySamples * DT;
  const base = buildFidelityMotionProbeFixture({
    scenarioId: 'known-latency-66ms',
    signalKey: keyFace('jawOpen'),
    holdValue: 0.6,
  });
  return {
    ...base,
    metadata: {
      ...base.metadata,
      knownProcessingDelayMs: delayMs,
      knownCameraToAvatarP95Ms: delayMs,
    },
  };
}

export function fixtureAmplitudeUnderResponse(): LiveActFidelityCaptureSessionV1 {
  return buildFidelityMotionProbeFixture({
    scenarioId: 'amplitude-under-response',
    signalKey: keyFace('jawOpen'),
    holdValue: 0.8,
    appliedHoldValue: 0.4,
  });
}

export function fixtureAmplitudeOverResponse(): LiveActFidelityCaptureSessionV1 {
  return buildFidelityMotionProbeFixture({
    scenarioId: 'amplitude-over-response',
    signalKey: keyFace('mouthSmileLeft'),
    holdValue: 0.5,
    appliedHoldValue: 0.95,
  });
}

export function fixtureCrossTalk(): LiveActFidelityCaptureSessionV1 {
  return buildFidelityMotionProbeFixture({
    scenarioId: 'cross-talk-blink',
    signalKey: keyFace('eyeBlinkLeft'),
    holdValue: 0.9,
    unintendedKey: keyFace('eyeBlinkRight'),
    unintendedHoldValue: 0.4,
  });
}

export function fixtureJitter(): LiveActFidelityCaptureSessionV1 {
  return buildFidelityMotionProbeFixture({
    scenarioId: 'jitter-hold',
    signalKey: keyFace('browInnerUp'),
    holdValue: 0.5,
    jitterAmp: 0.08,
  });
}

export function fixtureSaturation(): LiveActFidelityCaptureSessionV1 {
  return buildFidelityMotionProbeFixture({
    scenarioId: 'saturation-hold',
    signalKey: keyFace('mouthPucker'),
    holdValue: 0.7,
    saturateHold: true,
  });
}

export function fixtureDelayedReturn(): LiveActFidelityCaptureSessionV1 {
  // 3 samples @ 30 Hz ≈ 100 ms > 70 ms target
  return buildFidelityMotionProbeFixture({
    scenarioId: 'delayed-return-to-neutral',
    signalKey: keyFace('jawOpen'),
    holdValue: 0.7,
    returnLagSamples: 3,
  });
}

export function fixtureDroppedFrames(): LiveActFidelityCaptureSessionV1 {
  const base = fixturePerfectIdentityJaw();
  const gapped: LiveActFidelityTimeSampleV1[] = [];
  let sequence = 0;
  for (let i = 0; i < base.samples.length; i += 1) {
    if (i > 0 && i % 8 === 0) sequence += 1; // intentional sequence gap
    gapped.push({ ...base.samples[i]!, sequence, monotonicMs: sequence * DT });
    sequence += 1;
  }
  return buildFidelityCaptureSession({
    scenarioId: 'dropped-frames',
    sourceKind: 'synthetic',
    sampleRateHz: HZ,
    samples: gapped,
    metadata: { fixture: 'dropped-frames' },
  });
}

/** Speech-shaped overlapping mouth dynamics (~2 s). */
export function fixtureSpeechShaped(): LiveActFidelityCaptureSessionV1 {
  const n = 60;
  const samples: LiveActFidelityTimeSampleV1[] = [];
  for (let i = 0; i < n; i += 1) {
    const t = i / HZ;
    const jaw = 0.35 + 0.25 * Math.sin(2 * Math.PI * 4.5 * t) + 0.1 * Math.sin(2 * Math.PI * 11 * t);
    const smileL = 0.2 + 0.15 * Math.sin(2 * Math.PI * 2.2 * t + 0.4);
    const smileR = 0.2 + 0.15 * Math.sin(2 * Math.PI * 2.2 * t + 0.55);
    const pucker = 0.15 + 0.12 * Math.sin(2 * Math.PI * 3.1 * t + 1.1);
    const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
    const values = {
      [keyFace('jawOpen')]: clamp01(jaw),
      [keyFace('mouthSmileLeft')]: clamp01(smileL),
      [keyFace('mouthSmileRight')]: clamp01(smileR),
      [keyFace('mouthPucker')]: clamp01(pucker),
    };
    // 1-sample applied lag for speech lag metric
    const prev = samples[i - 1];
    const appliedValues = prev
      ? {
          [keyFace('jawOpen')]: prev.stages.find((s) => s.stage === 'raw')?.values?.[keyFace('jawOpen')] ?? 0,
          [keyFace('mouthSmileLeft')]:
            prev.stages.find((s) => s.stage === 'raw')?.values?.[keyFace('mouthSmileLeft')] ?? 0,
          [keyFace('mouthSmileRight')]:
            prev.stages.find((s) => s.stage === 'raw')?.values?.[keyFace('mouthSmileRight')] ?? 0,
          [keyFace('mouthPucker')]:
            prev.stages.find((s) => s.stage === 'raw')?.values?.[keyFace('mouthPucker')] ?? 0,
        }
      : values;
    samples.push({
      sequence: i,
      monotonicMs: i * DT,
      stages: stagesWithAppliedDelay(values, appliedValues),
    });
  }
  return buildFidelityCaptureSession({
    scenarioId: 'speech-shaped',
    sourceKind: 'synthetic_speech',
    sampleRateHz: HZ,
    samples,
    metadata: {
      fixture: 'speech-shaped',
      knownProcessingDelayMs: DT,
    },
  });
}

export function fixtureGazeAngularError(): {
  targets: { x: number; y: number }[];
  outputs: { x: number; y: number }[];
  /** Expected median ≈ 4° (MISS vs 3° target) for honest baseline demo. */
  expectedMedianDegApprox: number;
} {
  // Rotate output by ~4 degrees from target on unit circle samples
  const deg = 4;
  const rad = (deg * Math.PI) / 180;
  const targets = [
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 0, y: -1 },
    { x: 0.7071, y: 0.7071 },
  ];
  const outputs = targets.map((t) => ({
    x: t.x * Math.cos(rad) - t.y * Math.sin(rad),
    y: t.x * Math.sin(rad) + t.y * Math.cos(rad),
  }));
  return { targets, outputs, expectedMedianDegApprox: deg };
}

export function fixtureContourError(): {
  errors: number[];
  mouthWidth: number;
  expectedMedianPctApprox: number;
} {
  const mouthWidth = 1.0;
  // absolute errors → 2%, 2%, 4%, 2%, 2% → median 2%, p95 ~4%
  const errors = [0.02, 0.02, 0.04, 0.02, 0.02];
  return { errors, mouthWidth, expectedMedianPctApprox: 2 };
}

/** Stages with one missing APPLIED sample to prove dropout detection. */
export function fixtureMissingAppliedStage(): LiveActFidelityCaptureSessionV1 {
  const base = fixturePerfectIdentityJaw();
  const samples = base.samples.map((s, i) => {
    if (i !== 20) return s;
    return {
      ...s,
      stages: createEmptyFidelityStageSamples({
        raw: s.stages.find((x) => x.stage === 'raw')?.values ?? {},
        mapped: s.stages.find((x) => x.stage === 'mapped')?.values ?? {},
        smoothed: s.stages.find((x) => x.stage === 'smoothed')?.values ?? {},
        calibrated: s.stages.find((x) => x.stage === 'calibrated')?.values ?? {},
        retargeted: s.stages.find((x) => x.stage === 'retargeted')?.values ?? {},
        // applied omitted → missing
      }),
    };
  });
  return buildFidelityCaptureSession({
    scenarioId: 'missing-applied-stage',
    sourceKind: 'synthetic',
    sampleRateHz: HZ,
    samples,
    metadata: { fixture: 'missing-applied-stage' },
  });
}

export const LIVEACT_FIDELITY_SYNTHETIC_FIXTURE_IDS = [
  'perfect-identity-jawOpen',
  'known-latency-66ms',
  'amplitude-under-response',
  'amplitude-over-response',
  'cross-talk-blink',
  'jitter-hold',
  'saturation-hold',
  'delayed-return-to-neutral',
  'dropped-frames',
  'speech-shaped',
  'gaze-angular-error',
  'contour-error',
  'missing-applied-stage',
] as const;
