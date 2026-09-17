/**
 * Deterministic bone alias tables — Infrastructure mapping helpers (pure strings).
 * Location: src/infrastructure/character/avatar/rig-bone-aliases.ts
 *
 * Maps VRM / Meshy / SkinTokens / Blender common names → SagaDriveHumanoidBoneId.
 */

import type { SagaDriveHumanoidBoneId } from '../../../domains/character/avatar';

/** Lowercase source bone name → canonical id. First match wins; later aliases must not remap. */
export const BONE_ALIAS_TABLE: Readonly<Record<string, SagaDriveHumanoidBoneId>> = {
  // VRM / UniVRM
  hips: 'hips',
  j_hips: 'hips',
  spine: 'spine',
  j_spine: 'spine',
  chest: 'chest',
  j_chest: 'chest',
  upperchest: 'chest',
  neck: 'neck',
  j_neck: 'neck',
  head: 'head',
  j_head: 'head',
  leftupperarm: 'leftUpperArm',
  left_upper_arm: 'leftUpperArm',
  j_leftupperarm: 'leftUpperArm',
  leftlowerarm: 'leftLowerArm',
  left_lower_arm: 'leftLowerArm',
  lefthand: 'leftHand',
  left_hand: 'leftHand',
  rightupperarm: 'rightUpperArm',
  right_upper_arm: 'rightUpperArm',
  rightlowerarm: 'rightLowerArm',
  right_lower_arm: 'rightLowerArm',
  righthand: 'rightHand',
  right_hand: 'rightHand',
  leftupperleg: 'leftUpperLeg',
  left_upper_leg: 'leftUpperLeg',
  leftlowerleg: 'leftLowerLeg',
  left_lower_leg: 'leftLowerLeg',
  leftfoot: 'leftFoot',
  left_foot: 'leftFoot',
  rightupperleg: 'rightUpperLeg',
  right_upper_leg: 'rightUpperLeg',
  rightlowerleg: 'rightLowerLeg',
  right_lower_leg: 'rightLowerLeg',
  rightfoot: 'rightFoot',
  right_foot: 'rightFoot',
  // Mixamo / Blender
  'mixamorig:hips': 'hips',
  'mixamorig:spine': 'spine',
  'mixamorig:spine1': 'chest',
  'mixamorig:spine2': 'chest',
  'mixamorig:neck': 'neck',
  'mixamorig:head': 'head',
  'mixamorig:leftarm': 'leftUpperArm',
  'mixamorig:leftforearm': 'leftLowerArm',
  'mixamorig:lefthand': 'leftHand',
  'mixamorig:rightarm': 'rightUpperArm',
  'mixamorig:rightforearm': 'rightLowerArm',
  'mixamorig:righthand': 'rightHand',
  'mixamorig:leftupleg': 'leftUpperLeg',
  'mixamorig:leftleg': 'leftLowerLeg',
  'mixamorig:leftfoot': 'leftFoot',
  'mixamorig:rightupleg': 'rightUpperLeg',
  'mixamorig:rightleg': 'rightLowerLeg',
  'mixamorig:rightfoot': 'rightFoot',
  // Meshy / SkinTokens-ish
  pelvis: 'hips',
  hip: 'hips',
  torso: 'spine',
  chest_bone: 'chest',
  l_upperarm: 'leftUpperArm',
  l_forearm: 'leftLowerArm',
  l_hand: 'leftHand',
  r_upperarm: 'rightUpperArm',
  r_forearm: 'rightLowerArm',
  r_hand: 'rightHand',
  l_thigh: 'leftUpperLeg',
  l_calf: 'leftLowerLeg',
  l_foot: 'leftFoot',
  r_thigh: 'rightUpperLeg',
  r_calf: 'rightLowerLeg',
  r_foot: 'rightFoot',
  armature: 'root',
  root: 'root',
};

const IGNORE_SUBSTRINGS = [
  'twist',
  'helper',
  'ik_',
  '_ik',
  'ctrl',
  'control',
  'end',
  'tip',
  'roll',
] as const;

export function normalizeBoneName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '_');
}

export function shouldIgnoreBoneName(name: string): boolean {
  const n = normalizeBoneName(name);
  return IGNORE_SUBSTRINGS.some((token) => n.includes(token));
}

export function resolveCanonicalBoneId(sourceName: string): SagaDriveHumanoidBoneId | undefined {
  if (shouldIgnoreBoneName(sourceName)) return undefined;
  const key = normalizeBoneName(sourceName);
  return BONE_ALIAS_TABLE[key];
}

/** Max bones visited during analysis (unbounded graph guard). */
export const RIG_ANALYSIS_MAX_BONES = 512;
export const RIG_ANALYSIS_MAX_NODES = 4096;
