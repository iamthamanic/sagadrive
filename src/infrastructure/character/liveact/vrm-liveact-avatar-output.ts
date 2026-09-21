/**
 * VRM LiveAct avatar output — head, LookAt, ARKit expressions (#332).
 * Location: src/infrastructure/character/liveact/vrm-liveact-avatar-output.ts
 */

import * as THREE from 'three';
import type { VRM } from '@pixiv/three-vrm';
import {
  LIVEACT_FACE_CHANNELS,
  clampLiveActChannel,
  createLiveActAvatarCapabilities,
  type LiveActAvatarCapabilities,
  type LiveActFaceChannelId,
  type LiveActFrameV1,
} from '../../../domains/character/liveact';
import { resolveLiveActChannelTargets } from '../../../domains/character/liveact/liveact-channel-target-aliases';
import type { LiveActAvatarOutput } from './liveact-avatar-output';
import {
  applyLiveActHeadRotation,
  applyLiveActVrmEyeLookAt,
  resetLiveActHeadRotation,
} from './liveact-pose-drive';

function listVrmExpressionNames(vrm: VRM): string[] {
  const manager = vrm.expressionManager;
  if (!manager) return [];
  const names: string[] = [];
  const map = (manager as { expressionMap?: Record<string, unknown> }).expressionMap;
  if (map && typeof map === 'object') {
    names.push(...Object.keys(map));
  }
  const getExpression = (manager as { getExpression?: (name: string) => unknown }).getExpression;
  if (typeof getExpression === 'function') {
    for (const id of LIVEACT_FACE_CHANNELS) {
      for (const alias of [id, id.charAt(0).toUpperCase() + id.slice(1)]) {
        try {
          if (getExpression(alias)) names.push(alias);
        } catch {
          // ignore
        }
      }
    }
  }
  return names;
}

export interface VrmLiveActAvatarOutputDeps {
  vrm: VRM;
  headBone: THREE.Object3D | null;
  headRestQuaternion: THREE.Quaternion;
  eyeLookTarget: THREE.Vector3;
  headScratchEuler: THREE.Euler;
  headScratchQuaternion: THREE.Quaternion;
}

export class VrmLiveActAvatarOutput implements LiveActAvatarOutput {
  private readonly resolved: Readonly<Partial<Record<LiveActFaceChannelId, string>>>;
  private readonly avatarCapabilities: LiveActAvatarCapabilities;
  private disposed = false;

  constructor(private readonly deps: VrmLiveActAvatarOutputDeps) {
    const present = listVrmExpressionNames(deps.vrm);
    const resolution = resolveLiveActChannelTargets(present);
    this.resolved = resolution.resolvedNames;
    const hasLookAt = Boolean(deps.vrm.lookAt);
    this.avatarCapabilities = createLiveActAvatarCapabilities({
      headBone: Boolean(deps.headBone),
      leftEyeBone: hasLookAt,
      rightEyeBone: hasLookAt,
      avatarFace: resolution.faceSupport,
    });
  }

  getAvatarCapabilities(): LiveActAvatarCapabilities {
    return this.avatarCapabilities;
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
    applyLiveActVrmEyeLookAt(
      this.deps.vrm,
      this.deps.eyeLookTarget,
      frame.eyeLeft,
      frame.eyeRight,
    );

    const manager = this.deps.vrm.expressionManager;
    if (!manager) return;

    for (const id of LIVEACT_FACE_CHANNELS) {
      const name = this.resolved[id];
      if (!name) continue;
      const weight = clampLiveActChannel(frame.face[id]);
      try {
        manager.setValue(name, weight);
      } catch {
        // fail-soft per binding
      }
    }
  }

  resetLiveActPose(): void {
    resetLiveActHeadRotation(this.deps.headBone, this.deps.headRestQuaternion);
    this.deps.vrm.lookAt?.reset?.();
    this.deps.vrm.expressionManager?.resetValues?.();
    for (const id of LIVEACT_FACE_CHANNELS) {
      const name = this.resolved[id];
      if (!name || !this.deps.vrm.expressionManager) continue;
      const neutral = id === '_neutral' ? 1 : 0;
      try {
        this.deps.vrm.expressionManager.setValue(name, neutral);
      } catch {
        // ignore
      }
    }
  }

  dispose(): void {
    this.disposed = true;
    this.resetLiveActPose();
  }
}
