/**
 * Inventory v2 catalog policy (#107).
 *
 * Pure rules for which item definitions a character may see and how a
 * character's effective world profile is resolved. Persistence and
 * authorization enforcement live in `src/infrastructure/inventory/**` and in
 * the row level security policies of migration 015 — this module never trusts
 * client input and never reaches for a database.
 *
 * Location: src/domains/character/inventory-v2/catalog.ts
 */

import { EQUIPMENT_SLOTS } from './types';
import type {
  EquipmentSlot,
  InventoryItemType,
  ItemDefinition,
  ItemDefinitionLookup,
  ItemDefinitionScope,
} from './types';

/** Lifecycle of a persisted definition. Archived rows leave the Add catalog. */
export type CatalogDefinitionStatus = 'active' | 'archived';

/** World-profile bindings that feed the effective-profile rule. */
export interface WorldProfileBinding {
  /** World profile bound by the adventure the character is attached to. */
  adventureWorldProfileId?: string | null;
  /** World profile bound by the character itself. */
  characterWorldProfileId?: string | null;
}

/** A definition together with the ownership facts the catalog filters on. */
export interface CatalogDefinitionRecord {
  definition: ItemDefinition;
  status: CatalogDefinitionStatus;
  /** Set exactly for `world` definitions. */
  worldProfileId?: string | null;
  /** Set for `personal` definitions; the authenticated owner. */
  ownerUserId?: string | null;
}

/** Who is asking, and which world they are effectively playing in. */
export interface CatalogVisibilityContext {
  userId: string;
  effectiveWorldProfileId: string | null;
}

/**
 * Effective world profile for inventory catalog purposes.
 *
 * `adventureWorldProfileId ?? characterWorldProfileId ?? null` — the adventure
 * binding wins, the character binding is the fallback, and `null` means Core and
 * Personal only. A blank string is treated as unbound so an empty form field
 * cannot silently become a world id.
 */
export function resolveEffectiveWorldProfileId(binding: WorldProfileBinding): string | null {
  const adventure = normalizeId(binding.adventureWorldProfileId);
  if (adventure) return adventure;
  return normalizeId(binding.characterWorldProfileId);
}

function normalizeId(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Whether a record is visible at all to this user — independent of its status.
 *
 * A `world` record needs an effective world profile that matches exactly; an
 * unbound character therefore receives no World definitions rather than a
 * default world. A `personal` record needs the asking user as owner. `core` is
 * visible to everyone.
 */
export function isDefinitionVisible(
  record: CatalogDefinitionRecord,
  context: CatalogVisibilityContext,
): boolean {
  switch (record.definition.scope) {
    case 'core':
      return true;
    case 'world': {
      const worldProfileId = normalizeId(record.worldProfileId);
      if (!worldProfileId) return false;
      return worldProfileId === normalizeId(context.effectiveWorldProfileId);
    }
    case 'personal': {
      const ownerUserId = normalizeId(record.ownerUserId);
      if (!ownerUserId) return false;
      return ownerUserId === normalizeId(context.userId);
    }
    default:
      return false;
  }
}

/**
 * Definitions offered by the Add/Catalog surfaces: visible AND active, in a
 * stable order (Core before World before Personal, then `de-DE` name, then id).
 */
export function selectCatalogDefinitions(
  records: readonly CatalogDefinitionRecord[],
  context: CatalogVisibilityContext,
): ItemDefinition[] {
  return records
    .filter((record) => record.status === 'active' && isDefinitionVisible(record, context))
    .map((record) => record.definition)
    .sort(compareDefinitions);
}

const SCOPE_ORDER: readonly ItemDefinitionScope[] = ['core', 'world', 'personal'];

function compareDefinitions(a: ItemDefinition, b: ItemDefinition): number {
  const scopeDelta = SCOPE_ORDER.indexOf(a.scope) - SCOPE_ORDER.indexOf(b.scope);
  if (scopeDelta !== 0) return scopeDelta;
  const nameDelta = a.name.localeCompare(b.name, 'de-DE');
  if (nameDelta !== 0) return nameDelta;
  return a.id.localeCompare(b.id);
}

const ITEM_TYPES: readonly InventoryItemType[] = [
  'weapon',
  'armor',
  'shield',
  'tool',
  'consumable',
  'container',
  'misc',
];

/**
 * Build an `ItemDefinition` from an untrusted persisted payload.
 *
 * Returns `null` instead of throwing when the row cannot be read as a valid
 * definition, so one corrupt catalog row cannot take down a whole inventory
 * screen. Identity (`id`, `scope`) comes from the trusted columns, never from
 * the payload — a payload claiming a different scope must not be able to
 * smuggle a Personal item into a World catalog.
 */
export function parseItemDefinition(
  id: string,
  scope: ItemDefinitionScope,
  payload: unknown,
): ItemDefinition | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const raw = payload as Record<string, unknown>;

  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  const type = raw.type;
  if (!id || name.length === 0) return null;
  if (typeof type !== 'string' || !ITEM_TYPES.includes(type as InventoryItemType)) return null;

  const load = raw.load;
  const cost = raw.cost;
  if (!isIntegerInRange(load, 0, 3) || !isIntegerInRange(cost, 0, 5)) return null;

  const stackLimit = Number.isInteger(raw.stackLimit) && (raw.stackLimit as number) >= 1
    ? (raw.stackLimit as number)
    : 1;

  const definition: ItemDefinition = {
    id,
    scope,
    name,
    description: typeof raw.description === 'string' ? raw.description : '',
    type: type as InventoryItemType,
    load: load as ItemDefinition['load'],
    cost: cost as ItemDefinition['cost'],
    stackLimit,
  };

  const equipSlots = readEquipSlots(raw.equipSlots);
  if (equipSlots) definition.equipSlots = equipSlots;
  if (raw.twoHanded === true) definition.twoHanded = true;
  if (isIntegerInRange(raw.containerCapacity, 1, 20)) {
    definition.containerCapacity = raw.containerCapacity as number;
  }
  if (isIntegerInRange(raw.protection, 1, 3)) {
    definition.protection = raw.protection as ItemDefinition['protection'];
  }
  if (typeof raw.damage === 'string' && raw.damage) definition.damage = raw.damage;
  if (typeof raw.damageType === 'string' && raw.damageType) definition.damageType = raw.damageType;
  if (typeof raw.iconKey === 'string' && raw.iconKey) definition.iconKey = raw.iconKey;
  if (typeof raw.assetKey === 'string' && raw.assetKey) definition.assetKey = raw.assetKey;
  if (Array.isArray(raw.traits)) {
    const traits = raw.traits.filter((trait): trait is string => typeof trait === 'string' && trait.length > 0);
    if (traits.length > 0) definition.traits = traits;
  }
  const minimumStrength = (raw.requirements as { minimumStrength?: unknown } | undefined)?.minimumStrength;
  if (minimumStrength === 1 || minimumStrength === 2 || minimumStrength === 4) {
    definition.requirements = { minimumStrength };
  }

  // A container without positions is unusable by moveIntoContainer, so give it
  // the same single position the domain assumes rather than emitting a
  // definition the rest of the layer would reject.
  if (definition.type === 'container' && definition.containerCapacity === undefined) {
    definition.containerCapacity = 1;
  }

  return definition;
}

function isIntegerInRange(value: unknown, min: number, max: number): boolean {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

function readEquipSlots(value: unknown): EquipmentSlot[] | null {
  if (!Array.isArray(value)) return null;
  const slots = value.filter((slot): slot is EquipmentSlot =>
    typeof slot === 'string' && (EQUIPMENT_SLOTS as readonly string[]).includes(slot),
  );
  return slots.length > 0 ? slots : null;
}

/**
 * Lookup for rendering owned instances.
 *
 * Deliberately wider than {@link selectCatalogDefinitions}: archived
 * definitions still resolve, because an item a character already owns must keep
 * rendering after the catalog entry is archived. Visibility still applies — an
 * archived definition of another world or another user stays unresolvable.
 */
export function createDefinitionLookup(
  records: readonly CatalogDefinitionRecord[],
  context: CatalogVisibilityContext,
): ItemDefinitionLookup {
  const byId = new Map<string, ItemDefinition>();
  for (const record of records) {
    if (!isDefinitionVisible(record, context)) continue;
    byId.set(record.definition.id, record.definition);
  }
  return (definitionId: string) => byId.get(definitionId);
}
