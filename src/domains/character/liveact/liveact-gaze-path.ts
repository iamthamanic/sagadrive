/**
 * liveact-gaze-path — exclusive Gaze drive path for LiveAct outputs (#403).
 * Location: src/domains/character/liveact/liveact-gaze-path.ts
 *
 * Exactly one path may drive gaze: eye bones, VRM LookAt, or eyeLook morphs.
 * Blink/Squint/Wide stay facial expressions and are never gated here.
 */

import type { LiveActFaceChannelId } from './liveact-face-contract';

/** ARKit eye-look morphs that duplicate bone/LookAt gaze when both are applied. */
export const LIVEACT_EYE_LOOK_FACE_CHANNELS = [
  'eyeLookDownLeft',
  'eyeLookDownRight',
  'eyeLookInLeft',
  'eyeLookInRight',
  'eyeLookOutLeft',
  'eyeLookOutRight',
  'eyeLookUpLeft',
  'eyeLookUpRight',
] as const satisfies readonly LiveActFaceChannelId[];

export type LiveActEyeLookFaceChannelId = (typeof LIVEACT_EYE_LOOK_FACE_CHANNELS)[number];

const EYE_LOOK_SET: ReadonlySet<string> = new Set(LIVEACT_EYE_LOOK_FACE_CHANNELS);

export function isLiveActEyeLookFaceChannel(
  id: LiveActFaceChannelId,
): id is LiveActEyeLookFaceChannelId {
  return EYE_LOOK_SET.has(id);
}

/**
 * Active runtime gaze driver. Preference: bones → LookAt → morphs → none.
 * Callers must not apply a second path when one is selected.
 */
export type LiveActGazeDrivePath = 'bones' | 'lookAt' | 'morphs' | 'none';

export function resolveLiveActGazeDrivePath(input: {
  hasEyeBones: boolean;
  hasLookAt: boolean;
  hasEyeLookMorphs: boolean;
}): LiveActGazeDrivePath {
  if (input.hasEyeBones) return 'bones';
  if (input.hasLookAt) return 'lookAt';
  if (input.hasEyeLookMorphs) return 'morphs';
  return 'none';
}

/** True when face morph/expression application should skip eyeLook* channels. */
export function liveActGazePathSkipsEyeLookMorphs(path: LiveActGazeDrivePath): boolean {
  return path === 'bones' || path === 'lookAt';
}

/** True when bone/LookAt pose drivers should run. */
export function liveActGazePathUsesPoseDriver(path: LiveActGazeDrivePath): boolean {
  return path === 'bones' || path === 'lookAt';
}
