/**
 * Maps MediaPipe face landmark results to LiveActFaceDiagnosticsFrameV1 (#331).
 * Location: src/infrastructure/character/liveact/liveact-face-diagnostics.ts
 */

import {
  assertLiveActFaceDiagnosticsLocalOnly,
  createEmptyLiveActFaceDiagnosticsFrame,
  type LiveActFaceDiagnosticsContours,
  type LiveActFaceDiagnosticsFrameV1,
  type LiveActFaceLandmark2d,
} from '../../../domains/character/liveact';

interface NormalizedLandmarkLike {
  x?: number;
  y?: number;
}

interface ConnectionLike {
  start?: number;
  end?: number;
}

function toPoint2d(landmarks: readonly NormalizedLandmarkLike[], index: number): LiveActFaceLandmark2d {
  const hit = landmarks[index];
  const x = typeof hit?.x === 'number' && Number.isFinite(hit.x) ? hit.x : 0;
  const y = typeof hit?.y === 'number' && Number.isFinite(hit.y) ? hit.y : 0;
  return { x, y };
}

function polylineFromConnections(
  landmarks: readonly NormalizedLandmarkLike[],
  connections: readonly ConnectionLike[],
): LiveActFaceLandmark2d[] {
  const out: LiveActFaceLandmark2d[] = [];
  for (const edge of connections) {
    if (typeof edge.start !== 'number' || typeof edge.end !== 'number') continue;
    out.push(toPoint2d(landmarks, edge.start));
    out.push(toPoint2d(landmarks, edge.end));
  }
  return out;
}

export function mapMediaPipeLandmarksToLiveActDiagnostics(input: {
  landmarks: readonly NormalizedLandmarkLike[] | undefined;
  connections: {
    faceOval: readonly ConnectionLike[];
    lips: readonly ConnectionLike[];
    leftEye: readonly ConnectionLike[];
    rightEye: readonly ConnectionLike[];
    leftEyebrow: readonly ConnectionLike[];
    rightEyebrow: readonly ConnectionLike[];
  };
  timestampMs: number;
  sequence: number;
  faceIndex: number;
  faceCount: number;
  trackingLost: boolean;
}): LiveActFaceDiagnosticsFrameV1 {
  if (input.trackingLost || !input.landmarks || input.landmarks.length === 0) {
    return createEmptyLiveActFaceDiagnosticsFrame({
      timestampMs: input.timestampMs,
      sequence: input.sequence,
    });
  }

  const landmarks: LiveActFaceLandmark2d[] = input.landmarks.map((lm) => ({
    x: typeof lm.x === 'number' && Number.isFinite(lm.x) ? lm.x : 0,
    y: typeof lm.y === 'number' && Number.isFinite(lm.y) ? lm.y : 0,
  }));

  const contours: LiveActFaceDiagnosticsContours = {
    faceOval: polylineFromConnections(input.landmarks, input.connections.faceOval),
    lips: polylineFromConnections(input.landmarks, input.connections.lips),
    leftEye: polylineFromConnections(input.landmarks, input.connections.leftEye),
    rightEye: polylineFromConnections(input.landmarks, input.connections.rightEye),
    leftEyebrow: polylineFromConnections(input.landmarks, input.connections.leftEyebrow),
    rightEyebrow: polylineFromConnections(input.landmarks, input.connections.rightEyebrow),
  };

  const frame: LiveActFaceDiagnosticsFrameV1 = {
    contractVersion: 'SagaDriveLiveActFaceDiagnosticsV1',
    timestampMs: input.timestampMs,
    sequence: input.sequence,
    trackingLost: false,
    faceIndex: input.faceIndex,
    faceCount: input.faceCount,
    landmarks,
    contours,
  };
  assertLiveActFaceDiagnosticsLocalOnly(frame);
  return frame;
}
