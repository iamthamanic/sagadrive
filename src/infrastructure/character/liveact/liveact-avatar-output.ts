/**
 * LiveAct avatar output port + factory (#329, #332).
 * Location: src/infrastructure/character/liveact/liveact-avatar-output.ts
 *
 * Concrete VRM/GLB adapters apply atomic LiveActFrameV1 without exclusive facial-layer wipes.
 */

import * as THREE from 'three';
import type { VRM } from '@pixiv/three-vrm';
import type {
  LiveActAvatarCapabilities,
  LiveActFrameV1,
} from '../../../domains/character/liveact';
import { GltfLiveActAvatarOutput } from './gltf-liveact-avatar-output';
import { VrmLiveActAvatarOutput } from './vrm-liveact-avatar-output';

export interface LiveActAvatarOutput {
  applyLiveActFrame(frame: LiveActFrameV1): void;
  resetLiveActPose(): void;
  /** Asset/bone/morph support only — never camera/input flags (#381). */
  getAvatarCapabilities(): LiveActAvatarCapabilities;
  dispose(): void;
}

export interface CreateLiveActAvatarOutputInput {
  root: THREE.Object3D;
  vrm: VRM | undefined;
  headBone: THREE.Object3D | null;
  headRestQuaternion: THREE.Quaternion;
  headScratchEuler: THREE.Euler;
  headScratchQuaternion: THREE.Quaternion;
  eyeLookTarget: THREE.Vector3;
}

export function createLiveActAvatarOutput(
  input: CreateLiveActAvatarOutputInput,
): LiveActAvatarOutput | null {
  if (input.vrm) {
    return new VrmLiveActAvatarOutput({
      vrm: input.vrm,
      headBone: input.headBone,
      headRestQuaternion: input.headRestQuaternion,
      eyeLookTarget: input.eyeLookTarget,
      headScratchEuler: input.headScratchEuler,
      headScratchQuaternion: input.headScratchQuaternion,
    });
  }
  return new GltfLiveActAvatarOutput({
    root: input.root,
    headBone: input.headBone,
    headRestQuaternion: input.headRestQuaternion,
    headScratchEuler: input.headScratchEuler,
    headScratchQuaternion: input.headScratchQuaternion,
  });
}
