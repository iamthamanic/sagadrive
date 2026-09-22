/**
 * liveact-diagnostics-v2 — SagaDriveLiveActDiagnosticsV2 stage trace (pure domain).
 * Location: src/domains/character/liveact/liveact-diagnostics-v2.ts
 *
 * Stages: RAW → MAPPED → SMOOTHED → CALIBRATED → RETARGETED → APPLIED.
 * Local-only / ephemeral — never persist, never attach video/blobs.
 */

import {
  LIVEACT_FACE_CHANNELS,
  type LiveActFaceChannelId,
  type LiveActFaceChannels,
} from './liveact-face-contract';
import type { LiveActFrameV1, LiveActSourceSample } from './liveact-contract';

export const LIVEACT_DIAGNOSTICS_V2_VERSION = 'SagaDriveLiveActDiagnosticsV2' as const;

export const LIVEACT_DIAGNOSTICS_V2_STAGES = [
  'raw',
  'mapped',
  'smoothed',
  'calibrated',
  'retargeted',
  'applied',
] as const;

export type LiveActDiagnosticsV2StageId = (typeof LIVEACT_DIAGNOSTICS_V2_STAGES)[number];

/** Fixed pose/gaze keys plus every face channel id. */
export const LIVEACT_DIAGNOSTICS_V2_SIGNAL_KEYS = [
  'head.yaw',
  'head.pitch',
  'head.roll',
  'eyeLeft.x',
  'eyeLeft.y',
  'eyeRight.x',
  'eyeRight.y',
  ...LIVEACT_FACE_CHANNELS.map((id) => `face.${id}` as const),
] as const;

export type LiveActDiagnosticsV2SignalKey = (typeof LIVEACT_DIAGNOSTICS_V2_SIGNAL_KEYS)[number];

export type LiveActAppliedSignalStatus = 'supported' | 'unavailable' | 'neutral';

export interface LiveActAppliedSignalV1 {
  status: LiveActAppliedSignalStatus;
  /** Numeric value when supported/neutral; null when unavailable. */
  value: number | null;
}

export type LiveActDiagnosticsV2StageValues = Readonly<
  Partial<Record<LiveActDiagnosticsV2SignalKey, number | null>>
>;

export type LiveActDiagnosticsV2AppliedValues = Readonly<
  Partial<Record<LiveActDiagnosticsV2SignalKey, LiveActAppliedSignalV1>>
>;

export interface LiveActDiagnosticsV2Snapshot {
  contractVersion: typeof LIVEACT_DIAGNOSTICS_V2_VERSION;
  timestampMs: number;
  sequence: number;
  trackingLost: boolean;
  stages: {
    raw: LiveActDiagnosticsV2StageValues;
    mapped: LiveActDiagnosticsV2StageValues;
    smoothed: LiveActDiagnosticsV2StageValues;
    calibrated: LiveActDiagnosticsV2StageValues;
    retargeted: LiveActDiagnosticsV2StageValues;
    applied: LiveActDiagnosticsV2AppliedValues;
  };
}

function faceKey(id: LiveActFaceChannelId): LiveActDiagnosticsV2SignalKey {
  return `face.${id}` as LiveActDiagnosticsV2SignalKey;
}

export function snapshotLiveActDiagnosticsV2FromSample(
  sample: LiveActSourceSample,
): LiveActDiagnosticsV2StageValues {
  const out: Partial<Record<LiveActDiagnosticsV2SignalKey, number | null>> = {
    'head.yaw': sample.headYaw,
    'head.pitch': sample.headPitch,
    'head.roll': sample.headRoll,
    'eyeLeft.x': sample.eyeLeftX,
    'eyeLeft.y': sample.eyeLeftY,
    'eyeRight.x': sample.eyeRightX,
    'eyeRight.y': sample.eyeRightY,
  };
  for (const id of LIVEACT_FACE_CHANNELS) {
    const v = sample.face[id];
    out[faceKey(id)] = typeof v === 'number' ? v : null;
  }
  return out;
}

export function snapshotLiveActDiagnosticsV2FromFrame(
  frame: LiveActFrameV1,
): LiveActDiagnosticsV2StageValues {
  const out: Partial<Record<LiveActDiagnosticsV2SignalKey, number | null>> = {
    'head.yaw': frame.head.yaw,
    'head.pitch': frame.head.pitch,
    'head.roll': frame.head.roll,
    'eyeLeft.x': frame.eyeLeft.x,
    'eyeLeft.y': frame.eyeLeft.y,
    'eyeRight.x': frame.eyeRight.x,
    'eyeRight.y': frame.eyeRight.y,
  };
  for (const id of LIVEACT_FACE_CHANNELS) {
    out[faceKey(id)] = frame.face[id];
  }
  return out;
}

export function createUnavailableLiveActAppliedValues(): LiveActDiagnosticsV2AppliedValues {
  const out: Partial<Record<LiveActDiagnosticsV2SignalKey, LiveActAppliedSignalV1>> = {};
  for (const key of LIVEACT_DIAGNOSTICS_V2_SIGNAL_KEYS) {
    out[key] = { status: 'unavailable', value: null };
  }
  return out;
}

export function createNeutralLiveActAppliedValues(
  supported: ReadonlySet<LiveActDiagnosticsV2SignalKey>,
): LiveActDiagnosticsV2AppliedValues {
  const out: Partial<Record<LiveActDiagnosticsV2SignalKey, LiveActAppliedSignalV1>> = {};
  for (const key of LIVEACT_DIAGNOSTICS_V2_SIGNAL_KEYS) {
    if (supported.has(key)) {
      const neutral = key === 'face._neutral' ? 1 : 0;
      out[key] = { status: 'neutral', value: neutral };
    } else {
      out[key] = { status: 'unavailable', value: null };
    }
  }
  return out;
}

export function buildLiveActAppliedValuesFromFace(
  input: {
    headSupported: boolean;
    eyeLeftSupported: boolean;
    eyeRightSupported: boolean;
    face: Readonly<Partial<Record<LiveActFaceChannelId, number | null | undefined>>>;
    faceSupported: ReadonlySet<LiveActFaceChannelId>;
    head?: { yaw: number; pitch: number; roll: number } | null;
    eyeLeft?: { x: number; y: number } | null;
    eyeRight?: { x: number; y: number } | null;
    mode: 'driven' | 'neutral';
  },
): LiveActDiagnosticsV2AppliedValues {
  const out: Partial<Record<LiveActDiagnosticsV2SignalKey, LiveActAppliedSignalV1>> = {};
  const status = input.mode === 'neutral' ? 'neutral' : 'supported';

  if (input.headSupported && input.head) {
    out['head.yaw'] = { status, value: input.head.yaw };
    out['head.pitch'] = { status, value: input.head.pitch };
    out['head.roll'] = { status, value: input.head.roll };
  } else {
    out['head.yaw'] = { status: 'unavailable', value: null };
    out['head.pitch'] = { status: 'unavailable', value: null };
    out['head.roll'] = { status: 'unavailable', value: null };
  }

  if (input.eyeLeftSupported && input.eyeLeft) {
    out['eyeLeft.x'] = { status, value: input.eyeLeft.x };
    out['eyeLeft.y'] = { status, value: input.eyeLeft.y };
  } else {
    out['eyeLeft.x'] = { status: 'unavailable', value: null };
    out['eyeLeft.y'] = { status: 'unavailable', value: null };
  }

  if (input.eyeRightSupported && input.eyeRight) {
    out['eyeRight.x'] = { status, value: input.eyeRight.x };
    out['eyeRight.y'] = { status, value: input.eyeRight.y };
  } else {
    out['eyeRight.x'] = { status: 'unavailable', value: null };
    out['eyeRight.y'] = { status: 'unavailable', value: null };
  }

  for (const id of LIVEACT_FACE_CHANNELS) {
    const key = faceKey(id);
    if (!input.faceSupported.has(id)) {
      out[key] = { status: 'unavailable', value: null };
      continue;
    }
    const raw = input.face[id];
    if (typeof raw !== 'number') {
      out[key] = { status: 'unavailable', value: null };
      continue;
    }
    out[key] = { status, value: raw };
  }
  return out;
}

export function createLiveActDiagnosticsV2Snapshot(input: {
  timestampMs: number;
  sequence: number;
  trackingLost: boolean;
  raw: LiveActDiagnosticsV2StageValues;
  mapped: LiveActDiagnosticsV2StageValues;
  smoothed: LiveActDiagnosticsV2StageValues;
  calibrated: LiveActDiagnosticsV2StageValues;
  retargeted: LiveActDiagnosticsV2StageValues;
  applied: LiveActDiagnosticsV2AppliedValues;
}): LiveActDiagnosticsV2Snapshot {
  return {
    contractVersion: LIVEACT_DIAGNOSTICS_V2_VERSION,
    timestampMs: input.timestampMs,
    sequence: input.sequence,
    trackingLost: input.trackingLost,
    stages: {
      raw: input.raw,
      mapped: input.mapped,
      smoothed: input.smoothed,
      calibrated: input.calibrated,
      retargeted: input.retargeted,
      applied: input.applied,
    },
  };
}

/** Privacy: diagnostics must never carry video blobs or serialize hooks. */
export function assertLiveActDiagnosticsV2LocalOnly(snapshot: LiveActDiagnosticsV2Snapshot): void {
  const record = snapshot as LiveActDiagnosticsV2Snapshot & {
    video?: unknown;
    imageData?: unknown;
    serialize?: unknown;
    blob?: unknown;
    landmarks?: unknown;
  };
  if (
    record.video !== undefined ||
    record.imageData !== undefined ||
    record.serialize !== undefined ||
    record.blob !== undefined ||
    record.landmarks !== undefined
  ) {
    throw new Error('LiveAct-Diagnostics-V2 dürfen keine Video-/Blob-/Landmark-Rohdaten tragen.');
  }
}

/** Test helper: face channel map typed for applied builders. */
export function liveActFaceChannelsToPartial(
  face: LiveActFaceChannels,
): Partial<Record<LiveActFaceChannelId, number>> {
  const out: Partial<Record<LiveActFaceChannelId, number>> = {};
  for (const id of LIVEACT_FACE_CHANNELS) {
    out[id] = face[id];
  }
  return out;
}
