/**
 * npc-creature-service — app-facing facade for NPC/creature definition CRUD (#196).
 * App slices must not query `npc_creature_definitions` directly.
 * Location: src/infrastructure/npc-creature/npc-creature-service.ts
 */
import {
  deriveNpcCreaturePower,
  type CreateNpcCreatureDefinitionInput,
  type NpcCreatureCatalogRecord,
  type NpcCreatureDefinitionSummary,
  type NpcCreatureScope,
  type UpdateNpcCreatureDefinitionInput,
} from '../../domains/npc-creature';
import { supabaseNpcCreatureRepository } from './supabase-npc-creature.repository';

export async function listNpcCreatureDefinitions(options?: {
  scope?: NpcCreatureScope;
  worldProfileId?: string | null;
  includeArchived?: boolean;
}): Promise<NpcCreatureCatalogRecord[]> {
  return supabaseNpcCreatureRepository.listDefinitions(options);
}

export async function getNpcCreatureDefinition(
  definitionId: string,
): Promise<NpcCreatureCatalogRecord | null> {
  return supabaseNpcCreatureRepository.getDefinitionById(definitionId);
}

export async function createNpcCreatureDefinition(
  input: CreateNpcCreatureDefinitionInput,
): Promise<NpcCreatureCatalogRecord> {
  return supabaseNpcCreatureRepository.createDefinition(input);
}

export async function updateNpcCreatureDefinition(
  input: UpdateNpcCreatureDefinitionInput,
): Promise<NpcCreatureCatalogRecord> {
  return supabaseNpcCreatureRepository.updateDefinition(input);
}

export async function archiveNpcCreatureDefinition(
  definitionId: string,
): Promise<NpcCreatureCatalogRecord> {
  return supabaseNpcCreatureRepository.archiveDefinition(definitionId);
}

export async function restoreNpcCreatureDefinition(
  definitionId: string,
): Promise<NpcCreatureCatalogRecord> {
  return supabaseNpcCreatureRepository.restoreDefinition(definitionId);
}

/** Library-ready summaries with derived Machtgrad labels. */
export function toNpcCreatureDefinitionSummaries(
  records: readonly NpcCreatureCatalogRecord[],
): NpcCreatureDefinitionSummary[] {
  return records.map((record) => {
    const derived = deriveNpcCreaturePower(record.definition);
    return {
      definition: record.definition,
      machtgradLabel: derived.machtgradLabel,
      status: record.status,
      scope: record.definition.scope,
      worldProfileId: record.worldProfileId,
    };
  });
}
