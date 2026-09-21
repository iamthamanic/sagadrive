/**
 * LiveAct face diagnostics contract — local-only landmark debug (pure domain).
 * Location: src/domains/character/liveact/liveact-face-diagnostics.ts
 *
 * Never merged into LiveActFrameV1. Ephemeral; no persistence or serialize API.
 */

export const LIVEACT_FACE_DIAGNOSTICS_VERSION = 'SagaDriveLiveActFaceDiagnosticsV1' as const;

/** Normalized image coordinates (0..1), origin top-left. */
export interface LiveActFaceLandmark2d {
  x: number;
  y: number;
}

export interface LiveActFaceDiagnosticsContours {
  readonly faceOval: readonly LiveActFaceLandmark2d[];
  readonly lips: readonly LiveActFaceLandmark2d[];
  readonly leftEye: readonly LiveActFaceLandmark2d[];
  readonly rightEye: readonly LiveActFaceLandmark2d[];
  readonly leftEyebrow: readonly LiveActFaceLandmark2d[];
  readonly rightEyebrow: readonly LiveActFaceLandmark2d[];
}

/** Local-only debug frame for canvas overlay — not part of LiveActFrameV1. */
export interface LiveActFaceDiagnosticsFrameV1 {
  contractVersion: typeof LIVEACT_FACE_DIAGNOSTICS_VERSION;
  timestampMs: number;
  sequence: number;
  trackingLost: boolean;
  faceIndex: number;
  faceCount: number;
  /** Full landmark set (normalized x,y). */
  landmarks: readonly LiveActFaceLandmark2d[];
  contours: LiveActFaceDiagnosticsContours;
}

export function createEmptyLiveActFaceDiagnosticsFrame(input: {
  timestampMs: number;
  sequence: number;
}): LiveActFaceDiagnosticsFrameV1 {
  const empty: readonly LiveActFaceLandmark2d[] = [];
  return {
    contractVersion: LIVEACT_FACE_DIAGNOSTICS_VERSION,
    timestampMs: input.timestampMs,
    sequence: input.sequence,
    trackingLost: true,
    faceIndex: -1,
    faceCount: 0,
    landmarks: empty,
    contours: {
      faceOval: empty,
      lips: empty,
      leftEye: empty,
      rightEye: empty,
      leftEyebrow: empty,
      rightEyebrow: empty,
    },
  };
}

/** Privacy: diagnostics must never carry video blobs or serialize hooks. */
export function assertLiveActFaceDiagnosticsLocalOnly(
  frame: LiveActFaceDiagnosticsFrameV1,
): void {
  const record = frame as LiveActFaceDiagnosticsFrameV1 & {
    video?: unknown;
    imageData?: unknown;
    serialize?: unknown;
    blob?: unknown;
  };
  if (
    record.video !== undefined ||
    record.imageData !== undefined ||
    record.serialize !== undefined ||
    record.blob !== undefined
  ) {
    throw new Error('LiveAct-Diagnostics dürfen keine Rohvideo-/Blob-/Serialize-Daten tragen.');
  }
}
