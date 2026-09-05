/**
 * inventory-v2 types — Inventory v2 domain contracts (issue #106).
 * Item definitions, item instances, the 20-slot base grid, containers,
 * equipment and quick access. Downstream issues (#107–#114) consume these
 * contracts and must not restate the rules they encode.
 * Location: src/domains/character/inventory-v2/types.ts
 *
 * Domain-pure: no React, no Supabase, no UI imports.
 */

/**
 * Where a catalog definition comes from. Ownership (which world profile, which
 * user) is resolved by the catalog/persistence layer — never trusted from
 * character state.
 */
export type ItemDefinitionScope = 'core' | 'world' | 'personal';

/** Item type. Drives the deterministic base-grid sort; `container` marks container definitions. */
export type InventoryItemType =
  | 'weapon'
  | 'armor'
  | 'shield'
  | 'tool'
  | 'consumable'
  | 'container'
  | 'misc';

/** The seven named equipment positions. */
export type EquipmentSlot =
  | 'head'
  | 'body'
  | 'accessory1'
  | 'accessory2'
  | 'mainHand'
  | 'offHand'
  | 'special';

/** Single source of truth for equipment-slot iteration order. */
export const EQUIPMENT_SLOTS: readonly EquipmentSlot[] = [
  'head',
  'body',
  'accessory1',
  'accessory2',
  'mainHand',
  'offHand',
  'special',
];

/** The two hand references a two-handed item occupies. */
export const HAND_SLOTS: readonly EquipmentSlot[] = ['mainHand', 'offHand'];

/** Exactly 20 base positions. Strength never changes this count. */
export const BASE_SLOT_COUNT = 20;

/** Exactly 4 ordered quick-access references. */
export const QUICK_SLOT_COUNT = 4;

/** Schema marker for persisted inventory state (#109 migrates onto this version). */
export const INVENTORY_V2_SCHEMA_VERSION = 1;

/**
 * Deterministic base-grid sort order by type.
 * weapon → armor → shield → tool → consumable → container → misc
 */
export const SORT_TYPE_ORDER: readonly InventoryItemType[] = [
  'weapon',
  'armor',
  'shield',
  'tool',
  'consumable',
  'container',
  'misc',
];

/** Minimum-strength values used by the SagaDrive core rules (matches legacy `ItemDto.minimum_strength`). */
export type MinimumStrength = 1 | 2 | 4;

/** Load points per unit, per the core resource rule. */
export type ItemLoad = 0 | 1 | 2 | 3;

/** Abstract cost 0–5 per the core resource rule. Owning an item is not a purchase. */
export type ItemCost = 0 | 1 | 2 | 3 | 4 | 5;

/** Mechanical metadata carried over from the legacy `ItemDto` shape. */
export interface ItemMechanics {
  damage?: string;
  damageType?: string;
  protection?: 1 | 2 | 3;
  traits?: string[];
}

/** Equip prerequisites. Unmet prerequisites block equipping, never ownership. */
export interface ItemRequirements {
  minimumStrength?: MinimumStrength;
}

/**
 * Catalog definition of an item — shared and scope-owned. Instances reference a
 * definition by id; the definition never changes per character.
 */
export interface ItemDefinition extends ItemMechanics {
  /** Stable catalog id, e.g. `core:shortsword`. */
  id: string;
  scope: ItemDefinitionScope;
  name: string;
  description: string;
  type: InventoryItemType;
  load: ItemLoad;
  cost: ItemCost;
  /** Maximum units per stack; `1` means non-stackable. */
  stackLimit: number;
  requirements?: ItemRequirements;
  /** Equipment positions this definition may occupy. Absent/empty = not equippable. */
  equipSlots?: EquipmentSlot[];
  /** A two-handed item is one instance occupying both hand references. */
  twoHanded?: boolean;
  /** Capacity positions of a container definition; required when `type === 'container'`. */
  containerCapacity?: number;
  /** Future-facing visual metadata. No 3D behavior in this epic. */
  iconKey?: string;
  assetKey?: string;
}

/**
 * Per-instance state that can genuinely differ between two instances of the
 * same definition (e.g. an engraving or a bound owner). Stack-relevant: two
 * instances with differing state never merge.
 */
export type ItemInstanceState = Record<string, string | number | boolean | null>;

/** A concrete item instance owned by a character. */
export interface ItemInstance {
  /** Unique within one character's inventory state. */
  instanceId: string;
  definitionId: string;
  /** Units in this stack; always >= 1. */
  quantity: number;
  /** Absent when the instance is a pure definition mirror. */
  state?: ItemInstanceState;
}

/**
 * The single physical location of an instance. A two-handed instance is
 * reported at `mainHand`; its `offHand` reference is not a second location.
 * Quick slots are references only and are never a physical location.
 */
export type InventoryLocation =
  | { kind: 'base'; slotIndex: number }
  | { kind: 'container'; containerInstanceId: string; positionIndex: number }
  | { kind: 'equipment'; slot: EquipmentSlot }
  | { kind: 'overflow' };

/** Container contents keyed by container instance id; values are ordered capacity positions (`null` = free). */
export type ContainerContentsMap = Record<string, (string | null)[]>;

/** Equipment references keyed by slot. A two-handed instance appears under both hand slots. */
export type EquipmentMap = Partial<Record<EquipmentSlot, string>>;

/** Character inventory state — the aggregate every Inventory v2 operation reads and returns. */
export interface InventoryState {
  schemaVersion: number;
  /** Instance records by instance id. */
  instances: Record<string, ItemInstance>;
  /** Exactly `BASE_SLOT_COUNT` ordered positions; `null` = explicitly empty. */
  baseSlots: (string | null)[];
  containers: ContainerContentsMap;
  equipment: EquipmentMap;
  /** Exactly `QUICK_SLOT_COUNT` ordered references; `null` = unassigned. */
  quickSlots: (string | null)[];
  /** Legacy overflow — read/repair only, counts toward load, nothing is ever deleted into it. */
  legacyOverflow: string[];
}

/** Why a pure operation refused to change state. Operations never throw on rule violations. */
export type InventoryOperationError =
  | 'INVALID_INPUT'
  | 'UNKNOWN_INSTANCE'
  | 'UNKNOWN_DEFINITION'
  | 'BASE_SLOTS_FULL'
  | 'SLOT_OCCUPIED'
  | 'NOT_STACKABLE'
  | 'STACK_LIMIT_REACHED'
  | 'INCOMPATIBLE_STACK'
  | 'NOT_A_CONTAINER'
  | 'CONTAINER_FULL'
  | 'CONTAINER_NESTING_FORBIDDEN'
  | 'NOT_IN_BASE_INVENTORY'
  | 'NOT_EQUIPPABLE'
  | 'REQUIREMENT_NOT_MET'
  | 'NOT_QUICK_SLOT_ELIGIBLE'
  | 'NOT_A_CONSUMABLE'
  | 'OVERFLOW_NOT_EMPTY';

/**
 * Result of a pure operation. Discriminated on `ok` so callers cannot read a
 * state that was never produced.
 */
export type InventoryOperationResult =
  | { ok: true; state: InventoryState }
  | { ok: false; error: InventoryOperationError; reason: string };

/**
 * Resolve a definition id to its definition. Implementations are provided by the
 * catalog layer (#107/#108); this contract stays pure and synchronous.
 */
export type ItemDefinitionLookup = (definitionId: string) => ItemDefinition | undefined;

/** An invariant violation found by validation, or a repair applied by normalization. */
export type InventoryInvariantCode =
  | 'INVALID_SCHEMA_VERSION'
  | 'INVALID_BASE_SLOT_COUNT'
  | 'INVALID_QUICK_SLOT_COUNT'
  | 'INVALID_EQUIPMENT_SLOT'
  | 'INVALID_QUANTITY'
  | 'INVALID_STACK_LIMIT'
  | 'INVALID_CONTAINER_CAPACITY'
  | 'DANGLING_REFERENCE'
  | 'DUPLICATE_LOCATION'
  | 'UNPLACED_INSTANCE'
  | 'UNKNOWN_DEFINITION'
  | 'CONTAINER_NESTING'
  | 'INCOMPATIBLE_EQUIPMENT'
  | 'INVALID_TWO_HANDED_REFERENCE'
  | 'QUICK_SLOT_NOT_ELIGIBLE';

/** A single invariant finding with the offending reference. */
export interface InventoryInvariantFinding {
  code: InventoryInvariantCode;
  /** Instance id, slot name or index that triggered the finding. */
  detail: string;
}

/** Validation verdict. `ok` is true exactly when `findings` is empty. */
export interface InventoryValidationReport {
  ok: boolean;
  findings: InventoryInvariantFinding[];
}

/**
 * Normalization outcome: a structurally valid state plus the repairs needed to
 * get there.
 *
 * `repairs` lists only changes that were actually applied, so re-normalizing an
 * already normalized state yields an empty list. Instances whose definition the
 * catalog cannot resolve are kept (normalization is lossless) but reported in
 * `unresolved` instead of `repairs` — the domain cannot invent a definition, so
 * this is a catalog problem for the caller to surface, not a repairable one.
 */
export interface InventoryNormalizationResult {
  state: InventoryState;
  repairs: InventoryInvariantFinding[];
  /** Instance ids kept in the state whose `definitionId` the catalog does not know. */
  unresolved: string[];
}

/** An instance together with its resolved physical location. */
export interface InventoryPlacement {
  instanceId: string;
  location: InventoryLocation;
}
