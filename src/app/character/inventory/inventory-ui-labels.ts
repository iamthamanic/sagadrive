/**
 * inventory-ui-labels — German labels and load-capacity helpers for Inventory v2
 * desktop UI (#110/#111). Shared by summary bar, grid, equipment, catalog and forms.
 * Location: src/app/character/inventory/inventory-ui-labels.ts
 */
import type {
  EquipmentSlot,
  InventoryItemType,
} from '../../../domains/character/inventory-v2';

/** German type labels matching issue #110 catalog / grid copy. */
export const INVENTORY_TYPE_LABELS: Record<InventoryItemType, string> = {
  weapon: 'Waffe',
  armor: 'Rüstung',
  shield: 'Schild',
  tool: 'Werkzeug',
  consumable: 'Verbrauch',
  container: 'Behälter',
  misc: 'Sonstiges',
};


/** Equipment slot labels for Ausrüstung panel (#111). */
export const EQUIPMENT_SLOT_LABELS: Record<EquipmentSlot, string> = {
  head: 'Kopf',
  body: 'Körper',
  accessory1: 'Accessoire 1',
  accessory2: 'Accessoire 2',
  mainHand: 'Haupthand',
  offHand: 'Nebenhand',
  special: 'Spezial',
};

/** Empty-slot category hints shown under equipment labels. */
export const EQUIPMENT_SLOT_CATEGORY_HINTS: Record<EquipmentSlot, string> = {
  head: 'Kopfbedeckung',
  body: 'Rüstung',
  accessory1: 'Accessoire',
  accessory2: 'Accessoire',
  mainHand: 'Waffe / Werkzeug',
  offHand: 'Waffe / Schild',
  special: 'Spezialgerät',
};

/** Exact UI copy when equip displacement needs more free base slots than available. */
export const EQUIP_DISPLACE_NO_ROOM =
  'Nicht genügend freie Inventarplätze, um die aktuelle Ausrüstung abzulegen.';

/** Strength gate copy for blocked equip (menu + DnD). */
export function formatStrengthRequirement(required: number, current: number): string {
  return `Benötigt Stärke ${required} · Aktuell ${current}`;
}

/** Type filter options for the catalog (includes “Alle”). */
export const INVENTORY_TYPE_FILTER_OPTIONS: ReadonlyArray<{
  value: 'all' | InventoryItemType;
  label: string;
}> = [
  { value: 'all', label: 'Alle' },
  { value: 'weapon', label: 'Waffen' },
  { value: 'armor', label: 'Rüstung' },
  { value: 'shield', label: 'Schilde' },
  { value: 'tool', label: 'Werkzeuge' },
  { value: 'consumable', label: 'Verbrauch' },
  { value: 'container', label: 'Behälter' },
  { value: 'misc', label: 'Sonstiges' },
];

export const WEAPON_DAMAGE_OPTIONS = ['d6+1', 'd8+2', 'd10+3', 'd12+4'] as const;

/** Carry capacity from core rules: 5 + 2 × Stärke. */
export function inventoryCarryCapacity(strength: number): number {
  return 5 + 2 * strength;
}

export function isInventoryItemType(value: string): value is InventoryItemType {
  return (
    value === 'weapon' ||
    value === 'armor' ||
    value === 'shield' ||
    value === 'tool' ||
    value === 'consumable' ||
    value === 'container' ||
    value === 'misc'
  );
}

export function parseItemLoad(value: string): 0 | 1 | 2 | 3 {
  if (value === '0') return 0;
  if (value === '2') return 2;
  if (value === '3') return 3;
  return 1;
}

export function parseItemCost(value: string): 0 | 1 | 2 | 3 | 4 | 5 {
  if (value === '0') return 0;
  if (value === '2') return 2;
  if (value === '3') return 3;
  if (value === '4') return 4;
  if (value === '5') return 5;
  return 1;
}

export function parseProtection(value: string): 1 | 2 | 3 {
  if (value === '2') return 2;
  if (value === '3') return 3;
  return 1;
}

export function parseMinimumStrength(value: string): 1 | 2 | 4 {
  if (value === '2') return 2;
  if (value === '4') return 4;
  return 1;
}
