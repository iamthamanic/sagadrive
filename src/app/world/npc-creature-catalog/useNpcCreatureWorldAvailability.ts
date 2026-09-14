/**
 * useNpcCreatureWorldAvailability — world-editor state for `npc-creature-catalog`
 * (#199). Pack toggles, include/exclude, personal switch, live effective count.
 * Location: src/app/world/npc-creature-catalog/useNpcCreatureWorldAvailability.ts
 */
import { useEffect, useState } from 'react';
import type { NpcCreatureDefinition } from '../../../domains/npc-creature';
import {
  ANIMALS_PACK_ID,
  FANTASY_BASICS_PACK_ID,
  NPC_CREATURE_CATALOG_MODULE_ID,
  getBuiltinNpcCreatureDefinition,
  getCoreNpcCreatureDefinition,
  getNpcCreatureCatalogModuleConfig,
  listBaseNpcCreaturePacks,
  listBuiltinNpcCreatureDefinitions,
  listContextNpcCreaturePacks,
  listCoreNpcCreatureDefinitions,
  normalizeNpcCreatureCatalogModuleConfig,
  resolveWorldNpcCreatureCatalog,
  type NpcCreatureCatalogModuleConfig,
  type NpcCreatureCatalogModuleDiagnosis,
} from '../../../domains/npc-creature';
import { loadWorldProfileNpcCreatureCatalog } from '../../../infrastructure/npc-creature/npc-creature-service';
import type { WorldModuleConfigMap } from '../../../domains/world/contracts/world.types';

const BASE_PACK_LABELS: Readonly<Record<string, string>> = {
  [FANTASY_BASICS_PACK_ID]: 'Fantasy Basics',
  [ANIMALS_PACK_ID]: 'Tiere',
};

export interface PackToggleVm {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  unknown: boolean;
}

export interface IdListEntryVm {
  id: string;
  label: string;
  unknown: boolean;
}

export interface UseNpcCreatureWorldAvailabilityArgs {
  modules: WorldModuleConfigMap;
  onModulesChange: (
    next:
      | WorldModuleConfigMap
      | ((current: WorldModuleConfigMap) => WorldModuleConfigMap),
  ) => void;
  worldProfileId?: string | null;
}

export interface UseNpcCreatureWorldAvailabilityResult {
  config: NpcCreatureCatalogModuleConfig;
  diagnosis: NpcCreatureCatalogModuleDiagnosis;
  basePacks: PackToggleVm[];
  contextPacks: PackToggleVm[];
  includes: IdListEntryVm[];
  excludes: IdListEntryVm[];
  allowPersonalDefinitions: boolean;
  effectiveCount: number;
  worldDefsLoading: boolean;
  worldDefsError: string | null;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  searchResults: readonly NpcCreatureDefinition[];
  togglePack: (packId: string, enabled: boolean) => void;
  addInclude: (definitionId: string) => void;
  removeInclude: (definitionId: string) => void;
  addExclude: (definitionId: string) => void;
  removeExclude: (definitionId: string) => void;
  setAllowPersonalDefinitions: (value: boolean) => void;
}

function writeConfig(
  modules: WorldModuleConfigMap,
  config: NpcCreatureCatalogModuleConfig,
): WorldModuleConfigMap {
  return {
    ...modules,
    [NPC_CREATURE_CATALOG_MODULE_ID]: {
      ...(modules[NPC_CREATURE_CATALOG_MODULE_ID] ?? {}),
      enabledPackIds: config.enabledPackIds,
      includedDefinitionIds: config.includedDefinitionIds,
      excludedDefinitionIds: config.excludedDefinitionIds,
      allowPersonalDefinitions: config.allowPersonalDefinitions,
    },
  };
}

function labelForDefinitionId(definitionId: string): string {
  const builtin = getBuiltinNpcCreatureDefinition(definitionId);
  if (builtin) return builtin.name;
  const core = getCoreNpcCreatureDefinition(definitionId);
  if (core) return core.name;
  return definitionId;
}

function isKnownDefinitionId(definitionId: string): boolean {
  return (
    getBuiltinNpcCreatureDefinition(definitionId) !== undefined ||
    getCoreNpcCreatureDefinition(definitionId) !== undefined
  );
}

function patchList(ids: readonly string[], id: string, add: boolean): string[] {
  if (add) {
    if (ids.includes(id)) return [...ids];
    return [...ids, id];
  }
  return ids.filter((entry) => entry !== id);
}

export function useNpcCreatureWorldAvailability({
  modules,
  onModulesChange,
  worldProfileId,
}: UseNpcCreatureWorldAvailabilityArgs): UseNpcCreatureWorldAvailabilityResult {
  const { config, diagnosis } = getNpcCreatureCatalogModuleConfig(modules);
  const [searchQuery, setSearchQuery] = useState('');
  const [worldDefinitions, setWorldDefinitions] = useState<NpcCreatureDefinition[]>([]);
  const [worldDefsLoading, setWorldDefsLoading] = useState(false);
  const [worldDefsError, setWorldDefsError] = useState<string | null>(null);

  useEffect(() => {
    if (!worldProfileId) {
      setWorldDefinitions([]);
      setWorldDefsError(null);
      setWorldDefsLoading(false);
      return;
    }
    let cancelled = false;
    setWorldDefsLoading(true);
    setWorldDefsError(null);
    void loadWorldProfileNpcCreatureCatalog(worldProfileId)
      .then((records) => {
        if (cancelled) return;
        setWorldDefinitions(
          records
            .filter((record) => record.status === 'active')
            .map((record) => record.definition),
        );
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error('[worlds] npc-creature-catalog world defs load failed', err);
        setWorldDefsError(
          err instanceof Error
            ? err.message
            : 'Welt-NPCs/-Kreaturen konnten nicht geladen werden.',
        );
        setWorldDefinitions([]);
      })
      .finally(() => {
        if (!cancelled) setWorldDefsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [worldProfileId]);

  const enabledPackSet = new Set(config.enabledPackIds);
  const knownBase = listBaseNpcCreaturePacks();
  const knownContext = listContextNpcCreaturePacks();
  const knownPackIds = new Set([...knownBase, ...knownContext].map((pack) => pack.id));

  const basePacks: PackToggleVm[] = knownBase.map((pack) => ({
    id: pack.id,
    label: BASE_PACK_LABELS[pack.id] ?? pack.name,
    description: pack.description,
    enabled: enabledPackSet.has(pack.id),
    unknown: false,
  }));

  const contextPacks: PackToggleVm[] = knownContext.map((pack) => ({
    id: pack.id,
    label: pack.name,
    description: pack.description,
    enabled: enabledPackSet.has(pack.id),
    unknown: false,
  }));

  for (const packId of config.enabledPackIds) {
    if (knownPackIds.has(packId)) continue;
    contextPacks.push({
      id: packId,
      label: packId,
      description: 'Unbekanntes Pack (von neuerer App-Version). Bleibt erhalten.',
      enabled: true,
      unknown: true,
    });
  }

  const includes: IdListEntryVm[] = config.includedDefinitionIds.map((id) => ({
    id,
    label: labelForDefinitionId(id),
    unknown: !isKnownDefinitionId(id),
  }));

  const excludes: IdListEntryVm[] = config.excludedDefinitionIds.map((id) => ({
    id,
    label: labelForDefinitionId(id),
    unknown: !isKnownDefinitionId(id),
  }));

  const resolveDefinition = (definitionId: string): NpcCreatureDefinition | undefined => {
    const builtin = getBuiltinNpcCreatureDefinition(definitionId);
    if (builtin) return builtin;
    const world = worldDefinitions.find((entry) => entry.id === definitionId);
    if (world) return world;
    return getCoreNpcCreatureDefinition(definitionId);
  };

  const resolved = resolveWorldNpcCreatureCatalog({
    config,
    coreDefinitions: listCoreNpcCreatureDefinitions(),
    resolveDefinition,
    worldDefinitions,
    personalDefinitions: [],
  });

  const query = searchQuery.trim().toLowerCase();
  const searchResults =
    query.length === 0
      ? []
      : listBuiltinNpcCreatureDefinitions()
          .filter((definition) => {
            const haystack =
              `${definition.name} ${definition.description} ${definition.id}`.toLowerCase();
            return haystack.includes(query);
          })
          .slice(0, 12);

  const updateConfig = (
    recipe: (current: NpcCreatureCatalogModuleConfig) => NpcCreatureCatalogModuleConfig,
  ) => {
    onModulesChange((currentModules) => {
      const { config: current } = getNpcCreatureCatalogModuleConfig(currentModules);
      const normalized = normalizeNpcCreatureCatalogModuleConfig(recipe(current));
      return writeConfig(currentModules, normalized.config);
    });
  };

  return {
    config,
    diagnosis,
    basePacks,
    contextPacks,
    includes,
    excludes,
    allowPersonalDefinitions: config.allowPersonalDefinitions,
    effectiveCount: resolved.definitions.length,
    worldDefsLoading,
    worldDefsError,
    searchQuery,
    setSearchQuery,
    searchResults,
    togglePack: (packId, enabled) => {
      updateConfig((current) => ({
        ...current,
        enabledPackIds: patchList(current.enabledPackIds, packId, enabled),
      }));
    },
    addInclude: (definitionId) => {
      updateConfig((current) => ({
        ...current,
        includedDefinitionIds: patchList(current.includedDefinitionIds, definitionId, true),
        excludedDefinitionIds: current.excludedDefinitionIds.filter((id) => id !== definitionId),
      }));
    },
    removeInclude: (definitionId) => {
      updateConfig((current) => ({
        ...current,
        includedDefinitionIds: patchList(current.includedDefinitionIds, definitionId, false),
      }));
    },
    addExclude: (definitionId) => {
      updateConfig((current) => ({
        ...current,
        excludedDefinitionIds: patchList(current.excludedDefinitionIds, definitionId, true),
      }));
    },
    removeExclude: (definitionId) => {
      updateConfig((current) => ({
        ...current,
        excludedDefinitionIds: patchList(current.excludedDefinitionIds, definitionId, false),
      }));
    },
    setAllowPersonalDefinitions: (value) => {
      updateConfig((current) => ({
        ...current,
        allowPersonalDefinitions: value,
      }));
    },
  };
}
