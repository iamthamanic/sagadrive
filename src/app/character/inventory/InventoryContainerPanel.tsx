/**
 * InventoryContainerPanel — Sheet UX for container contents (#111/#113).
 * Shows capacity, ordered contents, move-out to free base slots and move-in
 * from eligible base instances via domain moveIntoContainer / moveOutOfContainer.
 * Mobile: bottom Sheet; desktop: right Sheet.
 * Location: src/app/character/inventory/InventoryContainerPanel.tsx
 */
import { useState } from 'react';
import { Button } from '../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '../../../components/ui/sheet';
import { useIsMobile } from '../../../components/ui/use-mobile';
import {
  freeBaseSlotIndices,
  isContainerInstance,
  moveIntoContainer,
  moveOutOfContainer,
  type InventoryState,
  type ItemDefinitionLookup,
} from '../../../domains/character/inventory-v2';
import { itemDisplayName } from './inventory-equip-preview';

export interface InventoryContainerPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  containerInstanceId: string | null;
  state: InventoryState;
  lookup: ItemDefinitionLookup;
  onApplyResult: (next: InventoryState) => void;
  onRefuse: (reason: string) => void;
}

export function InventoryContainerPanel({
  open,
  onOpenChange,
  containerInstanceId,
  state,
  lookup,
  onApplyResult,
  onRefuse,
}: InventoryContainerPanelProps) {
  const [putPickerOpen, setPutPickerOpen] = useState(false);
  const isMobile = useIsMobile();

  const container =
    containerInstanceId && state.instances[containerInstanceId]
      ? state.instances[containerInstanceId]
      : undefined;
  const definition = container ? lookup(container.definitionId) : undefined;
  const positions =
    containerInstanceId && state.containers[containerInstanceId]
      ? state.containers[containerInstanceId]
      : [];
  const occupiedCount = positions.filter((id) => id !== null).length;
  const capacity = positions.length;
  const freeContainerIndex = positions.findIndex((id) => id === null);
  const containerFull = freeContainerIndex === -1;
  const containerName = definition?.name ?? container?.definitionId ?? 'Behälter';

  const eligibleBaseInstances = state.baseSlots
    .map((instanceId, slotIndex) => ({ instanceId, slotIndex }))
    .filter((entry): entry is { instanceId: string; slotIndex: number } => {
      if (!entry.instanceId) return false;
      if (entry.instanceId === containerInstanceId) return false;
      if (isContainerInstance(state, entry.instanceId, lookup)) return false;
      return true;
    });

  const handleMoveOut = (instanceId: string) => {
    if (!containerInstanceId) return;
    const free = freeBaseSlotIndices(state);
    if (free.length === 0) {
      onRefuse('Kein freies Basis-Fach — Verschieben blockiert.');
      return;
    }
    const result = moveOutOfContainer(state, instanceId, containerInstanceId, free[0]);
    if (result.ok === false) {
      onRefuse(result.reason);
      return;
    }
    onApplyResult(result.state);
  };

  const handleMoveIn = (instanceId: string) => {
    if (!containerInstanceId) return;
    if (isContainerInstance(state, instanceId, lookup)) {
      onRefuse('Behälter-in-Behälter ist in V2 verboten.');
      return;
    }
    if (containerFull || freeContainerIndex < 0) {
      onRefuse('Behälter ist voll.');
      return;
    }
    const result = moveIntoContainer(
      state,
      lookup,
      instanceId,
      containerInstanceId,
      freeContainerIndex,
    );
    if (result.ok === false) {
      onRefuse(result.reason);
      return;
    }
    onApplyResult(result.state);
    setPutPickerOpen(false);
  };

  return (
    <>
      <Sheet open={open && Boolean(containerInstanceId)} onOpenChange={onOpenChange}>
        <SheetContent
          side={isMobile ? 'bottom' : 'right'}
          className={
            isMobile
              ? 'max-h-[90vh] w-full overflow-y-auto'
              : 'w-full sm:max-w-md'
          }
          data-inventory-container-sheet
        >
          <SheetHeader>
            <SheetTitle>{containerName}</SheetTitle>
            <SheetDescription>
              Inhalt {occupiedCount} / {capacity}
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4">
            <Button
              type="button"
              className="min-h-11 w-full"
              variant="outline"
              disabled={containerFull || eligibleBaseInstances.length === 0}
              onClick={() => setPutPickerOpen(true)}
            >
              Gegenstand hineinlegen
            </Button>
            {containerFull && (
              <p className="text-xs text-muted-foreground">Behälter ist voll.</p>
            )}
            <ul className="space-y-2" aria-label="Behälterinhalt">
              {positions.map((instanceId, positionIndex) => {
                if (!instanceId) {
                  return (
                    <li
                      key={`empty-${positionIndex}`}
                      className="rounded-md border border-dashed border-border/60 px-3 py-2 text-xs text-muted-foreground"
                    >
                      Position {positionIndex + 1}: leer
                    </li>
                  );
                }
                const name = itemDisplayName(state, lookup, instanceId);
                const qty = state.instances[instanceId]?.quantity ?? 1;
                const freeBase = freeBaseSlotIndices(state).length > 0;
                return (
                  <li
                    key={instanceId}
                    className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{name}</p>
                      {qty > 1 && <p className="text-xs text-muted-foreground">×{qty}</p>}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="min-h-11 shrink-0"
                      disabled={!freeBase}
                      title={
                        freeBase
                          ? undefined
                          : 'Kein freies Basis-Fach — Verschieben blockiert.'
                      }
                      onClick={() => handleMoveOut(instanceId)}
                    >
                      Ins Inventar verschieben
                    </Button>
                  </li>
                );
              })}
            </ul>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={putPickerOpen} onOpenChange={setPutPickerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gegenstand hineinlegen</DialogTitle>
            <DialogDescription>
              Wähle einen Gegenstand aus dem Basis-Inventar (keine Behälter).
            </DialogDescription>
          </DialogHeader>
          <ul className="max-h-64 space-y-2 overflow-y-auto py-2">
            {eligibleBaseInstances.length === 0 && (
              <li className="text-sm text-muted-foreground">Keine geeigneten Gegenstände.</li>
            )}
            {eligibleBaseInstances.map(({ instanceId }) => (
              <li key={instanceId}>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 w-full justify-start"
                  onClick={() => handleMoveIn(instanceId)}
                >
                  {itemDisplayName(state, lookup, instanceId)}
                </Button>
              </li>
            ))}
          </ul>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setPutPickerOpen(false)}>
              Abbrechen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
