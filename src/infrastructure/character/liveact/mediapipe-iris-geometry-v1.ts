/**
 * mediapipe-iris-geometry-v1 — MediaPipe iris indices → provider-neutral eye geometry (#446).
 * Location: src/infrastructure/character/liveact/mediapipe-iris-geometry-v1.ts
 *
 * Provenance (@mediapipe/tasks-vision@0.10.14 FaceLandmarker API):
 * - FACE_LANDMARKS_LEFT_IRIS → 474,475,476,477 (anatomical left contour)
 * - FACE_LANDMARKS_RIGHT_IRIS → 469,470,471,472 (anatomical right contour)
 * Iris center = centroid(contour[4]). No undocumented center index hardcodes.
 *
 * Eye corners/lids reuse MediaPipeSagaDriveFaceAnchorMapV1 (#421/#445).
 */

import {
  LIVEACT_IRIS_EYE_GEOMETRY_CONTRACT,
  type IrisBinocularGeometryV1,
  type IrisEyeGeometryV1,
  type IrisPoint3,
} from '../../../domains/character/liveact/liveact-iris-gaze-contract';
import {
  MEDIAPIPE_SAGADRIVE_FACE_ANCHOR_MAP_V1,
  type NormalizedLandmark2dLike,
  resolveMediaPipeAnchorSample,
} from './mediapipe-sagadrive-face-anchor-map-v1';

export const MEDIAPIPE_IRIS_GEOMETRY_VERSION = 'MediaPipeIrisGeometryV1' as const;

/**
 * Authoritative contour indices from FaceLandmarker.FACE_LANDMARKS_*_IRIS
 * on @mediapipe/tasks-vision@0.10.14 (verified via API dump).
 */
export const MEDIAPIPE_LEFT_IRIS_CONTOUR_INDICES = [474, 475, 476, 477] as const;
export const MEDIAPIPE_RIGHT_IRIS_CONTOUR_INDICES = [469, 470, 471, 472] as const;

function emptyPoint(): IrisPoint3 {
  return { available: false, x: Number.NaN, y: Number.NaN, z: Number.NaN };
}

function at(
  landmarks: readonly NormalizedLandmark2dLike[],
  index: number,
): IrisPoint3 | null {
  const p = landmarks[index];
  if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return null;
  const z = typeof p.z === 'number' && Number.isFinite(p.z) ? p.z : 0;
  return { available: true, x: p.x, y: p.y, z };
}

function centroid(points: readonly IrisPoint3[]): IrisPoint3 {
  if (points.length === 0) return emptyPoint();
  let x = 0;
  let y = 0;
  let z = 0;
  for (const p of points) {
    x += p.x;
    y += p.y;
    z += p.z;
  }
  const n = points.length;
  return { available: true, x: x / n, y: y / n, z: z / n };
}

function resolveAnchor(
  landmarks: readonly NormalizedLandmark2dLike[],
  anchorId: string,
): IrisPoint3 {
  const entry = MEDIAPIPE_SAGADRIVE_FACE_ANCHOR_MAP_V1.find((e) => e.anchorId === anchorId);
  if (!entry) return emptyPoint();
  const sample = resolveMediaPipeAnchorSample(landmarks, entry);
  if (!sample.available) return emptyPoint();
  let z = 0;
  let zCount = 0;
  for (const index of entry.landmarkIndices) {
    const lm = landmarks[index];
    if (lm && typeof lm.z === 'number' && Number.isFinite(lm.z)) {
      z += lm.z;
      zCount += 1;
    }
  }
  return {
    available: true,
    x: sample.x,
    y: sample.y,
    z: zCount > 0 ? z / zCount : 0,
  };
}

function resolveEye(
  landmarks: readonly NormalizedLandmark2dLike[],
  side: 'left' | 'right',
): IrisEyeGeometryV1 {
  const prefix = side === 'left' ? 'eyeLeft' : 'eyeRight';
  const contour =
    side === 'left' ? MEDIAPIPE_LEFT_IRIS_CONTOUR_INDICES : MEDIAPIPE_RIGHT_IRIS_CONTOUR_INDICES;
  const contourPts: IrisPoint3[] = [];
  for (const index of contour) {
    const p = at(landmarks, index);
    if (p) contourPts.push(p);
  }
  return {
    innerCorner: resolveAnchor(landmarks, `${prefix}Inner`),
    outerCorner: resolveAnchor(landmarks, `${prefix}Outer`),
    upperLid: resolveAnchor(landmarks, `${prefix}Upper`),
    lowerLid: resolveAnchor(landmarks, `${prefix}Lower`),
    irisCenter: contourPts.length >= 4 ? centroid(contourPts) : emptyPoint(),
    irisContourAvailableCount: contourPts.length,
  };
}

/**
 * Map raw MediaPipe landmarks → provider-neutral binocular iris/eye geometry.
 * Landmarks remain caller-owned / transient.
 */
export function mapMediaPipeLandmarksToIrisGeometry(input: {
  landmarks: readonly NormalizedLandmark2dLike[] | undefined;
  faceConfidence?: number;
}): IrisBinocularGeometryV1 {
  const landmarks = input.landmarks;
  const faceConfidence =
    typeof input.faceConfidence === 'number' && Number.isFinite(input.faceConfidence)
      ? Math.min(1, Math.max(0, input.faceConfidence))
      : 1;

  if (!landmarks || landmarks.length === 0) {
    const emptyEye: IrisEyeGeometryV1 = {
      innerCorner: emptyPoint(),
      outerCorner: emptyPoint(),
      upperLid: emptyPoint(),
      lowerLid: emptyPoint(),
      irisCenter: emptyPoint(),
      irisContourAvailableCount: 0,
    };
    return {
      contractVersion: LIVEACT_IRIS_EYE_GEOMETRY_CONTRACT,
      left: emptyEye,
      right: emptyEye,
      forehead: emptyPoint(),
      noseBridge: emptyPoint(),
      noseTip: emptyPoint(),
      faceConfidence: 0,
    };
  }

  return {
    contractVersion: LIVEACT_IRIS_EYE_GEOMETRY_CONTRACT,
    left: resolveEye(landmarks, 'left'),
    right: resolveEye(landmarks, 'right'),
    forehead: resolveAnchor(landmarks, 'forehead'),
    noseBridge: (() => {
      // Dense extension uses nose bridge; fall back to midpoint noseTip/forehead if missing
      const tip = resolveAnchor(landmarks, 'noseTip');
      const fh = resolveAnchor(landmarks, 'forehead');
      if (tip.available && fh.available) {
        return {
          available: true,
          x: (tip.x + fh.x) * 0.5,
          y: (tip.y + fh.y) * 0.5,
          z: (tip.z + fh.z) * 0.5,
        };
      }
      return tip.available ? tip : fh;
    })(),
    noseTip: resolveAnchor(landmarks, 'noseTip'),
    faceConfidence,
  };
}
