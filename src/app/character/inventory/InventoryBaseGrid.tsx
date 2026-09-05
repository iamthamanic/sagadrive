/**
 * InventoryBaseGrid — exactly 20 base slots for Inventory v2 desktop (#110).
 * HTML5 drag-and-drop plus click-to-select move targets; occupied cells show
 * name, quantity, type and load badges. Domain merge/move is applied by parent.
 * Location: src/app/character/inventory/InventoryBaseGrid.tsx
 */
import type { DragEvent, KeyboardEvent } from 'react';
import { Badge } from '../../../components/ui/badge';
import {
  BASE_SLOT_COUNT,
  type InventoryState,
  type ItemDefinitionLookup,
  type ItemInstance,
} from '../../../domains/character/inventory-v2';
import { INVENTORY_TYPE_LABELS } from './inventory-ui-labels';
import { InventoryItemActions } from './InventoryItemActions';

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
}: InventoryBaseGridProps) {
  const handleDragStart = (event: DragEvent<HTMLDivElement>, slotIndex: number) => {
    if (state.baseSlots[slotIndex] === null) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.setData('text/plain', String(slotIndex));
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
      className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-5"
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
            aria-label={
              occupied
                ? `Platz ${slotIndex + 1}: ${definition?.name ?? 'Unbekannt'}`
                : `Platz ${slotIndex + 1}: leer`
            }
            className={[
              'relative flex min-h-[88px] flex-col rounded-lg border p-2 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
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
              <>
                <div className="absolute right-1 top-1">
                  <InventoryItemActions
                    state={state}
                    lookup={lookup}
                    instanceId={instance.instanceId}
                    slotIndex={slotIndex}
                    strength={strength}
                    onApplyResult={onApplyResult}
                    onRefuse={onRefuse}
                    onRequestMove={() => onRequestMove(slotIndex)}
                    onRequestSplit={() => onRequestSplit(slotIndex)}
                  />
                </div>
                <p className="pr-8 text-sm font-medium leading-snug">
                  {definition?.name ?? instance.definitionId}
                </p>
                {instance.quantity > 1 && (
                  <p className="text-xs text-muted-foreground">×{instance.quantity}</p>
                )}
                <div className="mt-auto flex flex-wrap gap-1 pt-2">
                  {definition && (
                    <Badge variant="outline" className="text-[10px]">
                      {INVENTORY_TYPE_LABELS[definition.type]}
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-[10px]">
                    Last {stackLoad}
                  </Badge>
                  {definition?.damage && (
                    <Badge className="text-[10px]">{definition.damage}</Badge>
                  )}
                  {definition?.protection && (
                    <Badge className="text-[10px]">Schutz {definition.protection}</Badge>
                  )}
                </div>
              </>
            ) : (
              <p className="mt-auto text-xs">Leer</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
