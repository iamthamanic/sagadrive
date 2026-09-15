/**
 * useNpcCreatureLibrary — query/loading/error/refresh for Library NPCs & Kreaturen (#197/#199).
 * Merges repository-local Core + builtin pack definitions with persisted personal/world rows.
 * Location: src/app/library/npc-creatures/useNpcCreatureLibrary.ts
 */
import { useEffect, useRef, useState } from 'react';
import type { NpcCreatureCatalogRecord, NpcCreatureDefinition } from '../../../domains/npc-creature';
import {
  EMPTY_NPC_CREATURE_LIBRARY_FILTERS,
  compareNpcCreatureLibraryRecords,
  filterNpcCreatureLibraryCatalog,
  hasActiveNpcCreatureLibraryFilters,
  listBuiltinNpcCreatureDefinitions,
  listCoreNpcCreatureDefinitions,
  type NpcCreatureLibraryFilters,
} from '../../../domains/npc-creature';
import { listNpcCreatureDefinitions } from '../../../infrastructure/npc-creature/npc-creature-service';

export interface UseNpcCreatureLibraryOptions {
  enabled?: boolean;
}

export interface UseNpcCreatureLibraryResult {
  records: NpcCreatureCatalogRecord[];
  filteredRecords: NpcCreatureCatalogRecord[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  filters: NpcCreatureLibraryFilters;
  setFilters: (next: NpcCreatureLibraryFilters) => void;
  resetFilters: () => void;
  hasActiveFilters: boolean;
  refresh: () => void;
}

function toLocalRecord(definition: NpcCreatureDefinition): NpcCreatureCatalogRecord {
  return {
    definition,
    status: 'active',
    ownerUserId: '',
    worldProfileId: null,
  };
}

function mergeLibraryCatalog(
  persisted: readonly NpcCreatureCatalogRecord[],
): NpcCreatureCatalogRecord[] {
  const local = [
    ...listCoreNpcCreatureDefinitions().map(toLocalRecord),
    ...listBuiltinNpcCreatureDefinitions().map(toLocalRecord),
  ];
  const byId = new Map<string, NpcCreatureCatalogRecord>();
  for (const record of local) {
    byId.set(record.definition.id, record);
  }
  for (const record of persisted) {
    byId.set(record.definition.id, record);
  }
  return [...byId.values()].sort(compareNpcCreatureLibraryRecords);
}

export function useNpcCreatureLibrary(
  options: UseNpcCreatureLibraryOptions = {},
): UseNpcCreatureLibraryResult {
  const { enabled = true } = options;
  const [records, setRecords] = useState<NpcCreatureCatalogRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<NpcCreatureLibraryFilters>(
    EMPTY_NPC_CREATURE_LIBRARY_FILTERS,
  );
  const [reloadToken, setReloadToken] = useState(0);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsLoading(true);
    setError(null);

    void listNpcCreatureDefinitions()
      .then((list) => {
        if (requestIdRef.current !== requestId) return;
        setRecords(mergeLibraryCatalog(list));
      })
      .catch((err) => {
        console.error('[library/npc-creatures] catalog load failed', err);
        if (requestIdRef.current !== requestId) return;
        setError(
          err instanceof Error
            ? err.message
            : 'NPCs und Kreaturen konnten nicht geladen werden.',
        );
        setRecords(mergeLibraryCatalog([]));
      })
      .finally(() => {
        if (requestIdRef.current === requestId) setIsLoading(false);
      });
  }, [enabled, reloadToken]);

  const filteredRecords = filterNpcCreatureLibraryCatalog(
    records,
    searchQuery,
    filters,
  );

  const resetFilters = () => {
    setFilters(EMPTY_NPC_CREATURE_LIBRARY_FILTERS);
    setSearchQuery('');
  };

  return {
    records,
    filteredRecords,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    resetFilters,
    hasActiveFilters:
      hasActiveNpcCreatureLibraryFilters(filters) || searchQuery.trim().length > 0,
    refresh: () => setReloadToken((token) => token + 1),
  };
}
