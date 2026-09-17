/**
 * Item workbench avatar-fit defaults — pure mapping type→anchor (#160).
 * Location: src/domains/character/avatar/item-avatar-fit-defaults.ts
 */

import type { InventoryItemType } from '../inventory-v2';
import type { SagaDriveHumanoidAnchorId } from './rig-contract';
import type { AvatarEquipmentLocalTransform } from './equipment-visual-contract';
import { clampEquipmentTransform } from './equipment-visual-contract';

export const ITEM_AVATAR_FIT_DEFAULTS_VERSION = 'SagaDriveItemAvatarFitDefaultsV1' as const;

const IDENTITY: AvatarEquipmentLocalTransform = {
  position: [0, 0, 0],
  rotationEuler: [0, 0, 0],
  scale: [1, 1, 1],
};

/** Default canonical #6 anchor for workbench fitting. */
export function defaultAnchorForItemType(type: InventoryItemType): SagaDriveHumanoidAnchorId {
  switch (type) {
    case 'weapon':
      return 'rightHand';
    case 'shield':
      return 'leftHand';
    case 'armor':
      return 'chest';
    case 'tool':
      return 'rightHand';
    case 'consumable':
    case 'container':
    case 'misc':
    default:
      return 'hips';
  }
}

/** Helm-like misc head → head; backpack-ish → back. */
export function defaultAnchorForMiscEquip(
  miscEquip: 'none' | 'head' | 'accessory' | 'special' | 'feet',
): SagaDriveHumanoidAnchorId {
  switch (miscEquip) {
    case 'head':
      return 'head';
    case 'feet':
      return 'rightFoot';
    case 'special':
      return 'back';
    case 'accessory':
      return 'chest';
    default:
      return 'hips';
  }
}

export function defaultRigidFitTransform(): AvatarEquipmentLocalTransform {
  return clampEquipmentTransform(IDENTITY);
}

export function resolveWorkbenchDefaultAnchor(input: {
  type: InventoryItemType;
  miscEquip?: 'none' | 'head' | 'accessory' | 'special' | 'feet';
}): SagaDriveHumanoidAnchorId {
  if (input.type === 'misc' && input.miscEquip && input.miscEquip !== 'none') {
    return defaultAnchorForMiscEquip(input.miscEquip);
  }
  if (input.type === 'armor' && input.miscEquip === 'head') {
    return 'head';
  }
  return defaultAnchorForItemType(input.type);
}
