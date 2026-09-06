/**
 * ItemLibraryCard — list/grid row for a Library Items definition (#138/#140).
 * Resolves thumbnail2d assetKey when present; otherwise type/icon fallback.
 * Location: src/app/library/items/ItemLibraryCard.tsx
 */
import type { ItemDefinition } from '../../../domains/items';
import {
  librarySourceFromOrigin,
  normalizeItemDefinition,
} from '../../../domains/items';
import { InventoryItemThumb } from '../../../components/InventoryItemThumb';
import { Badge } from '../../../components/ui/badge';
import { cn } from '../../../components/ui/utils';
import { useItemThumbnailSrc } from '../../items/useItemThumbnailSrc';
import {
  ITEM_CONTEXT_LABELS,
  ITEM_KIND_LABELS,
  ITEM_SETTING_LABELS,
  LIBRARY_SOURCE_LABELS,
  type ItemLibraryViewMode,
} from './itemLibraryLabels';

export interface ItemLibraryCardProps {
  definition: ItemDefinition;
  viewMode: ItemLibraryViewMode;
  onOpen: () => void;
}

function thumbSlot(definition: ItemDefinition): 'mainHand' | 'body' | 'special' {
  const first = definition.equipSlots?.[0];
  if (first === 'mainHand' || first === 'offHand') return 'mainHand';
  if (first === 'body' || first === 'head' || first === 'feet') return 'body';
  return 'special';
}

function metaLine(definition: ItemDefinition): string {
  const normalized = normalizeItemDefinition(definition);
  const kind = normalized.kindKey
    ? ITEM_KIND_LABELS[normalized.kindKey]
    : normalized.type;
  const settings = (normalized.settingTags ?? [])
    .map((tag) => ITEM_SETTING_LABELS[tag])
    .filter(Boolean);
  const contexts = (normalized.contexts ?? [])
    .slice(0, 2)
    .map((ctx) => ITEM_CONTEXT_LABELS[ctx])
    .filter(Boolean);
  const parts = [kind, ...settings, ...contexts];
  return parts.join(' · ');
}

function mechanicsHint(definition: ItemDefinition): string | null {
  const bits: string[] = [];
  if (definition.damage) bits.push(definition.damage);
  if (definition.protection != null) bits.push(`Schutz ${definition.protection}`);
  if (bits.length === 0) return null;
  return bits.join(' · ');
}

export function ItemLibraryCard({ definition, viewMode, onOpen }: ItemLibraryCardProps) {
  const normalized = normalizeItemDefinition(definition);
  const source = librarySourceFromOrigin(normalized.origin);
  const sourceLabel = LIBRARY_SOURCE_LABELS[source];
  const mechanics = mechanicsHint(normalized);
  const isGrid = viewMode === 'grid';
  const assetSrc = useItemThumbnailSrc(normalized.assetKey);

  return (
    <button
      type="button"
      onClick={onOpen}
      data-item-library-card={normalized.id}
      data-item-source={source}
      className={cn(
        'group w-full min-h-11 rounded-lg border border-border bg-card text-left transition-colors',
        'hover:border-primary/40 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        isGrid ? 'flex flex-col gap-2 p-3' : 'flex items-center gap-3 p-2.5 sm:p-3',
      )}
      aria-label={`${normalized.name}, ${sourceLabel}`}
    >
      <div
        className={cn(
          'shrink-0 overflow-hidden rounded-md border border-border/70 bg-muted/50',
          isGrid ? 'aspect-square w-full' : 'size-12 sm:size-14',
        )}
      >
        <InventoryItemThumb
          slot={thumbSlot(normalized)}
          definition={normalized}
          assetSrc={assetSrc}
          alt={`Vorschaubild ${normalized.name}`}
          className="size-full"
        />
      </div>

      <div className={cn('min-w-0 flex-1', isGrid && 'space-y-1')}>
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate text-sm font-medium leading-snug sm:text-base">
            {normalized.name}
          </h3>
          <Badge variant="outline" className="shrink-0 text-[10px] sm:text-xs">
            {sourceLabel}
          </Badge>
        </div>
        <p className="line-clamp-2 text-xs text-muted-foreground sm:text-sm">
          {metaLine(normalized)}
        </p>
        {mechanics ? (
          <p className="truncate text-[11px] text-muted-foreground/90 sm:text-xs">
            {mechanics}
          </p>
        ) : null}
      </div>
    </button>
  );
}
