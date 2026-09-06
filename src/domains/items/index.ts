/**
 * items — public domain API for ItemDefinition + taxonomy/provenance (#134).
 * Inventory v2 re-exports ItemDefinition for compatibility; new consumers
 * should prefer this barrel.
 * Location: src/domains/items/index.ts
 */

export type { ItemDefinition } from './definition';

export type {
  ItemCapability,
  ItemContext,
  ItemKindKey,
  ItemOrigin,
  ItemRole,
  ItemSettingTag,
  ItemTechLevel,
} from './taxonomy';

export {
  ITEM_CAPABILITIES,
  ITEM_CONTEXTS,
  ITEM_KIND_KEYS,
  ITEM_ORIGINS,
  ITEM_ROLES,
  ITEM_SETTING_TAGS,
  ITEM_TECH_LEVELS,
  isItemCapability,
  isItemContext,
  isItemKindKey,
  isItemOrigin,
  isItemRole,
  isItemSettingTag,
  isItemTechLevel,
} from './taxonomy';

export { normalizeItemDefinition } from './normalize';

export type { ItemDefinitionMetadataValidation } from './validate';
export { validateItemDefinitionMetadata } from './validate';
