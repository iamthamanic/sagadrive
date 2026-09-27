/**
 * Shared head / eye gaze helpers for LiveAct avatar outputs (#332).
 * Location: src/infrastructure/character/liveact/liveact-pose-drive.ts
 */

import * as THREE from 'three';
import {
  VRMLookAtBoneApplier,
  VRMLookAtExpressionApplier,
  type VRM,
  type VRMLookAtApplier,
  type VRMLookAtRangeMap,
} from '@pixiv/three-vrm';
import type { LiveActEyeGaze, LiveActHeadPose } from '../../../domains/character/liveact';

/** VRMLookAt degrees at gaze ±1 when an asset's LookAt applier exposes no range maps. */
const LIVEACT_LOOKAT_FALLBACK_INPUT_MAX_DEG = 30;

/** VRMLookAt yaw / pitch in degrees that gaze ±1 maps to, per direction. */
export interface LiveActLookAtGazeScaleDeg {
  horizontal: number;
  up: number;
  down: number;
}

function positiveOr(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

/**
 * Gaze ±1 reaches exactly the output the asset declares: the full eye rotation of a bone applier,
 * weight 1 of an expression applier (expression weights saturate at 1, so an outputScale > 1
 * would otherwise reach full weight after a fraction of the gaze range).
 */
export function liveActLookAtGazeScaleDeg(applier: VRMLookAtApplier): LiveActLookAtGazeScaleDeg {
  const fallback = LIVEACT_LOOKAT_FALLBACK_INPUT_MAX_DEG;
  const inputMax = (map: VRMLookAtRangeMap): number => positiveOr(map.inputMaxValue, fallback);
  if (applier instanceof VRMLookAtBoneApplier) {
    // three-vrm's bone applier reads rangeMapVerticalDown for pitch < 0 (up) and
    // rangeMapVerticalUp for pitch > 0 (down); pinned by scripts/liveact-fidelity-check.mjs.
    return {
      horizontal: inputMax(applier.rangeMapHorizontalOuter),
      up: inputMax(applier.rangeMapVerticalDown),
      down: inputMax(applier.rangeMapVerticalUp),
    };
  }
  if (applier instanceof VRMLookAtExpressionApplier) {
    const fullWeightInput = (map: VRMLookAtRangeMap): number =>
      inputMax(map) * Math.min(1, 1 / positiveOr(map.outputScale, 1));
    return {
      horizontal: fullWeightInput(applier.rangeMapHorizontalOuter),
      up: fullWeightInput(applier.rangeMapVerticalUp),
      down: fullWeightInput(applier.rangeMapVerticalDown),
    };
  }
  return { horizontal: fallback, up: fallback, down: fallback };
}

export function applyLiveActHeadRotation(
  headBone: THREE.Object3D | null,
  restQuaternion: THREE.Quaternion,
  head: LiveActHeadPose,
  scratchEuler: THREE.Euler,
  scratchQuaternion: THREE.Quaternion,
): void {
  if (!headBone) return;
  scratchEuler.set(head.pitch, head.yaw, head.roll, 'YXZ');
  scratchQuaternion.setFromEuler(scratchEuler);
  headBone.quaternion.copy(restQuaternion).multiply(scratchQuaternion);
}

/**
 * Eye-in-head gaze: the tracker reports eye rotation relative to the head, so yaw / pitch are
 * set on VRMLookAt (head-relative, no target) instead of aiming at a fixed world point — head
 * turns no longer counter-rotate the eyes and neutral gaze is straight ahead. Scale: see
 * {@link liveActLookAtGazeScaleDeg}. three-vrm: +yaw looks toward +X (avatar's left), +pitch
 * looks down.
 */
export function applyLiveActVrmEyeLookAt(
  vrm: VRM | undefined,
  eyeLeft: LiveActEyeGaze,
  eyeRight: LiveActEyeGaze,
): void {
  const lookAt = vrm?.lookAt;
  if (!lookAt) return;
  const x = (eyeLeft.x + eyeRight.x) * 0.5;
  const y = (eyeLeft.y + eyeRight.y) * 0.5;
  const scale = liveActLookAtGazeScaleDeg(lookAt.applier);
  lookAt.yaw = x * scale.horizontal;
  lookAt.pitch = -y * (y >= 0 ? scale.up : scale.down);
}

export function applyLiveActEyeBoneGaze(
  leftEye: THREE.Object3D | null,
  rightEye: THREE.Object3D | null,
  leftRest: THREE.Quaternion,
  rightRest: THREE.Quaternion,
  eyeLeft: LiveActEyeGaze,
  eyeRight: LiveActEyeGaze,
  scratchEuler: THREE.Euler,
  scratchQuaternion: THREE.Quaternion,
): void {
  if (leftEye) {
    scratchEuler.set(eyeLeft.y * 0.35, eyeLeft.x * 0.35, 0, 'YXZ');
    scratchQuaternion.setFromEuler(scratchEuler);
    leftEye.quaternion.copy(leftRest).multiply(scratchQuaternion);
  }
  if (rightEye) {
    scratchEuler.set(eyeRight.y * 0.35, eyeRight.x * 0.35, 0, 'YXZ');
    scratchQuaternion.setFromEuler(scratchEuler);
    rightEye.quaternion.copy(rightRest).multiply(scratchQuaternion);
  }
}

export function resetLiveActHeadRotation(
  headBone: THREE.Object3D | null,
  restQuaternion: THREE.Quaternion,
): void {
  if (!headBone) return;
  headBone.quaternion.copy(restQuaternion);
}

export function resetLiveActEyeBoneGaze(
  leftEye: THREE.Object3D | null,
  rightEye: THREE.Object3D | null,
  leftRest: THREE.Quaternion,
  rightRest: THREE.Quaternion,
): void {
  if (leftEye) leftEye.quaternion.copy(leftRest);
  if (rightEye) rightEye.quaternion.copy(rightRest);
}
