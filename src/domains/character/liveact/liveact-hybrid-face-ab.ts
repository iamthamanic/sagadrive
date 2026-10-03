/**
 * liveact-hybrid-face-ab — fair A/B V1 semantic-only vs hybrid (#447 / #444).
 * Location: src/domains/character/liveact/liveact-hybrid-face-ab.ts
 *
 * Latent truth ≠ dense observation. No baseline sabotage.
 * Uses #444 Pearson / amplitude / velocity / saturation helpers.
 */

import {
  LIVEACT_HYBRID_AB_MIN_MEDIAN_IMPROVEMENT,
  LIVEACT_HYBRID_AB_NON_DEGRADATION_TOL,
  LIVEACT_HYBRID_FACE_CONTROL_IDS,
  type LiveActHybridFaceControlId,
} from './liveact-hybrid-face-contract';
import {
  LIVEACT_HYBRID_FACE_FIXTURE_IDS,
  LIVEACT_HYBRID_VALIDATION_FIXTURE_IDS,
  buildHybridFaceFixture,
  buildHybridSpeechLikeSequence,
  type HybridFaceFixtureFrame,
  type HybridFaceLatentTruth,
  type LiveActHybridFaceFixtureId,
} from './liveact-hybrid-face-fixtures';
import { solveHybridFace } from './liveact-hybrid-face-solve';
import {
  fidelityAmplitudeRetentionPct,
  fidelityMedian,
  fidelityPearson,
  fidelitySaturationFraction,
  fidelityVelocityRetentionPct,
} from './liveact-perfect-fidelity-math';
import { LIVEACT_FIDELITY_SATURATION_THRESHOLD } from './liveact-perfect-fidelity-contract';

export interface HybridFaceAbPathErrors {
  readonly path: 'v1' | 'hybrid';
  readonly medianAbsError: number | null;
  readonly errors: readonly number[];
}

export interface HybridFaceAbReportV1 {
  readonly contractVersion: 'SagaDriveLiveActHybridFaceAbReportV1';
  readonly fixtureVersion: 'hybrid-face-v1';
  readonly controlsEvaluated: readonly LiveActHybridFaceControlId[];
  readonly v1: HybridFaceAbPathErrors;
  readonly hybrid: HybridFaceAbPathErrors;
  readonly motionImprovement: number | null;
  readonly cleanNonDegradation: boolean;
  readonly validationImprovement: number | null;
  readonly hybridBeatsV1: boolean;
  readonly speech: {
    readonly v1Correlation: number | null;
    readonly hybridCorrelation: number | null;
    readonly v1AmplitudeRetentionPct: number | null;
    readonly hybridAmplitudeRetentionPct: number | null;
    readonly v1VelocityRetentionPct: number | null;
    readonly hybridVelocityRetentionPct: number | null;
    readonly v1Saturation: number | null;
    readonly hybridSaturation: number | null;
    readonly returnToNeutralOk: boolean;
  };
  readonly crossTalk: {
    readonly v1MaxUnintended: number;
    readonly hybridMaxUnintended: number;
    readonly notWorse: boolean;
  };
  readonly avatarContourFidelity: 'NOT_MEASURED — requires #450/#451';
  readonly method: {
    readonly minMedianImprovement: typeof LIVEACT_HYBRID_AB_MIN_MEDIAN_IMPROVEMENT;
    readonly nonDegradationTol: typeof LIVEACT_HYBRID_AB_NON_DEGRADATION_TOL;
  };
}

const EVAL_CONTROLS: readonly LiveActHybridFaceControlId[] = [
  'mouthSmileLeft',
  'mouthSmileRight',
  'mouthPucker',
  'mouthFunnel',
  'mouthPressLeft',
  'mouthPressRight',
  'cheekSquintLeft',
  'cheekSquintRight',
  'noseSneerLeft',
  'noseSneerRight',
  'jawOpen',
];

function latentValue(latent: HybridFaceLatentTruth, id: LiveActHybridFaceControlId): number {
  return latent[id as keyof HybridFaceLatentTruth] ?? 0;
}

function semanticValue(
  face: HybridFaceFixtureFrame['semantic'],
  id: LiveActHybridFaceControlId,
): number {
  const v = face[id];
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

function absErrorsForFrame(
  frame: HybridFaceFixtureFrame,
  path: 'v1' | 'hybrid',
): number[] {
  const errors: number[] = [];
  const hybrid =
    path === 'hybrid'
      ? solveHybridFace({
          semanticFace: frame.semantic,
          dense: frame.dense,
          sequence: frame.sequence,
          timestampMs: frame.timestampMs,
          denseSequence: frame.denseSequenceOverride ?? frame.dense?.sequence ?? null,
        })
      : null;

  for (const id of EVAL_CONTROLS) {
    const truth = latentValue(frame.latent, id);
    const pred =
      path === 'v1'
        ? semanticValue(frame.semantic, id)
        : (hybrid!.controls[id].value ?? semanticValue(frame.semantic, id));
    errors.push(Math.abs(pred - truth));
  }
  return errors;
}

function runPath(ids: readonly LiveActHybridFaceFixtureId[], path: 'v1' | 'hybrid'): number[] {
  const all: number[] = [];
  for (const id of ids) {
    all.push(...absErrorsForFrame(buildHybridFaceFixture(id), path));
  }
  return all;
}

/** Errors only on controls where latent truth is materially active (or path moved). */
function runPathActive(
  ids: readonly LiveActHybridFaceFixtureId[],
  path: 'v1' | 'hybrid',
): number[] {
  const all: number[] = [];
  for (const id of ids) {
    const frame = buildHybridFaceFixture(id);
    const hybrid =
      path === 'hybrid'
        ? solveHybridFace({
            semanticFace: frame.semantic,
            dense: frame.dense,
            sequence: frame.sequence,
            timestampMs: frame.timestampMs,
            denseSequence: frame.denseSequenceOverride ?? frame.dense?.sequence ?? null,
          })
        : null;
    for (const cid of EVAL_CONTROLS) {
      const truth = latentValue(frame.latent, cid);
      const pred =
        path === 'v1'
          ? semanticValue(frame.semantic, cid)
          : (hybrid!.controls[cid].value ?? semanticValue(frame.semantic, cid));
      if (truth < 0.05 && pred < 0.05) continue;
      all.push(Math.abs(pred - truth));
    }
  }
  return all;
}

function speechSeries(path: 'v1' | 'hybrid'): {
  truth: number[];
  pred: number[];
  timestampsMs: number[];
} {
  const frames = buildHybridSpeechLikeSequence(60);
  const truth: number[] = [];
  const pred: number[] = [];
  const timestampsMs: number[] = [];
  for (const f of frames) {
    // Composite lip activity: jaw + smile mean + pucker
    const t =
      (f.latent.jawOpen +
        (f.latent.mouthSmileLeft + f.latent.mouthSmileRight) / 2 +
        f.latent.mouthPucker) /
      3;
    truth.push(t);
    timestampsMs.push(f.timestampMs);
    if (path === 'v1') {
      const s =
        (semanticValue(f.semantic, 'jawOpen') +
          (semanticValue(f.semantic, 'mouthSmileLeft') +
            semanticValue(f.semantic, 'mouthSmileRight')) /
            2 +
          semanticValue(f.semantic, 'mouthPucker')) /
        3;
      pred.push(s);
    } else {
      const h = solveHybridFace({
        semanticFace: f.semantic,
        dense: f.dense,
        sequence: f.sequence,
        timestampMs: f.timestampMs,
        denseSequence: f.dense?.sequence ?? null,
      });
      const s =
        ((h.controls.jawOpen.value ?? 0) +
          ((h.controls.mouthSmileLeft.value ?? 0) + (h.controls.mouthSmileRight.value ?? 0)) /
            2 +
          (h.controls.mouthPucker.value ?? 0)) /
        3;
      pred.push(s);
    }
  }
  return { truth, pred, timestampsMs };
}

function crossTalkMax(path: 'v1' | 'hybrid'): number {
  // Isolated smile-left: unintended pucker/funnel/jaw
  const f = buildHybridFaceFixture('hy-smile-left-only');
  const unintended: LiveActHybridFaceControlId[] = [
    'mouthPucker',
    'mouthFunnel',
    'jawOpen',
    'mouthSmileRight',
  ];
  let maxU = 0;
  if (path === 'v1') {
    for (const id of unintended) {
      maxU = Math.max(maxU, semanticValue(f.semantic, id));
    }
    return maxU;
  }
  const h = solveHybridFace({
    semanticFace: f.semantic,
    dense: f.dense,
    sequence: f.sequence,
    timestampMs: f.timestampMs,
    denseSequence: f.dense?.sequence ?? null,
  });
  for (const id of unintended) {
    maxU = Math.max(maxU, h.controls[id].value ?? 0);
  }
  return maxU;
}

export function runHybridFaceAbBenchmark(): HybridFaceAbReportV1 {
  const motionIds = LIVEACT_HYBRID_FACE_FIXTURE_IDS.filter(
    (id) => id !== 'hy-speech-like' && id !== 'hy-dense-stale-sequence',
  );
  const v1Errors = runPath(motionIds, 'v1');
  const hyErrors = runPath(motionIds, 'hybrid');
  const v1Median = fidelityMedian(v1Errors);
  const hyMedian = fidelityMedian(hyErrors);
  const motionImprovement =
    v1Median !== null && hyMedian !== null ? v1Median - hyMedian : null;

  // Clean non-degradation
  const clean = buildHybridFaceFixture('hy-clean-smile-bilateral');
  const cleanV1 = fidelityMedian(absErrorsForFrame(clean, 'v1')) ?? 0;
  const cleanHy = fidelityMedian(absErrorsForFrame(clean, 'hybrid')) ?? 0;
  const cleanNonDegradation = cleanHy <= cleanV1 + LIVEACT_HYBRID_AB_NON_DEGRADATION_TOL;

  // Validation-only improvement (known-limitation under-response style)
  const valUnder = ['hy-smile-over-response', 'hy-funnel', 'hy-cheek', 'hy-nose-sneer', 'hy-jaw'] as const;
  const v1Val = runPath(valUnder, 'v1');
  const hyVal = runPath(valUnder, 'hybrid');
  const validationImprovement =
    (fidelityMedian(v1Val) ?? 0) - (fidelityMedian(hyVal) ?? 0);

  // Under-response meaningful improvement (active controls only — avoid zero-inflated median)
  const underIds = ['hy-smile-under-response', 'hy-pucker-under', 'hy-smile-left-only'] as const;
  const underImp =
    (fidelityMedian(runPathActive(underIds, 'v1')) ?? 0) -
    (fidelityMedian(runPathActive(underIds, 'hybrid')) ?? 0);

  // Success (predeclared design): non-degradation on clean + meaningful under-response win.
  // Validation median must not regress by more than non-degradation tolerance.
  const hybridBeatsV1 =
    cleanNonDegradation &&
    underImp >= LIVEACT_HYBRID_AB_MIN_MEDIAN_IMPROVEMENT &&
    validationImprovement >= -LIVEACT_HYBRID_AB_NON_DEGRADATION_TOL;

  const spV1 = speechSeries('v1');
  const spHy = speechSeries('hybrid');
  const v1Corr = fidelityPearson(spV1.truth, spV1.pred);
  const hyCorr = fidelityPearson(spHy.truth, spHy.pred);
  const v1Amp = fidelityAmplitudeRetentionPct(spV1.truth, spV1.pred);
  const hyAmp = fidelityAmplitudeRetentionPct(spHy.truth, spHy.pred);
  const v1Vel = fidelityVelocityRetentionPct(spV1.truth, spV1.pred, spV1.timestampsMs);
  const hyVel = fidelityVelocityRetentionPct(spHy.truth, spHy.pred, spHy.timestampsMs);
  const v1Sat = fidelitySaturationFraction(spV1.pred, LIVEACT_FIDELITY_SATURATION_THRESHOLD);
  const hySat = fidelitySaturationFraction(spHy.pred, LIVEACT_FIDELITY_SATURATION_THRESHOLD);

  // Return-to-neutral: last frames of speech sequence should be near 0 for hybrid
  const lastHy = spHy.pred.slice(-5);
  const returnToNeutralOk = lastHy.every((v) => Math.abs(v) <= 0.08);

  const ctV1 = crossTalkMax('v1');
  const ctHy = crossTalkMax('hybrid');

  void LIVEACT_HYBRID_VALIDATION_FIXTURE_IDS;

  return {
    contractVersion: 'SagaDriveLiveActHybridFaceAbReportV1',
    fixtureVersion: 'hybrid-face-v1',
    controlsEvaluated: EVAL_CONTROLS,
    v1: { path: 'v1', medianAbsError: v1Median, errors: v1Errors },
    hybrid: { path: 'hybrid', medianAbsError: hyMedian, errors: hyErrors },
    motionImprovement,
    cleanNonDegradation,
    validationImprovement,
    hybridBeatsV1,
    speech: {
      v1Correlation: v1Corr,
      hybridCorrelation: hyCorr,
      v1AmplitudeRetentionPct: v1Amp,
      hybridAmplitudeRetentionPct: hyAmp,
      v1VelocityRetentionPct: v1Vel,
      hybridVelocityRetentionPct: hyVel,
      v1Saturation: v1Sat,
      hybridSaturation: hySat,
      returnToNeutralOk,
    },
    crossTalk: {
      v1MaxUnintended: ctV1,
      hybridMaxUnintended: ctHy,
      notWorse: ctHy <= ctV1 + 0.05,
    },
    avatarContourFidelity: 'NOT_MEASURED — requires #450/#451',
    method: {
      minMedianImprovement: LIVEACT_HYBRID_AB_MIN_MEDIAN_IMPROVEMENT,
      nonDegradationTol: LIVEACT_HYBRID_AB_NON_DEGRADATION_TOL,
    },
  };
}
