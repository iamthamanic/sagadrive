/**
 * npc-creature — public domain API for NPC/creature definitions (#196).
 * Session instances, library UI, and legacy D&D npcs/bestiary are out of scope.
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
  NpcCreatureScope,
  NpcCreatureSheetMode,
  NpcCreatureStatus,
} from './taxonomy';

export {
  NPC_CREATURE_CATEGORIES,
  NPC_CREATURE_KINDS,
  NPC_CREATURE_SCOPES,
  NPC_CREATURE_SHEET_MODES,
  NPC_CREATURE_STATUSES,
  isNpcCreatureCategory,
  isNpcCreatureKind,
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
  compareNpcCreatureLibraryRecords,
  filterNpcCreatureLibraryCatalog,
  hasActiveNpcCreatureLibraryFilters,
  npcCreatureMatchesFulltext,
  npcCreatureMatchesLibraryFilters,
} from './library-query';
