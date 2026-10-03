/**
 * liveact-iris-gaze-ab — A/B iris vs blendshape-only gaze measurement (#446 / #444).
 * Location: src/domains/character/liveact/liveact-iris-gaze-ab.ts
 *
 * Measurement authority remains Perfect Fidelity (#444). No target weakening.
 */

import { fidelityMedian, fidelityPercentile } from './liveact-perfect-fidelity-math';
import {
  LIVEACT_PERFECT_FIDELITY_TARGETS,
  evaluateFidelityMaxTarget,
  type LiveActFidelityMetricStatus,
} from './liveact-perfect-fidelity-contract';
import {
  LIVEACT_IRIS_GAZE_MAX_PITCH_DEG,
  LIVEACT_IRIS_GAZE_MAX_YAW_DEG,
} from './liveact-iris-gaze-contract';
import {
  approximateBlendshapeGazeFromTruth,
  buildIrisGazeFixture,
  LIVEACT_IRIS_GAZE_FIXTURE_IDS,
  type LiveActIrisGazeFixtureId,
} from './liveact-iris-gaze-fixtures';
import { solveIrisGaze } from './liveact-iris-gaze-solve';

export interface IrisGazeAbPathErrors {
  readonly path: 'iris' | 'blendshape';
  readonly errorsDeg: readonly number[];
  readonly medianDeg: number | null;
  readonly p95Deg: number | null;
  readonly neutralOffsetMax: number | null;
  readonly medianStatus: LiveActFidelityMetricStatus;
  readonly p95Status: LiveActFidelityMetricStatus;
  readonly neutralStatus: LiveActFidelityMetricStatus;
}

export interface IrisGazeAbReportV1 {
  readonly fixtureIds: readonly LiveActIrisGazeFixtureId[];
  readonly iris: IrisGazeAbPathErrors;
  readonly blendshape: IrisGazeAbPathErrors;
  readonly irisBeatsBlendshape: boolean;
  readonly medianImprovementDeg: number | null;
  readonly headRelativeMaxAbs: number;
  readonly binocularFarDisagreementDeg: number | null;
}

function pathErrors(
  path: 'iris' | 'blendshape',
  errorsDeg: number[],
  neutralOffsets: number[],
): IrisGazeAbPathErrors {
  const T = LIVEACT_PERFECT_FIDELITY_TARGETS;
  const medianDeg = fidelityMedian(errorsDeg);
  const p95Deg = fidelityPercentile(errorsDeg, 95);
  const neutralOffsetMax =
    neutralOffsets.length === 0
      ? null
      : Math.max(...neutralOffsets.map((v) => Math.abs(v)));
  return {
    path,
    errorsDeg,
    medianDeg,
    p95Deg,
    neutralOffsetMax,
    medianStatus: evaluateFidelityMaxTarget(
      medianDeg,
      T.eyes.gazeAngularErrorMedianDegMax,
      errorsDeg.length,
    ),
    p95Status: evaluateFidelityMaxTarget(
      p95Deg,
      T.eyes.gazeAngularErrorP95DegMax,
      errorsDeg.length,
    ),
    neutralStatus: evaluateFidelityMaxTarget(
      neutralOffsetMax,
      T.eyes.neutralEyeOffsetMax,
      neutralOffsets.length,
    ),
  };
}

/**
 * Angular error in degrees from normalized −1..1 gaze components.
 * Uses yaw/pitch degree scale (not unit-vector acos — that is undefined at origin).
 */
function eyeError(tx: number, ty: number, ox: number, oy: number): number {
  const dYaw = (tx - ox) * LIVEACT_IRIS_GAZE_MAX_YAW_DEG;
  const dPitch = (ty - oy) * LIVEACT_IRIS_GAZE_MAX_PITCH_DEG;
  return Math.hypot(dYaw, dPitch);
}

/**
 * Run A/B suite: iris geometric solve vs degraded blendshape-only proxy on same fixtures.
 */
export function runIrisGazeAbBenchmark(): IrisGazeAbReportV1 {
  const irisErrors: number[] = [];
  const blendErrors: number[] = [];
  const irisNeutral: number[] = [];
  const blendNeutral: number[] = [];
  let headRelativeMaxAbs = 0;
  let binocularFarDisagreementDeg: number | null = null;

  const directional = [
    'iris-neutral',
    'iris-look-left',
    'iris-look-right',
    'iris-look-up',
    'iris-look-down',
    'iris-far-convergent',
  ] as const;

  for (const id of directional) {
    const { geometry, truth, headLeak } = buildIrisGazeFixture(id);
    const iris = solveIrisGaze({ geometry, sequence: 1, timestampMs: 0 });
    const blend = approximateBlendshapeGazeFromTruth(truth, headLeak);

    if (iris.left.available && iris.left.x !== null && iris.left.y !== null) {
      irisErrors.push(eyeError(truth.leftX, truth.leftY, iris.left.x, iris.left.y));
      if (id === 'iris-neutral') {
        irisNeutral.push(iris.left.x, iris.left.y);
      }
    }
    if (iris.right.available && iris.right.x !== null && iris.right.y !== null) {
      irisErrors.push(eyeError(truth.rightX, truth.rightY, iris.right.x, iris.right.y));
      if (id === 'iris-neutral') {
        irisNeutral.push(iris.right.x, iris.right.y);
      }
    }

    blendErrors.push(eyeError(truth.leftX, truth.leftY, blend.eyeLeftX, blend.eyeLeftY));
    blendErrors.push(eyeError(truth.rightX, truth.rightY, blend.eyeRightX, blend.eyeRightY));
    if (id === 'iris-neutral') {
      blendNeutral.push(blend.eyeLeftX, blend.eyeLeftY, blend.eyeRightX, blend.eyeRightY);
    }

    if (id === 'iris-far-convergent' && iris.binocularYawDisagreementDeg !== null) {
      binocularFarDisagreementDeg = iris.binocularYawDisagreementDeg;
    }
  }

  // Head-relative: neutral eyes under head transforms
  const neutralTruth = { leftX: 0, leftY: 0, rightX: 0, rightY: 0 };
  for (const id of [
    'iris-head-yaw-neutral-eyes',
    'iris-head-pitch-neutral-eyes',
    'iris-head-roll-neutral-eyes',
  ] as const) {
    const { geometry, headLeak } = buildIrisGazeFixture(id);
    const iris = solveIrisGaze({ geometry, sequence: 2, timestampMs: 0 });
    if (iris.left.available && iris.left.x !== null && iris.left.y !== null) {
      headRelativeMaxAbs = Math.max(
        headRelativeMaxAbs,
        Math.abs(iris.left.x),
        Math.abs(iris.left.y),
      );
      irisErrors.push(eyeError(0, 0, iris.left.x, iris.left.y));
    }
    if (iris.right.available && iris.right.x !== null && iris.right.y !== null) {
      headRelativeMaxAbs = Math.max(
        headRelativeMaxAbs,
        Math.abs(iris.right.x),
        Math.abs(iris.right.y),
      );
      irisErrors.push(eyeError(0, 0, iris.right.x, iris.right.y));
    }
    const blend = approximateBlendshapeGazeFromTruth(neutralTruth, headLeak);
    blendErrors.push(eyeError(0, 0, blend.eyeLeftX, blend.eyeLeftY));
    blendErrors.push(eyeError(0, 0, blend.eyeRightX, blend.eyeRightY));
  }

  const iris = pathErrors('iris', irisErrors, irisNeutral);
  const blendshape = pathErrors('blendshape', blendErrors, blendNeutral);

  const medianImprovementDeg =
    iris.medianDeg !== null && blendshape.medianDeg !== null
      ? blendshape.medianDeg - iris.medianDeg
      : null;

  const irisBeatsBlendshape =
    iris.medianDeg !== null &&
    blendshape.medianDeg !== null &&
    iris.medianDeg < blendshape.medianDeg - 0.25 &&
    (iris.p95Deg === null ||
      blendshape.p95Deg === null ||
      iris.p95Deg <= blendshape.p95Deg);

  return {
    fixtureIds: [...LIVEACT_IRIS_GAZE_FIXTURE_IDS],
    iris,
    blendshape,
    irisBeatsBlendshape,
    medianImprovementDeg,
    headRelativeMaxAbs,
    binocularFarDisagreementDeg,
  };
}
