/**
 * LiveAct Face Asset contract — provider-neutral profiles for Runtime GLBs (#382).
 * Location: src/domains/character/liveact/liveact-face-asset-contract.ts
 *
 * Describes what a loaded avatar must expose as Face-Asset — never DCC tooling as runtime.
 * Pure domain: no React / Three / MediaPipe.
 */

import {
  LIVEACT_FACE_CHANNELS,
  type LiveActFaceChannelId,
} from './liveact-face-contract';

export const LIVEACT_FACE_ASSET_CONTRACT_VERSION = 'SagaDriveLiveActFaceAssetV1' as const;

export type LiveActFaceAssetProfileId = 'core-v1' | 'full-v1';

/** Exactly one gaze path for LiveAct V1 assets. */
export type LiveActFaceAssetGazeMode = 'none' | 'morphs' | 'bones';

/**
 * P0 product floor — inspector core channels (exact set).
 * `_neutral` is never a required deforming morph.
 */
export const LIVEACT_FACE_ASSET_CORE_V1_CHANNELS = [
  'eyeBlinkLeft',
  'eyeBlinkRight',
  'jawOpen',
  'mouthSmileLeft',
  'mouthSmileRight',
  'mouthFrownLeft',
  'mouthFrownRight',
  'mouthPucker',
  'mouthShrugUpper',
  'mouthShrugLower',
] as const satisfies readonly LiveActFaceChannelId[];

/** All animatable LiveAct face channels (excludes `_neutral`). */
export const LIVEACT_FACE_ASSET_FULL_V1_CHANNELS: readonly LiveActFaceChannelId[] =
  LIVEACT_FACE_CHANNELS.filter((id) => id !== '_neutral');

/** Eye-look morph targets required when gazeMode is `morphs`. */
export const LIVEACT_FACE_ASSET_GAZE_MORPH_CHANNELS = [
  'eyeLookDownLeft',
  'eyeLookDownRight',
  'eyeLookInLeft',
  'eyeLookInRight',
  'eyeLookOutLeft',
  'eyeLookOutRight',
  'eyeLookUpLeft',
  'eyeLookUpRight',
] as const satisfies readonly LiveActFaceChannelId[];

/** Explicitly outside LiveAct V1 capability counting (may exist on mesh unused). */
export const LIVEACT_FACE_ASSET_EXCLUDED_FROM_V1 = ['_neutral', 'tongueOut'] as const;

export interface LiveActFaceAssetInventory {
  /** Morph / expression target names present on the asset (semantic channel ids). */
  presentChannels: readonly string[];
  /** True when dedicated left/right eye bones (or VRM LookAt) can drive gaze. */
  hasEyeBones: boolean;
}

export interface LiveActFaceAssetProfileCheckResult {
  profileId: LiveActFaceAssetProfileId;
  gazeMode: LiveActFaceAssetGazeMode;
  ok: boolean;
  missingChannels: readonly LiveActFaceChannelId[];
  missingGaze: boolean;
}

export function liveActFaceAssetRequiredChannels(
  profileId: LiveActFaceAssetProfileId,
): readonly LiveActFaceChannelId[] {
  return profileId === 'core-v1'
    ? LIVEACT_FACE_ASSET_CORE_V1_CHANNELS
    : LIVEACT_FACE_ASSET_FULL_V1_CHANNELS;
}

export function isLiveActFaceAssetV1Channel(id: string): id is LiveActFaceChannelId {
  if (id === '_neutral' || id === 'tongueOut') return false;
  return (LIVEACT_FACE_CHANNELS as readonly string[]).includes(id);
}

/**
 * Deterministic profile check against a present channel name set + eye-bone flag.
 * `_neutral` is never required as a deforming morph; `tongueOut` is never a V1 channel.
 */
export function checkLiveActFaceAssetProfile(
  inventory: LiveActFaceAssetInventory,
  profileId: LiveActFaceAssetProfileId,
  gazeMode: LiveActFaceAssetGazeMode,
): LiveActFaceAssetProfileCheckResult {
  const present = new Set(inventory.presentChannels);
  const required = liveActFaceAssetRequiredChannels(profileId);
  const missingChannels = required.filter((id) => !present.has(id));

  let missingGaze = false;
  if (gazeMode === 'morphs') {
    missingGaze = LIVEACT_FACE_ASSET_GAZE_MORPH_CHANNELS.some((id) => !present.has(id));
  } else if (gazeMode === 'bones') {
    missingGaze = !inventory.hasEyeBones;
  }

  return {
    profileId,
    gazeMode,
    ok: missingChannels.length === 0 && !missingGaze,
    missingChannels,
    missingGaze,
  };
}
