/**
 * LiveActRetargetProfileV1 — per-channel gain/deadZone before avatar output (#385).
 * Location: src/domains/character/liveact/liveact-retarget-profile.ts
 *
 * Pure domain. Does not change head/gaze/calibration/trackingLost semantics.
 * `_neutral` is never amplified. Non-finite config fails closed to identity.
 */

import {
  LIVEACT_FACE_CHANNELS,
  clampLiveActChannel,
  type LiveActFaceChannelId,
} from './liveact-face-contract';
import type { LiveActFrameV1 } from './liveact-contract';

export const LIVEACT_RETARGET_PROFILE_VERSION = 'SagaDriveLiveActRetargetProfileV1' as const;

export interface LiveActChannelRetargetV1 {
  /** Multiplier after dead-zone (default 1). */
  gain: number;
  /** Values at or below this map to 0 before gain (default 0). */
  deadZone: number;
}

export interface LiveActRetargetProfileV1 {
  contractVersion: typeof LIVEACT_RETARGET_PROFILE_VERSION;
  /** Sparse overrides; missing channels use identity (gain=1, deadZone=0). */
  channels: Readonly<Partial<Record<LiveActFaceChannelId, LiveActChannelRetargetV1>>>;
}

export const IDENTITY_CHANNEL_RETARGET: Readonly<LiveActChannelRetargetV1> = {
  gain: 1,
  deadZone: 0,
};

export function createIdentityLiveActRetargetProfile(): LiveActRetargetProfileV1 {
  return {
    contractVersion: LIVEACT_RETARGET_PROFILE_VERSION,
    channels: {},
  };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Validate/normalize a profile. Invalid entries are dropped (fail closed → identity for that channel).
 */
export function normalizeLiveActRetargetProfile(
  input: LiveActRetargetProfileV1 | null | undefined,
): LiveActRetargetProfileV1 {
  if (!input || input.contractVersion !== LIVEACT_RETARGET_PROFILE_VERSION) {
    return createIdentityLiveActRetargetProfile();
  }
  const channels: Partial<Record<LiveActFaceChannelId, LiveActChannelRetargetV1>> = {};
  for (const id of LIVEACT_FACE_CHANNELS) {
    if (id === '_neutral') continue;
    const raw = input.channels?.[id];
    if (!raw) continue;
    if (!isFiniteNumber(raw.gain) || !isFiniteNumber(raw.deadZone)) continue;
    if (raw.gain < 0 || raw.deadZone < 0 || raw.deadZone >= 1) continue;
    channels[id] = { gain: raw.gain, deadZone: raw.deadZone };
  }
  return {
    contractVersion: LIVEACT_RETARGET_PROFILE_VERSION,
    channels,
  };
}

/**
 * Apply deadZone then gain, then clamp to 0..1.
 * `_neutral` and missing/invalid config → identity.
 */
export function retargetLiveActChannel(
  channelId: LiveActFaceChannelId,
  value: number,
  profile: LiveActRetargetProfileV1,
): number {
  const base = clampLiveActChannel(value);
  if (channelId === '_neutral') return base;
  const cfg = profile.channels[channelId];
  if (!cfg) return base;
  if (!isFiniteNumber(cfg.gain) || !isFiniteNumber(cfg.deadZone)) return base;
  if (cfg.deadZone < 0 || cfg.deadZone >= 1 || cfg.gain < 0) return base;
  if (base <= cfg.deadZone) return 0;
  return clampLiveActChannel(base * cfg.gain);
}

/**
 * Returns a shallow-copied frame with retargeted face channels only.
 * Head, gaze, confidence, trackingLost, sequence remain unchanged.
 */
export function applyLiveActRetargetProfile(
  frame: LiveActFrameV1,
  profile: LiveActRetargetProfileV1,
): LiveActFrameV1 {
  const normalized = normalizeLiveActRetargetProfile(profile);
  if (frame.trackingLost) {
    return frame;
  }
  const face = { ...frame.face };
  for (const id of LIVEACT_FACE_CHANNELS) {
    face[id] = retargetLiveActChannel(id, frame.face[id], normalized);
  }
  return { ...frame, face };
}

/** Production default: identity until a documented QA override registry exists. */
export const DEFAULT_LIVEACT_RETARGET_PROFILE: LiveActRetargetProfileV1 =
  createIdentityLiveActRetargetProfile();
