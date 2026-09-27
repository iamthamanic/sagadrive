/**
 * useLookLibrary — load/filter Looks for Bibliothek › Looks (#343).
 * Location: src/app/library/looks/useLookLibrary.ts
 */
import { useEffect, useRef, useState } from 'react';
import {
  EMPTY_LOOK_LIBRARY_FILTERS,
  filterLookLibraryCatalog,
  hasActiveLookLibraryFilters,
  type LookLibraryFilters,
  type LookProfileRecord,
} from '../../../domains/look';
import {
  archiveLookProfile,
  duplicateLookProfile,
  listLookProfiles,
} from '../../../infrastructure/look';

export interface UseLookLibraryOptions {
  enabled?: boolean;
  /** When false, mutate actions are disabled in the UI. */
  canMutate?: boolean;
}

export interface UseLookLibraryResult {
  looks: LookProfileRecord[];
  filteredLooks: LookProfileRecord[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  filters: LookLibraryFilters;
  setFilters: (next: LookLibraryFilters) => void;
  resetFilters: () => void;
  hasActiveFilters: boolean;
  canMutate: boolean;
  refresh: () => void;
  duplicateLook: (profileId: string) => Promise<boolean>;
  archiveLook: (profileId: string) => Promise<boolean>;
}

export function useLookLibrary(options: UseLookLibraryOptions = {}): UseLookLibraryResult {
  const { enabled = true, canMutate = true } = options;
  const [looks, setLooks] = useState<LookProfileRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<LookLibraryFilters>(EMPTY_LOOK_LIBRARY_FILTERS);
  const [reloadToken, setReloadToken] = useState(0);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsLoading(true);
    setError(null);

    void listLookProfiles({ includeArchived: true })
      .then((rows) => {
        if (requestIdRef.current !== requestId) return;
        setLooks(rows);
      })
      .catch((err) => {
        console.error('[library/looks] catalog load failed', err);
        if (requestIdRef.current !== requestId) return;
        setError(
          err instanceof Error ? err.message : 'Looks konnten nicht geladen werden.',
        );
        setLooks([]);
      })
      .finally(() => {
        if (requestIdRef.current === requestId) setIsLoading(false);
      });
  }, [enabled, reloadToken]);

  const filteredLooks = filterLookLibraryCatalog(looks, searchQuery, filters);

  const duplicateLook = async (profileId: string): Promise<boolean> => {
    if (!canMutate) return false;
    try {
      await duplicateLookProfile({ sourceProfileId: profileId });
      setReloadToken((n) => n + 1);
      return true;
    } catch (err) {
      console.error('[library/looks] duplicate failed', err);
      setError(
        err instanceof Error ? err.message : 'Look konnte nicht dupliziert werden.',
      );
      return false;
    }
  };

  const archiveLook = async (profileId: string): Promise<boolean> => {
    if (!canMutate) return false;
    try {
      await archiveLookProfile(profileId);
      setReloadToken((n) => n + 1);
      return true;
    } catch (err) {
      console.error('[library/looks] archive failed', err);
      setError(
        err instanceof Error ? err.message : 'Look konnte nicht archiviert werden.',
      );
      return false;
    }
  };

  return {
    looks,
    filteredLooks,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    resetFilters: () => setFilters(EMPTY_LOOK_LIBRARY_FILTERS),
    hasActiveFilters: hasActiveLookLibraryFilters(filters),
    canMutate,
    refresh: () => setReloadToken((n) => n + 1),
    duplicateLook,
    archiveLook,
  };
}
