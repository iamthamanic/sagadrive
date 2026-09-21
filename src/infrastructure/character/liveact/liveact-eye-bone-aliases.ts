/**
 * Optional eye bone name aliases for generic GLB LiveAct gaze (#332).
 * Location: src/infrastructure/character/liveact/liveact-eye-bone-aliases.ts
 */

import * as THREE from 'three';

const LEFT_EYE_ALIASES = [
  'lefteye',
  'eye_l',
  'left_eye',
  'l_eye',
  'mixamorig:lefteye',
  'mixamorig:eye_l',
] as const;

const RIGHT_EYE_ALIASES = [
  'righteye',
  'eye_r',
  'right_eye',
  'r_eye',
  'mixamorig:righteye',
  'mixamorig:eye_r',
] as const;

function normalizeBoneName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '');
}

export function resolveLiveActEyeBones(root: THREE.Object3D): {
  left: THREE.Object3D | null;
  right: THREE.Object3D | null;
} {
  const leftSet = new Set<string>(LEFT_EYE_ALIASES);
  const rightSet = new Set<string>(RIGHT_EYE_ALIASES);
  let left: THREE.Object3D | null = null;
  let right: THREE.Object3D | null = null;

  root.traverse((object) => {
    if (!(object instanceof THREE.Bone)) return;
    const key = normalizeBoneName(object.name);
    if (!left && leftSet.has(key)) left = object;
    if (!right && rightSet.has(key)) right = object;
  });

  return { left, right };
}
