/**
 * ItemLibraryToolbar — result count + Liste/Grid toggle + primary create CTA (#138).
 * Location: src/app/library/items/ItemLibraryToolbar.tsx
 */
import { LayoutGrid, List, Plus } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../components/ui/utils';
import type { ItemLibraryViewMode } from './itemLibraryLabels';

export interface ItemLibraryToolbarProps {
  resultCount: number;
  totalCount: number;
  hasActiveFilters: boolean;
  viewMode: ItemLibraryViewMode;
  onViewModeChange: (mode: ItemLibraryViewMode) => void;
  onCreate: () => void;
}

export function ItemLibraryToolbar({
  resultCount,
  totalCount,
  hasActiveFilters,
  viewMode,
  onViewModeChange,
  onCreate,
}: ItemLibraryToolbarProps) {
  const countLabel = hasActiveFilters
    ? `${resultCount} von ${totalCount} Gegenständen`
    : `${resultCount} Gegenstand${resultCount === 1 ? '' : 'e'}`;

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3"
      data-item-library-toolbar
    >
      <p className="min-w-0 flex-1 text-sm text-muted-foreground">{countLabel}</p>

      <div className="flex items-center gap-2">
        <div
          className="flex items-center gap-1 rounded-lg border p-1"
          role="group"
          aria-label="Ansicht wählen"
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Listenansicht"
            aria-pressed={viewMode === 'list'}
            onClick={() => onViewModeChange('list')}
            className={cn(
              'h-11 min-h-11 w-11 min-w-11 p-0',
              viewMode === 'list' && 'bg-background shadow-sm',
            )}
          >
            <List className="size-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Grid-Ansicht"
            aria-pressed={viewMode === 'grid'}
            onClick={() => onViewModeChange('grid')}
            className={cn(
              'h-11 min-h-11 w-11 min-w-11 p-0',
              viewMode === 'grid' && 'bg-background shadow-sm',
            )}
          >
            <LayoutGrid className="size-4" aria-hidden="true" />
          </Button>
        </div>

        <Button
          type="button"
          size="sm"
          className="h-11 min-h-11"
          onClick={onCreate}
          data-item-library-create
        >
          <Plus className="mr-2 size-4" aria-hidden="true" />
          <span className="hidden sm:inline">Neues Item erstellen</span>
          <span className="sm:hidden">Neu</span>
        </Button>
      </div>
    </div>
  );
}
