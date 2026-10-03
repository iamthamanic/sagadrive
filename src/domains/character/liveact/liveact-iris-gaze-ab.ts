/**
 * liveact-iris-gaze-ab — A/B iris sphere vs fair V1 blendshape gaze (#446 / #444).
 * Location: src/domains/character/liveact/liveact-iris-gaze-ab.ts
 *
 * Measurement: 3D gaze-direction acos(dot) (Phase 11; same definition as #444,
 * magnitude-sensitive). Also reports evaluateFidelityGazeAngular on normalized x/y.
 * Fair V1 = planar aperture → V1 eyeLook source mapper (no gain sabotage).
 */

import {
  fidelityGazeAngularErrorDeg,
  fidelityMedian,
  fidelityPercentile,
} from './liveact-perfect-fidelity-math';
import {
  LIVEACT_PERFECT_FIDELITY_TARGETS,
  evaluateFidelityMaxTarget,
  type LiveActFidelityMetricStatus,
} from './liveact-perfect-fidelity-contract';
import {
  buildIrisGazeFixture,
  fairBlendshapeGazeFromGeometry,
  LIVEACT_IRIS_GAZE_FIXTURE_IDS,
  type LiveActIrisGazeFixtureId,
} from './liveact-iris-gaze-fixtures';
import { solveIrisGaze } from './liveact-iris-gaze-solve';
import {
  gazeDirectionAngularErrorDeg,
  gazeDirectionFromYawPitchDeg,
} from './liveact-iris-gaze-sphere';
import { normalizedGazeToYawPitch } from './liveact-iris-gaze-contract';

/** Minimum absolute median improvement (degrees) above numerical noise. */
export const LIVEACT_IRIS_AB_MIN_MEDIAN_IMPROVEMENT_DEG = 0.5 as const;

export interface IrisGazeAbPathErrors {
  readonly path: 'iris' | 'blendshape';
  readonly errorsDeg: readonly number[];
  readonly medianDeg: number | null;
  readonly p95Deg: number | null;
  readonly neutralOffsetMax: number | null;
  readonly medianStatus: LiveActFidelityMetricStatus;
  readonly p95Status: LiveActFidelityMetricStatus;
  readonly neutralStatus: LiveActFidelityMetricStatus;
  /** #444 2D unit-vector metric (direction-only; reported for contract compliance). */
  readonly fidelity2dMedianDeg: number | null;
  readonly fidelity2dP95Deg: number | null;
}

export interface IrisGazeAbReportV1 {
  readonly contractVersion: 'SagaDriveLiveActIrisGazeAbReportV1';
  readonly fixtureVersion: 'iris-sphere-v1';
  readonly fixtureIds: readonly LiveActIrisGazeFixtureId[];
  readonly iris: IrisGazeAbPathErrors;
  readonly blendshape: IrisGazeAbPathErrors;
  readonly irisBeatsBlendshape: boolean;
  readonly medianImprovementDeg: number | null;
  readonly p95ImprovementDeg: number | null;
  readonly headRelativeMaxAbs: number;
  readonly binocularFarDisagreementDeg: number | null;
  readonly golden: {
    readonly yaw10AbsErrorDeg: number | null;
    readonly yawNeg10AbsErrorDeg: number | null;
    readonly pitch8AbsErrorDeg: number | null;
  };
  readonly method: {
    readonly iris: 'eyeball-sphere-solve';
    readonly blendshape: 'planar-aperture→v1-eyelook-mapper';
    readonly angularError: 'acos(dot) 3D unit gaze directions';
    readonly minMedianImprovementDeg: typeof LIVEACT_IRIS_AB_MIN_MEDIAN_IMPROVEMENT_DEG;
  };
}

function pathErrors(
  path: 'iris' | 'blendshape',
  errorsDeg: number[],
  neutralOffsets: number[],
  fidelity2dErrors: number[],
): IrisGazeAbPathErrors {
  const T = LIVEACT_PERFECT_FIDELITY_TARGETS;
  const medianDeg = fidelityMedian(errorsDeg);
  const p95Deg = fidelityPercentile(errorsDeg, 95);
  const neutralOffsetMax =
    neutralOffsets.length === 0
      ? null
      : Math.max(...neutralOffsets.map((v) => Math.abs(v)));
  const fidelity2dMedianDeg = fidelityMedian(fidelity2dErrors);
  const fidelity2dP95Deg = fidelityPercentile(fidelity2dErrors, 95);
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
    fidelity2dMedianDeg,
    fidelity2dP95Deg,
  };
}

function angularErrorFromYawPitch(
  tYaw: number,
  tPitch: number,
  oYaw: number,
  oPitch: number,
): number {
  return gazeDirectionAngularErrorDeg(
    gazeDirectionFromYawPitchDeg(tYaw, tPitch),
    gazeDirectionFromYawPitchDeg(oYaw, oPitch),
  );
}

const DIRECTIONAL: readonly LiveActIrisGazeFixtureId[] = [
  'iris-neutral',
  'iris-look-left',
  'iris-look-right',
  'iris-look-up',
  'iris-look-down',
  'iris-look-diag-ul',
  'iris-look-diag-ur',
  'iris-look-diag-dl',
  'iris-look-diag-dr',
  'iris-yaw-10',
  'iris-yaw-neg10',
  'iris-pitch-8',
  'iris-far-same',
  'iris-head-yaw-with-gaze',
];

const HEAD_NEUTRAL: readonly LiveActIrisGazeFixtureId[] = [
  'iris-head-yaw-neutral-eyes',
  'iris-head-pitch-neutral-eyes',
  'iris-head-roll-neutral-eyes',
  'iris-head-combined-neutral-eyes',
];

/**
 * Run A/B suite: iris sphere solve vs fair planar→V1 mapper on same fixtures.
 */
export function runIrisGazeAbBenchmark(): IrisGazeAbReportV1 {
  const irisErrors: number[] = [];
  const blendErrors: number[] = [];
  const irisNeutral: number[] = [];
  const blendNeutral: number[] = [];
  const iris2dTargets: { x: number; y: number }[] = [];
  const iris2dOutputs: { x: number; y: number }[] = [];
  const blend2dTargets: { x: number; y: number }[] = [];
  const blend2dOutputs: { x: number; y: number }[] = [];
  let headRelativeMaxAbs = 0;
  let binocularFarDisagreementDeg: number | null = null;
  let yaw10AbsErrorDeg: number | null = null;
  let yawNeg10AbsErrorDeg: number | null = null;
  let pitch8AbsErrorDeg: number | null = null;

  for (const id of DIRECTIONAL) {
    const { geometry, truth } = buildIrisGazeFixture(id);
    const iris = solveIrisGaze({ geometry, sequence: 1, timestampMs: 0 });
    const blend = fairBlendshapeGazeFromGeometry(geometry);

    if (
      iris.left.available &&
      iris.left.yawDeg !== null &&
      iris.left.pitchDeg !== null &&
      iris.left.x !== null &&
      iris.left.y !== null
    ) {
      irisErrors.push(
        angularErrorFromYawPitch(
          truth.leftYawDeg,
          truth.leftPitchDeg,
          iris.left.yawDeg,
          iris.left.pitchDeg,
        ),
      );
      iris2dTargets.push({ x: truth.leftX, y: truth.leftY });
      iris2dOutputs.push({ x: iris.left.x, y: iris.left.y });
      if (id === 'iris-neutral') irisNeutral.push(iris.left.x, iris.left.y);
      if (id === 'iris-yaw-10') {
        yaw10AbsErrorDeg = Math.abs(iris.left.yawDeg - 10);
      }
      if (id === 'iris-yaw-neg10') {
        yawNeg10AbsErrorDeg = Math.abs(iris.left.yawDeg - -10);
      }
      if (id === 'iris-pitch-8') {
        pitch8AbsErrorDeg = Math.abs(iris.left.pitchDeg - 8);
      }
    }
    if (
      iris.right.available &&
      iris.right.yawDeg !== null &&
      iris.right.pitchDeg !== null &&
      iris.right.x !== null &&
      iris.right.y !== null
    ) {
      irisErrors.push(
        angularErrorFromYawPitch(
          truth.rightYawDeg,
          truth.rightPitchDeg,
          iris.right.yawDeg,
          iris.right.pitchDeg,
        ),
      );
      iris2dTargets.push({ x: truth.rightX, y: truth.rightY });
      iris2dOutputs.push({ x: iris.right.x, y: iris.right.y });
      if (id === 'iris-neutral') irisNeutral.push(iris.right.x, iris.right.y);
    }

    const bL = normalizedGazeToYawPitch(blend.eyeLeftX, blend.eyeLeftY);
    const bR = normalizedGazeToYawPitch(blend.eyeRightX, blend.eyeRightY);
    blendErrors.push(
      angularErrorFromYawPitch(
        truth.leftYawDeg,
        truth.leftPitchDeg,
        bL.yawDeg,
        bL.pitchDeg,
      ),
    );
    blendErrors.push(
      angularErrorFromYawPitch(
        truth.rightYawDeg,
        truth.rightPitchDeg,
        bR.yawDeg,
        bR.pitchDeg,
      ),
    );
    blend2dTargets.push({ x: truth.leftX, y: truth.leftY });
    blend2dOutputs.push({ x: blend.eyeLeftX, y: blend.eyeLeftY });
    blend2dTargets.push({ x: truth.rightX, y: truth.rightY });
    blend2dOutputs.push({ x: blend.eyeRightX, y: blend.eyeRightY });
    if (id === 'iris-neutral') {
      blendNeutral.push(
        blend.eyeLeftX,
        blend.eyeLeftY,
        blend.eyeRightX,
        blend.eyeRightY,
      );
    }

    if (id === 'iris-far-same' && iris.binocularYawDisagreementDeg !== null) {
      binocularFarDisagreementDeg = iris.binocularYawDisagreementDeg;
    }
  }

  for (const id of HEAD_NEUTRAL) {
    const { geometry } = buildIrisGazeFixture(id);
    const iris = solveIrisGaze({ geometry, sequence: 2, timestampMs: 0 });
    if (iris.left.available && iris.left.x !== null && iris.left.y !== null) {
      headRelativeMaxAbs = Math.max(
        headRelativeMaxAbs,
        Math.abs(iris.left.x),
        Math.abs(iris.left.y),
      );
      irisErrors.push(
        angularErrorFromYawPitch(0, 0, iris.left.yawDeg ?? 0, iris.left.pitchDeg ?? 0),
      );
    }
    if (iris.right.available && iris.right.x !== null && iris.right.y !== null) {
      headRelativeMaxAbs = Math.max(
        headRelativeMaxAbs,
        Math.abs(iris.right.x),
        Math.abs(iris.right.y),
      );
      irisErrors.push(
        angularErrorFromYawPitch(0, 0, iris.right.yawDeg ?? 0, iris.right.pitchDeg ?? 0),
      );
    }
    const blend = fairBlendshapeGazeFromGeometry(geometry);
    const bL = normalizedGazeToYawPitch(blend.eyeLeftX, blend.eyeLeftY);
    const bR = normalizedGazeToYawPitch(blend.eyeRightX, blend.eyeRightY);
    blendErrors.push(angularErrorFromYawPitch(0, 0, bL.yawDeg, bL.pitchDeg));
    blendErrors.push(angularErrorFromYawPitch(0, 0, bR.yawDeg, bR.pitchDeg));
  }

  const iris2dErrors = iris2dTargets.map((t, i) => {
    const o = iris2dOutputs[i]!;
    return fidelityGazeAngularErrorDeg(t.x, t.y, o.x, o.y);
  });
  const blend2dErrors = blend2dTargets.map((t, i) => {
    const o = blend2dOutputs[i]!;
    return fidelityGazeAngularErrorDeg(t.x, t.y, o.x, o.y);
  });

  const iris = pathErrors('iris', irisErrors, irisNeutral, iris2dErrors);
  const blendshape = pathErrors('blendshape', blendErrors, blendNeutral, blend2dErrors);

  const medianImprovementDeg =
    iris.medianDeg !== null && blendshape.medianDeg !== null
      ? blendshape.medianDeg - iris.medianDeg
      : null;
  const p95ImprovementDeg =
    iris.p95Deg !== null && blendshape.p95Deg !== null
      ? blendshape.p95Deg - iris.p95Deg
      : null;

  const irisBeatsBlendshape =
    iris.medianDeg !== null &&
    blendshape.medianDeg !== null &&
    medianImprovementDeg !== null &&
    medianImprovementDeg >= LIVEACT_IRIS_AB_MIN_MEDIAN_IMPROVEMENT_DEG &&
    (iris.p95Deg === null ||
      blendshape.p95Deg === null ||
      iris.p95Deg <= blendshape.p95Deg + 1e-9);

  return {
    contractVersion: 'SagaDriveLiveActIrisGazeAbReportV1',
    fixtureVersion: 'iris-sphere-v1',
    fixtureIds: [...LIVEACT_IRIS_GAZE_FIXTURE_IDS],
    iris,
    blendshape,
    irisBeatsBlendshape,
    medianImprovementDeg,
    p95ImprovementDeg,
    headRelativeMaxAbs,
    binocularFarDisagreementDeg,
    golden: {
      yaw10AbsErrorDeg,
      yawNeg10AbsErrorDeg,
      pitch8AbsErrorDeg,
    },
    method: {
      iris: 'eyeball-sphere-solve',
      blendshape: 'planar-aperture→v1-eyelook-mapper',
      angularError: 'acos(dot) 3D unit gaze directions',
      minMedianImprovementDeg: LIVEACT_IRIS_AB_MIN_MEDIAN_IMPROVEMENT_DEG,
    },
  };
}
