/**
 * liveact-iris-gaze-fixtures — deterministic synthetic iris/eye geometry (#446).
 * Location: src/domains/character/liveact/liveact-iris-gaze-fixtures.ts
 *
 * Provider-neutral geometry only. No biometric capture. Ground-truth gaze known.
 */

import {
  LIVEACT_IRIS_EYE_GEOMETRY_CONTRACT,
  type IrisBinocularGeometryV1,
  type IrisEyeGeometryV1,
  type IrisPoint3,
} from './liveact-iris-gaze-contract';
import { transformDenseSemanticGeometry } from './liveact-dense-face-features-normalize';
import { irisGeometryToDenseSemanticGeometry } from './liveact-iris-gaze-solve';
import {
  LIVEACT_DENSE_SEMANTIC_GEOMETRY_CONTRACT,
  type DenseSemanticGeometryV1,
  type DenseSemanticPoint3,
} from './liveact-dense-face-features-contract';

export const LIVEACT_IRIS_GAZE_FIXTURE_IDS = [
  'iris-neutral',
  'iris-look-left',
  'iris-look-right',
  'iris-look-up',
  'iris-look-down',
  'iris-far-convergent',
  'iris-head-yaw-neutral-eyes',
  'iris-head-pitch-neutral-eyes',
  'iris-head-roll-neutral-eyes',
  'iris-missing-contour',
] as const;

export type LiveActIrisGazeFixtureId = (typeof LIVEACT_IRIS_GAZE_FIXTURE_IDS)[number];

export interface IrisGazeGroundTruth {
  readonly leftX: number;
  readonly leftY: number;
  readonly rightX: number;
  readonly rightY: number;
}

function pt(x: number, y: number, z: number): IrisPoint3 {
  return { available: true, x, y, z };
}

function missing(): IrisPoint3 {
  return { available: false, x: Number.NaN, y: Number.NaN, z: Number.NaN };
}

function makeEye(input: {
  inner: IrisPoint3;
  outer: IrisPoint3;
  upper: IrisPoint3;
  lower: IrisPoint3;
  /** Iris offset in face-ish space from eye center (before placing). */
  irisOffsetX: number;
  irisOffsetY: number;
  irisOffsetZ?: number;
}): IrisEyeGeometryV1 {
  const cx = (input.inner.x + input.outer.x + input.upper.x + input.lower.x) / 4;
  const cy = (input.inner.y + input.outer.y + input.upper.y + input.lower.y) / 4;
  const cz = (input.inner.z + input.outer.z + input.upper.z + input.lower.z) / 4;
  const irisCenter = pt(
    cx + input.irisOffsetX,
    cy + input.irisOffsetY,
    cz + (input.irisOffsetZ ?? 0.02),
  );
  return {
    innerCorner: input.inner,
    outerCorner: input.outer,
    upperLid: input.upper,
    lowerLid: input.lower,
    irisCenter,
    irisContourAvailableCount: 4,
  };
}

/** Canonical upright face — matches #445 synthetic layout. */
export function buildIrisNeutralGeometry(
  offsets: { leftX?: number; leftY?: number; rightX?: number; rightY?: number } = {},
): IrisBinocularGeometryV1 {
  const lOx = offsets.leftX ?? 0;
  const lOy = offsets.leftY ?? 0;
  const rOx = offsets.rightX ?? 0;
  const rOy = offsets.rightY ?? 0;

  // Half eye width ~0.15 → aperture nx ≈ offset/0.15
  const left = makeEye({
    inner: pt(0.25, 0.2, 0.08),
    outer: pt(0.55, 0.2, 0.05),
    upper: pt(0.4, 0.28, 0.06),
    lower: pt(0.4, 0.12, 0.06),
    irisOffsetX: lOx * 0.15,
    irisOffsetY: lOy * 0.08,
  });
  const right = makeEye({
    inner: pt(-0.25, 0.2, 0.08),
    outer: pt(-0.55, 0.2, 0.05),
    upper: pt(-0.4, 0.28, 0.06),
    lower: pt(-0.4, 0.12, 0.06),
    irisOffsetX: rOx * 0.15,
    irisOffsetY: rOy * 0.08,
  });

  return {
    contractVersion: LIVEACT_IRIS_EYE_GEOMETRY_CONTRACT,
    left,
    right,
    forehead: pt(0, 0.65, 0.02),
    noseBridge: pt(0, 0.1, 0.18),
    noseTip: pt(0, -0.05, 0.28),
    faceConfidence: 1,
  };
}

/**
 * Approximate V1 blendshape gaze from true normalized gaze with systematic degradation.
 * Models head-leakage + gain compression typical of blendshape-only proxies.
 */
export function approximateBlendshapeGazeFromTruth(
  truth: IrisGazeGroundTruth,
  headLeak: { yaw?: number; pitch?: number; roll?: number } = {},
): {
  eyeLeftX: number;
  eyeLeftY: number;
  eyeRightX: number;
  eyeRightY: number;
} {
  const leakX = (headLeak.yaw ?? 0) * 0.35 + (headLeak.roll ?? 0) * 0.15;
  const leakY = (headLeak.pitch ?? 0) * 0.35;
  const gain = 0.72;
  return {
    eyeLeftX: clamp1(truth.leftX * gain + leakX),
    eyeLeftY: clamp1(truth.leftY * gain + leakY),
    eyeRightX: clamp1(truth.rightX * gain + leakX),
    eyeRightY: clamp1(truth.rightY * gain + leakY),
  };
}

function clamp1(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n <= -1) return -1;
  if (n >= 1) return 1;
  return n;
}

export function buildIrisGazeFixture(id: LiveActIrisGazeFixtureId): {
  geometry: IrisBinocularGeometryV1;
  truth: IrisGazeGroundTruth;
  headLeak: { yaw: number; pitch: number; roll: number };
} {
  switch (id) {
    case 'iris-neutral':
      return {
        geometry: buildIrisNeutralGeometry(),
        truth: { leftX: 0, leftY: 0, rightX: 0, rightY: 0 },
        headLeak: { yaw: 0, pitch: 0, roll: 0 },
      };
    case 'iris-look-left':
      return {
        geometry: buildIrisNeutralGeometry({ leftX: 0.55, rightX: 0.55 }),
        truth: { leftX: 0.55, leftY: 0, rightX: 0.55, rightY: 0 },
        headLeak: { yaw: 0, pitch: 0, roll: 0 },
      };
    case 'iris-look-right':
      return {
        geometry: buildIrisNeutralGeometry({ leftX: -0.55, rightX: -0.55 }),
        truth: { leftX: -0.55, leftY: 0, rightX: -0.55, rightY: 0 },
        headLeak: { yaw: 0, pitch: 0, roll: 0 },
      };
    case 'iris-look-up':
      return {
        geometry: buildIrisNeutralGeometry({ leftY: 0.5, rightY: 0.5 }),
        truth: { leftX: 0, leftY: 0.5, rightX: 0, rightY: 0.5 },
        headLeak: { yaw: 0, pitch: 0, roll: 0 },
      };
    case 'iris-look-down':
      return {
        geometry: buildIrisNeutralGeometry({ leftY: -0.5, rightY: -0.5 }),
        truth: { leftX: 0, leftY: -0.5, rightX: 0, rightY: -0.5 },
        headLeak: { yaw: 0, pitch: 0, roll: 0 },
      };
    case 'iris-far-convergent':
      return {
        geometry: buildIrisNeutralGeometry({ leftX: 0.35, rightX: 0.3 }),
        truth: { leftX: 0.35, leftY: 0, rightX: 0.3, rightY: 0 },
        headLeak: { yaw: 0, pitch: 0, roll: 0 },
      };
    case 'iris-head-yaw-neutral-eyes': {
      const base = buildIrisNeutralGeometry();
      return {
        geometry: applyRigidHeadToIrisGeometry(base, { yawRad: 0.4 }),
        truth: { leftX: 0, leftY: 0, rightX: 0, rightY: 0 },
        headLeak: { yaw: 0.4, pitch: 0, roll: 0 },
      };
    }
    case 'iris-head-pitch-neutral-eyes': {
      const base = buildIrisNeutralGeometry();
      return {
        geometry: applyRigidHeadToIrisGeometry(base, { pitchRad: 0.3 }),
        truth: { leftX: 0, leftY: 0, rightX: 0, rightY: 0 },
        headLeak: { yaw: 0, pitch: 0.3, roll: 0 },
      };
    }
    case 'iris-head-roll-neutral-eyes': {
      const base = buildIrisNeutralGeometry();
      return {
        geometry: applyRigidHeadToIrisGeometry(base, { rollRad: 0.35 }),
        truth: { leftX: 0, leftY: 0, rightX: 0, rightY: 0 },
        headLeak: { yaw: 0, pitch: 0, roll: 0.35 },
      };
    }
    case 'iris-missing-contour': {
      const g = buildIrisNeutralGeometry({ leftX: 0.4, rightX: 0.4 });
      return {
        geometry: {
          ...g,
          left: {
            ...g.left,
            irisCenter: missing(),
            irisContourAvailableCount: 0,
          },
        },
        truth: { leftX: 0.4, leftY: 0, rightX: 0.4, rightY: 0 },
        headLeak: { yaw: 0, pitch: 0, roll: 0 },
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
  // Also carry iris centers through dense via custom transform on all iris points
  const withIris = attachIrisCentersToDense(dense, geometry);
  const transformed = transformDenseSemanticGeometry(withIris, transform);
  return denseTransformedToIrisGeometry(transformed, geometry);
}

function attachIrisCentersToDense(
  dense: DenseSemanticGeometryV1,
  geometry: IrisBinocularGeometryV1,
): DenseSemanticGeometryV1 {
  // Reuse unused brow mid slots as carriers for iris centers during rigid transform
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
