/**
 * inventory-persistence — read/write helpers for Inventory v2 on characters (#109).
 *
 * Prefers `inventory_v2` when `inventory_schema_version === 2` and the payload
 * validates; otherwise falls back to migrating the legacy `ItemDto[]` in memory
 * (without writing) so callers always receive an InventoryState. Persisting the
 * migration is a separate, explicit save path that creates Personal definitions
 * first and only then flips the version marker.
 *
 * Location: src/infrastructure/inventory/inventory-persistence.ts
 */
import type { ItemDto } from '../../domains/character/domain/character.entity';
import {
  bindPendingDefinitions,
  cloneInventory,
  isInventoryV2State,
  migrateLegacyInventory,
} from '../../domains/character/inventory-v2';
import type {
  InventoryState,
  LegacyMigrationResult,
  MigratedPersonalDefinitionDraft,
} from '../../domains/character/inventory-v2';
import { getAuthenticatedUserId } from '../../lib/authenticatedUser';
import { raceWithTimeoutReject, SUPABASE_QUERY_TIMEOUT_MS } from '../../lib/networkTimeout';
import { supabase } from '../../lib/supabase';
import type { CharacterDto } from '../character/character.persistence';
import {
  ITEM_DEFINITION_COLUMNS,
  mapDefinitionRow,
  toDefinitionPayload,
} from './item-catalog.persistence';
import type { ItemDefinitionDto } from './item-catalog.persistence';
import { supabaseItemCatalogRepository } from './supabase-item-catalog.repository';
import type { ItemDefinitionDraft } from './supabase-item-catalog.repository';

export interface CharacterInventoryRead {
  state: InventoryState;
  /** True when the persisted version marker is 2 and the payload validated. */
  authoritativeV2: boolean;
  /** Set when the reader fell back to legacy ItemDto[] (migrate in memory only). */
  legacyFallback: boolean;
}

/**
 * Read the character's inventory as Inventory v2.
 *
 * Never silently overwrites a valid v2 payload with a legacy re-migration.
 */
export function readCharacterInventory(
  dto: Pick<CharacterDto, 'inventory' | 'inventory_v2' | 'inventory_schema_version'>,
): CharacterInventoryRead {
  if (dto.inventory_schema_version === 2 && isInventoryV2State(dto.inventory_v2)) {
    return {
      state: cloneInventory(dto.inventory_v2),
      authoritativeV2: true,
      legacyFallback: false,
    };
  }

  if (dto.inventory_schema_version === 2) {
    console.warn(
      '[inventory-v2] inventory_schema_version=2 but inventory_v2 payload is invalid; falling back to legacy ItemDto[] without overwriting.',
    );
  }

  const migrated = migrateLegacyInventory(dto.inventory as ItemDto[] | undefined);
  return {
    state: migrated.state,
    authoritativeV2: false,
    legacyFallback: true,
  };
}

/**
 * Shape-check + catalog visibility gate before accepting an inventory_v2 write.
 *
 * `characterId` may be null on create (no adventure binding yet) — then only
 * Core + the caller's Personal catalog are visible.
 */
export async function assertWritableInventoryV2(
  state: unknown,
  characterId: string | null,
): Promise<InventoryState> {
  if (!isInventoryV2State(state)) {
    throw new Error('Ungültiges Inventar v2 — Speichern abgebrochen.');
  }

  const definitionIds = new Set(
    Object.values(state.instances).map((instance) => instance.definitionId),
  );
  if (definitionIds.size === 0) return state;

  const worldProfileId = characterId
    ? await supabaseItemCatalogRepository.resolveEffectiveWorldProfileId(characterId)
    : null;
  const catalog = await supabaseItemCatalogRepository.listCatalogRecords(worldProfileId);
  const visible = new Set(catalog.map((record) => record.definition.id));
  const missing = [...definitionIds].filter((id) => !visible.has(id));
  if (missing.length > 0) {
    throw new Error(
      `Unbekannte oder nicht sichtbare Gegenstandsdefinitionen: ${missing.slice(0, 5).join(', ')}`,
    );
  }
  return state;
}

/**
 * Persist a migrated inventory: create required Personal definitions, bind
 * pending ids, write inventory_v2, then set inventory_schema_version = 2.
 *
 * Ordering is retry-safe: definition ids are derived from the fingerprint so a
 * retry reuses the same Personal rows; the character update requires
 * `inventory_schema_version = 1` and the row's current `updated_at` so a
 * concurrent migration or edit cannot clobber a completed write. Legacy
 * `inventory` is left untouched.
 */
export async function persistMigratedInventory(
  characterId: string,
  migration: LegacyMigrationResult,
): Promise<InventoryState> {
  const fingerprintToId = new Map<string, string>();

  for (const draft of migration.personalDrafts) {
    const stableId = await ensurePersonalDefinition(draft);
    fingerprintToId.set(draft.fingerprint, stableId);
  }

  const bound = bindPendingDefinitions(migration.state, fingerprintToId);

  const { data: current, error: readError } = await raceWithTimeoutReject(
    supabase
      .from('characters')
      .select('updated_at, inventory_schema_version')
      .eq('id', characterId)
      .maybeSingle(),
    SUPABASE_QUERY_TIMEOUT_MS,
    'Charakter konnte nicht für die Inventar-Migration geladen werden (Zeitüberschreitung).',
  );
  if (readError) {
    throw new Error(`Inventar-Migration konnte den Charakter nicht laden: ${readError.message}`);
  }
  if (!current || current.inventory_schema_version !== 1) {
    throw new Error(
      'Inventar-Migration kollidierte mit einer anderen Speicherung. Bitte erneut versuchen.',
    );
  }

  const { data, error } = await raceWithTimeoutReject(
    supabase
      .from('characters')
      .update({
        inventory_v2: bound,
        inventory_schema_version: 2,
        updated_at: new Date().toISOString(),
      })
      .eq('id', characterId)
      .eq('inventory_schema_version', 1)
      .eq('updated_at', current.updated_at as string)
      .select('id')
      .maybeSingle(),
    SUPABASE_QUERY_TIMEOUT_MS,
    'Inventar v2 konnte nicht gespeichert werden (Zeitüberschreitung).',
  );

  if (error) {
    throw new Error(`Inventar v2 konnte nicht gespeichert werden: ${error.message}`);
  }
  if (!data) {
    throw new Error(
      'Inventar-Migration kollidierte mit einer anderen Speicherung. Bitte erneut versuchen.',
    );
  }

  return bound;
}

/**
 * Create-or-reuse a Personal definition for a migration fingerprint.
 * Ids are deterministic (`personal:mig-<hash>`), so a retry after a partial
 * failure does not duplicate catalog entries.
 */
async function ensurePersonalDefinition(draft: MigratedPersonalDefinitionDraft): Promise<string> {
  const id = migrationDefinitionId(draft.fingerprint);
  const existing = await fetchDefinitionById(id);
  if (existing) return existing;

  const userId = await getAuthenticatedUserId();
  const payload = toDefinitionPayload({
    ...toItemDefinitionDraft(draft),
    id,
    scope: 'personal',
  });

  const { data, error } = await raceWithTimeoutReject(
    supabase
      .from('inventory_item_definitions')
      .insert({
        id,
        scope: 'personal',
        world_profile_id: null,
        owner_user_id: userId,
        payload,
        status: 'active',
      })
      .select(ITEM_DEFINITION_COLUMNS)
      .maybeSingle(),
    SUPABASE_QUERY_TIMEOUT_MS,
    'Persönliche Definition konnte nicht angelegt werden (Zeitüberschreitung).',
  );

  if (error) {
    // Unique violation / race: another retry created it — read it back.
    const raced = await fetchDefinitionById(id);
    if (raced) return raced;
    throw new Error(`Failed to create item definition: ${error.message}`);
  }
  if (!data) {
    const raced = await fetchDefinitionById(id);
    if (raced) return raced;
    throw new Error('Definition konnte nicht angelegt werden.');
  }
  const record = mapDefinitionRow(data as ItemDefinitionDto);
  if (!record) throw new Error('Definition konnte nicht angelegt werden.');
  return record.definition.id;
}

async function fetchDefinitionById(id: string): Promise<string | null> {
  const { data, error } = await raceWithTimeoutReject(
    supabase
      .from('inventory_item_definitions')
      .select('id')
      .eq('id', id)
      .maybeSingle(),
    SUPABASE_QUERY_TIMEOUT_MS,
    'Definition konnte nicht geladen werden (Zeitüberschreitung).',
  );
  if (error) throw new Error(`Failed to load item definition: ${error.message}`);
  return typeof data?.id === 'string' ? data.id : null;
}

/** Deterministic Personal id for a migration fingerprint (retry-safe). */
export function migrationDefinitionId(fingerprint: string): string {
  return `personal:mig-${fnv1aHex(fingerprint, 32)}`;
}

function fnv1aHex(input: string, hexChars: number): string {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  let out = (hash >>> 0).toString(16).padStart(8, '0');
  // Mix a second seed so short fingerprints still expand to hexChars.
  hash = 2166136261 ^ hexChars;
  for (let index = input.length - 1; index >= 0; index -= 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
    out += (hash >>> 0).toString(16).padStart(8, '0');
  }
  return out.slice(0, hexChars);
}

function toItemDefinitionDraft(draft: MigratedPersonalDefinitionDraft): ItemDefinitionDraft {
  return {
    name: draft.name,
    description: draft.description,
    type: draft.type,
    load: draft.load,
    cost: draft.cost,
    stackLimit: draft.stackLimit,
    ...(draft.damage ? { damage: draft.damage } : {}),
    ...(draft.damageType ? { damageType: draft.damageType } : {}),
    ...(draft.protection ? { protection: draft.protection } : {}),
    ...(draft.requirements ? { requirements: draft.requirements } : {}),
    ...(draft.traits ? { traits: draft.traits } : {}),
  };
}
