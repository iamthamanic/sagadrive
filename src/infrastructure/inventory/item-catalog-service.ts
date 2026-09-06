/**
 * item-catalog-service — application-facing facade for the Inventory v2 catalog
 * (#107 / #136 / #138). This is the boundary the character UI and Library Items
 * browser consume; app slices must not query `inventory_item_definitions`
 * themselves. Lifecycle ops adapt the `domains/items` write/fork API onto the
 * existing catalog table.
 * Location: src/infrastructure/inventory/item-catalog-service.ts
 */
import {
  createDefinitionLookup,
  listCoreItemDefinitions,
  selectCatalogDefinitions,
} from '../../domains/character/inventory-v2';
import type {
  CatalogDefinitionRecord,
  ItemDefinition,
  ItemDefinitionLookup,
} from '../../domains/character/inventory-v2';
import {
  compareLibraryItemDefinitions,
  listBuiltinStandardDefinitions,
  normalizeItemDefinition,
} from '../../domains/items';
import {
  supabaseItemCatalogRepository,
} from './supabase-item-catalog.repository';
import type {
  ForkDefinitionTarget,
  ItemDefinitionDraft,
} from './supabase-item-catalog.repository';

/** Everything a character screen needs to render and extend its inventory. */
export interface CharacterItemCatalog {
  effectiveWorldProfileId: string | null;
  /** Active definitions offered by Add/Catalog surfaces, already ordered. */
  addable: ItemDefinition[];
  /** Resolves owned instances, including archived definitions. */
  lookup: ItemDefinitionLookup;
  /** Raw records, for callers that need status or ownership. */
  records: CatalogDefinitionRecord[];
}

/** Library Items browser catalog (#138): Core + builtin-standard + persisted. */
export interface LibraryItemCatalog {
  /** Active definitions visible in the Library Items tab, already ordered. */
  definitions: ItemDefinition[];
  /** Raw persisted records (Personal/World), including archived. */
  persistedRecords: CatalogDefinitionRecord[];
}

/**
 * Load the catalog for a character: Core plus the exact World the character
 * effectively plays in plus the user's own Personal definitions.
 */
export async function loadCharacterItemCatalog(
  characterId: string | null,
  userId: string,
): Promise<CharacterItemCatalog> {
  const effectiveWorldProfileId = characterId
    ? await supabaseItemCatalogRepository.resolveEffectiveWorldProfileId(characterId)
    : null;
  const records = await supabaseItemCatalogRepository.listCatalogRecords(effectiveWorldProfileId);
  const context = { userId, effectiveWorldProfileId };

  return {
    effectiveWorldProfileId,
    addable: selectCatalogDefinitions(records, context),
    lookup: createDefinitionLookup(records, context),
    records,
  };
}

/**
 * Load the Library Items catalog: local Core + builtin-standard packs plus
 * Personal/World rows RLS already returns. Filter is UX-only; visibility is
 * server-side (#136). Archived persisted rows are omitted from `definitions`.
 */
export async function loadLibraryItemCatalog(): Promise<LibraryItemCatalog> {
  const persistedRecords = await supabaseItemCatalogRepository.listLibraryPersistedRecords();
  const byId = new Map<string, ItemDefinition>();

  for (const definition of listCoreItemDefinitions()) {
    byId.set(definition.id, normalizeItemDefinition(definition));
  }
  for (const definition of listBuiltinStandardDefinitions()) {
    byId.set(definition.id, normalizeItemDefinition(definition));
  }
  for (const record of persistedRecords) {
    if (record.status !== 'active') continue;
    byId.set(record.definition.id, normalizeItemDefinition(record.definition));
  }

  const definitions = [...byId.values()].sort(compareLibraryItemDefinitions);
  return { definitions, persistedRecords };
}

/**
 * Load World-scoped catalog records for a single world profile (active + archived).
 * Used by World-profile item authoring (#112); not a character Add catalog.
 */
export async function loadWorldProfileItemCatalog(
  worldProfileId: string,
): Promise<CatalogDefinitionRecord[]> {
  const records = await supabaseItemCatalogRepository.listCatalogRecords(worldProfileId);
  return records.filter(
    (r) => r.definition.scope === 'world' && r.worldProfileId === worldProfileId,
  );
}

export function createPersonalDefinition(draft: ItemDefinitionDraft): Promise<CatalogDefinitionRecord> {
  return supabaseItemCatalogRepository.createPersonalDefinition(draft);
}

export function createWorldDefinition(
  worldProfileId: string,
  draft: ItemDefinitionDraft,
): Promise<CatalogDefinitionRecord> {
  return supabaseItemCatalogRepository.createWorldDefinition(worldProfileId, draft);
}

export function updateDefinition(
  definitionId: string,
  draft: ItemDefinitionDraft,
): Promise<CatalogDefinitionRecord> {
  return supabaseItemCatalogRepository.updateDefinition(definitionId, draft);
}

/** Archiving is the only removal path; owned instances keep resolving afterwards. */
export function archiveDefinition(definitionId: string): Promise<CatalogDefinitionRecord> {
  return supabaseItemCatalogRepository.setDefinitionStatus(definitionId, 'archived');
}

export function restoreDefinition(definitionId: string): Promise<CatalogDefinitionRecord> {
  return supabaseItemCatalogRepository.setDefinitionStatus(definitionId, 'active');
}

/**
 * Fork Core/World/Personal into a new Personal or World definition.
 * Always a new id with provenance; never overwrites the source.
 */
export function forkDefinition(
  sourceDefinitionId: string,
  target: ForkDefinitionTarget,
): Promise<CatalogDefinitionRecord> {
  return supabaseItemCatalogRepository.forkDefinition(sourceDefinitionId, target);
}

export type { ForkDefinitionTarget, ItemDefinitionDraft };
