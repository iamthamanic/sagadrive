/**
 * VRM LiveAct avatar output — head, LookAt, ARKit expressions (#332, #397, #403).
 * Location: src/infrastructure/character/liveact/vrm-liveact-avatar-output.ts
 */

import * as THREE from 'three';
import type { VRM } from '@pixiv/three-vrm';
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
  headScratchEuler: THREE.Euler;
  headScratchQuaternion: THREE.Quaternion;
}

export class VrmLiveActAvatarOutput implements LiveActAvatarOutput {
  private readonly resolved: Readonly<Partial<Record<LiveActFaceChannelId, string>>>;
  private readonly faceSupported: ReadonlySet<LiveActFaceChannelId>;
  private readonly avatarCapabilities: LiveActAvatarCapabilities;
  private readonly hasLookAt: boolean;
  private readonly gazePath: LiveActGazeDrivePath;
  private disposed = false;
  private applied: LiveActDiagnosticsV2AppliedValues = createUnavailableLiveActAppliedValues();

  constructor(private readonly deps: VrmLiveActAvatarOutputDeps) {
    const present = listVrmExpressionNames(deps.vrm);
    const resolution = resolveLiveActChannelTargets(present);
    this.resolved = resolution.resolvedNames;
    this.hasLookAt = Boolean(deps.vrm.lookAt);
    const hasEyeLookMorphs = LIVEACT_FACE_CHANNELS.some(
      (id) => isLiveActEyeLookFaceChannel(id) && Boolean(this.resolved[id]),
    );
    this.gazePath = resolveLiveActGazeDrivePath({
      hasEyeBones: false,
      hasLookAt: this.hasLookAt,
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
      leftEyeBone: this.hasLookAt,
      rightEyeBone: this.hasLookAt,
      avatarFace: resolution.faceSupport,
      gazeDrivePath: this.gazePath,
      runtimeKind: 'vrm',
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
    if (usePoseGaze && this.hasLookAt) {
      applyLiveActVrmEyeLookAt(this.deps.vrm, frame.eyeLeft, frame.eyeRight);
    } else {
      this.deps.vrm.lookAt?.reset?.();
    }

    const skipEyeLook = liveActGazePathSkipsEyeLookMorphs(this.gazePath);
    const manager = this.deps.vrm.expressionManager;
    const faceApplied: Partial<Record<LiveActFaceChannelId, number>> = {};
    if (manager) {
      for (const id of LIVEACT_FACE_CHANNELS) {
        const name = this.resolved[id];
        if (!name) continue;
        if (skipEyeLook && isLiveActEyeLookFaceChannel(id)) {
          try {
            manager.setValue(name, 0);
          } catch {
            // fail-soft
          }
          continue;
        }
        const weight = clampLiveActChannel(frame.face[id]);
        try {
          manager.setValue(name, weight);
          faceApplied[id] = weight;
        } catch {
          // fail-soft per binding
        }
      }
    }

    this.applied = buildLiveActAppliedValuesFromFace({
      headSupported: Boolean(this.deps.headBone),
      eyeLeftSupported: usePoseGaze && this.hasLookAt,
      eyeRightSupported: usePoseGaze && this.hasLookAt,
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
      eyeLeftSupported: usePoseGaze && this.hasLookAt,
      eyeRightSupported: usePoseGaze && this.hasLookAt,
      faceSupported: this.faceSupported,
      face,
      head: { yaw: 0, pitch: 0, roll: 0 },
      eyeLeft: { x: 0, y: 0 },
      eyeRight: { x: 0, y: 0 },
      mode: 'neutral',
    });
  }
}
