/**
 * Inventory v2 Core catalog — versioned static source (#107).
 *
 * Core definitions ship with the repository and are read-only at runtime: they
 * are never persisted in `inventory_item_definitions`, so no runtime repository
 * can create, edit or archive one. Ids are stable — renaming an entry must not
 * change its id, because owned instances reference the id.
 *
 * The full SagaDrive Core item list is #108; this module establishes the source
 * and the seed it grows from.
 *
 * Location: src/domains/character/inventory-v2/core-catalog.ts
 */

import type { CatalogDefinitionRecord } from './catalog';
import type { ItemDefinition } from './types';

/** Bumped whenever Core entries are added or changed, for cache invalidation. */
export const CORE_CATALOG_VERSION = 1;

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value as object)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}

const CORE_DEFINITIONS: readonly ItemDefinition[] = deepFreeze([
  {
    id: 'core:shortsword',
    scope: 'core',
    name: 'Kurzschwert',
    description: 'Einhändige Klinge für enge Gänge und schnelle Stöße.',
    type: 'weapon',
    load: 1,
    cost: 2,
    stackLimit: 1,
    equipSlots: ['mainHand', 'offHand'],
    damage: '1W6',
  },
  {
    id: 'core:greatsword',
    scope: 'core',
    name: 'Großschwert',
    description: 'Zweihändige Waffe mit hoher Wucht.',
    type: 'weapon',
    load: 2,
    cost: 3,
    stackLimit: 1,
    equipSlots: ['mainHand', 'offHand'],
    twoHanded: true,
    damage: '1W10',
    requirements: { minimumStrength: 2 },
  },
  {
    id: 'core:shield',
    scope: 'core',
    name: 'Schild',
    description: 'Schützt die Nebenhand und wehrt Treffer ab.',
    type: 'shield',
    load: 1,
    cost: 2,
    stackLimit: 1,
    equipSlots: ['offHand'],
    protection: 1,
  },
  {
    id: 'core:leather-armor',
    scope: 'core',
    name: 'Lederrüstung',
    description: 'Leichte Rüstung ohne Einschränkung der Beweglichkeit.',
    type: 'armor',
    load: 2,
    cost: 3,
    stackLimit: 1,
    equipSlots: ['body'],
    protection: 2,
  },
  {
    id: 'core:helm',
    scope: 'core',
    name: 'Helm',
    description: 'Kopfschutz aus verstärktem Leder und Metall.',
    type: 'armor',
    load: 1,
    cost: 2,
    stackLimit: 1,
    equipSlots: ['head'],
    protection: 1,
  },
  {
    id: 'core:rope',
    scope: 'core',
    name: 'Seil',
    description: 'Zehn Meter geflochtenes Hanfseil.',
    type: 'tool',
    load: 1,
    cost: 1,
    stackLimit: 1,
  },
  {
    id: 'core:torch',
    scope: 'core',
    name: 'Fackel',
    description: 'Brennt für eine Szene und erhellt den Umkreis.',
    type: 'tool',
    load: 0,
    cost: 1,
    stackLimit: 5,
  },
  {
    id: 'core:ration',
    scope: 'core',
    name: 'Ration',
    description: 'Tagesverpflegung für unterwegs.',
    type: 'consumable',
    load: 1,
    cost: 1,
    stackLimit: 3,
  },
  {
    id: 'core:healing-potion',
    scope: 'core',
    name: 'Heiltrank',
    description: 'Stellt im Kampf einen Teil der Lebenspunkte wieder her.',
    type: 'consumable',
    load: 0,
    cost: 2,
    stackLimit: 5,
  },
  {
    id: 'core:backpack',
    scope: 'core',
    name: 'Rucksack',
    description: 'Behälter mit vier zusätzlichen Plätzen.',
    type: 'container',
    load: 1,
    cost: 2,
    stackLimit: 1,
    containerCapacity: 4,
  },
  {
    id: 'core:pouch',
    scope: 'core',
    name: 'Beutel',
    description: 'Kleiner Gürtelbeutel mit zwei Plätzen.',
    type: 'container',
    load: 0,
    cost: 1,
    stackLimit: 1,
    containerCapacity: 2,
  },
] satisfies ItemDefinition[]);

/** All Core definitions, in declaration order. */
export function listCoreItemDefinitions(): readonly ItemDefinition[] {
  return CORE_DEFINITIONS;
}

/** Core definitions as catalog records — always active, never owned. */
export function coreCatalogRecords(): CatalogDefinitionRecord[] {
  return CORE_DEFINITIONS.map((definition) => ({ definition, status: 'active' as const }));
}
