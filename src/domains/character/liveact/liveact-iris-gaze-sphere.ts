/**
 * liveact-iris-gaze-sphere — eyeball-sphere gaze geometry (#446).
 * Location: src/domains/character/liveact/liveact-iris-gaze-sphere.ts
 *
 * Eyeball radius from eye half-width so aperture edge = LIVEACT_IRIS_GAZE_MAX_YAW_DEG.
 * No asset-specific constants. Pure domain.
 */

import {
  LIVEACT_IRIS_GAZE_MAX_PITCH_DEG,
  LIVEACT_IRIS_GAZE_MAX_YAW_DEG,
} from './liveact-iris-gaze-contract';

export interface GazeVec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface EyeSphereFrame {
  readonly eyeOrigin: GazeVec3;
  readonly axisX: GazeVec3;
  readonly axisY: GazeVec3;
  readonly axisZ: GazeVec3;
  readonly halfWidth: number;
  readonly halfHeight: number;
  readonly radius: number;
  readonly eyeballCenter: GazeVec3;
}

const EPS = 1e-8;

export function gazeVec3(x: number, y: number, z: number): GazeVec3 {
  return { x, y, z };
}

export function gazeAdd(a: GazeVec3, b: GazeVec3): GazeVec3 {
  return gazeVec3(a.x + b.x, a.y + b.y, a.z + b.z);
}

export function gazeSub(a: GazeVec3, b: GazeVec3): GazeVec3 {
  return gazeVec3(a.x - b.x, a.y - b.y, a.z - b.z);
}

export function gazeScale(a: GazeVec3, s: number): GazeVec3 {
  return gazeVec3(a.x * s, a.y * s, a.z * s);
}

export function gazeDot(a: GazeVec3, b: GazeVec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function gazeCross(a: GazeVec3, b: GazeVec3): GazeVec3 {
  return gazeVec3(
    a.y * b.z - a.z * b.y,
    a.z * b.x - a.x * b.z,
    a.x * b.y - a.y * b.x,
  );
}

export function gazeLen(a: GazeVec3): number {
  return Math.hypot(a.x, a.y, a.z);
}

export function gazeNormalize(a: GazeVec3): GazeVec3 | null {
  const l = gazeLen(a);
  if (!Number.isFinite(l) || l < EPS) return null;
  return gazeScale(a, 1 / l);
}

/**
 * Eyeball radius from eye half-width: iris at ±halfWidth on the frontal plane
 * corresponds to ±MAX_YAW on the sphere (sin(yaw) = offset / R).
 */
export function irisEyeballRadiusFromHalfWidth(halfWidth: number): number | null {
  if (!Number.isFinite(halfWidth) || halfWidth < EPS) return null;
  const maxYawRad = (LIVEACT_IRIS_GAZE_MAX_YAW_DEG * Math.PI) / 180;
  const s = Math.sin(maxYawRad);
  if (s < EPS) return null;
  return halfWidth / s;
}

/**
 * Unit gaze direction from yaw/pitch (degrees), eye-local:
 * +yaw = anatomical left, +pitch = up, +z = face-forward.
 */
export function gazeDirectionFromYawPitchDeg(
  yawDeg: number,
  pitchDeg: number,
): GazeVec3 {
  const yaw = (yawDeg * Math.PI) / 180;
  const pitch = (pitchDeg * Math.PI) / 180;
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  return gazeVec3(sy * cp, sp, cy * cp);
}

export function yawPitchDegFromGazeDirection(dir: GazeVec3): {
  yawDeg: number;
  pitchDeg: number;
} | null {
  const n = gazeNormalize(dir);
  if (!n) return null;
  const yawDeg = (Math.atan2(n.x, n.z) * 180) / Math.PI;
  const pitchDeg = (Math.asin(Math.min(1, Math.max(-1, n.y))) * 180) / Math.PI;
  if (!Number.isFinite(yawDeg) || !Number.isFinite(pitchDeg)) return null;
  return { yawDeg, pitchDeg };
}

/**
 * Angular error degrees between two gaze directions.
 * Same acos(dot) definition as #444 fidelityGazeAngularErrorDeg, on 3D unit vectors
 * (Phase 11 — magnitude-sensitive; 2D unit-vector acos ignores scale).
 */
export function gazeDirectionAngularErrorDeg(a: GazeVec3, b: GazeVec3): number {
  const na = gazeNormalize(a);
  const nb = gazeNormalize(b);
  if (!na || !nb) return Number.NaN;
  const d = Math.min(1, Math.max(-1, gazeDot(na, nb)));
  return (Math.acos(d) * 180) / Math.PI;
}

/** Place iris center on sphere for known gaze (fixture generation). */
export function irisCenterOnSphere(
  frame: EyeSphereFrame,
  yawDeg: number,
  pitchDeg: number,
): GazeVec3 {
  const dirLocal = gazeDirectionFromYawPitchDeg(yawDeg, pitchDeg);
  const dir = gazeAdd(
    gazeAdd(gazeScale(frame.axisX, dirLocal.x), gazeScale(frame.axisY, dirLocal.y)),
    gazeScale(frame.axisZ, dirLocal.z),
  );
  return gazeAdd(frame.eyeballCenter, gazeScale(dir, frame.radius));
}

/**
 * Solve gaze from iris center on eyeball sphere.
 * Returns yaw/pitch in degrees (eye-local / head-relative after face normalize).
 */
export function solveGazeFromIrisOnSphere(
  frame: EyeSphereFrame,
  irisCenter: GazeVec3,
): { yawDeg: number; pitchDeg: number; direction: GazeVec3 } | null {
  const rel = gazeSub(irisCenter, frame.eyeballCenter);
  const dirWorld = gazeNormalize(rel);
  if (!dirWorld) return null;
  const lx = gazeDot(dirWorld, frame.axisX);
  const ly = gazeDot(dirWorld, frame.axisY);
  const lz = gazeDot(dirWorld, frame.axisZ);
  const dirLocal = gazeNormalize(gazeVec3(lx, ly, lz));
  if (!dirLocal) return null;
  const yp = yawPitchDegFromGazeDirection(dirLocal);
  if (!yp) return null;
  if (Math.abs(yp.yawDeg) > LIVEACT_IRIS_GAZE_MAX_YAW_DEG + 15) return null;
  if (Math.abs(yp.pitchDeg) > LIVEACT_IRIS_GAZE_MAX_PITCH_DEG + 15) return null;
  if (lz < -0.15) return null;
  return { yawDeg: yp.yawDeg, pitchDeg: yp.pitchDeg, direction: dirLocal };
}

/**
 * Build eye-local sphere frame from corners/lids already in face-local space.
 * +axisX = anatomical left along the eye.
 */
export function buildEyeSphereFrameFromCorners(input: {
  inner: GazeVec3;
  outer: GazeVec3;
  upper: GazeVec3;
  lower: GazeVec3;
  anatomicalLeft: boolean;
}): EyeSphereFrame | null {
  const { inner, outer, upper, lower, anatomicalLeft } = input;
  const origin = gazeScale(
    gazeAdd(gazeAdd(inner, outer), gazeAdd(upper, lower)),
    0.25,
  );
  // Left: outer is anatomical left. Right: inner (nose) is anatomical left.
  const xRaw = anatomicalLeft ? gazeSub(outer, inner) : gazeSub(inner, outer);
  const axisX = gazeNormalize(xRaw);
  if (!axisX) return null;

  let yCand = gazeSub(upper, lower);
  yCand = gazeSub(yCand, gazeScale(axisX, gazeDot(yCand, axisX)));
  let axisY = gazeNormalize(yCand);
  if (!axisY) return null;

  let axisZ = gazeNormalize(gazeCross(axisX, axisY));
  if (!axisZ) return null;
  if (gazeDot(axisZ, gazeVec3(0, 0, 1)) < 0) {
    axisZ = gazeScale(axisZ, -1);
  }
  axisY = gazeNormalize(gazeCross(axisZ, axisX));
  if (!axisY) return null;
  axisZ = gazeNormalize(gazeCross(axisX, axisY));
  if (!axisZ) return null;

  const halfWidth = gazeLen(gazeSub(outer, inner)) * 0.5;
  const halfHeight = gazeLen(gazeSub(upper, lower)) * 0.5;
  const radius = irisEyeballRadiusFromHalfWidth(halfWidth);
  if (!radius || halfHeight < EPS) return null;

  // Neutral iris on frontal plane: depth = R * cos(maxYaw)
  const maxYawRad = (LIVEACT_IRIS_GAZE_MAX_YAW_DEG * Math.PI) / 180;
  const depth = radius * Math.cos(maxYawRad);
  const eyeballCenter = gazeSub(origin, gazeScale(axisZ, depth));

  return {
    eyeOrigin: origin,
    axisX,
    axisY,
    axisZ,
    halfWidth,
    halfHeight,
    radius,
    eyeballCenter,
  };
}

/**
 * Planar aperture read (V1-like): iris offset / halfWidth → normalized −1..1.
 * Structural baseline for fair A/B — not gain-sabotaged.
 */
export function planarApertureGazeFromIris(
  frame: EyeSphereFrame,
  irisCenter: GazeVec3,
): { x: number; y: number } | null {
  const rel = gazeSub(irisCenter, frame.eyeOrigin);
  const lx = gazeDot(rel, frame.axisX);
  const ly = gazeDot(rel, frame.axisY);
  if (frame.halfWidth < EPS || frame.halfHeight < EPS) return null;
  let x = lx / frame.halfWidth;
  let y = ly / frame.halfHeight;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  x = Math.min(1, Math.max(-1, x));
  y = Math.min(1, Math.max(-1, y));
  return { x, y };
}
