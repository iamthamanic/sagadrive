/**
 * workbenchLabels — German copy and type-entry defaults for Item Workbench (#139).
 * Location: src/app/items/workbench/workbenchLabels.ts
 */
import type { InventoryItemType } from '../../../domains/character/inventory-v2';
import type {
  ItemCapability,
  ItemContext,
  ItemKindKey,
  ItemRole,
  ItemSettingTag,
  ItemTechLevel,
} from '../../../domains/items';
import { ITEM_KIND_LABELS } from '../../library/items/itemLibraryLabels';

export const DIRTY_LEAVE_MESSAGE = 'Ungespeicherte Änderungen verwerfen?';

export const WORKBENCH_TYPE_ENTRIES: ReadonlyArray<{
  id: string;
  label: string;
  kindKey: ItemKindKey;
  type: InventoryItemType;
  description: string;
}> = [
  { id: 'weapon', label: 'Waffe', kindKey: 'weapon', type: 'weapon', description: 'Nah- oder Fernkampf' },
  { id: 'armor', label: 'Rüstung', kindKey: 'armor', type: 'armor', description: 'Körperschutz' },
  { id: 'shield', label: 'Schild', kindKey: 'shield', type: 'shield', description: 'Verteidigung in der Hand' },
  { id: 'tool', label: 'Werkzeug', kindKey: 'tool', type: 'tool', description: 'Handwerk und Nutzen' },
  { id: 'device', label: 'Gerät', kindKey: 'device', type: 'tool', description: 'Technik und Module' },
  {
    id: 'consumable',
    label: 'Verbrauchsgut',
    kindKey: 'consumable',
    type: 'consumable',
    description: 'Einmalig oder stapelbar',
  },
  { id: 'container', label: 'Behälter', kindKey: 'container', type: 'container', description: 'Tragen und lagern' },
  { id: 'document', label: 'Dokument', kindKey: 'document', type: 'misc', description: 'Notizen und Belege' },
  { id: 'key', label: 'Schlüssel/Zugang', kindKey: 'key', type: 'misc', description: 'Zugang und Sperren' },
  { id: 'clothing', label: 'Kleidung', kindKey: 'clothing', type: 'misc', description: 'Tracht und Stil' },
  {
    id: 'resource',
    label: 'Ressource/Geld',
    kindKey: 'resource',
    type: 'misc',
    description: 'Material und Währung',
  },
  {
    id: 'misc',
    label: 'Alltags-/Sonstiges',
    kindKey: 'misc',
    type: 'misc',
    description: 'Alles andere',
  },
];

export const ITEM_TECH_LEVEL_LABELS: Record<ItemTechLevel, string> = {
  primitive: 'Primitiv',
  medieval: 'Mittelalterlich',
  industrial: 'Industriell',
  modern: 'Modern',
  'near-future': 'Nahe Zukunft',
  advanced: 'Fortgeschritten',
};

export const ITEM_CAPABILITY_LABELS: Record<ItemCapability, string> = {
  attack: 'Angriff',
  defend: 'Verteidigung',
  heal: 'Heilen',
  communicate: 'Kommunizieren',
  navigate: 'Navigieren',
  illuminate: 'Beleuchten',
  repair: 'Reparieren',
  scan: 'Scannen',
  record: 'Aufzeichnen',
  access: 'Zugang',
  carry: 'Tragen',
  consume: 'Verbrauch',
  trade: 'Handel',
  unlock: 'Entriegeln',
  disguise: 'Tarnung',
  entertain: 'Unterhalten',
  research: 'Forschen',
  survive: 'Überleben',
};

export const ITEM_ROLE_LABELS: Record<ItemRole, string> = {
  ordinary: 'Alltäglich',
  valuable: 'Wertvoll',
  quest: 'Quest',
  evidence: 'Beweis',
  contraband: 'Schmuggelware',
  'key-item': 'Schlüsselgegenstand',
  personal: 'Persönlich',
  collectible: 'Sammlerstück',
};

export { ITEM_KIND_LABELS };

export type { ItemContext, ItemSettingTag };
