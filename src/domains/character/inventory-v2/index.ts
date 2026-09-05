/**
 * inventory-v2 — public domain API for Inventory v2 (issue #106).
 * The single import surface for persistence (#107/#109), catalogs (#108/#112)
 * and UI slices (#110/#111/#113). Consumers must use these contracts and
 * operations instead of reimplementing slot, stack, container, equipment or
 * quick-access rules.
 * Location: src/domains/character/inventory-v2/index.ts
 */

export type {
  ContainerContentsMap,
  EquipmentMap,
  EquipmentSlot,
  InventoryInvariantCode,
  InventoryInvariantFinding,
  InventoryItemType,
  InventoryLocation,
  InventoryNormalizationResult,
  InventoryOperationError,
  InventoryOperationResult,
  InventoryPlacement,
  InventoryState,
  InventoryValidationReport,
  ItemCost,
  ItemDefinition,
  ItemDefinitionLookup,
  ItemDefinitionScope,
  ItemInstance,
  ItemInstanceState,
  ItemLoad,
  ItemMechanics,
  ItemRequirements,
  MinimumStrength,
} from './types';

export {
  BASE_SLOT_COUNT,
  EQUIPMENT_SLOTS,
  HAND_SLOTS,
  INVENTORY_V2_SCHEMA_VERSION,
  QUICK_SLOT_COUNT,
  SORT_TYPE_ORDER,
} from './types';

export {
  calculateTotalLoad,
  cloneInventory,
  containerHasContents,
  createEmptyInventory,
  definitionOf,
  equipmentSlotsOf,
  findInstanceLocation,
  freeBaseSlotIndices,
  isBaseSlotIndex,
  isContainerInstance,
  isEquipmentSlot,
  isQuickSlotIndex,
  isSameStackFamily,
  isTwoHandedHandPair,
  listPlacements,
} from './state';

export type { SplitDestination } from './operations';

export {
  addItems,
  assignQuickSlot,
  clearQuickSlot,
  consumeItem,
  equipItem,
  mergeStacks,
  moveBaseSlot,
  moveIntoContainer,
  moveOutOfContainer,
  recoverOverflowInstance,
  removeItem,
  sortBaseGrid,
  splitStack,
  unequipItem,
} from './operations';

export { normalizeInventory, validateInventory } from './validation';
