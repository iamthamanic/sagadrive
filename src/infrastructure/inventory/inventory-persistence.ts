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
import { raceWithTimeoutReject, SUPABASE_QUERY_TIMEOUT_MS } from '../../lib/networkTimeout';
import { supabase } from '../../lib/supabase';
import type { CharacterDto } from '../character/character.persistence';
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
 * Persist a migrated inventory: create required Personal definitions, bind
 * pending ids, write inventory_v2, then set inventory_schema_version = 2.
 *
 * Ordering is retry-safe: definitions are created first; the version marker
 * flips only after the state references stable ids. Legacy `inventory` is left
 * untouched.
 */
export async function persistMigratedInventory(
  characterId: string,
  migration: LegacyMigrationResult,
): Promise<InventoryState> {
  const fingerprintToId = new Map<string, string>();

  for (const draft of migration.personalDrafts) {
    const created = await supabaseItemCatalogRepository.createPersonalDefinition(
      toItemDefinitionDraft(draft),
    );
    fingerprintToId.set(draft.fingerprint, created.definition.id);
  }

  const bound = bindPendingDefinitions(migration.state, fingerprintToId);

  const { error } = await raceWithTimeoutReject(
    supabase
      .from('characters')
      .update({
        inventory_v2: bound,
        inventory_schema_version: 2,
        updated_at: new Date().toISOString(),
      })
      .eq('id', characterId),
    SUPABASE_QUERY_TIMEOUT_MS,
    'Inventar v2 konnte nicht gespeichert werden (Zeitüberschreitung).',
  );

  if (error) {
    throw new Error(`Inventar v2 konnte nicht gespeichert werden: ${error.message}`);
  }

  return bound;
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
