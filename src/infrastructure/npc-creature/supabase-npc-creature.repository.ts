/**
 * supabase-npc-creature.repository — owner/world-scoped CRUD for NPC definitions (#196).
 *
 * Filters duplicate RLS from migration 021; RLS remains the authority.
 * Owner comes from the authenticated session — never from draft/client elevation.
 * Location: src/infrastructure/npc-creature/supabase-npc-creature.repository.ts
 */
import { supabase } from '../../lib/supabase';
import { getAuthenticatedUserId } from '../../lib/authenticatedUser';
import { raceWithTimeoutReject, SUPABASE_QUERY_TIMEOUT_MS } from '../../lib/networkTimeout';
import {
  assembleNpcCreatureDefinition,
  canCreateNpcCreatureDefinition,
  canMutateNpcCreatureDefinition,
  parseNpcCreatureDefinition,
  validateNpcCreatureDefinition,
  type CreateNpcCreatureDefinitionInput,
  type NpcCreatureCatalogRecord,
  type NpcCreatureDefinitionRepository,
  type NpcCreatureDefinitionWriteDraft,
  type NpcCreatureScope,
  type UpdateNpcCreatureDefinitionInput,
} from '../../domains/npc-creature';
import {
  NPC_CREATURE_DEFINITION_COLUMNS,
  mapNpcCreatureDefinitionRow,
  toPersistedNpcCreatureWrite,
  type NpcCreatureDefinitionDto,
  type PersistedNpcCreatureScope,
} from './npc-creature.persistence';

const TABLE = 'npc_creature_definitions';

export class SupabaseNpcCreatureRepository implements NpcCreatureDefinitionRepository {
  async listDefinitions(options?: {
    scope?: NpcCreatureScope;
    worldProfileId?: string | null;
    includeArchived?: boolean;
  }): Promise<NpcCreatureCatalogRecord[]> {
    await getAuthenticatedUserId();

    let query = supabase.from(TABLE).select(NPC_CREATURE_DEFINITION_COLUMNS);
    if (options?.scope) {
      query = query.eq('scope', options.scope);
    }
    if (options?.worldProfileId) {
      query = query.eq('world_profile_id', assertUuid(options.worldProfileId, 'Weltprofil'));
    }
    if (!options?.includeArchived) {
      query = query.eq('status', 'active');
    }

    const { data, error } = await raceWithTimeoutReject(
      query.order('updated_at', { ascending: false }),
      SUPABASE_QUERY_TIMEOUT_MS,
      'NPC-/Kreaturen-Definitionen konnten nicht geladen werden (Zeitüberschreitung).',
    );
    if (error) {
      throw new Error(`NPC-/Kreaturen-Definitionen konnten nicht geladen werden: ${error.message}`);
    }

    return ((data ?? []) as NpcCreatureDefinitionDto[])
      .map(mapNpcCreatureDefinitionRow)
      .filter((record): record is NpcCreatureCatalogRecord => record !== null);
  }

  async getDefinitionById(definitionId: string): Promise<NpcCreatureCatalogRecord | null> {
    await getAuthenticatedUserId();
    return this.loadPersistedRecord(definitionId);
  }

  async createDefinition(
    input: CreateNpcCreatureDefinitionInput,
  ): Promise<NpcCreatureCatalogRecord> {
    const userId = await getAuthenticatedUserId();
    const { target, draft } = input;

    if (target.scope === 'personal') {
      const context = { userId, editableWorldProfileIds: [] as const };
      if (!canCreateNpcCreatureDefinition('personal', context)) {
        throw new Error('Persönliche Definition nicht erlaubt.');
      }
      return this.insertDefinition('personal', draft, userId, null);
    }

    const worldProfileId = assertUuid(target.worldProfileId, 'Weltprofil');
    const context = { userId, editableWorldProfileIds: [worldProfileId] };
    if (!canCreateNpcCreatureDefinition('world', context, worldProfileId)) {
      throw new Error('Welt-Definition nicht erlaubt.');
    }
    return this.insertDefinition('world', draft, userId, worldProfileId);
  }

  async updateDefinition(
    input: UpdateNpcCreatureDefinitionInput,
  ): Promise<NpcCreatureCatalogRecord> {
    const definitionId = input.definitionId;
    assertPersistedId(definitionId);
    const userId = await getAuthenticatedUserId();
    const existing = await this.loadPersistedRecord(definitionId);
    if (!existing) {
      throw new Error('Definition konnte nicht gespeichert werden.');
    }

    if (existing.definition.scope === 'personal') {
      if (!canMutateNpcCreatureDefinition(existing, { userId, editableWorldProfileIds: [] })) {
        throw new Error('Definition konnte nicht gespeichert werden.');
      }
    } else if (existing.definition.scope !== 'world' || !existing.worldProfileId) {
      throw new Error('Definition konnte nicht gespeichert werden.');
    }

    const scope = scopeOfId(definitionId);
    const write = assertWritable(definitionId, scope, input.draft);

    let query = supabase
      .from(TABLE)
      .update({
        payload: write.payload,
        payload_version: write.payload_version,
      })
      .eq('id', definitionId)
      .eq('scope', scope);

    if (scope === 'personal') {
      query = query.eq('owner_user_id', userId);
    } else {
      query = query.eq(
        'world_profile_id',
        assertUuid(existing.worldProfileId as string, 'Weltprofil'),
      );
    }

    const { data, error } = await raceWithTimeoutReject(
      query.select(NPC_CREATURE_DEFINITION_COLUMNS).maybeSingle(),
      SUPABASE_QUERY_TIMEOUT_MS,
      'Definition konnte nicht gespeichert werden (Zeitüberschreitung).',
    );
    if (error) {
      throw new Error(`Definition konnte nicht gespeichert werden: ${error.message}`);
    }
    return requireRecord(data as NpcCreatureDefinitionDto | null, 'Definition konnte nicht gespeichert werden.');
  }

  async archiveDefinition(definitionId: string): Promise<NpcCreatureCatalogRecord> {
    return this.setStatus(definitionId, 'archived');
  }

  async restoreDefinition(definitionId: string): Promise<NpcCreatureCatalogRecord> {
    return this.setStatus(definitionId, 'active');
  }

  private async setStatus(
    definitionId: string,
    status: 'active' | 'archived',
  ): Promise<NpcCreatureCatalogRecord> {
    assertPersistedId(definitionId);
    const userId = await getAuthenticatedUserId();
    const existing = await this.loadPersistedRecord(definitionId);
    if (!existing) {
      throw new Error('Definition konnte nicht aktualisiert werden.');
    }

    if (existing.definition.scope === 'personal') {
      if (!canMutateNpcCreatureDefinition(existing, { userId, editableWorldProfileIds: [] })) {
        throw new Error('Definition konnte nicht aktualisiert werden.');
      }
    } else if (existing.definition.scope !== 'world' || !existing.worldProfileId) {
      throw new Error('Definition konnte nicht aktualisiert werden.');
    }

    const scope = scopeOfId(definitionId);
    let query = supabase
      .from(TABLE)
      .update({ status })
      .eq('id', definitionId)
      .eq('scope', scope);

    if (scope === 'personal') {
      query = query.eq('owner_user_id', userId);
    } else {
      query = query.eq(
        'world_profile_id',
        assertUuid(existing.worldProfileId as string, 'Weltprofil'),
      );
    }

    const { data, error } = await raceWithTimeoutReject(
      query.select(NPC_CREATURE_DEFINITION_COLUMNS).maybeSingle(),
      SUPABASE_QUERY_TIMEOUT_MS,
      'Definition konnte nicht aktualisiert werden (Zeitüberschreitung).',
    );
    if (error) {
      throw new Error(`Definition konnte nicht aktualisiert werden: ${error.message}`);
    }
    return requireRecord(
      data as NpcCreatureDefinitionDto | null,
      'Definition konnte nicht aktualisiert werden.',
    );
  }

  private async loadPersistedRecord(
    definitionId: string,
  ): Promise<NpcCreatureCatalogRecord | null> {
    const { data, error } = await raceWithTimeoutReject(
      supabase
        .from(TABLE)
        .select(NPC_CREATURE_DEFINITION_COLUMNS)
        .eq('id', definitionId)
        .maybeSingle(),
      SUPABASE_QUERY_TIMEOUT_MS,
      'Definition konnte nicht geladen werden (Zeitüberschreitung).',
    );
    if (error) {
      throw new Error(`Definition konnte nicht geladen werden: ${error.message}`);
    }
    if (!data) return null;
    return mapNpcCreatureDefinitionRow(data as NpcCreatureDefinitionDto);
  }

  private async insertDefinition(
    scope: PersistedNpcCreatureScope,
    draft: NpcCreatureDefinitionWriteDraft,
    ownerUserId: string,
    worldProfileId: string | null,
  ): Promise<NpcCreatureCatalogRecord> {
    const id = `${scope}:${crypto.randomUUID()}`;
    const write = assertWritable(id, scope, draft);

    const { data, error } = await raceWithTimeoutReject(
      supabase
        .from(TABLE)
        .insert({
          id,
          scope,
          world_profile_id: worldProfileId,
          // Derived from the authenticated session, never from client input.
          owner_user_id: ownerUserId,
          payload: write.payload,
          payload_version: write.payload_version,
          status: 'active',
        })
        .select(NPC_CREATURE_DEFINITION_COLUMNS)
        .maybeSingle(),
      SUPABASE_QUERY_TIMEOUT_MS,
      'Definition konnte nicht angelegt werden (Zeitüberschreitung).',
    );
    if (error) {
      throw new Error(`Definition konnte nicht angelegt werden: ${error.message}`);
    }
    return requireRecord(
      data as NpcCreatureDefinitionDto | null,
      'Definition konnte nicht angelegt werden.',
    );
  }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertUuid(value: string, label: string): string {
  if (!UUID_PATTERN.test(value)) {
    throw new Error(`Ungültige ${label}-Kennung.`);
  }
  return value;
}

function scopeOfId(definitionId: string): PersistedNpcCreatureScope {
  if (definitionId.startsWith('world:')) return 'world';
  if (definitionId.startsWith('personal:')) return 'personal';
  throw new Error(`Nicht persistierbare Definition: ${definitionId}`);
}

function assertPersistedId(definitionId: string): void {
  scopeOfId(definitionId);
}

function assertWritable(
  definitionId: string,
  scope: PersistedNpcCreatureScope,
  draft: NpcCreatureDefinitionWriteDraft,
): { payload: Record<string, unknown>; payload_version: number } {
  const candidate = assembleNpcCreatureDefinition(definitionId, scope, draft);
  const validation = validateNpcCreatureDefinition(candidate);
  if (validation.ok === false) {
    throw new Error(validation.errors[0] ?? 'Ungültige Definition — Speichern abgebrochen.');
  }
  const write = toPersistedNpcCreatureWrite(candidate);
  if (!parseNpcCreatureDefinition(definitionId, scope, write.payload)) {
    throw new Error('Ungültige Definition — Speichern abgebrochen.');
  }
  return write;
}

function requireRecord(
  dto: NpcCreatureDefinitionDto | null,
  message: string,
): NpcCreatureCatalogRecord {
  if (!dto) throw new Error(message);
  const record = mapNpcCreatureDefinitionRow(dto);
  if (!record) throw new Error(message);
  return record;
}

export const supabaseNpcCreatureRepository = new SupabaseNpcCreatureRepository();
