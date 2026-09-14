/**
 * npc-creature-service — app-facing facade for NPC/creature definition CRUD (#196)
 * and world catalog availability (#199). App slices must not query tables directly.
 * Location: src/infrastructure/npc-creature/npc-creature-service.ts
 */
import {
  deriveNpcCreaturePower,
  getBuiltinNpcCreatureDefinition,
  getCoreNpcCreatureDefinition,
  getNpcCreatureCatalogModuleConfig,
  listCoreNpcCreatureDefinitions,
  resolveWorldNpcCreatureCatalog,
  type CreateNpcCreatureDefinitionInput,
  type NpcCreatureCatalogModuleConfig,
  type NpcCreatureCatalogRecord,
  type NpcCreatureDefinition,
  type NpcCreatureDefinitionSummary,
  type NpcCreatureScope,
  type ResolvedWorldNpcCreatureCatalog,
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

/**
 * World-scoped definition authoring list (#199) — includes archived for restore UI.
 * Does not embed definitions into modules JSON.
 */
export async function loadWorldProfileNpcCreatureCatalog(
  worldProfileId: string,
): Promise<NpcCreatureCatalogRecord[]> {
  return supabaseNpcCreatureRepository.listDefinitions({
    scope: 'world',
    worldProfileId,
    includeArchived: true,
  });
}

export interface WorldNpcCreatureAvailability {
  config: NpcCreatureCatalogModuleConfig;
  resolved: ResolvedWorldNpcCreatureCatalog;
  worldRecords: NpcCreatureCatalogRecord[];
}

/**
 * Compose effective NPC/creature availability for a world profile (#199).
 * Includes the caller's active personal definitions when the module allows them.
 */
export async function loadWorldNpcCreatureAvailability(
  worldProfileId: string,
): Promise<WorldNpcCreatureAvailability> {
  const [modules, worldRecords, personalRecords] = await Promise.all([
    supabaseNpcCreatureRepository.loadWorldProfileModules(worldProfileId),
    loadWorldProfileNpcCreatureCatalog(worldProfileId),
    supabaseNpcCreatureRepository.listDefinitions({
      scope: 'personal',
      includeArchived: false,
    }),
  ]);
  const { config } = getNpcCreatureCatalogModuleConfig(modules);
  const worldDefinitions = worldRecords
    .filter((record) => record.status === 'active')
    .map((record) => record.definition);
  const personalDefinitions = personalRecords.map((record) => record.definition);

  const resolveDefinition = (
    definitionId: string,
  ): NpcCreatureDefinition | undefined => {
    const builtin = getBuiltinNpcCreatureDefinition(definitionId);
    if (builtin) return builtin;
    const core = getCoreNpcCreatureDefinition(definitionId);
    if (core) return core;
    const world = worldDefinitions.find((entry) => entry.id === definitionId);
    if (world) return world;
    return personalDefinitions.find((entry) => entry.id === definitionId);
  };

  const resolved = resolveWorldNpcCreatureCatalog({
    config,
    coreDefinitions: listCoreNpcCreatureDefinitions(),
    resolveDefinition,
    worldDefinitions,
    personalDefinitions,
  });

  return { config, resolved, worldRecords };
}
