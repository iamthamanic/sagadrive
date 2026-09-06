/**
 * items — public domain API for ItemDefinition + taxonomy/provenance (#134),
 * definition write/fork helpers (#136), builtin standard packs (#137),
 * and Library Items query helpers (#138).
 * Inventory v2 re-exports ItemDefinition for compatibility; new consumers
 * should prefer this barrel.
 * Location: src/domains/items/index.ts
 */

export type { ItemDefinition } from './definition';

export type { ItemPack } from './pack';

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

export { ITEM_DEFINITION_PAYLOAD_VERSION } from './payload';
export type { ItemDefinitionPayloadVersion } from './payload';

export type { ItemDefinitionWriteDraft } from './fork';
export { buildForkedItemDefinitionDraft } from './fork';

export {
  ALL_ITEM_PACKS,
  BASE_PACK_SIZE,
  BASE_PACKS,
  BUILTIN_STANDARD_DEFINITIONS,
  CONTEMPORARY_BASIC_DEFINITIONS,
  CONTEMPORARY_BASIC_PACK,
  CONTEMPORARY_BASIC_PACK_ID,
  CONTEXT_PACKS,
  FANTASY_BASIC_DEFINITIONS,
  FANTASY_BASIC_PACK,
  FANTASY_BASIC_PACK_ID,
  SCIFI_BASIC_DEFINITIONS,
  SCIFI_BASIC_PACK,
  SCIFI_BASIC_PACK_ID,
  STRESS_TEST_PACK_COMBINATIONS,
  getBuiltinStandardDefinition,
  getItemPack,
  listBaseItemPacks,
  listBuiltinStandardDefinitions,
  listContextItemPacks,
  listItemPacks,
} from './packs';

export type { ItemLibraryFilters, LibraryItemSource } from './library-query';
export {
  EMPTY_ITEM_LIBRARY_FILTERS,
  buildPackMembershipIndex,
  compareLibraryItemDefinitions,
  filterItemLibraryCatalog,
  hasActiveItemLibraryFilters,
  itemMatchesFulltext,
  itemMatchesLibraryFilters,
  librarySourceFromOrigin,
} from './library-query';

export type {
  ItemThumbnailAssetRecord,
  ItemThumbnailJobStatus,
  ItemThumbnailKind,
  ItemThumbnailMime,
  ItemThumbnailOrigin,
  ItemThumbnailPromptInput,
} from './assets';
export {
  ITEM_THUMBNAIL_ALLOWED_MIME,
  ITEM_THUMBNAIL_ASSET_KEY_PREFIX,
  ITEM_THUMBNAIL_KIND,
  ITEM_THUMBNAIL_MAX_BYTES,
  ITEM_THUMBNAIL_ORIGINS,
  buildItemThumbnailAssetKey,
  buildItemThumbnailPrompt,
  buildItemThumbnailStoragePath,
  extensionForItemThumbnailMime,
  isAllowedItemThumbnailMime,
  parseItemThumbnailAssetKey,
  sniffItemThumbnailMime,
} from './assets';
