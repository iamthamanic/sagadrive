/**
 * useNpcCreatureLibrary — query/loading/error/refresh for Library NPCs & Kreaturen (#197).
 * Domain filter/search rules live in domains/npc-creature; this hook holds UI state
 * and loads definitions via the infrastructure facade.
 * Location: src/app/library/npc-creatures/useNpcCreatureLibrary.ts
 */
import { useEffect, useRef, useState } from 'react';
import type { NpcCreatureCatalogRecord } from '../../../domains/npc-creature';
import {
  EMPTY_NPC_CREATURE_LIBRARY_FILTERS,
  compareNpcCreatureLibraryRecords,
  filterNpcCreatureLibraryCatalog,
  hasActiveNpcCreatureLibraryFilters,
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
        setRecords([...list].sort(compareNpcCreatureLibraryRecords));
      })
      .catch((err) => {
        console.error('[library/npc-creatures] catalog load failed', err);
        if (requestIdRef.current !== requestId) return;
        setError(
          err instanceof Error
            ? err.message
            : 'NPCs und Kreaturen konnten nicht geladen werden.',
        );
        setRecords([]);
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
