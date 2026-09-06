/**
 * ItemLibraryBrowser — public Library Items tab entry (#138).
 * Composes search, filters, toolbar, and list/grid results; navigates via
 * callbacks from App shell routing (single useAppLocation owner). No item
 * business rules beyond presentation wiring.
 * Location: src/app/library/items/ItemLibraryBrowser.tsx
 */
import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '../../../components/ui/input';
import { ItemLibraryFiltersBar } from './ItemLibraryFilters';
import { ItemLibraryResults } from './ItemLibraryResults';
import { ItemLibraryToolbar } from './ItemLibraryToolbar';
import {
  ITEM_LIBRARY_VIEW_MODE_STORAGE_KEY,
  type ItemLibraryViewMode,
} from './itemLibraryLabels';
import { useItemLibrary } from './useItemLibrary';

function isViewMode(value: unknown): value is ItemLibraryViewMode {
  return value === 'list' || value === 'grid';
}

function loadInitialViewMode(): ItemLibraryViewMode {
  const fallback: ItemLibraryViewMode =
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'grid' : 'list';
  try {
    const saved = window.localStorage.getItem(ITEM_LIBRARY_VIEW_MODE_STORAGE_KEY);
    return isViewMode(saved) ? saved : fallback;
  } catch {
    return fallback;
  }
}

export interface ItemLibraryBrowserProps {
  enabled?: boolean;
  /** Navigate to `/items/create` via shell routing. */
  onCreateItem: () => void;
  /** Navigate to `/items/:id` via shell routing. */
  onOpenItem: (itemId: string) => void;
}

export function ItemLibraryBrowser({
  enabled = true,
  onCreateItem,
  onOpenItem,
}: ItemLibraryBrowserProps) {
  const library = useItemLibrary({ enabled });
  const [viewMode, setViewMode] = useState<ItemLibraryViewMode>(() => loadInitialViewMode());

  useEffect(() => {
    try {
      window.localStorage.setItem(ITEM_LIBRARY_VIEW_MODE_STORAGE_KEY, viewMode);
    } catch {
      // Private mode: keep in-memory preference only.
    }
  }, [viewMode]);

  return (
    <div className="space-y-4" data-item-library-browser>
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          placeholder="Gegenstände suchen…"
          value={library.searchQuery}
          onChange={(event) => library.setSearchQuery(event.target.value)}
          className="h-11 min-h-11 pl-10"
          aria-label="Gegenstände suchen"
          data-item-library-search
        />
      </div>

      <ItemLibraryFiltersBar
        filters={library.filters}
        onChange={library.setFilters}
        onReset={library.resetFilters}
        showReset={library.hasActiveFilters}
      />

      <ItemLibraryToolbar
        resultCount={library.filteredItems.length}
        totalCount={library.items.length}
        hasActiveFilters={library.hasActiveFilters}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onCreate={onCreateItem}
      />

      <ItemLibraryResults
        items={library.filteredItems}
        viewMode={viewMode}
        isLoading={library.isLoading}
        error={library.error}
        hasActiveFilters={library.hasActiveFilters}
        catalogEmpty={library.items.length === 0}
        onOpenItem={onOpenItem}
        onResetFilters={library.resetFilters}
        onRetry={library.refresh}
      />
    </div>
  );
}
