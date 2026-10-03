/**
 * liveact-iris-gaze-solve — head-local per-eye iris gaze solver (#446).
 * Location: src/domains/character/liveact/liveact-iris-gaze-solve.ts
 *
 * Pure domain. Reuses #445 face-local frame. No provider landmark indices. No eyelid-follow.
 * No temporal filter. Minimal neutral offsets only (not #449).
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
  type IrisBinocularGeometryV1,
  type IrisEyeGeometryV1,
  type IrisPoint3,
  type LiveActIrisEyeGazeV1,
  type LiveActIrisGazeFallbackState,
  type LiveActIrisGazeNeutralOffsetV1,
  type LiveActIrisGazeV1,
} from './liveact-iris-gaze-contract';

const EPS = 1e-5;

function v(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return v(a.x - b.x, a.y - b.y, a.z - b.z);
}

function add(a: Vec3, b: Vec3): Vec3 {
  return v(a.x + b.x, a.y + b.y, a.z + b.z);
}

function scale(a: Vec3, s: number): Vec3 {
  return v(a.x * s, a.y * s, a.z * s);
}

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return v(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
}

function len(a: Vec3): number {
  return Math.hypot(a.x, a.y, a.z);
}

function normalize(a: Vec3): Vec3 | null {
  const l = len(a);
  if (!Number.isFinite(l) || l < EPS) return null;
  return scale(a, 1 / l);
}

function asVec(p: IrisPoint3): Vec3 | null {
  if (!p.available) return null;
  if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.z)) return null;
  return v(p.x, p.y, p.z);
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

interface EyeLocalFrame {
  readonly origin: Vec3;
  readonly axisX: Vec3;
  readonly axisY: Vec3;
  readonly axisZ: Vec3;
  readonly halfWidth: number;
  readonly halfHeight: number;
}

function buildEyeLocalFrame(
  eye: IrisEyeGeometryV1,
  faceFrame: DenseFaceLocalFrameV1,
  /** Anatomical left eye: +eyeX toward anatomical left (temporal = outer). */
  anatomicalLeft: boolean,
): EyeLocalFrame | null {
  const innerW = asVec(eye.innerCorner);
  const outerW = asVec(eye.outerCorner);
  const upperW = asVec(eye.upperLid);
  const lowerW = asVec(eye.lowerLid);
  if (!innerW || !outerW || !upperW || !lowerW) return null;

  const inner = toDenseLocalPoint(innerW, faceFrame);
  const outer = toDenseLocalPoint(outerW, faceFrame);
  const upper = toDenseLocalPoint(upperW, faceFrame);
  const lower = toDenseLocalPoint(lowerW, faceFrame);
  if (!inner || !outer || !upper || !lower) return null;

  const origin = scale(add(add(inner, outer), add(upper, lower)), 0.25);

  // +eyeX = anatomical left direction along eye
  // left eye: outer is more +X (anatomical left); right eye: outer is more -X
  const xRaw = anatomicalLeft ? sub(outer, inner) : sub(inner, outer);
  // Wait: for right eye anatomical left is toward nose = inner. Spec: outer↔inner axis.
  // Convention: +eyeX = anatomical left in face space.
  // Left eye: outer (+X) - inner → points anatomical left. Good: sub(outer, inner).
  // Right eye: anatomical left is toward nose = inner (higher X than outer). sub(inner, outer).
  const axisX = normalize(xRaw);
  if (!axisX) return null;

  let yCand = sub(upper, lower);
  yCand = sub(yCand, scale(axisX, dot(yCand, axisX)));
  let axisY = normalize(yCand);
  if (!axisY) return null;

  let axisZ = normalize(cross(axisX, axisY));
  if (!axisZ) return null;
  // Face-forward: +Z should align with face +Z
  if (dot(axisZ, v(0, 0, 1)) < 0) {
    axisZ = scale(axisZ, -1);
  }
  axisY = normalize(cross(axisZ, axisX));
  if (!axisY) return null;
  axisZ = normalize(cross(axisX, axisY));
  if (!axisZ) return null;

  const halfWidth = len(sub(outer, inner)) * 0.5;
  const halfHeight = len(sub(upper, lower)) * 0.5;
  if (halfWidth < EPS || halfHeight < EPS) return null;

  return { origin, axisX, axisY, axisZ, halfWidth, halfHeight };
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
  const irisW = asVec(eye.irisCenter);
  if (!irisW) return unavailableIrisEyeGaze(faceConf * 0.2);

  const eyeFrame = buildEyeLocalFrame(eye, faceFrame, anatomicalLeft);
  if (!eyeFrame) return unavailableIrisEyeGaze(faceConf * 0.3);

  const irisLocal = toDenseLocalPoint(irisW, faceFrame);
  if (!irisLocal) return unavailableIrisEyeGaze(faceConf * 0.3);

  const rel = sub(irisLocal, eyeFrame.origin);
  const lx = dot(rel, eyeFrame.axisX);
  const ly = dot(rel, eyeFrame.axisY);
  // Normalized aperture coords
  let nx = lx / eyeFrame.halfWidth;
  let ny = ly / eyeFrame.halfHeight;
  if (!Number.isFinite(nx) || !Number.isFinite(ny)) {
    return unavailableIrisEyeGaze(faceConf * 0.3);
  }
  // Aperture-normalized iris offset → LiveAct −1..1 gaze (head-local).
  let x = Math.min(1, Math.max(-1, nx)) - neutralX;
  let y = Math.min(1, Math.max(-1, ny)) - neutralY;
  x = Math.min(1, Math.max(-1, x));
  y = Math.min(1, Math.max(-1, y));
  const yawDeg = x * LIVEACT_IRIS_GAZE_MAX_YAW_DEG;
  const pitchDeg = y * LIVEACT_IRIS_GAZE_MAX_PITCH_DEG;

  const geomAvail = eye.irisContourAvailableCount / 4;
  const confidence = Math.min(
    1,
    Math.max(0, faceConf * geomAvail * (faceFrame.status === 'ok' ? 1 : 0.2)),
  );

  return {
    available: true,
    yawDeg,
    pitchDeg,
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
  // Swap eyes and flip horizontal (same as mirrorLiveActSourceSample)
  return {
    ...gaze,
    left: flipEye(gaze.right),
    right: flipEye(gaze.left),
    binocularYawDisagreementDeg: gaze.binocularYawDisagreementDeg,
    binocularPitchDisagreementDeg: gaze.binocularPitchDisagreementDeg,
  };
}
