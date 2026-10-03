/**
 * liveact-dense-face-features-normalize — face-local orthonormal frame (#445).
 * Location: src/domains/character/liveact/liveact-dense-face-features-normalize.ts
 *
 * Upper-face anchors only (eyes / forehead / nose bridge). Mouth/jaw must not define the basis.
 * Pure domain — no provider landmark indices.
 */

import type {
  DenseNormalizationStatus,
  DenseSemanticGeometryV1,
  DenseSemanticPoint3,
  DenseSemanticPointId,
} from './liveact-dense-face-features-contract';

const SCALE_EPS = 1e-5;
const DOT_EPS = 1e-8;

export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface DenseFaceLocalFrameV1 {
  readonly status: DenseNormalizationStatus;
  readonly origin: Vec3;
  readonly axisX: Vec3;
  readonly axisY: Vec3;
  readonly axisZ: Vec3;
  readonly scale: number;
}

export type DenseLocalPointMap = Readonly<
  Partial<Record<DenseSemanticPointId, Vec3 | null>>
>;

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
  if (!Number.isFinite(l) || l < SCALE_EPS) return null;
  return scale(a, 1 / l);
}

function midpoint(a: Vec3, b: Vec3): Vec3 {
  return scale(add(a, b), 0.5);
}

function asVec(p: DenseSemanticPoint3): Vec3 | null {
  if (!p.available) return null;
  if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.z)) return null;
  return v(p.x, p.y, p.z);
}

function requirePoint(
  geometry: DenseSemanticGeometryV1,
  id: DenseSemanticPointId,
): Vec3 | null {
  return asVec(geometry.points[id]);
}

function degenerateFrame(): DenseFaceLocalFrameV1 {
  const z = v(0, 0, 0);
  return {
    status: 'degenerate',
    origin: z,
    axisX: z,
    axisY: z,
    axisZ: z,
    scale: 0,
  };
}

/**
 * Build face-local orthonormal frame from upper-face semantic points.
 * +X = anatomical left (right eye center → left eye center).
 * +Y = up (toward forehead).
 * +Z = face-forward (nose tip has +Z after sign stabilize).
 */
export function buildDenseFaceLocalFrame(
  geometry: DenseSemanticGeometryV1,
): DenseFaceLocalFrameV1 {
  const eyeOuterL = requirePoint(geometry, 'eyeOuterLeft');
  const eyeInnerL = requirePoint(geometry, 'eyeInnerLeft');
  const eyeOuterR = requirePoint(geometry, 'eyeOuterRight');
  const eyeInnerR = requirePoint(geometry, 'eyeInnerRight');
  const forehead = requirePoint(geometry, 'forehead');
  const noseBridge = requirePoint(geometry, 'noseBridge');
  const noseTip = requirePoint(geometry, 'noseTip');

  if (!eyeOuterL || !eyeInnerL || !eyeOuterR || !eyeInnerR) {
    return { ...degenerateFrame(), status: 'unavailable' };
  }

  const eyeCenterL = midpoint(eyeOuterL, eyeInnerL);
  const eyeCenterR = midpoint(eyeOuterR, eyeInnerR);
  const origin = midpoint(eyeCenterL, eyeCenterR);

  const xRaw = sub(eyeCenterL, eyeCenterR); // toward anatomical left
  const axisX = normalize(xRaw);
  if (!axisX) return degenerateFrame();

  const upRef = forehead ?? noseBridge;
  if (!upRef) return degenerateFrame();

  let yCand = sub(upRef, origin);
  // Remove projection onto X
  yCand = sub(yCand, scale(axisX, dot(yCand, axisX)));
  let axisY = normalize(yCand);
  if (!axisY) return degenerateFrame();

  let axisZ = cross(axisX, axisY);
  axisZ = normalize(axisZ) ?? v(0, 0, 0);
  if (len(axisZ) < SCALE_EPS) return degenerateFrame();

  // Stabilize +Z face-forward using nose tip when available
  if (noseTip) {
    const noseRel = sub(noseTip, origin);
    if (dot(noseRel, axisZ) < 0) {
      axisZ = scale(axisZ, -1);
    }
  }

  // Re-orthogonalize Y = Z × X
  axisY = cross(axisZ, axisX);
  axisY = normalize(axisY) ?? v(0, 0, 0);
  if (len(axisY) < SCALE_EPS) return degenerateFrame();

  // Recompute Z = X × Y for exact orthonormality
  axisZ = cross(axisX, axisY);
  axisZ = normalize(axisZ) ?? v(0, 0, 0);
  if (len(axisZ) < SCALE_EPS) return degenerateFrame();

  const scaleDist = len(sub(eyeCenterL, eyeCenterR));
  if (!Number.isFinite(scaleDist) || scaleDist < SCALE_EPS) return degenerateFrame();

  // Sanity: axes nearly orthogonal
  if (Math.abs(dot(axisX, axisY)) > 1e-3) return degenerateFrame();
  if (Math.abs(dot(axisX, axisZ)) > 1e-3) return degenerateFrame();
  if (Math.abs(dot(axisY, axisZ)) > 1e-3) return degenerateFrame();

  return {
    status: 'ok',
    origin,
    axisX,
    axisY,
    axisZ,
    scale: scaleDist,
  };
}

/** Transform provider point into face-local normalized coordinates. */
export function toDenseLocalPoint(world: Vec3, frame: DenseFaceLocalFrameV1): Vec3 | null {
  if (frame.status !== 'ok' || frame.scale < SCALE_EPS) return null;
  const rel = sub(world, frame.origin);
  const lx = dot(rel, frame.axisX) / frame.scale;
  const ly = dot(rel, frame.axisY) / frame.scale;
  const lz = dot(rel, frame.axisZ) / frame.scale;
  if (!Number.isFinite(lx) || !Number.isFinite(ly) || !Number.isFinite(lz)) return null;
  return v(lx, ly, lz);
}

/** Map all available semantic points into face-local space. */
export function mapGeometryToDenseLocal(
  geometry: DenseSemanticGeometryV1,
  frame: DenseFaceLocalFrameV1,
): DenseLocalPointMap {
  const out: Partial<Record<DenseSemanticPointId, Vec3 | null>> = {};
  for (const id of Object.keys(geometry.points) as DenseSemanticPointId[]) {
    const world = asVec(geometry.points[id]);
    out[id] = world ? toDenseLocalPoint(world, frame) : null;
  }
  return out;
}

export function denseLocalDistance(a: Vec3, b: Vec3): number {
  return len(sub(a, b));
}

export function isFiniteVec3(p: Vec3 | null | undefined): p is Vec3 {
  return !!p && Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z);
}

/** Apply rigid transform to all available points (fixtures / invariance tests). */
export function transformDenseSemanticGeometry(
  geometry: DenseSemanticGeometryV1,
  transform: {
    translate?: Vec3;
    uniformScale?: number;
    /** Radians, applied as yaw(Y) → pitch(X) → roll(Z) about geometry centroid of eye centers. */
    yawRad?: number;
    pitchRad?: number;
    rollRad?: number;
  },
): DenseSemanticGeometryV1 {
  const eyeL = asVec(geometry.points.eyeOuterLeft);
  const eyeR = asVec(geometry.points.eyeOuterRight);
  const pivot =
    eyeL && eyeR
      ? midpoint(eyeL, eyeR)
      : v(0, 0, 0);

  const s = transform.uniformScale ?? 1;
  const t = transform.translate ?? v(0, 0, 0);
  const yaw = transform.yawRad ?? 0;
  const pitch = transform.pitchRad ?? 0;
  const roll = transform.rollRad ?? 0;

  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const cr = Math.cos(roll);
  const sr = Math.sin(roll);

  function rotate(p: Vec3): Vec3 {
    // yaw about Y
    let x = p.x * cy + p.z * sy;
    let y = p.y;
    let z = -p.x * sy + p.z * cy;
    // pitch about X
    const y2 = y * cp - z * sp;
    const z2 = y * sp + z * cp;
    y = y2;
    z = z2;
    // roll about Z
    const x3 = x * cr - y * sr;
    const y3 = x * sr + y * cr;
    x = x3;
    y = y3;
    return v(x, y, z);
  }

  const points = { ...geometry.points } as Record<
    DenseSemanticPointId,
    DenseSemanticPoint3
  >;
  for (const id of Object.keys(points) as DenseSemanticPointId[]) {
    const p = points[id];
    if (!p.available || !Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.z)) {
      continue;
    }
    let rel = sub(v(p.x, p.y, p.z), pivot);
    rel = scale(rel, s);
    rel = rotate(rel);
    const out = add(add(pivot, rel), t);
    points[id] = { available: true, x: out.x, y: out.y, z: out.z };
  }

  return {
    contractVersion: geometry.contractVersion,
    points,
    faceConfidence: geometry.faceConfidence,
  };
}

export { SCALE_EPS, DOT_EPS };
