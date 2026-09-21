/**
 * Shared head / eye gaze helpers for LiveAct avatar outputs (#332).
 * Location: src/infrastructure/character/liveact/liveact-pose-drive.ts
 */

import * as THREE from 'three';
import type { VRM } from '@pixiv/three-vrm';
import type { LiveActEyeGaze, LiveActHeadPose } from '../../../domains/character/liveact';

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

export function applyLiveActVrmEyeLookAt(
  vrm: VRM | undefined,
  eyeLookTarget: THREE.Vector3,
  eyeLeft: LiveActEyeGaze,
  eyeRight: LiveActEyeGaze,
): void {
  const lookAt = vrm?.lookAt;
  if (!lookAt) return;
  const avgX = (eyeLeft.x + eyeRight.x) * 0.5;
  const avgY = (eyeLeft.y + eyeRight.y) * 0.5;
  eyeLookTarget.set(avgX * 0.35, 1.55 + avgY * 0.2, 1.2);
  lookAt.lookAt(eyeLookTarget);
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
