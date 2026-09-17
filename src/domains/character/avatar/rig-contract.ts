/**
 * SagaDrive humanoid rig contract v1 — pure domain (no Three / React).
 * Location: src/domains/character/avatar/rig-contract.ts
 *
 * Capabilities are derived only from validated bone/anchor evidence — never from client claims.
 */

export const RIG_CONTRACT_VERSION = 'SagaDriveHumanoidRigV1' as const;

export const SAGA_DRIVE_HUMANOID_BONES = [
  'root',
  'hips',
  'spine',
  'chest',
  'neck',
  'head',
  'leftUpperArm',
  'leftLowerArm',
  'leftHand',
  'rightUpperArm',
  'rightLowerArm',
  'rightHand',
  'leftUpperLeg',
  'leftLowerLeg',
  'leftFoot',
  'rightUpperLeg',
  'rightLowerLeg',
  'rightFoot',
] as const;

export type SagaDriveHumanoidBoneId = (typeof SAGA_DRIVE_HUMANOID_BONES)[number];

export const SAGA_DRIVE_HUMANOID_ANCHORS = [
  'head',
  'chest',
  'back',
  'hips',
  'leftHand',
  'rightHand',
  'leftFoot',
  'rightFoot',
] as const;

export type SagaDriveHumanoidAnchorId = (typeof SAGA_DRIVE_HUMANOID_ANCHORS)[number];

/** Ordered capability ladder — higher never implied by lower alone. */
export type AvatarRigCapabilityFlag =
  | 'static'
  | 'rigged'
  | 'humanoid'
  | 'vrm-ready'
  | 'rigid-equipment-ready'
  | 'skinned-wearable-ready';

export type AvatarRigAnalysisUiStatus = 'analyzing' | 'ready' | 'limited' | 'failed';

export interface SagaDriveHumanoidRigV1 {
  contractVersion: typeof RIG_CONTRACT_VERSION;
  /** Canonical bone → source bone name that mapped (unique). */
  bones: Readonly<Partial<Record<SagaDriveHumanoidBoneId, string>>>;
  /** Canonical anchor → source node name. */
  anchors: Readonly<Partial<Record<SagaDriveHumanoidAnchorId, string>>>;
  upAxis: 'y';
  forwardAxis: 'z';
  unit: 'meter';
  scaleFactor: number;
}

export interface AvatarRigCapabilities {
  flags: readonly AvatarRigCapabilityFlag[];
  /** Missing humanoid bones when partially rigged. */
  missingBones: readonly SagaDriveHumanoidBoneId[];
  /** Human-readable DE reasons for limited/unsupported features. */
  limitations: readonly string[];
}

export interface AvatarRigAnalysisResult {
  status: AvatarRigAnalysisUiStatus;
  capabilities: AvatarRigCapabilities;
  rig: SagaDriveHumanoidRigV1;
  message: string;
}

const CORE_HUMANOID: readonly SagaDriveHumanoidBoneId[] = [
  'hips',
  'spine',
  'chest',
  'neck',
  'head',
  'leftUpperArm',
  'leftLowerArm',
  'leftHand',
  'rightUpperArm',
  'rightLowerArm',
  'rightHand',
  'leftUpperLeg',
  'leftLowerLeg',
  'leftFoot',
  'rightUpperLeg',
  'rightLowerLeg',
  'rightFoot',
];

export function listMissingHumanoidBones(
  bones: Readonly<Partial<Record<SagaDriveHumanoidBoneId, string>>>,
): SagaDriveHumanoidBoneId[] {
  return CORE_HUMANOID.filter((id) => !bones[id]);
}

/**
 * Derive capability flags from mapped bones. Never trusts external provider success labels.
 */
export function resolveAvatarRigCapabilities(input: {
  boneCount: number;
  mappedBones: Readonly<Partial<Record<SagaDriveHumanoidBoneId, string>>>;
  hasVrmHumanoid: boolean;
  hasSkinnedMesh: boolean;
  scaleFactor: number;
}): AvatarRigCapabilities {
  const missingBones = listMissingHumanoidBones(input.mappedBones);
  const mappedCount = SAGA_DRIVE_HUMANOID_BONES.filter((id) => input.mappedBones[id]).length;
  const limitations: string[] = [];
  const flags: AvatarRigCapabilityFlag[] = ['static'];

  if (input.boneCount <= 0) {
    limitations.push('Kein Skelett erkannt — nur statische Vorschau.');
    return { flags, missingBones: [...CORE_HUMANOID], limitations };
  }

  flags.push('rigged');

  if (missingBones.length === 0) {
    flags.push('humanoid');
  } else {
    limitations.push(
      `Humanoid unvollständig (${missingBones.length} Knochen fehlen) — eingeschränkte Animation.`,
    );
  }

  if (input.hasVrmHumanoid && missingBones.length === 0) {
    flags.push('vrm-ready');
  } else if (input.hasVrmHumanoid && missingBones.length > 0) {
    limitations.push('VRM-Humanoid vorhanden, aber Mapping unvollständig.');
  }

  if (flags.includes('humanoid')) {
    flags.push('rigid-equipment-ready');
  } else {
    limitations.push('Starre Ausrüstung erst mit vollständigem Humanoid-Rig.');
  }

  if (flags.includes('humanoid') && input.hasSkinnedMesh) {
    flags.push('skinned-wearable-ready');
  } else if (flags.includes('humanoid')) {
    limitations.push('Keine SkinnedMeshes — Wearables nur starr möglich.');
  }

  if (input.scaleFactor < 0.05 || input.scaleFactor > 20) {
    limitations.push('Extreme Skalierung — Anzeige normalisiert, Fähigkeiten begrenzt.');
  }

  if (mappedCount === 0 && input.boneCount > 0) {
    limitations.push('Skelett ohne bekannte Bone-Aliase — Mapping eingeschränkt.');
  }

  return { flags, missingBones, limitations };
}

export function summarizeRigAnalysisStatus(
  capabilities: AvatarRigCapabilities,
): AvatarRigAnalysisUiStatus {
  if (capabilities.flags.includes('humanoid') && capabilities.limitations.length === 0) {
    return 'ready';
  }
  if (capabilities.flags.includes('rigged') || capabilities.flags.includes('static')) {
    return capabilities.limitations.length > 0 ? 'limited' : 'ready';
  }
  return 'failed';
}

export function capabilityFlagLabel(flag: AvatarRigCapabilityFlag): string {
  switch (flag) {
    case 'static':
      return 'Statisch';
    case 'rigged':
      return 'Geriggt';
    case 'humanoid':
      return 'Humanoid';
    case 'vrm-ready':
      return 'VRM-bereit';
    case 'rigid-equipment-ready':
      return 'Starre Ausrüstung';
    case 'skinned-wearable-ready':
      return 'Skinned Wearables';
    default: {
      const _exhaustive: never = flag;
      return _exhaustive;
    }
  }
}
