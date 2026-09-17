/**
 * Avatar animation contract — pure domain (no React / Three / network).
 * Location: src/domains/character/avatar/animation-contract.ts
 *
 * Allowlisted preview clips retarget exclusively via SagaDriveHumanoidRigV1
 * canonical bone handles. Capabilities are never raised by animation success.
 */

import {
  RIG_CONTRACT_VERSION,
  type AvatarRigCapabilityFlag,
  type SagaDriveHumanoidBoneId,
  type SagaDriveHumanoidAnchorId,
} from './rig-contract';

export const ANIMATION_CONTRACT_VERSION = 'SagaDriveAvatarAnimationV1' as const;

export const AVATAR_ANIMATION_ACTIONS = ['idle', 'walk', 'combat', 'emote'] as const;
export type AvatarAnimationActionId = (typeof AVATAR_ANIMATION_ACTIONS)[number];

export interface AvatarAnimationClipCatalogEntry {
  actionId: AvatarAnimationActionId;
  clipId: string;
  labelDe: string;
  /** Canonical bones required for this clip to be playable. */
  requiredBones: readonly SagaDriveHumanoidBoneId[];
  /** Preferred rigid attachment anchor while this clip plays. */
  attachmentAnchor: SagaDriveHumanoidAnchorId;
  loop: boolean;
}

/** Allowlisted SagaDrive preview clips — no remote arbitrary animation URLs. */
export const AVATAR_ANIMATION_CATALOG: readonly AvatarAnimationClipCatalogEntry[] = [
  {
    actionId: 'idle',
    clipId: 'sagadrive-preview-idle-v1',
    labelDe: 'Idle',
    requiredBones: ['hips', 'spine', 'chest', 'neck', 'head'],
    attachmentAnchor: 'hips',
    loop: true,
  },
  {
    actionId: 'walk',
    clipId: 'sagadrive-preview-walk-v1',
    labelDe: 'Walk',
    requiredBones: [
      'hips',
      'leftUpperLeg',
      'leftLowerLeg',
      'leftFoot',
      'rightUpperLeg',
      'rightLowerLeg',
      'rightFoot',
    ],
    attachmentAnchor: 'hips',
    loop: true,
  },
  {
    actionId: 'combat',
    clipId: 'sagadrive-preview-combat-v1',
    labelDe: 'Combat',
    requiredBones: [
      'hips',
      'spine',
      'chest',
      'leftUpperArm',
      'leftLowerArm',
      'leftHand',
      'rightUpperArm',
      'rightLowerArm',
      'rightHand',
    ],
    attachmentAnchor: 'rightHand',
    loop: true,
  },
  {
    actionId: 'emote',
    clipId: 'sagadrive-preview-emote-wave-v1',
    labelDe: 'Emote',
    requiredBones: ['spine', 'chest', 'rightUpperArm', 'rightLowerArm', 'rightHand'],
    attachmentAnchor: 'rightHand',
    loop: false,
  },
] as const;

export interface AvatarAnimationSupportResult {
  contractVersion: typeof ANIMATION_CONTRACT_VERSION;
  rigContractVersion: typeof RIG_CONTRACT_VERSION;
  /** Actions that may be activated in preview. */
  supported: readonly AvatarAnimationActionId[];
  /** Unsupported action → DE explanation (never a hard error). */
  unsupportedReasons: Readonly<Partial<Record<AvatarAnimationActionId, string>>>;
  defaultAction: AvatarAnimationActionId | null;
}

export function getAnimationCatalogEntry(
  actionId: AvatarAnimationActionId,
): AvatarAnimationClipCatalogEntry | undefined {
  return AVATAR_ANIMATION_CATALOG.find((entry) => entry.actionId === actionId);
}

export function isAllowlistedAnimationClipId(clipId: string): boolean {
  return AVATAR_ANIMATION_CATALOG.some((entry) => entry.clipId === clipId);
}

/**
 * Resolve which preview actions the current rig can play.
 * Requires at least `rigged`; full humanoid unlocks all catalog clips that have bones.
 * Never elevates capability flags based on animation playback.
 */
export function resolveAvatarAnimationSupport(input: {
  capabilityFlags: readonly AvatarRigCapabilityFlag[];
  mappedBones: Readonly<Partial<Record<SagaDriveHumanoidBoneId, string>>>;
}): AvatarAnimationSupportResult {
  const unsupportedReasons: Partial<Record<AvatarAnimationActionId, string>> = {};
  const supported: AvatarAnimationActionId[] = [];

  if (!input.capabilityFlags.includes('rigged')) {
    for (const actionId of AVATAR_ANIMATION_ACTIONS) {
      unsupportedReasons[actionId] = 'Kein Skelett — Animationen nicht verfügbar.';
    }
    return {
      contractVersion: ANIMATION_CONTRACT_VERSION,
      rigContractVersion: RIG_CONTRACT_VERSION,
      supported,
      unsupportedReasons,
      defaultAction: null,
    };
  }

  for (const entry of AVATAR_ANIMATION_CATALOG) {
    const missing = entry.requiredBones.filter((bone) => !input.mappedBones[bone]);
    if (missing.length > 0) {
      unsupportedReasons[entry.actionId] =
        `Teilrig: fehlende Knochen für ${entry.labelDe} (${missing.length}).`;
      continue;
    }
    supported.push(entry.actionId);
  }

  const defaultAction =
    supported.includes('idle') ? 'idle' : supported[0] ?? null;

  return {
    contractVersion: ANIMATION_CONTRACT_VERSION,
    rigContractVersion: RIG_CONTRACT_VERSION,
    supported,
    unsupportedReasons,
    defaultAction,
  };
}

export function animationActionLabelDe(actionId: AvatarAnimationActionId): string {
  return getAnimationCatalogEntry(actionId)?.labelDe ?? actionId;
}

/** Crossfade seconds; reduced motion → 0. */
export function resolveAnimationCrossfadeSeconds(prefersReducedMotion: boolean): number {
  return prefersReducedMotion ? 0 : 0.25;
}
