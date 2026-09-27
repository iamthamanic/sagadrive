/**
 * LiveAct capability matrix — Input (engine) vs Avatar (asset) ownership (#381).
 * Location: src/domains/character/liveact/liveact-capabilities.ts
 *
 * Pure domain: no React / Three / MediaPipe.
 */

import {
  LIVEACT_FACE_CHANNELS,
  type LiveActFaceChannelId,
} from './liveact-face-contract';
import type { LiveActGazeDrivePath } from './liveact-gaze-path';

export const LIVEACT_CAPABILITIES_VERSION = 'SagaDriveLiveActCapabilitiesV1' as const;

export interface LiveActInputCapabilities {
  face: boolean;
  headPose: boolean;
  eyeGaze: boolean;
}

export interface LiveActAvatarBoneCapabilities {
  head: boolean;
  leftEye: boolean;
  rightEye: boolean;
}

export type LiveActAvatarFaceChannelSupport = Readonly<
  Record<LiveActFaceChannelId, boolean>
>;

/** Asset-only support discovered from the loaded VRM/GLB (no camera/input flags). */
export interface LiveActAvatarCapabilities {
  avatarBones: LiveActAvatarBoneCapabilities;
  avatarFace: LiveActAvatarFaceChannelSupport;
  activeFaceChannelCount: number;
  totalFaceChannelCount: number;
  /** Exclusive gaze driver discovered at bind time (#403). */
  gazeDrivePath: LiveActGazeDrivePath;
  /** Adapter that produced this capability snapshot. */
  runtimeKind: 'vrm' | 'gltf';
}

/** Composed inspector matrix: Input (engine) + Avatar (asset). */
export interface LiveActCapabilitiesV1 {
  contractVersion: typeof LIVEACT_CAPABILITIES_VERSION;
  input: LiveActInputCapabilities;
  avatarBones: LiveActAvatarBoneCapabilities;
  avatarFace: LiveActAvatarFaceChannelSupport;
  activeFaceChannelCount: number;
  totalFaceChannelCount: number;
  gazeDrivePath: LiveActGazeDrivePath;
  runtimeKind: 'vrm' | 'gltf';
}

export function createEmptyLiveActAvatarFaceSupport(): LiveActAvatarFaceChannelSupport {
  const out = {} as Record<LiveActFaceChannelId, boolean>;
  for (const id of LIVEACT_FACE_CHANNELS) {
    out[id] = false;
  }
  return out;
}

export function createLiveActInputCapabilities(input: {
  face?: boolean;
  headPose?: boolean;
  eyeGaze?: boolean;
}): LiveActInputCapabilities {
  return {
    face: input.face === true,
    headPose: input.headPose === true,
    eyeGaze: input.eyeGaze === true,
  };
}

export function createLiveActAvatarCapabilities(input: {
  headBone?: boolean;
  leftEyeBone?: boolean;
  rightEyeBone?: boolean;
  avatarFace?: Partial<Record<LiveActFaceChannelId, boolean>>;
  gazeDrivePath?: LiveActGazeDrivePath;
  runtimeKind?: 'vrm' | 'gltf';
}): LiveActAvatarCapabilities {
  const avatarFace = createEmptyLiveActAvatarFaceSupport() as Record<
    LiveActFaceChannelId,
    boolean
  >;
  let active = 0;
  for (const id of LIVEACT_FACE_CHANNELS) {
    const supported = input.avatarFace?.[id] === true;
    avatarFace[id] = supported;
    if (supported) active += 1;
  }
  return {
    avatarBones: {
      head: input.headBone === true,
      leftEye: input.leftEyeBone === true,
      rightEye: input.rightEyeBone === true,
    },
    avatarFace,
    activeFaceChannelCount: active,
    totalFaceChannelCount: LIVEACT_FACE_CHANNELS.length,
    gazeDrivePath: input.gazeDrivePath ?? 'none',
    runtimeKind: input.runtimeKind ?? 'gltf',
  };
}

/** Sole public compose path: engine input × asset avatar → inspector matrix. */
export function composeLiveActCapabilities(
  input: LiveActInputCapabilities,
  avatar: LiveActAvatarCapabilities,
): LiveActCapabilitiesV1 {
  return {
    contractVersion: LIVEACT_CAPABILITIES_VERSION,
    input: {
      face: input.face === true,
      headPose: input.headPose === true,
      eyeGaze: input.eyeGaze === true,
    },
    avatarBones: { ...avatar.avatarBones },
    avatarFace: avatar.avatarFace,
    activeFaceChannelCount: avatar.activeFaceChannelCount,
    totalFaceChannelCount: avatar.totalFaceChannelCount,
    gazeDrivePath: avatar.gazeDrivePath,
    runtimeKind: avatar.runtimeKind,
  };
}

/**
 * @deprecated Prefer createLiveActAvatarCapabilities + createLiveActInputCapabilities + compose.
 * Kept for transitional call sites / tests; routes through compose.
 */
export function createLiveActCapabilities(input: {
  face?: boolean;
  headPose?: boolean;
  eyeGaze?: boolean;
  headBone?: boolean;
  leftEyeBone?: boolean;
  rightEyeBone?: boolean;
  avatarFace?: Partial<Record<LiveActFaceChannelId, boolean>>;
}): LiveActCapabilitiesV1 {
  return composeLiveActCapabilities(
    createLiveActInputCapabilities({
      face: input.face,
      headPose: input.headPose,
      eyeGaze: input.eyeGaze,
    }),
    createLiveActAvatarCapabilities({
      headBone: input.headBone,
      leftEyeBone: input.leftEyeBone,
      rightEyeBone: input.rightEyeBone,
      avatarFace: input.avatarFace,
    }),
  );
}
