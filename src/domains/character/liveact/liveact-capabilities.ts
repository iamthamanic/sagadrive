/**
 * LiveAct capability matrix — which input / avatar channels are available (pure domain).
 * Location: src/domains/character/liveact/liveact-capabilities.ts
 *
 * Used by later inspector UI (5/7). No React / Three / MediaPipe.
 */

import {
  LIVEACT_FACE_CHANNELS,
  type LiveActFaceChannelId,
} from './liveact-face-contract';

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

export interface LiveActCapabilitiesV1 {
  contractVersion: typeof LIVEACT_CAPABILITIES_VERSION;
  input: LiveActInputCapabilities;
  avatarBones: LiveActAvatarBoneCapabilities;
  avatarFace: LiveActAvatarFaceChannelSupport;
  /** Count of avatar face channels reported as supported. */
  activeFaceChannelCount: number;
  totalFaceChannelCount: number;
}

export function createEmptyLiveActAvatarFaceSupport(): LiveActAvatarFaceChannelSupport {
  const out = {} as Record<LiveActFaceChannelId, boolean>;
  for (const id of LIVEACT_FACE_CHANNELS) {
    out[id] = false;
  }
  return out;
}

export function createLiveActCapabilities(input: {
  face?: boolean;
  headPose?: boolean;
  eyeGaze?: boolean;
  headBone?: boolean;
  leftEyeBone?: boolean;
  rightEyeBone?: boolean;
  avatarFace?: Partial<Record<LiveActFaceChannelId, boolean>>;
}): LiveActCapabilitiesV1 {
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
    contractVersion: LIVEACT_CAPABILITIES_VERSION,
    input: {
      face: input.face === true,
      headPose: input.headPose === true,
      eyeGaze: input.eyeGaze === true,
    },
    avatarBones: {
      head: input.headBone === true,
      leftEye: input.leftEyeBone === true,
      rightEye: input.rightEyeBone === true,
    },
    avatarFace,
    activeFaceChannelCount: active,
    totalFaceChannelCount: LIVEACT_FACE_CHANNELS.length,
  };
}
