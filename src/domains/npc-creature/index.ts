/**
 * npc-creature — public domain API for NPC/creature definitions (#196)
 * and adventure/session instances (#201).
 * Library UI and legacy D&D npcs/bestiary remain app/infra concerns.
 * Location: src/domains/npc-creature/index.ts
 */

export type {
  NpcCreatureCombatDetails,
  NpcCreatureDefinition,
  NpcCreatureDefinitionWriteDraft,
  NpcCreatureDetailExtras,
  NpcCreatureStatOverrides,
} from './definition';

export type {
  NpcCreatureCategory,
  NpcCreatureKind,
  NpcCreaturePersistedScope,
  NpcCreatureScope,
  NpcCreatureSheetMode,
  NpcCreatureStatus,
} from './taxonomy';

export {
  NPC_CREATURE_CATEGORIES,
  NPC_CREATURE_KINDS,
  NPC_CREATURE_PERSISTED_SCOPES,
  NPC_CREATURE_SCOPES,
  NPC_CREATURE_SHEET_MODES,
  NPC_CREATURE_STATUSES,
  isNpcCreatureCategory,
  isNpcCreatureKind,
  isNpcCreaturePersistedScope,
  isNpcCreatureScope,
  isNpcCreatureSheetMode,
  isNpcCreatureStatus,
} from './taxonomy';

export {
  NPC_CREATURE_DEFINITION_PAYLOAD_VERSION,
  type NpcCreatureDefinitionPayloadVersion,
} from './payload';

export type { NpcCreatureValidationResult } from './validate';
export { validateNpcCreatureDefinition } from './validate';

export {
  assembleNpcCreatureDefinition,
  parseNpcCreatureDefinition,
  toNpcCreatureDefinitionPayload,
} from './parse';

export type {
  NpcCreatureCatalogRecord,
  NpcCreatureMutationContext,
  NpcCreatureVisibilityContext,
} from './policy';
export {
  canCreateNpcCreatureDefinition,
  canMutateNpcCreatureDefinition,
  isNpcCreatureDefinitionVisible,
} from './policy';

export type { NpcCreatureDerivedPower, NpcCreatureEffectiveStats } from './derived';
export {
  deriveNpcCreaturePower,
  resolveNpcCreatureEffectiveStats,
} from './derived';

export type {
  CreateNpcCreatureDefinitionInput,
  CreateNpcCreatureDefinitionTarget,
  NpcCreatureDefinitionRepository,
  NpcCreatureDefinitionSummary,
  UpdateNpcCreatureDefinitionInput,
} from './contracts';

export type {
  LibraryNpcCreatureSource,
  NpcCreatureLibraryFilters,
  NpcCreatureLibraryKindFilter,
} from './library-query';
export {
  EMPTY_NPC_CREATURE_LIBRARY_FILTERS,
  LIBRARY_NPC_CREATURE_SOURCES,
  compareNpcCreatureLibraryRecords,
  filterNpcCreatureLibraryCatalog,
  hasActiveNpcCreatureLibraryFilters,
  librarySourceOf,
  npcCreatureMatchesFulltext,
  npcCreatureMatchesLibraryFilters,
} from './library-query';

export type { NpcCreaturePack } from './pack';

export {
  NPC_CREATURE_CORE_CATALOG_SIZE,
  NPC_CREATURE_CORE_DEFINITIONS,
  getCoreNpcCreatureDefinition,
  isCoreNpcCreatureDefinitionId,
  listCoreNpcCreatureDefinitions,
} from './core-catalog';

export {
  ALL_NPC_CREATURE_PACKS,
  ANIMALS_PACK_ID,
  BASE_NPC_CREATURE_PACKS,
  BUILTIN_NPC_CREATURE_DEFINITIONS,
  FANTASY_BASICS_PACK_ID,
  getBuiltinNpcCreatureDefinition,
  getNpcCreaturePack,
  listBaseNpcCreaturePacks,
  listBuiltinNpcCreatureDefinitions,
  listContextNpcCreaturePacks,
  listNpcCreaturePacks,
} from './packs';

export { builtinNpcCreatureIdToIconKey } from './packs/build-builtin';

export type {
  NpcCreatureIconGenerationStatus,
  NpcCreatureIconManifestEntry,
} from './icon-assets';
export {
  NPC_CREATURE_ICON_MANIFEST_PATH,
  NPC_CREATURE_ICON_OUTPUT_DIR,
  NPC_CREATURE_ICON_PUBLIC_DIR,
  NPC_CREATURE_ICON_SLUG_PATTERN,
  NPC_CREATURE_ICON_SOURCE_DIR,
  NPC_CREATURE_ICON_STYLE_REFS,
  buildNpcCreatureIconOutputPath,
  buildNpcCreatureIconPrompt,
  buildNpcCreatureIconPublicSrc,
  buildNpcCreatureIconSourcePath,
  getNpcCreatureIconStyleTemplate,
  isNpcCreatureIconSlug,
  normalizeNpcCreatureIconSlug,
} from './icon-assets';

export {
  NPC_CREATURE_CATALOG_MODULE_ID,
  defaultNpcCreatureCatalogModuleConfig,
  getNpcCreatureCatalogModuleConfig,
  normalizeNpcCreatureCatalogModuleConfig,
  resolveWorldNpcCreatureCatalog,
} from './world-catalog';
export type {
  NormalizeNpcCreatureCatalogModuleResult,
  NpcCreatureCatalogModuleConfig,
  NpcCreatureCatalogModuleDiagnosis,
  NpcCreatureCatalogResolveDiagnosis,
  ResolveWorldNpcCreatureCatalogInput,
  ResolvedWorldNpcCreatureCatalog,
} from './world-catalog';

export type {
  NpcCharacterEditorSeed,
  NpcLibraryPromotionAction,
  NpcPromotionPlan,
  NpcPromotionPlanError,
  NpcPromotionPlanResult,
  NpcUnresolvedChoice,
  NpcUnresolvedChoiceKey,
} from './promotion';
export {
  assertFullSheetHasNoSilentIllegalAttributes,
  buildCompactToFullWriteDraft,
  classifyNpcLibraryPromotionAction,
  isLegalFullBaseAttributes,
  planCompactToFullPromotion,
  planTemplateToCharacterPromotion,
} from './promotion';

export type {
  NpcControllerAssignment,
  NpcControllerAssignmentContext,
  NpcControllerAssignmentErr,
  NpcControllerAssignmentErrorCode,
  NpcControllerAssignmentOk,
} from './controller-assignment';
export {
  planNpcControllerAssignment,
  resolveControllerAfterMemberLeave,
} from './controller-assignment';

export type {
  NpcCreatureDefinitionSnapshot,
  NpcCreatureInstance,
  NpcCreatureInstanceKind,
  NpcCreatureInstanceRuntime,
  NpcCreatureInstanceRuntimeErr,
  NpcCreatureInstanceRuntimeErrorCode,
  NpcCreatureInstanceRuntimeOk,
  NpcCreatureInstanceRuntimeUpdate,
  NpcCreatureInstanceSpawnContext,
  NpcCreatureInstanceSpawnErr,
  NpcCreatureInstanceSpawnErrorCode,
  NpcCreatureInstanceSpawnOk,
  NpcCreatureInstanceSpawnRequest,
} from './instance';
export {
  captureNpcCreatureDefinitionSnapshot,
  clearTemporaryControllersForSession,
  formatNpcCreatureInstanceDisplayName,
  nextInstanceSequenceNumber,
  planNpcCreatureInstanceRuntimeUpdate,
  planNpcCreatureInstanceSpawn,
  resolveInstanceAfterDefinitionChange,
  resolveInstancePlayView,
} from './instance';
