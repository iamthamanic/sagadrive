/**
 * Generic GLB LiveAct avatar output — rig bones + morph targets (#332).
 * Location: src/infrastructure/character/liveact/gltf-liveact-avatar-output.ts
 */

import * as THREE from 'three';
import {
  LIVEACT_FACE_CHANNELS,
  clampLiveActChannel,
  createLiveActCapabilities,
  type LiveActCapabilitiesV1,
  type LiveActFaceChannelId,
  type LiveActFrameV1,
} from '../../../domains/character/liveact';
import { resolveLiveActChannelTargets } from '../../../domains/character/liveact/liveact-channel-target-aliases';
import type { LiveActAvatarOutput } from './liveact-avatar-output';
import { resolveLiveActEyeBones } from './liveact-eye-bone-aliases';
import {
  buildLiveActMorphTargetIndex,
  listLiveActMorphTargetNames,
  type LiveActMorphTargetIndex,
} from './liveact-morph-target-index';
import {
  applyLiveActEyeBoneGaze,
  applyLiveActHeadRotation,
  resetLiveActEyeBoneGaze,
  resetLiveActHeadRotation,
} from './liveact-pose-drive';

export interface GltfLiveActAvatarOutputDeps {
  root: THREE.Object3D;
  headBone: THREE.Object3D | null;
  headRestQuaternion: THREE.Quaternion;
  headScratchEuler: THREE.Euler;
  headScratchQuaternion: THREE.Quaternion;
}

export class GltfLiveActAvatarOutput implements LiveActAvatarOutput {
  private readonly morphIndex: LiveActMorphTargetIndex;
  private readonly resolved: Readonly<Partial<Record<LiveActFaceChannelId, string>>>;
  private readonly capabilities: LiveActCapabilitiesV1;
  private readonly leftEyeBone: THREE.Object3D | null;
  private readonly rightEyeBone: THREE.Object3D | null;
  private readonly leftEyeRest = new THREE.Quaternion();
  private readonly rightEyeRest = new THREE.Quaternion();
  private disposed = false;

  constructor(private readonly deps: GltfLiveActAvatarOutputDeps) {
    this.morphIndex = buildLiveActMorphTargetIndex(deps.root);
    const present = listLiveActMorphTargetNames(this.morphIndex);
    const resolution = resolveLiveActChannelTargets(present);
    this.resolved = resolution.resolvedNames;

    const eyes = resolveLiveActEyeBones(deps.root);
    this.leftEyeBone = eyes.left;
    this.rightEyeBone = eyes.right;
    if (this.leftEyeBone) this.leftEyeRest.copy(this.leftEyeBone.quaternion);
    if (this.rightEyeBone) this.rightEyeRest.copy(this.rightEyeBone.quaternion);

    this.capabilities = createLiveActCapabilities({
      headBone: Boolean(deps.headBone),
      leftEyeBone: Boolean(this.leftEyeBone),
      rightEyeBone: Boolean(this.rightEyeBone),
      avatarFace: resolution.faceSupport,
    });
  }

  getCapabilities(): LiveActCapabilitiesV1 {
    return this.capabilities;
  }

  applyLiveActFrame(frame: LiveActFrameV1): void {
    if (this.disposed || frame.trackingLost) {
      this.resetLiveActPose();
      return;
    }

    applyLiveActHeadRotation(
      this.deps.headBone,
      this.deps.headRestQuaternion,
      frame.head,
      this.deps.headScratchEuler,
      this.deps.headScratchQuaternion,
    );
    applyLiveActEyeBoneGaze(
      this.leftEyeBone,
      this.rightEyeBone,
      this.leftEyeRest,
      this.rightEyeRest,
      frame.eyeLeft,
      frame.eyeRight,
      this.deps.headScratchEuler,
      this.deps.headScratchQuaternion,
    );

    for (const id of LIVEACT_FACE_CHANNELS) {
      const targetName = this.resolved[id];
      if (!targetName) continue;
      const bindings = this.morphIndex.get(targetName);
      if (!bindings?.length) continue;
      const weight = clampLiveActChannel(frame.face[id]);
      for (const binding of bindings) {
        const influences = binding.mesh.morphTargetInfluences;
        if (!influences) continue;
        influences[binding.index] = weight;
      }
    }
  }

  resetLiveActPose(): void {
    resetLiveActHeadRotation(this.deps.headBone, this.deps.headRestQuaternion);
    resetLiveActEyeBoneGaze(
      this.leftEyeBone,
      this.rightEyeBone,
      this.leftEyeRest,
      this.rightEyeRest,
    );
    for (const id of LIVEACT_FACE_CHANNELS) {
      const targetName = this.resolved[id];
      if (!targetName) continue;
      const bindings = this.morphIndex.get(targetName);
      if (!bindings?.length) continue;
      const neutral = id === '_neutral' ? 1 : 0;
      for (const binding of bindings) {
        const influences = binding.mesh.morphTargetInfluences;
        if (!influences) continue;
        influences[binding.index] = neutral;
      }
    }
  }

  dispose(): void {
    this.disposed = true;
    this.resetLiveActPose();
  }
}
