/**
 * liveact-iris-gaze-solve — head-local per-eye iris gaze solver (#446).
 * Location: src/domains/character/liveact/liveact-iris-gaze-solve.ts
 *
 * Pure domain. Reuses #445 face-local frame. Eyeball-sphere geometric solve.
 * No provider landmark indices. No eyelid-follow. No temporal filter.
 * Minimal neutral offsets only (not #449).
 */

import {
  DENSE_SEMANTIC_POINT_IDS,
  LIVEACT_DENSE_SEMANTIC_GEOMETRY_CONTRACT,
  type DenseSemanticGeometryV1,
  type DenseSemanticPoint3,
  type DenseSemanticPointId,
} from './liveact-dense-face-features-contract';
import {
  buildDenseFaceLocalFrame,
  toDenseLocalPoint,
  type DenseFaceLocalFrameV1,
  type Vec3,
} from './liveact-dense-face-features-normalize';
import {
  LIVEACT_IRIS_GAZE_CONTRACT,
  LIVEACT_IRIS_GAZE_MAX_PITCH_DEG,
  LIVEACT_IRIS_GAZE_MAX_YAW_DEG,
  LIVEACT_IRIS_GAZE_MIN_CONFIDENCE,
  LIVEACT_IRIS_GAZE_NEUTRAL_ZERO,
  unavailableIrisEyeGaze,
  yawPitchToNormalizedGaze,
  type IrisBinocularGeometryV1,
  type IrisEyeGeometryV1,
  type IrisPoint3,
  type LiveActIrisEyeGazeV1,
  type LiveActIrisGazeFallbackState,
  type LiveActIrisGazeNeutralOffsetV1,
  type LiveActIrisGazeV1,
} from './liveact-iris-gaze-contract';
import {
  buildEyeSphereFrameFromCorners,
  gazeVec3,
  planarApertureGazeFromIris,
  solveGazeFromIrisOnSphere,
  type EyeSphereFrame,
} from './liveact-iris-gaze-sphere';

function asVec(p: IrisPoint3): Vec3 | null {
  if (!p.available) return null;
  if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.z)) return null;
  return { x: p.x, y: p.y, z: p.z };
}

function toDensePoint(p: IrisPoint3): DenseSemanticPoint3 {
  return { available: p.available, x: p.x, y: p.y, z: p.z };
}

/** Build #445 semantic geometry subset for face-local frame reuse. */
export function irisGeometryToDenseSemanticGeometry(
  geometry: IrisBinocularGeometryV1,
): DenseSemanticGeometryV1 {
  const missing: DenseSemanticPoint3 = {
    available: false,
    x: Number.NaN,
    y: Number.NaN,
    z: Number.NaN,
  };
  const points = {} as Record<DenseSemanticPointId, DenseSemanticPoint3>;
  for (const id of DENSE_SEMANTIC_POINT_IDS) points[id] = missing;

  points.eyeOuterLeft = toDensePoint(geometry.left.outerCorner);
  points.eyeInnerLeft = toDensePoint(geometry.left.innerCorner);
  points.eyeUpperLeft = toDensePoint(geometry.left.upperLid);
  points.eyeLowerLeft = toDensePoint(geometry.left.lowerLid);
  points.eyeOuterRight = toDensePoint(geometry.right.outerCorner);
  points.eyeInnerRight = toDensePoint(geometry.right.innerCorner);
  points.eyeUpperRight = toDensePoint(geometry.right.upperLid);
  points.eyeLowerRight = toDensePoint(geometry.right.lowerLid);
  points.forehead = toDensePoint(geometry.forehead);
  points.noseBridge = toDensePoint(geometry.noseBridge);
  points.noseTip = toDensePoint(geometry.noseTip);

  return {
    contractVersion: LIVEACT_DENSE_SEMANTIC_GEOMETRY_CONTRACT,
    points,
    faceConfidence: geometry.faceConfidence,
  };
}

function faceLocalCorners(
  eye: IrisEyeGeometryV1,
  faceFrame: DenseFaceLocalFrameV1,
): {
  inner: Vec3;
  outer: Vec3;
  upper: Vec3;
  lower: Vec3;
  iris: Vec3;
} | null {
  const innerW = asVec(eye.innerCorner);
  const outerW = asVec(eye.outerCorner);
  const upperW = asVec(eye.upperLid);
  const lowerW = asVec(eye.lowerLid);
  const irisW = asVec(eye.irisCenter);
  if (!innerW || !outerW || !upperW || !lowerW || !irisW) return null;
  const inner = toDenseLocalPoint(innerW, faceFrame);
  const outer = toDenseLocalPoint(outerW, faceFrame);
  const upper = toDenseLocalPoint(upperW, faceFrame);
  const lower = toDenseLocalPoint(lowerW, faceFrame);
  const iris = toDenseLocalPoint(irisW, faceFrame);
  if (!inner || !outer || !upper || !lower || !iris) return null;
  return { inner, outer, upper, lower, iris };
}

function buildEyeSphere(
  eye: IrisEyeGeometryV1,
  faceFrame: DenseFaceLocalFrameV1,
  anatomicalLeft: boolean,
): { frame: EyeSphereFrame; iris: Vec3 } | null {
  const c = faceLocalCorners(eye, faceFrame);
  if (!c) return null;
  const frame = buildEyeSphereFrameFromCorners({
    inner: gazeVec3(c.inner.x, c.inner.y, c.inner.z),
    outer: gazeVec3(c.outer.x, c.outer.y, c.outer.z),
    upper: gazeVec3(c.upper.x, c.upper.y, c.upper.z),
    lower: gazeVec3(c.lower.x, c.lower.y, c.lower.z),
    anatomicalLeft,
  });
  if (!frame) return null;
  return { frame, iris: c.iris };
}

function solveOneEye(
  eye: IrisEyeGeometryV1,
  faceFrame: DenseFaceLocalFrameV1,
  anatomicalLeft: boolean,
  faceConf: number,
  neutralX: number,
  neutralY: number,
): LiveActIrisEyeGazeV1 {
  if (eye.irisContourAvailableCount < 4) {
    return unavailableIrisEyeGaze(faceConf * 0.2);
  }

  const built = buildEyeSphere(eye, faceFrame, anatomicalLeft);
  if (!built) return unavailableIrisEyeGaze(faceConf * 0.3);

  const solved = solveGazeFromIrisOnSphere(
    built.frame,
    gazeVec3(built.iris.x, built.iris.y, built.iris.z),
  );
  if (!solved) return unavailableIrisEyeGaze(faceConf * 0.3);

  // Plausible iris: reject extreme planar outliers (outside ~1.35 aperture)
  const planar = planarApertureGazeFromIris(
    built.frame,
    gazeVec3(built.iris.x, built.iris.y, built.iris.z),
  );
  if (!planar || Math.abs(planar.x) > 1.35 || Math.abs(planar.y) > 1.35) {
    return unavailableIrisEyeGaze(faceConf * 0.25);
  }

  let { x, y } = yawPitchToNormalizedGaze(solved.yawDeg, solved.pitchDeg);
  x = Math.min(1, Math.max(-1, x - neutralX));
  y = Math.min(1, Math.max(-1, y - neutralY));
  const outYaw = x * LIVEACT_IRIS_GAZE_MAX_YAW_DEG;
  const outPitch = y * LIVEACT_IRIS_GAZE_MAX_PITCH_DEG;

  const geomAvail = eye.irisContourAvailableCount / 4;
  const confidence = Math.min(
    1,
    Math.max(0, faceConf * geomAvail * (faceFrame.status === 'ok' ? 1 : 0.2)),
  );

  return {
    available: true,
    yawDeg: outYaw,
    pitchDeg: outPitch,
    x,
    y,
    confidence,
  };
}

/**
 * Solve head-local per-eye iris gaze from provider-neutral binocular geometry.
 */
export function solveIrisGaze(input: {
  geometry: IrisBinocularGeometryV1;
  sequence: number;
  timestampMs: number;
  neutral?: LiveActIrisGazeNeutralOffsetV1;
}): LiveActIrisGazeV1 {
  const neutral = input.neutral ?? LIVEACT_IRIS_GAZE_NEUTRAL_ZERO;
  const dense = irisGeometryToDenseSemanticGeometry(input.geometry);
  const faceFrame = buildDenseFaceLocalFrame(dense);
  const faceConf =
    typeof input.geometry.faceConfidence === 'number' &&
    Number.isFinite(input.geometry.faceConfidence)
      ? Math.min(1, Math.max(0, input.geometry.faceConfidence))
      : 0;

  if (faceFrame.status !== 'ok') {
    return {
      contractVersion: LIVEACT_IRIS_GAZE_CONTRACT,
      sequence: input.sequence,
      timestampMs: input.timestampMs,
      left: unavailableIrisEyeGaze(faceConf),
      right: unavailableIrisEyeGaze(faceConf),
      fallbackState: 'unavailable',
      binocularYawDisagreementDeg: null,
      binocularPitchDisagreementDeg: null,
      faceNormalizationOk: false,
    };
  }

  const left = solveOneEye(
    input.geometry.left,
    faceFrame,
    true,
    faceConf,
    neutral.leftX,
    neutral.leftY,
  );
  const right = solveOneEye(
    input.geometry.right,
    faceFrame,
    false,
    faceConf,
    neutral.rightX,
    neutral.rightY,
  );

  let binocularYawDisagreementDeg: number | null = null;
  let binocularPitchDisagreementDeg: number | null = null;
  if (
    left.available &&
    right.available &&
    left.yawDeg !== null &&
    right.yawDeg !== null &&
    left.pitchDeg !== null &&
    right.pitchDeg !== null
  ) {
    binocularYawDisagreementDeg = Math.abs(left.yawDeg - right.yawDeg);
    binocularPitchDisagreementDeg = Math.abs(left.pitchDeg - right.pitchDeg);
  }

  return {
    contractVersion: LIVEACT_IRIS_GAZE_CONTRACT,
    sequence: input.sequence,
    timestampMs: input.timestampMs,
    left,
    right,
    fallbackState: 'iris',
    binocularYawDisagreementDeg,
    binocularPitchDisagreementDeg,
    faceNormalizationOk: true,
  };
}

/**
 * Planar aperture gaze from same geometry (structural V1-like channel).
 * Used for fair A/B — not intentionally gain-degraded.
 */
export function solvePlanarApertureGaze(input: {
  geometry: IrisBinocularGeometryV1;
}): {
  eyeLeftX: number;
  eyeLeftY: number;
  eyeRightX: number;
  eyeRightY: number;
  leftAvailable: boolean;
  rightAvailable: boolean;
} {
  const dense = irisGeometryToDenseSemanticGeometry(input.geometry);
  const faceFrame = buildDenseFaceLocalFrame(dense);
  const zero = {
    eyeLeftX: 0,
    eyeLeftY: 0,
    eyeRightX: 0,
    eyeRightY: 0,
    leftAvailable: false,
    rightAvailable: false,
  };
  if (faceFrame.status !== 'ok') return zero;

  const leftBuilt = buildEyeSphere(input.geometry.left, faceFrame, true);
  const rightBuilt = buildEyeSphere(input.geometry.right, faceFrame, false);
  let eyeLeftX = 0;
  let eyeLeftY = 0;
  let eyeRightX = 0;
  let eyeRightY = 0;
  let leftAvailable = false;
  let rightAvailable = false;

  if (leftBuilt && input.geometry.left.irisContourAvailableCount >= 4) {
    const p = planarApertureGazeFromIris(
      leftBuilt.frame,
      gazeVec3(leftBuilt.iris.x, leftBuilt.iris.y, leftBuilt.iris.z),
    );
    if (p) {
      eyeLeftX = p.x;
      eyeLeftY = p.y;
      leftAvailable = true;
    }
  }
  if (rightBuilt && input.geometry.right.irisContourAvailableCount >= 4) {
    const p = planarApertureGazeFromIris(
      rightBuilt.frame,
      gazeVec3(rightBuilt.iris.x, rightBuilt.iris.y, rightBuilt.iris.z),
    );
    if (p) {
      eyeRightX = p.x;
      eyeRightY = p.y;
      rightAvailable = true;
    }
  }
  return {
    eyeLeftX,
    eyeLeftY,
    eyeRightX,
    eyeRightY,
    leftAvailable,
    rightAvailable,
  };
}

export interface BlendshapeGazeSample {
  readonly eyeLeftX: number;
  readonly eyeLeftY: number;
  readonly eyeRightX: number;
  readonly eyeRightY: number;
}

/**
 * Arbitrate iris vs blendshape into LiveAct source eye channels.
 * Prefers iris per-eye when available and confidence ≥ threshold.
 */
export function arbitrateLiveActGaze(input: {
  iris: LiveActIrisGazeV1 | null;
  blendshape: BlendshapeGazeSample;
  minConfidence?: number;
}): BlendshapeGazeSample & {
  fallbackState: LiveActIrisGazeFallbackState;
  iris: LiveActIrisGazeV1 | null;
} {
  const minC = input.minConfidence ?? LIVEACT_IRIS_GAZE_MIN_CONFIDENCE;
  const iris = input.iris;
  if (!iris || !iris.faceNormalizationOk) {
    return {
      ...input.blendshape,
      fallbackState: 'blendshape',
      iris,
    };
  }

  const useLeft =
    iris.left.available &&
    iris.left.x !== null &&
    iris.left.y !== null &&
    iris.left.confidence >= minC;
  const useRight =
    iris.right.available &&
    iris.right.x !== null &&
    iris.right.y !== null &&
    iris.right.confidence >= minC;

  if (!useLeft && !useRight) {
    return { ...input.blendshape, fallbackState: 'blendshape', iris };
  }

  const eyeLeftX = useLeft ? iris.left.x! : input.blendshape.eyeLeftX;
  const eyeLeftY = useLeft ? iris.left.y! : input.blendshape.eyeLeftY;
  const eyeRightX = useRight ? iris.right.x! : input.blendshape.eyeRightX;
  const eyeRightY = useRight ? iris.right.y! : input.blendshape.eyeRightY;

  let fallbackState: LiveActIrisGazeFallbackState = 'iris';
  if (useLeft && useRight) fallbackState = 'iris';
  else if (useLeft || useRight) fallbackState = 'mixed';
  else fallbackState = 'blendshape';

  return {
    eyeLeftX,
    eyeLeftY,
    eyeRightX,
    eyeRightY,
    fallbackState,
    iris: {
      ...iris,
      fallbackState,
    },
  };
}

/** Mirror iris gaze the same way as LiveAct source samples (anatomical → avatar). */
export function mirrorIrisGaze(gaze: LiveActIrisGazeV1): LiveActIrisGazeV1 {
  const flipEye = (e: LiveActIrisEyeGazeV1): LiveActIrisEyeGazeV1 => {
    if (!e.available || e.x === null || e.y === null || e.yawDeg === null || e.pitchDeg === null) {
      return e;
    }
    return {
      available: e.available,
      yawDeg: -e.yawDeg,
      pitchDeg: e.pitchDeg,
      x: -e.x,
      y: e.y,
      confidence: e.confidence,
    };
  };
  return {
    ...gaze,
    left: flipEye(gaze.right),
    right: flipEye(gaze.left),
    binocularYawDisagreementDeg: gaze.binocularYawDisagreementDeg,
    binocularPitchDisagreementDeg: gaze.binocularPitchDisagreementDeg,
  };
}
