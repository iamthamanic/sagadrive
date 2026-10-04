/**
 * LiveAct network frame — ephemeral wire contract for session transport (#364).
 * Location: src/domains/character/liveact/liveact-network-frame.ts
 *
 * Encodes calibrated LiveActFrameV1 only. No landmarks, video, calib profiles.
 * Pure domain: no React / Three / LiveKit.
 */

import {
  LIVEACT_CONTRACT_VERSION,
  type LiveActEyeGaze,
  type LiveActFrameV1,
  type LiveActHeadPose,
} from './liveact-contract';
import {
  LIVEACT_FACE_CHANNELS,
  LIVEACT_FACE_CONTRACT_VERSION,
  assertLiveActFaceChannelsLocalOnly,
  clampLiveActChannel,
  createNeutralLiveActFaceChannels,
  isLiveActFaceChannelId,
  type LiveActFaceChannelId,
  type LiveActFaceChannels,
} from './liveact-face-contract';

export const LIVEACT_NETWORK_FRAME_CONTRACT = 'SagaDriveLiveActNetworkFrameV1' as const;
export const LIVEACT_NETWORK_TOPIC = 'liveact-data' as const;
/** Max publish rate (Hz) — aligns with desktop LiveAct FPS cap. */
export const LIVEACT_NETWORK_MAX_SEND_HZ = 30 as const;
/** Drop frames older than this relative to last accept (ms). */
export const LIVEACT_NETWORK_STALE_MS = 500 as const;

export type LiveActNetworkDecodeFailure =
  | 'unsupported_contract'
  | 'invalid_shape'
  | 'biometric_forbidden'
  | 'sequence_not_monotonic';

export interface LiveActNetworkFrameV1 {
  readonly contractVersion: typeof LIVEACT_NETWORK_FRAME_CONTRACT;
  readonly sequence: number;
  readonly timestampMs: number;
  readonly confidence: number;
  readonly trackingLost: boolean;
  readonly head: LiveActHeadPose;
  readonly eyeLeft: LiveActEyeGaze;
  readonly eyeRight: LiveActEyeGaze;
  /** Sparse face weights — only non-default channels. */
  readonly face: Readonly<Partial<Record<LiveActFaceChannelId, number>>>;
  /** Optional capability hint; never invents remote morph support. */
  readonly faceCapabilityLevel?: 0 | 1 | 2 | 3;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function encodeSparseFace(face: LiveActFaceChannels): Partial<Record<LiveActFaceChannelId, number>> {
  const out: Partial<Record<LiveActFaceChannelId, number>> = {};
  for (const id of LIVEACT_FACE_CHANNELS) {
    const v = face[id];
    const neutral = id === '_neutral' ? 1 : 0;
    if (Math.abs(v - neutral) < 1e-4) continue;
    out[id] = clampLiveActChannel(v);
  }
  return out;
}

/**
 * Encode a calibrated local frame for the wire. Strips biometric extras.
 */
export function encodeLiveActNetworkFrame(
  frame: LiveActFrameV1,
  options?: { faceCapabilityLevel?: 0 | 1 | 2 | 3 },
): LiveActNetworkFrameV1 {
  assertLiveActFaceChannelsLocalOnly(frame.face);
  return {
    contractVersion: LIVEACT_NETWORK_FRAME_CONTRACT,
    sequence: frame.sequence,
    timestampMs: frame.timestampMs,
    confidence: frame.confidence,
    trackingLost: frame.trackingLost === true,
    head: {
      yaw: frame.head.yaw,
      pitch: frame.head.pitch,
      roll: frame.head.roll,
    },
    eyeLeft: { x: frame.eyeLeft.x, y: frame.eyeLeft.y },
    eyeRight: { x: frame.eyeRight.x, y: frame.eyeRight.y },
    face: encodeSparseFace(frame.face),
    faceCapabilityLevel: options?.faceCapabilityLevel,
  };
}

export type LiveActNetworkDecodeResult =
  | { ok: true; frame: LiveActNetworkFrameV1; liveAct: LiveActFrameV1 }
  | { ok: false; reason: LiveActNetworkDecodeFailure; detail: string };

/**
 * Decode unknown JSON. Fail closed on contract mismatch / biometrics.
 */
export function decodeLiveActNetworkFrame(raw: unknown): LiveActNetworkDecodeResult {
  if (!isPlainObject(raw)) {
    return { ok: false, reason: 'invalid_shape', detail: 'Payload ist kein Objekt.' };
  }
  if (raw.contractVersion !== LIVEACT_NETWORK_FRAME_CONTRACT) {
    return {
      ok: false,
      reason: 'unsupported_contract',
      detail: `Unbekannter Network-Contract: ${String(raw.contractVersion)}`,
    };
  }
  for (const banned of ['landmarks', 'video', 'imageData', 'iris', 'webcam', 'calibrationProfile']) {
    if (raw[banned] !== undefined) {
      return {
        ok: false,
        reason: 'biometric_forbidden',
        detail: `Verbotenes Feld: ${banned}`,
      };
    }
  }
  if (typeof raw.sequence !== 'number' || !Number.isFinite(raw.sequence) || raw.sequence < 1) {
    return { ok: false, reason: 'invalid_shape', detail: 'sequence ungültig.' };
  }
  if (typeof raw.timestampMs !== 'number' || !Number.isFinite(raw.timestampMs)) {
    return { ok: false, reason: 'invalid_shape', detail: 'timestampMs ungültig.' };
  }
  if (typeof raw.confidence !== 'number' || !Number.isFinite(raw.confidence)) {
    return { ok: false, reason: 'invalid_shape', detail: 'confidence ungültig.' };
  }
  if (typeof raw.trackingLost !== 'boolean') {
    return { ok: false, reason: 'invalid_shape', detail: 'trackingLost ungültig.' };
  }
  if (!isPlainObject(raw.head) || !isPlainObject(raw.eyeLeft) || !isPlainObject(raw.eyeRight)) {
    return { ok: false, reason: 'invalid_shape', detail: 'head/eyes ungültig.' };
  }
  const head: LiveActHeadPose = {
    yaw: Number(raw.head.yaw) || 0,
    pitch: Number(raw.head.pitch) || 0,
    roll: Number(raw.head.roll) || 0,
  };
  const eyeLeft: LiveActEyeGaze = {
    x: Number(raw.eyeLeft.x) || 0,
    y: Number(raw.eyeLeft.y) || 0,
  };
  const eyeRight: LiveActEyeGaze = {
    x: Number(raw.eyeRight.x) || 0,
    y: Number(raw.eyeRight.y) || 0,
  };

  const facePartial: Partial<Record<LiveActFaceChannelId, number>> = {};
  if (raw.face !== undefined) {
    if (!isPlainObject(raw.face)) {
      return { ok: false, reason: 'invalid_shape', detail: 'face ungültig.' };
    }
    for (const [key, value] of Object.entries(raw.face)) {
      if (!isLiveActFaceChannelId(key)) continue;
      if (typeof value !== 'number') continue;
      facePartial[key] = clampLiveActChannel(value);
    }
  }

  let faceCapabilityLevel: 0 | 1 | 2 | 3 | undefined;
  if (raw.faceCapabilityLevel !== undefined) {
    if (
      raw.faceCapabilityLevel !== 0 &&
      raw.faceCapabilityLevel !== 1 &&
      raw.faceCapabilityLevel !== 2 &&
      raw.faceCapabilityLevel !== 3
    ) {
      return { ok: false, reason: 'invalid_shape', detail: 'faceCapabilityLevel ungültig.' };
    }
    faceCapabilityLevel = raw.faceCapabilityLevel;
  }

  const network: LiveActNetworkFrameV1 = {
    contractVersion: LIVEACT_NETWORK_FRAME_CONTRACT,
    sequence: raw.sequence,
    timestampMs: raw.timestampMs,
    confidence: Math.min(1, Math.max(0, raw.confidence)),
    trackingLost: raw.trackingLost,
    head,
    eyeLeft,
    eyeRight,
    face: facePartial,
    faceCapabilityLevel,
  };

  const faceBase = createNeutralLiveActFaceChannels() as Record<LiveActFaceChannelId, number>;
  for (const id of LIVEACT_FACE_CHANNELS) {
    const v = facePartial[id];
    if (typeof v === 'number') faceBase[id] = v;
  }
  assertLiveActFaceChannelsLocalOnly(faceBase);

  const liveAct: LiveActFrameV1 = {
    contractVersion: LIVEACT_CONTRACT_VERSION,
    faceContractVersion: LIVEACT_FACE_CONTRACT_VERSION,
    sequence: network.sequence,
    timestampMs: network.timestampMs,
    confidence: network.confidence,
    trackingLost: network.trackingLost,
    head: network.head,
    eyeLeft: network.eyeLeft,
    eyeRight: network.eyeRight,
    face: faceBase,
  };

  return { ok: true, frame: network, liveAct };
}

export function serializeLiveActNetworkFrame(frame: LiveActNetworkFrameV1): string {
  return JSON.stringify(frame);
}

export function parseLiveActNetworkFrameJson(text: string): LiveActNetworkDecodeResult {
  try {
    return decodeLiveActNetworkFrame(JSON.parse(text) as unknown);
  } catch {
    return { ok: false, reason: 'invalid_shape', detail: 'JSON parse fehlgeschlagen.' };
  }
}
