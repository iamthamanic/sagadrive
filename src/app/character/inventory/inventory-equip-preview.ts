/**
 * inventory-equip-preview — UI-only preview helpers for equip destination /
 * displacement dialogs (#111). Mirrors #106 equipItem vacancy rules so React
 * can confirm before calling the domain op; does not mutate state.
 * Location: src/app/character/inventory/inventory-equip-preview.ts
 */
import {
  findInstanceLocation,
  freeBaseSlotIndices,
  HAND_SLOTS,
  type EquipmentSlot,
  type InventoryState,
  type ItemDefinition,
  type ItemDefinitionLookup,
} from '../../../domains/character/inventory-v2';

/** Distinct instance ids that would return to the base grid if `instanceId` were equipped to `slot`. */
export function previewDisplacedOnEquip(
  state: InventoryState,
  lookup: ItemDefinitionLookup,
  instanceId: string,
  slot: EquipmentSlot,
): string[] {
  const definition = lookup(state.instances[instanceId]?.definitionId ?? '');
  if (!definition) return [];
  const targetSlots: EquipmentSlot[] = definition.twoHanded ? [...HAND_SLOTS] : [slot];
  const displaced: string[] = [];
  for (const target of targetSlots) {
    const occupant = state.equipment[target];
    if (occupant && occupant !== instanceId && !displaced.includes(occupant)) {
      displaced.push(occupant);
    }
  }
  return displaced;
}

/**
 * Free base slots available for displacement after vacating the source of
 * `instanceId` (base slot), matching equipItem.
 */
export function freeSlotsForEquipDisplace(state: InventoryState, instanceId: string): number {
  const location = findInstanceLocation(state, instanceId);
  const free = freeBaseSlotIndices(state).length;
  if (location?.kind === 'base') return free + 1;
  return free;
}

/** Empty compatible destinations (two-handed → mainHand only when both hands free of others). */
export function emptyCompatibleEquipSlots(
  state: InventoryState,
  definition: ItemDefinition,
  instanceId: string,
): EquipmentSlot[] {
  const declared = definition.equipSlots ?? [];
  if (declared.length === 0) return [];
  if (definition.twoHanded) {
    const bothFreeOfOthers = HAND_SLOTS.every((hand) => {
      const occupant = state.equipment[hand];
      return !occupant || occupant === instanceId;
    });
    if (!bothFreeOfOthers) return [];
    if (!declared.includes('mainHand')) return [];
    return ['mainHand'];
  }
  return declared.filter((slot) => {
    const occupant = state.equipment[slot];
    return !occupant || occupant === instanceId;
  });
}

/** Declared destinations for conflict picker (two-handed → mainHand). */
export function declaredEquipSlots(definition: ItemDefinition): EquipmentSlot[] {
  if (definition.twoHanded) {
    return definition.equipSlots?.includes('mainHand') ? ['mainHand'] : [];
  }
  return [...(definition.equipSlots ?? [])];
}

export function itemDisplayName(
  state: InventoryState,
  lookup: ItemDefinitionLookup,
  instanceId: string,
): string {
  const instance = state.instances[instanceId];
  if (!instance) return instanceId;
  return lookup(instance.definitionId)?.name ?? instance.definitionId;
}
