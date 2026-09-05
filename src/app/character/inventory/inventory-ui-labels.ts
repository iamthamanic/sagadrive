/**
 * inventory-ui-labels — German labels and load-capacity helpers for Inventory v2
 * desktop UI (#110). Shared by summary bar, grid cells, catalog and personal form.
 * Location: src/app/character/inventory/inventory-ui-labels.ts
 */
import type { InventoryItemType } from '../../../domains/character/inventory-v2';

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
