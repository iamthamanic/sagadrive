/**
 * Generic GLB LiveAct avatar output — rig bones + morph targets (#332, #397, #403).
 * Location: src/infrastructure/character/liveact/gltf-liveact-avatar-output.ts
 */

import * as THREE from 'three';
import {
  LIVEACT_FACE_CHANNELS,
  buildLiveActAppliedValuesFromFace,
  clampLiveActChannel,
  createLiveActAvatarCapabilities,
  createUnavailableLiveActAppliedValues,
  isLiveActEyeLookFaceChannel,
  liveActGazePathSkipsEyeLookMorphs,
  liveActGazePathUsesPoseDriver,
  resolveLiveActGazeDrivePath,
  type LiveActAvatarCapabilities,
  type LiveActDiagnosticsV2AppliedValues,
  type LiveActFaceChannelId,
  type LiveActFrameV1,
  type LiveActGazeDrivePath,
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
  private readonly faceSupported: ReadonlySet<LiveActFaceChannelId>;
  private readonly avatarCapabilities: LiveActAvatarCapabilities;
  private readonly leftEyeBone: THREE.Object3D | null;
  private readonly rightEyeBone: THREE.Object3D | null;
  private readonly leftEyeRest = new THREE.Quaternion();
  private readonly rightEyeRest = new THREE.Quaternion();
  private readonly gazePath: LiveActGazeDrivePath;
  private disposed = false;
  private applied: LiveActDiagnosticsV2AppliedValues = createUnavailableLiveActAppliedValues();

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

    const hasEyeLookMorphs = LIVEACT_FACE_CHANNELS.some(
      (id) => isLiveActEyeLookFaceChannel(id) && Boolean(this.resolved[id]),
    );
    this.gazePath = resolveLiveActGazeDrivePath({
      hasEyeBones: Boolean(this.leftEyeBone && this.rightEyeBone),
      hasLookAt: false,
      hasEyeLookMorphs,
    });
    const skipEyeLook = liveActGazePathSkipsEyeLookMorphs(this.gazePath);
    this.faceSupported = new Set(
      LIVEACT_FACE_CHANNELS.filter((id) => {
        if (!this.resolved[id]) return false;
        if (skipEyeLook && isLiveActEyeLookFaceChannel(id)) return false;
        return true;
      }),
    );

    this.avatarCapabilities = createLiveActAvatarCapabilities({
      headBone: Boolean(deps.headBone),
      leftEyeBone: Boolean(this.leftEyeBone),
      rightEyeBone: Boolean(this.rightEyeBone),
      avatarFace: resolution.faceSupport,
    });
    this.recordNeutralApplied();
  }

  getAvatarCapabilities(): LiveActAvatarCapabilities {
    return this.avatarCapabilities;
  }

  getAppliedDiagnostics(): LiveActDiagnosticsV2AppliedValues {
    return this.applied;
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
    const usePoseGaze = liveActGazePathUsesPoseDriver(this.gazePath);
    if (usePoseGaze) {
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
    } else {
      resetLiveActEyeBoneGaze(
        this.leftEyeBone,
        this.rightEyeBone,
        this.leftEyeRest,
        this.rightEyeRest,
      );
    }

    const skipEyeLook = liveActGazePathSkipsEyeLookMorphs(this.gazePath);
    const faceApplied: Partial<Record<LiveActFaceChannelId, number>> = {};
    for (const id of LIVEACT_FACE_CHANNELS) {
      const targetName = this.resolved[id];
      if (!targetName) continue;
      if (skipEyeLook && isLiveActEyeLookFaceChannel(id)) {
        // Keep morphs at neutral when bones own gaze (#403 exclusivity).
        const bindings = this.morphIndex.get(targetName);
        if (bindings?.length) {
          for (const binding of bindings) {
            const influences = binding.mesh.morphTargetInfluences;
            if (!influences) continue;
            influences[binding.index] = 0;
          }
        }
        continue;
      }
      const bindings = this.morphIndex.get(targetName);
      if (!bindings?.length) continue;
      const weight = clampLiveActChannel(frame.face[id]);
      for (const binding of bindings) {
        const influences = binding.mesh.morphTargetInfluences;
        if (!influences) continue;
        influences[binding.index] = weight;
      }
      faceApplied[id] = weight;
    }

    this.applied = buildLiveActAppliedValuesFromFace({
      headSupported: Boolean(this.deps.headBone),
      eyeLeftSupported: usePoseGaze && Boolean(this.leftEyeBone),
      eyeRightSupported: usePoseGaze && Boolean(this.rightEyeBone),
      faceSupported: this.faceSupported,
      face: faceApplied,
      head: frame.head,
      eyeLeft: frame.eyeLeft,
      eyeRight: frame.eyeRight,
      mode: 'driven',
    });
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
    this.recordNeutralApplied();
  }

  dispose(): void {
    this.disposed = true;
    this.resetLiveActPose();
    this.applied = createUnavailableLiveActAppliedValues();
  }

  private recordNeutralApplied(): void {
    const face: Partial<Record<LiveActFaceChannelId, number>> = {};
    for (const id of this.faceSupported) {
      face[id] = id === '_neutral' ? 1 : 0;
    }
    const usePoseGaze = liveActGazePathUsesPoseDriver(this.gazePath);
    this.applied = buildLiveActAppliedValuesFromFace({
      headSupported: Boolean(this.deps.headBone),
      eyeLeftSupported: usePoseGaze && Boolean(this.leftEyeBone),
      eyeRightSupported: usePoseGaze && Boolean(this.rightEyeBone),
      faceSupported: this.faceSupported,
      face,
      head: { yaw: 0, pitch: 0, roll: 0 },
      eyeLeft: { x: 0, y: 0 },
      eyeRight: { x: 0, y: 0 },
      mode: 'neutral',
    });
  }
}
