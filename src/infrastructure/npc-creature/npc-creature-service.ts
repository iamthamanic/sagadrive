/**
 * npc-creature-service — app-facing facade for NPC/creature definition CRUD (#196),
 * world catalog availability (#199), and promotion/controller (#200).
 * App slices must not query tables directly.
 * Location: src/infrastructure/npc-creature/npc-creature-service.ts
 */
import {
  assertFullSheetHasNoSilentIllegalAttributes,
  buildCompactToFullWriteDraft,
  deriveNpcCreaturePower,
  getBuiltinNpcCreatureDefinition,
  getCoreNpcCreatureDefinition,
  getNpcCreatureCatalogModuleConfig,
  listCoreNpcCreatureDefinitions,
  planNpcControllerAssignment,
  resolveWorldNpcCreatureCatalog,
  type CreateNpcCreatureDefinitionInput,
  type NpcControllerAssignment,
  type NpcCreatureCatalogModuleConfig,
  type NpcCreatureCatalogRecord,
  type NpcCreatureDefinition,
  type NpcCreatureDefinitionSummary,
  type NpcCreatureScope,
  type ResolvedWorldNpcCreatureCatalog,
  type UpdateNpcCreatureDefinitionInput,
} from '../../domains/npc-creature';
import { getAuthenticatedUserId } from '../../lib/authenticatedUser';
import { supabase } from '../../lib/supabase';
import { raceWithTimeoutReject, SUPABASE_QUERY_TIMEOUT_MS } from '../../lib/networkTimeout';
import {
  toNpcControllerAssignment,
  type NpcControllerAssignmentRow,
} from './npc-creature-controller.persistence';
import { supabaseNpcCreatureRepository } from './supabase-npc-creature.repository';

const CONTROLLER_TABLE = 'npc_creature_controller_assignments';

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

/**
 * Compact → Full (#200): flip sheetMode on the same definition id after a legal CharacterEditor save.
 */
export async function promoteNpcCreatureCompactToFull(input: {
  definitionId: string;
  fullSheet: Readonly<Record<string, unknown>>;
}): Promise<NpcCreatureCatalogRecord> {
  const attrsCheck = assertFullSheetHasNoSilentIllegalAttributes(input.fullSheet);
  if (attrsCheck.ok === false) {
    throw new Error(attrsCheck.message);
  }

  const existing = await supabaseNpcCreatureRepository.getDefinitionById(input.definitionId);
  if (!existing) {
    throw new Error('Figur wurde nicht gefunden.');
  }

  const draft = buildCompactToFullWriteDraft(existing.definition, input.fullSheet);
  if (!draft) {
    throw new Error('Compact→Full-Entwurf ungültig — Full Sheet fehlt oder ist leer.');
  }

  return supabaseNpcCreatureRepository.updateDefinition({
    definitionId: input.definitionId,
    draft,
  });
}

/** Load controller assignment for a campaign + definition (#200). */
export async function getNpcCreatureControllerAssignment(
  projectId: string,
  definitionId: string,
): Promise<NpcControllerAssignment | null> {
  await getAuthenticatedUserId();
  const { data, error } = await raceWithTimeoutReject(
    supabase
      .from(CONTROLLER_TABLE)
      .select('project_id, definition_id, controller_user_id, assigned_by, updated_at')
      .eq('project_id', projectId)
      .eq('definition_id', definitionId)
      .maybeSingle(),
    SUPABASE_QUERY_TIMEOUT_MS,
    'Controller-Zuweisung konnte nicht geladen werden (Zeitüberschreitung).',
  );
  if (error) {
    throw new Error(`Controller-Zuweisung konnte nicht geladen werden: ${error.message}`);
  }
  if (!data) return null;
  return toNpcControllerAssignment(data as NpcControllerAssignmentRow);
}

/**
 * Assign / clear controller via SECURITY DEFINER RPC (#200).
 * Domain plan runs first; server re-validates GM + membership.
 */
export async function assignNpcCreatureController(input: {
  projectId: string;
  definitionId: string;
  controllerUserId: string | null;
  activeMemberUserIds: readonly string[];
}): Promise<NpcControllerAssignment> {
  const actorUserId = await getAuthenticatedUserId();
  const record = await supabaseNpcCreatureRepository.getDefinitionById(input.definitionId);
  if (!record) {
    throw new Error('Figur wurde nicht gefunden.');
  }

  const planned = planNpcControllerAssignment(
    record.definition,
    {
      projectId: input.projectId,
      definitionId: input.definitionId,
      controllerUserId: input.controllerUserId,
    },
    {
      actorUserId,
      actorRole: 'gm',
      activeMemberUserIds: input.activeMemberUserIds,
    },
  );
  if (planned.ok === false) {
    throw new Error(planned.message);
  }

  const { data, error } = await raceWithTimeoutReject(
    supabase.rpc('assign_npc_creature_controller', {
      p_project_id: planned.assignment.projectId,
      p_definition_id: planned.assignment.definitionId,
      p_controller_user_id: planned.assignment.controllerUserId,
    }),
    SUPABASE_QUERY_TIMEOUT_MS,
    'Controller konnte nicht zugewiesen werden (Zeitüberschreitung).',
  );
  if (error) {
    throw new Error(`Controller konnte nicht zugewiesen werden: ${error.message}`);
  }
  if (!data || typeof data !== 'object') {
    throw new Error('Controller konnte nicht zugewiesen werden.');
  }
  return toNpcControllerAssignment(data as NpcControllerAssignmentRow);
}
