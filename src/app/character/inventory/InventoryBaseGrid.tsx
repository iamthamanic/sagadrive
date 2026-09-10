/**
 * InventoryBaseGrid — exactly 20 base slots for Inventory v2 (#110/#111/#113).
 * Desktop: HTML5 drag-and-drop plus click-to-select move targets.
 * Mobile: 2-column grid; move via parent Sheet. Occupied cells show thumbnail,
 * name, quantity, type and load; action trigger is ~44px on narrow viewports.
 * Location: src/app/character/inventory/InventoryBaseGrid.tsx
 */
import type { DragEvent, KeyboardEvent } from 'react';
import { Badge } from '../../../shared/ui/badge';
import {
  BASE_SLOT_COUNT,
  type EquipmentSlot,
  type InventoryState,
  type ItemDefinition,
  type ItemDefinitionLookup,
  type ItemInstance,
} from '../../../domains/character/inventory-v2';
import { useItemThumbnailSrc } from '../../items';
import { INVENTORY_TYPE_LABELS } from './inventory-ui-labels';
import { InventoryItemActions } from './InventoryItemActions';
import { InventoryItemThumb } from './InventoryItemThumb';

export const INVENTORY_INSTANCE_DRAG_MIME = 'application/x-inventory-instance-id';

export interface InventoryBaseGridProps {
  state: InventoryState;
  lookup: ItemDefinitionLookup;
  strength: number;
  selectedSourceSlot: number | null;
  moveMode: boolean;
  highlightedSlots?: ReadonlySet<number>;
  filterQuery: string;
  onSelectSlot: (slotIndex: number) => void;
  onDropSlot: (fromSlot: number, toSlot: number) => void;
  onApplyResult: (next: InventoryState) => void;
  onRefuse: (reason: string) => void;
  onRequestMove: (slotIndex: number) => void;
  onRequestSplit: (slotIndex: number) => void;
  onOpenContainer?: (containerInstanceId: string) => void;
  /** Desktop: stretch cells to fill equal-height panel beside Ausrüstung. */
  fillPanel?: boolean;
}

function matchesFilter(
  instance: ItemInstance | undefined,
  lookup: ItemDefinitionLookup,
  filterQuery: string,
): boolean {
  const q = filterQuery.trim().toLowerCase();
  if (!q) return true;
  if (!instance) return false;
  const definition = lookup(instance.definitionId);
  const name = definition?.name ?? instance.definitionId;
  const description = definition?.description ?? '';
  const typeLabel = definition ? INVENTORY_TYPE_LABELS[definition.type] : '';
  return (
    name.toLowerCase().includes(q) ||
    description.toLowerCase().includes(q) ||
    typeLabel.toLowerCase().includes(q) ||
    instance.definitionId.toLowerCase().includes(q)
  );
}

/** Same slot heuristic as catalog rows — drives type PNG / slot glyph fallback. */
function thumbSlot(definition: ItemDefinition | undefined): EquipmentSlot {
  const first = definition?.equipSlots?.[0];
  if (first === 'mainHand' || first === 'offHand') return 'mainHand';
  if (first === 'body' || first === 'head' || first === 'feet') return 'body';
  return 'special';
}

/**
 * OccupiedBaseSlotBody — thumbnail + name + badges for one inventar cell.
 * Isolated so `useItemThumbnailSrc` stays per-slot (hooks rules).
 */
function OccupiedBaseSlotBody({
  state,
  lookup,
  instance,
  definition,
  slotIndex,
  strength,
  displayName,
  stackLoad,
  onApplyResult,
  onRefuse,
  onRequestMove,
  onRequestSplit,
  onOpenContainer,
}: {
  state: InventoryState;
  lookup: ItemDefinitionLookup;
  instance: ItemInstance;
  definition: ItemDefinition | undefined;
  slotIndex: number;
  strength: number;
  displayName: string;
  stackLoad: number;
  onApplyResult: (next: InventoryState) => void;
  onRefuse: (reason: string) => void;
  onRequestMove: () => void;
  onRequestSplit: () => void;
  onOpenContainer?: (containerInstanceId: string) => void;
}) {
  const assetSrc = useItemThumbnailSrc(definition?.assetKey);

  return (
    <>
      <div className="absolute right-1 top-1 z-10">
        <InventoryItemActions
          state={state}
          lookup={lookup}
          instanceId={instance.instanceId}
          slotIndex={slotIndex}
          strength={strength}
          onApplyResult={onApplyResult}
          onRefuse={onRefuse}
          onRequestMove={onRequestMove}
          onRequestSplit={onRequestSplit}
          onOpenContainer={onOpenContainer}
        />
      </div>
      <div
        className="mb-1 size-9 shrink-0 overflow-hidden rounded-md border border-border/70 bg-muted/40"
        data-inventory-slot-thumb
      >
        <InventoryItemThumb
          slot={thumbSlot(definition)}
          definition={definition}
          assetSrc={assetSrc}
          alt=""
          className="size-full"
        />
      </div>
      {/* truncate + title: narrow 5-col desktop cells (~50px) must not wrap char-by-char */}
      <p className="min-w-0 truncate pr-10 text-sm font-medium leading-snug" title={displayName}>
        {displayName}
      </p>
      {instance.quantity > 1 && (
        <p className="text-xs text-muted-foreground">×{instance.quantity}</p>
      )}
      <div className="mt-auto flex min-w-0 flex-wrap gap-1 overflow-hidden pt-2">
        {definition && (
          <Badge variant="outline" className="max-w-full truncate text-[10px]">
            {INVENTORY_TYPE_LABELS[definition.type]}
          </Badge>
        )}
        <Badge variant="secondary" className="text-[10px]">
          Last {stackLoad}
        </Badge>
        {definition?.damage && (
          <Badge className="max-w-full truncate text-[10px]">{definition.damage}</Badge>
        )}
        {definition?.protection && (
          <Badge className="max-w-full truncate text-[10px]">
            Schutz {definition.protection}
          </Badge>
        )}
      </div>
    </>
  );
}

export function InventoryBaseGrid({
  state,
  lookup,
  strength,
  selectedSourceSlot,
  moveMode,
  highlightedSlots,
  filterQuery,
  onSelectSlot,
  onDropSlot,
  onApplyResult,
  onRefuse,
  onRequestMove,
  onRequestSplit,
  onOpenContainer,
  fillPanel = false,
}: InventoryBaseGridProps) {
  const handleDragStart = (event: DragEvent<HTMLDivElement>, slotIndex: number) => {
    const instanceId = state.baseSlots[slotIndex];
    if (instanceId === null) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.setData('text/plain', String(slotIndex));
    event.dataTransfer.setData(INVENTORY_INSTANCE_DRAG_MIME, instanceId);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>, toSlot: number) => {
    event.preventDefault();
    const raw = event.dataTransfer.getData('text/plain');
    const fromSlot = Number.parseInt(raw, 10);
    if (!Number.isInteger(fromSlot) || fromSlot === toSlot) return;
    onDropSlot(fromSlot, toSlot);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>, slotIndex: number) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelectSlot(slotIndex);
    }
  };

  const slots = Array.from({ length: BASE_SLOT_COUNT }, (_, index) => index);

  return (
    <div
      className={[
        'grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-5',
        fillPanel ? 'h-full min-h-0 lg:auto-rows-fr lg:grid-rows-4' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-inventory-base-grid
      role="list"
      aria-label="Inventar-Basisplätze"
    >
      {slots.map((slotIndex) => {
        const instanceId = state.baseSlots[slotIndex];
        const instance = instanceId ? state.instances[instanceId] : undefined;
        const definition = instance ? lookup(instance.definitionId) : undefined;
        const occupied = Boolean(instance);
        const filteredOut = occupied && !matchesFilter(instance, lookup, filterQuery);
        const isSource = selectedSourceSlot === slotIndex;
        const isHighlight = highlightedSlots?.has(slotIndex) ?? false;
        const unitLoad = definition?.load ?? 0;
        const stackLoad = instance ? unitLoad * instance.quantity : 0;
        const displayName = definition?.name ?? instance?.definitionId ?? 'Unbekannt';
        const qty = instance?.quantity ?? 0;
        const ariaLabel = occupied
          ? `Inventarplatz ${slotIndex + 1}: ${displayName} ×${qty}`
          : `Inventarplatz ${slotIndex + 1}: leer`;

        return (
          <div
            key={slotIndex}
            role="listitem"
            tabIndex={0}
            draggable={occupied && !moveMode}
            onDragStart={(event) => handleDragStart(event, slotIndex)}
            onDragOver={handleDragOver}
            onDrop={(event) => handleDrop(event, slotIndex)}
            onClick={() => onSelectSlot(slotIndex)}
            onKeyDown={(event) => handleKeyDown(event, slotIndex)}
            data-slot-index={slotIndex}
            aria-label={ariaLabel}
            className={[
              // min-w-0: CSS grid minmax(auto) otherwise lets long names inflate the column.
              'relative flex min-h-[88px] min-w-0 flex-col overflow-hidden rounded-lg border p-2 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
              fillPanel ? 'lg:min-h-0 lg:h-full' : '',
              occupied
                ? 'border-border bg-card hover:bg-accent/40'
                : 'border-dashed border-border/70 bg-muted/15 text-muted-foreground',
              isSource ? 'ring-2 ring-primary' : '',
              isHighlight ? 'ring-2 ring-primary/70' : '',
              moveMode && !isSource ? 'cursor-pointer hover:border-primary' : '',
              filteredOut ? 'opacity-35' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
              {slotIndex + 1}
            </span>
            {occupied && instance ? (
              <OccupiedBaseSlotBody
                state={state}
                lookup={lookup}
                instance={instance}
                definition={definition}
                slotIndex={slotIndex}
                strength={strength}
                displayName={displayName}
                stackLoad={stackLoad}
                onApplyResult={onApplyResult}
                onRefuse={onRefuse}
                onRequestMove={() => onRequestMove(slotIndex)}
                onRequestSplit={() => onRequestSplit(slotIndex)}
                onOpenContainer={onOpenContainer}
              />
            ) : (
              <p className="mt-auto text-xs">Leer</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
