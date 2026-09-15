/**
 * npc-creature.persistence — row shapes and mapping for npc_creature_definitions (#196).
 * Location: src/infrastructure/npc-creature/npc-creature.persistence.ts
 */
import {
  NPC_CREATURE_DEFINITION_PAYLOAD_VERSION,
  parseNpcCreatureDefinition,
  toNpcCreatureDefinitionPayload,
} from '../../domains/npc-creature';
import type {
  NpcCreatureCatalogRecord,
  NpcCreatureDefinition,
  NpcCreatureScope,
  NpcCreatureStatus,
} from '../../domains/npc-creature';

/** Scopes that are persisted. */
export type PersistedNpcCreatureScope = Extract<NpcCreatureScope, 'world' | 'personal'>;

/** Row shape of `public.npc_creature_definitions`. */
export interface NpcCreatureDefinitionDto {
  id: string;
  scope: PersistedNpcCreatureScope;
  world_profile_id: string | null;
  owner_user_id: string;
  payload: unknown;
  status: NpcCreatureStatus;
  payload_version: number;
  created_at: string;
  updated_at: string;
}

export const NPC_CREATURE_DEFINITION_COLUMNS =
  'id, scope, world_profile_id, owner_user_id, payload, status, payload_version, created_at, updated_at';

/**
 * Map a row to a catalog record.
 * Returns null for corrupt payloads so one bad row cannot take down the list.
 */
export function mapNpcCreatureDefinitionRow(
  dto: NpcCreatureDefinitionDto,
): NpcCreatureCatalogRecord | null {
  const definition = parseNpcCreatureDefinition(dto.id, dto.scope, dto.payload);
  if (!definition) return null;
  return {
    definition,
    status: dto.status === 'archived' ? 'archived' : 'active',
    worldProfileId: dto.world_profile_id,
    ownerUserId: dto.owner_user_id,
  };
}

/** Payload + column version for INSERT/UPDATE. */
export function toPersistedNpcCreatureWrite(
  definition: NpcCreatureDefinition,
): { payload: Record<string, unknown>; payload_version: number } {
  return {
    payload: toNpcCreatureDefinitionPayload(definition),
    payload_version: NPC_CREATURE_DEFINITION_PAYLOAD_VERSION,
  };
}
