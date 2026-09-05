/**
 * supabase-item-catalog.repository — Supabase adapter for Inventory v2 catalog
 * definitions and effective world-profile resolution (#107).
 *
 * Every filter applied here is a duplicate of a row level security policy in
 * migration 015, never the only line of defence: RLS decides what the user may
 * read or write, these predicates only keep the payload small.
 *
 * Location: src/infrastructure/inventory/supabase-item-catalog.repository.ts
 */
import { supabase } from '../../lib/supabase';
import { getAuthenticatedUserId } from '../../lib/authenticatedUser';
import { raceWithTimeoutReject, SUPABASE_QUERY_TIMEOUT_MS } from '../../lib/networkTimeout';
import {
  coreCatalogRecords,
  parseItemDefinition,
  resolveEffectiveWorldProfileId,
} from '../../domains/character/inventory-v2';
import type {
  CatalogDefinitionRecord,
  ItemDefinition,
} from '../../domains/character/inventory-v2';
import {
  ITEM_DEFINITION_COLUMNS,
  mapDefinitionRow,
  toDefinitionPayload,
} from './item-catalog.persistence';
import type { ItemDefinitionDto, PersistedDefinitionScope } from './item-catalog.persistence';

const DEFINITIONS_TABLE = 'inventory_item_definitions';
const CHARACTERS_TABLE = 'characters';
const PROJECTS_TABLE = 'projects';

/** Draft for creating or updating a definition; identity is assigned by the repository. */
export interface ItemDefinitionDraft extends Omit<ItemDefinition, 'id' | 'scope'> {}

export class SupabaseItemCatalogRepository {
  /**
   * Effective world profile for a character.
   *
   * `adventureWorldProfileId ?? characterWorldProfileId ?? null`. The precedence
   * itself is the domain rule in `resolveEffectiveWorldProfileId` — this method
   * only supplies the two bindings.
   */
  async resolveEffectiveWorldProfileId(characterId: string): Promise<string | null> {
    const { data, error } = await raceWithTimeoutReject(
      supabase
        .from(CHARACTERS_TABLE)
        .select('world_profile_id, project_id')
        .eq('id', characterId)
        .maybeSingle(),
      SUPABASE_QUERY_TIMEOUT_MS,
      'Weltprofil konnte nicht aufgelöst werden (Zeitüberschreitung).',
    );
    if (error) {
      throw new Error(`Failed to resolve world profile for character: ${error.message}`);
    }
    if (!data) return null;

    const characterWorldProfileId = typeof data.world_profile_id === 'string' ? data.world_profile_id : null;
    const projectId = typeof data.project_id === 'string' ? data.project_id : null;

    let adventureWorldProfileId: string | null = null;
    if (projectId) {
      const { data: project, error: projectError } = await raceWithTimeoutReject(
        supabase
          .from(PROJECTS_TABLE)
          .select('world_profile_id')
          .eq('id', projectId)
          .maybeSingle(),
        SUPABASE_QUERY_TIMEOUT_MS,
        'Abenteuer-Weltprofil konnte nicht aufgelöst werden (Zeitüberschreitung).',
      );
      // A project the user may not read is not an error here — it simply
      // contributes no binding, and the character binding takes over.
      if (projectError) {
        throw new Error(`Failed to resolve world profile for adventure: ${projectError.message}`);
      }
      if (project && typeof project.world_profile_id === 'string') {
        adventureWorldProfileId = project.world_profile_id;
      }
    }

    return resolveEffectiveWorldProfileId({ adventureWorldProfileId, characterWorldProfileId });
  }

  /**
   * Every catalog record the signed-in user may see for this world profile:
   * Core from the repository, plus the World and Personal rows RLS returns.
   *
   * Includes archived rows so owned instances stay resolvable; callers that
   * render an Add catalog filter them out via `selectCatalogDefinitions`.
   */
  async listCatalogRecords(effectiveWorldProfileId: string | null): Promise<CatalogDefinitionRecord[]> {
    const userId = await getAuthenticatedUserId();

    let query = supabase.from(DEFINITIONS_TABLE).select(ITEM_DEFINITION_COLUMNS);
    if (effectiveWorldProfileId) {
      // `.or()` takes a raw PostgREST filter string, so both ids are checked
      // against the UUID shape before they are interpolated into it.
      query = query.or(
        `and(scope.eq.personal,owner_user_id.eq.${assertUuid(userId, 'Benutzer')}),` +
          `and(scope.eq.world,world_profile_id.eq.${assertUuid(effectiveWorldProfileId, 'Weltprofil')})`,
      );
    } else {
      query = query.eq('scope', 'personal').eq('owner_user_id', userId);
    }

    const { data, error } = await raceWithTimeoutReject(
      query,
      SUPABASE_QUERY_TIMEOUT_MS,
      'Gegenstandskatalog konnte nicht geladen werden (Zeitüberschreitung).',
    );
    if (error) {
      throw new Error(`Failed to load item definitions: ${error.message}`);
    }

    const persisted = ((data ?? []) as ItemDefinitionDto[])
      .map(mapDefinitionRow)
      .filter((record): record is CatalogDefinitionRecord => record !== null);

    return [...coreCatalogRecords(), ...persisted];
  }

  /** Create a Personal definition owned by the authenticated user. */
  async createPersonalDefinition(draft: ItemDefinitionDraft): Promise<CatalogDefinitionRecord> {
    const userId = await getAuthenticatedUserId();
    return this.insertDefinition('personal', draft, userId, null);
  }

  /**
   * Create a World definition. Authorization is the world profile's own edit
   * rule, enforced by RLS via `current_user_can_edit_world_profile`.
   */
  async createWorldDefinition(
    worldProfileId: string,
    draft: ItemDefinitionDraft,
  ): Promise<CatalogDefinitionRecord> {
    const userId = await getAuthenticatedUserId();
    if (!worldProfileId) {
      throw new Error('Eine Welt-Definition benötigt ein Weltprofil.');
    }
    return this.insertDefinition('world', draft, userId, worldProfileId);
  }

  /**
   * Update a definition's payload. Id, scope and ownership are immutable — the
   * database triggers reject any attempt to change them, so a rename can never
   * strand an owned instance.
   */
  async updateDefinition(definitionId: string, draft: ItemDefinitionDraft): Promise<CatalogDefinitionRecord> {
    const scope = scopeOfId(definitionId);
    // Validate before writing. Writing first and parsing afterwards would leave
    // a previously valid definition permanently unreadable (mapDefinitionRow
    // returns null) while the caller only sees a generic save error.
    const payload = assertWritablePayload(definitionId, scope, draft);

    const { data, error } = await raceWithTimeoutReject(
      supabase
        .from(DEFINITIONS_TABLE)
        .update({ payload })
        .eq('id', definitionId)
        .select(ITEM_DEFINITION_COLUMNS)
        .maybeSingle(),
      SUPABASE_QUERY_TIMEOUT_MS,
      'Definition konnte nicht gespeichert werden (Zeitüberschreitung).',
    );
    if (error) {
      throw new Error(`Failed to update item definition: ${error.message}`);
    }
    return requireRecord(data as ItemDefinitionDto | null, 'Definition konnte nicht gespeichert werden.');
  }

  /**
   * Archive or restore a definition. Archiving is the only removal path — there
   * is no DELETE policy on the table, so owned instances always keep resolving.
   */
  async setDefinitionStatus(
    definitionId: string,
    status: 'active' | 'archived',
  ): Promise<CatalogDefinitionRecord> {
    const { data, error } = await raceWithTimeoutReject(
      supabase
        .from(DEFINITIONS_TABLE)
        .update({ status })
        .eq('id', definitionId)
        .select(ITEM_DEFINITION_COLUMNS)
        .maybeSingle(),
      SUPABASE_QUERY_TIMEOUT_MS,
      'Status konnte nicht geändert werden (Zeitüberschreitung).',
    );
    if (error) {
      throw new Error(`Failed to change item definition status: ${error.message}`);
    }
    return requireRecord(data as ItemDefinitionDto | null, 'Definition konnte nicht geändert werden.');
  }

  private async insertDefinition(
    scope: PersistedDefinitionScope,
    draft: ItemDefinitionDraft,
    ownerUserId: string,
    worldProfileId: string | null,
  ): Promise<CatalogDefinitionRecord> {
    const id = `${scope}:${crypto.randomUUID()}`;
    const payload = assertWritablePayload(id, scope, draft);

    const { data, error } = await raceWithTimeoutReject(
      supabase
        .from(DEFINITIONS_TABLE)
        .insert({
          id,
          scope,
          world_profile_id: worldProfileId,
          // Derived from the authenticated session, never from client input.
          owner_user_id: ownerUserId,
          payload,
          status: 'active',
        })
        .select(ITEM_DEFINITION_COLUMNS)
        .maybeSingle(),
      SUPABASE_QUERY_TIMEOUT_MS,
      'Definition konnte nicht angelegt werden (Zeitüberschreitung).',
    );
    if (error) {
      throw new Error(`Failed to create item definition: ${error.message}`);
    }
    return requireRecord(data as ItemDefinitionDto | null, 'Definition konnte nicht angelegt werden.');
  }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertUuid(value: string, label: string): string {
  if (!UUID_PATTERN.test(value)) {
    throw new Error(`Ungültige ${label}-Kennung.`);
  }
  return value;
}

function scopeOfId(definitionId: string): PersistedDefinitionScope {
  if (definitionId.startsWith('world:')) return 'world';
  if (definitionId.startsWith('personal:')) return 'personal';
  throw new Error(`Nicht persistierbare Definition: ${definitionId}`);
}

/**
 * Build a payload the read path will accept, or refuse the write.
 *
 * Must run before the UPDATE/INSERT: a rejected payload that still lands in the
 * column turns a previously valid definition into an unresolvable one for every
 * owned instance that points at it.
 */
function assertWritablePayload(
  definitionId: string,
  scope: PersistedDefinitionScope,
  draft: ItemDefinitionDraft,
): Record<string, unknown> {
  const payload = toDefinitionPayload({ ...draft, id: definitionId, scope });
  if (!parseItemDefinition(definitionId, scope, payload)) {
    throw new Error('Ungültige Definition — Speichern abgebrochen.');
  }
  return payload;
}

function requireRecord(dto: ItemDefinitionDto | null, message: string): CatalogDefinitionRecord {
  if (!dto) throw new Error(message);
  const record = mapDefinitionRow(dto);
  if (!record) throw new Error(message);
  return record;
}

export const supabaseItemCatalogRepository = new SupabaseItemCatalogRepository();
