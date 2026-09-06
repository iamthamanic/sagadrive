/**
 * useItemLibrary — query/loading/error/refresh state for Library Items (#138).
 * Domain filter/search rules live in domains/items; this hook only holds UI state
 * and loads the catalog via the infrastructure facade.
 * Location: src/app/library/items/useItemLibrary.ts
 */
import { useEffect, useRef, useState } from 'react';
import type { ItemDefinition } from '../../../domains/items';
import {
  EMPTY_ITEM_LIBRARY_FILTERS,
  buildPackMembershipIndex,
  filterItemLibraryCatalog,
  hasActiveItemLibraryFilters,
  listItemPacks,
  type ItemLibraryFilters,
} from '../../../domains/items';
import { loadLibraryItemCatalog } from '../../../infrastructure/inventory/item-catalog-service';

export interface UseItemLibraryOptions {
  enabled?: boolean;
}

export interface UseItemLibraryResult {
  items: ItemDefinition[];
  filteredItems: ItemDefinition[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  filters: ItemLibraryFilters;
  setFilters: (next: ItemLibraryFilters) => void;
  resetFilters: () => void;
  hasActiveFilters: boolean;
  packMembership: ReadonlyMap<string, readonly string[]>;
  refresh: () => void;
}

const PACK_MEMBERSHIP = buildPackMembershipIndex(listItemPacks());

export function useItemLibrary(options: UseItemLibraryOptions = {}): UseItemLibraryResult {
  const { enabled = true } = options;
  const [items, setItems] = useState<ItemDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<ItemLibraryFilters>(EMPTY_ITEM_LIBRARY_FILTERS);
  const [reloadToken, setReloadToken] = useState(0);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsLoading(true);
    setError(null);

    void loadLibraryItemCatalog()
      .then((catalog) => {
        if (requestIdRef.current !== requestId) return;
        setItems(catalog.definitions);
      })
      .catch((err) => {
        console.error('[library/items] catalog load failed', err);
        if (requestIdRef.current !== requestId) return;
        setError(
          err instanceof Error
            ? err.message
            : 'Gegenstände konnten nicht geladen werden.',
        );
        setItems([]);
      })
      .finally(() => {
        if (requestIdRef.current === requestId) setIsLoading(false);
      });
  }, [enabled, reloadToken]);

  const filteredItems = filterItemLibraryCatalog(
    items,
    searchQuery,
    filters,
    PACK_MEMBERSHIP,
  );

  const resetFilters = () => {
    setFilters(EMPTY_ITEM_LIBRARY_FILTERS);
    setSearchQuery('');
  };

  return {
    items,
    filteredItems,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    resetFilters,
    hasActiveFilters: hasActiveItemLibraryFilters(filters) || searchQuery.trim().length > 0,
    packMembership: PACK_MEMBERSHIP,
    refresh: () => setReloadToken((token) => token + 1),
  };
}
