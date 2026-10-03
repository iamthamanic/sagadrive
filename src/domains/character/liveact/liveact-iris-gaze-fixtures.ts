/**
 * liveact-iris-gaze-fixtures — deterministic synthetic eye-sphere geometry (#446).
 * Location: src/domains/character/liveact/liveact-iris-gaze-fixtures.ts
 *
 * Provider-neutral geometry only. Ground-truth yaw/pitch known from sphere placement.
 * Fair V1 baseline = planar aperture → V1 eyeLook mapper (no gain sabotage).
 */

import {
  LIVEACT_IRIS_EYE_GEOMETRY_CONTRACT,
  yawPitchToNormalizedGaze,
  type IrisBinocularGeometryV1,
  type IrisEyeGeometryV1,
  type IrisPoint3,
} from './liveact-iris-gaze-contract';
import { transformDenseSemanticGeometry } from './liveact-dense-face-features-normalize';
import {
  irisGeometryToDenseSemanticGeometry,
  solvePlanarApertureGaze,
} from './liveact-iris-gaze-solve';
import {
  LIVEACT_DENSE_SEMANTIC_GEOMETRY_CONTRACT,
  type DenseSemanticGeometryV1,
  type DenseSemanticPoint3,
} from './liveact-dense-face-features-contract';
import {
  buildEyeSphereFrameFromCorners,
  gazeVec3,
  irisCenterOnSphere,
} from './liveact-iris-gaze-sphere';
import {
  mapMediaPipeFaceToLiveActSample as mapFaceBlendshapesToLiveActSample,
  type LiveActMediaPipeCategory as LiveActBlendshapeCategory,
} from './liveact-mediapipe-sample';

export const LIVEACT_IRIS_GAZE_FIXTURE_IDS = [
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
  'iris-convergence',
  'iris-head-yaw-neutral-eyes',
  'iris-head-pitch-neutral-eyes',
  'iris-head-roll-neutral-eyes',
  'iris-head-combined-neutral-eyes',
  'iris-head-yaw-with-gaze',
  'iris-missing-contour',
  'iris-partial-contour',
] as const;

export type LiveActIrisGazeFixtureId = (typeof LIVEACT_IRIS_GAZE_FIXTURE_IDS)[number];

export interface IrisGazeGroundTruth {
  /** Normalized −1..1 (LiveAct eye channels). */
  readonly leftX: number;
  readonly leftY: number;
  readonly rightX: number;
  readonly rightY: number;
  /** Ground-truth degrees (sphere). */
  readonly leftYawDeg: number;
  readonly leftPitchDeg: number;
  readonly rightYawDeg: number;
  readonly rightPitchDeg: number;
}

function pt(x: number, y: number, z: number): IrisPoint3 {
  return { available: true, x, y, z };
}

function missing(): IrisPoint3 {
  return { available: false, x: Number.NaN, y: Number.NaN, z: Number.NaN };
}

function makeEyeCorners(side: 'left' | 'right'): {
  inner: IrisPoint3;
  outer: IrisPoint3;
  upper: IrisPoint3;
  lower: IrisPoint3;
} {
  if (side === 'left') {
    return {
      inner: pt(0.25, 0.2, 0.08),
      outer: pt(0.55, 0.2, 0.05),
      upper: pt(0.4, 0.28, 0.06),
      lower: pt(0.4, 0.12, 0.06),
    };
  }
  return {
    inner: pt(-0.25, 0.2, 0.08),
    outer: pt(-0.55, 0.2, 0.05),
    upper: pt(-0.4, 0.28, 0.06),
    lower: pt(-0.4, 0.12, 0.06),
  };
}

function placeIrisOnSphereEye(
  side: 'left' | 'right',
  yawDeg: number,
  pitchDeg: number,
): IrisEyeGeometryV1 {
  const corners = makeEyeCorners(side);
  const frame = buildEyeSphereFrameFromCorners({
    inner: gazeVec3(corners.inner.x, corners.inner.y, corners.inner.z),
    outer: gazeVec3(corners.outer.x, corners.outer.y, corners.outer.z),
    upper: gazeVec3(corners.upper.x, corners.upper.y, corners.upper.z),
    lower: gazeVec3(corners.lower.x, corners.lower.y, corners.lower.z),
    anatomicalLeft: side === 'left',
  });
  if (!frame) {
    throw new Error(`iris fixture: degenerate ${side} eye frame`);
  }
  const iris = irisCenterOnSphere(frame, yawDeg, pitchDeg);
  return {
    innerCorner: corners.inner,
    outerCorner: corners.outer,
    upperLid: corners.upper,
    lowerLid: corners.lower,
    irisCenter: pt(iris.x, iris.y, iris.z),
    irisContourAvailableCount: 4,
  };
}

function truthFromDeg(
  leftYaw: number,
  leftPitch: number,
  rightYaw: number,
  rightPitch: number,
): IrisGazeGroundTruth {
  const l = yawPitchToNormalizedGaze(leftYaw, leftPitch);
  const r = yawPitchToNormalizedGaze(rightYaw, rightPitch);
  return {
    leftX: l.x,
    leftY: l.y,
    rightX: r.x,
    rightY: r.y,
    leftYawDeg: leftYaw,
    leftPitchDeg: leftPitch,
    rightYawDeg: rightYaw,
    rightPitchDeg: rightPitch,
  };
}

/** Canonical upright face with per-eye sphere iris placement. */
export function buildIrisNeutralGeometry(
  angles: {
    leftYawDeg?: number;
    leftPitchDeg?: number;
    rightYawDeg?: number;
    rightPitchDeg?: number;
  } = {},
): IrisBinocularGeometryV1 {
  const ly = angles.leftYawDeg ?? 0;
  const lp = angles.leftPitchDeg ?? 0;
  const ry = angles.rightYawDeg ?? 0;
  const rp = angles.rightPitchDeg ?? 0;
  return {
    contractVersion: LIVEACT_IRIS_EYE_GEOMETRY_CONTRACT,
    left: placeIrisOnSphereEye('left', ly, lp),
    right: placeIrisOnSphereEye('right', ry, rp),
    forehead: pt(0, 0.65, 0.02),
    noseBridge: pt(0, 0.1, 0.18),
    noseTip: pt(0, -0.05, 0.28),
    faceConfidence: 1,
  };
}

/**
 * Encode normalized gaze as exclusive eyeLook* categories, then run
 * the authoritative V1 mapper (transparent inverse of the source mapper).
 */
export function encodeNormalizedGazeAsEyeLookCategories(input: {
  eyeLeftX: number;
  eyeLeftY: number;
  eyeRightX: number;
  eyeRightY: number;
}): LiveActBlendshapeCategory[] {
  const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
  const lx = input.eyeLeftX;
  const ly = input.eyeLeftY;
  const rx = input.eyeRightX;
  const ry = input.eyeRightY;
  return [
    { categoryName: 'eyeLookOutLeft', score: clamp01(lx) },
    { categoryName: 'eyeLookInLeft', score: clamp01(-lx) },
    { categoryName: 'eyeLookUpLeft', score: clamp01(ly) },
    { categoryName: 'eyeLookDownLeft', score: clamp01(-ly) },
    // V1: eyeRightX = in - out
    { categoryName: 'eyeLookInRight', score: clamp01(rx) },
    { categoryName: 'eyeLookOutRight', score: clamp01(-rx) },
    { categoryName: 'eyeLookUpRight', score: clamp01(ry) },
    { categoryName: 'eyeLookDownRight', score: clamp01(-ry) },
  ];
}

/**
 * Fair V1 blendshape prediction from the same synthetic geometry:
 * planar aperture read → eyeLook encoding → authoritative V1 source mapper.
 * No artificial gain/leak sabotage.
 */
export function fairBlendshapeGazeFromGeometry(geometry: IrisBinocularGeometryV1): {
  eyeLeftX: number;
  eyeLeftY: number;
  eyeRightX: number;
  eyeRightY: number;
} {
  const planar = solvePlanarApertureGaze({ geometry });
  const categories = encodeNormalizedGazeAsEyeLookCategories({
    eyeLeftX: planar.eyeLeftX,
    eyeLeftY: planar.eyeLeftY,
    eyeRightX: planar.eyeRightX,
    eyeRightY: planar.eyeRightY,
  });
  const sample = mapFaceBlendshapesToLiveActSample({
    categories,
    enableHeadPose: false,
    matrix: null,
    faceIndex: 0,
    faceCount: 1,
  });
  return {
    eyeLeftX: sample.eyeLeftX,
    eyeLeftY: sample.eyeLeftY,
    eyeRightX: sample.eyeRightX,
    eyeRightY: sample.eyeRightY,
  };
}

/** Honest truth→V1 mapper path (exact when categories encode truth). No sabotage. */
export function approximateBlendshapeGazeFromTruth(
  truth: IrisGazeGroundTruth,
  _headLeak: { yaw?: number; pitch?: number; roll?: number } = {},
): {
  eyeLeftX: number;
  eyeLeftY: number;
  eyeRightX: number;
  eyeRightY: number;
} {
  void _headLeak;
  const categories = encodeNormalizedGazeAsEyeLookCategories({
    eyeLeftX: truth.leftX,
    eyeLeftY: truth.leftY,
    eyeRightX: truth.rightX,
    eyeRightY: truth.rightY,
  });
  const sample = mapFaceBlendshapesToLiveActSample({
    categories,
    enableHeadPose: false,
    matrix: null,
    faceIndex: 0,
    faceCount: 1,
  });
  return {
    eyeLeftX: sample.eyeLeftX,
    eyeLeftY: sample.eyeLeftY,
    eyeRightX: sample.eyeRightX,
    eyeRightY: sample.eyeRightY,
  };
}

export function buildIrisGazeFixture(id: LiveActIrisGazeFixtureId): {
  geometry: IrisBinocularGeometryV1;
  truth: IrisGazeGroundTruth;
  headLeak: { yaw: number; pitch: number; roll: number };
} {
  const mk = (
    ly: number,
    lp: number,
    ry: number,
    rp: number,
    head: { yaw: number; pitch: number; roll: number } = {
      yaw: 0,
      pitch: 0,
      roll: 0,
    },
    transform?: { yawRad?: number; pitchRad?: number; rollRad?: number },
  ) => {
    let geometry = buildIrisNeutralGeometry({
      leftYawDeg: ly,
      leftPitchDeg: lp,
      rightYawDeg: ry,
      rightPitchDeg: rp,
    });
    if (transform) {
      geometry = applyRigidHeadToIrisGeometry(geometry, transform);
    }
    return {
      geometry,
      truth: truthFromDeg(ly, lp, ry, rp),
      headLeak: head,
    };
  };

  switch (id) {
    case 'iris-neutral':
      return mk(0, 0, 0, 0);
    case 'iris-look-left':
      return mk(20, 0, 20, 0);
    case 'iris-look-right':
      return mk(-20, 0, -20, 0);
    case 'iris-look-up':
      return mk(0, 15, 0, 15);
    case 'iris-look-down':
      return mk(0, -15, 0, -15);
    case 'iris-look-diag-ul':
      return mk(18, 12, 18, 12);
    case 'iris-look-diag-ur':
      return mk(-18, 12, -18, 12);
    case 'iris-look-diag-dl':
      return mk(18, -12, 18, -12);
    case 'iris-look-diag-dr':
      return mk(-18, -12, -18, -12);
    case 'iris-yaw-10':
      return mk(10, 0, 10, 0);
    case 'iris-yaw-neg10':
      return mk(-10, 0, -10, 0);
    case 'iris-pitch-8':
      return mk(0, 8, 0, 8);
    case 'iris-far-same':
      return mk(12, 0, 12, 0);
    case 'iris-convergence':
      // Near look: left toward nose (−), right toward nose (+)
      return mk(-8, 0, 8, 0);
    case 'iris-head-yaw-neutral-eyes':
      return mk(0, 0, 0, 0, { yaw: 0.4, pitch: 0, roll: 0 }, { yawRad: 0.4 });
    case 'iris-head-pitch-neutral-eyes':
      return mk(0, 0, 0, 0, { yaw: 0, pitch: 0.3, roll: 0 }, { pitchRad: 0.3 });
    case 'iris-head-roll-neutral-eyes':
      return mk(0, 0, 0, 0, { yaw: 0, pitch: 0, roll: 0.35 }, { rollRad: 0.35 });
    case 'iris-head-combined-neutral-eyes':
      return mk(
        0,
        0,
        0,
        0,
        { yaw: 0.25, pitch: 0.2, roll: 0.15 },
        { yawRad: 0.25, pitchRad: 0.2, rollRad: 0.15 },
      );
    case 'iris-head-yaw-with-gaze':
      return mk(15, 0, 15, 0, { yaw: 0.35, pitch: 0, roll: 0 }, { yawRad: 0.35 });
    case 'iris-missing-contour': {
      const base = mk(15, 0, 15, 0);
      return {
        ...base,
        geometry: {
          ...base.geometry,
          left: {
            ...base.geometry.left,
            irisCenter: missing(),
            irisContourAvailableCount: 0,
          },
        },
      };
    }
    case 'iris-partial-contour': {
      const base = mk(15, 0, 15, 0);
      return {
        ...base,
        geometry: {
          ...base.geometry,
          left: {
            ...base.geometry.left,
            irisContourAvailableCount: 2,
          },
        },
      };
    }
    default: {
      const _e: never = id;
      return _e;
    }
  }
}

function applyRigidHeadToIrisGeometry(
  geometry: IrisBinocularGeometryV1,
  transform: { yawRad?: number; pitchRad?: number; rollRad?: number },
): IrisBinocularGeometryV1 {
  const dense = irisGeometryToDenseSemanticGeometry(geometry);
  const withIris = attachIrisCentersToDense(dense, geometry);
  const transformed = transformDenseSemanticGeometry(withIris, transform);
  return denseTransformedToIrisGeometry(transformed, geometry);
}

function attachIrisCentersToDense(
  dense: DenseSemanticGeometryV1,
  geometry: IrisBinocularGeometryV1,
): DenseSemanticGeometryV1 {
  const points = { ...dense.points };
  points.browMidLeft = toDense(geometry.left.irisCenter);
  points.browMidRight = toDense(geometry.right.irisCenter);
  return {
    contractVersion: LIVEACT_DENSE_SEMANTIC_GEOMETRY_CONTRACT,
    points,
    faceConfidence: dense.faceConfidence,
  };
}

function toDense(p: IrisPoint3): DenseSemanticPoint3 {
  return { available: p.available, x: p.x, y: p.y, z: p.z };
}

function fromDense(p: DenseSemanticPoint3): IrisPoint3 {
  return { available: p.available, x: p.x, y: p.y, z: p.z };
}

function denseTransformedToIrisGeometry(
  dense: DenseSemanticGeometryV1,
  template: IrisBinocularGeometryV1,
): IrisBinocularGeometryV1 {
  return {
    contractVersion: LIVEACT_IRIS_EYE_GEOMETRY_CONTRACT,
    left: {
      innerCorner: fromDense(dense.points.eyeInnerLeft),
      outerCorner: fromDense(dense.points.eyeOuterLeft),
      upperLid: fromDense(dense.points.eyeUpperLeft),
      lowerLid: fromDense(dense.points.eyeLowerLeft),
      irisCenter: fromDense(dense.points.browMidLeft),
      irisContourAvailableCount: template.left.irisContourAvailableCount,
    },
    right: {
      innerCorner: fromDense(dense.points.eyeInnerRight),
      outerCorner: fromDense(dense.points.eyeOuterRight),
      upperLid: fromDense(dense.points.eyeUpperRight),
      lowerLid: fromDense(dense.points.eyeLowerRight),
      irisCenter: fromDense(dense.points.browMidRight),
      irisContourAvailableCount: template.right.irisContourAvailableCount,
    },
    forehead: fromDense(dense.points.forehead),
    noseBridge: fromDense(dense.points.noseBridge),
    noseTip: fromDense(dense.points.noseTip),
    faceConfidence: dense.faceConfidence,
  };
}
