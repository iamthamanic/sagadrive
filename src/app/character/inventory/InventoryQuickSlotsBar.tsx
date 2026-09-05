/**
 * InventoryQuickSlotsBar — four quick-access reference slots for Inventory v2 (#111).
 * Assign / replace / clear via domain assignQuickSlot and clearQuickSlot; displays
 * looked-up item names; empty slots stay interactive for assignment entry points.
 * Location: src/app/character/inventory/InventoryQuickSlotsBar.tsx
 */
import { useEffect, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../components/ui/alert-dialog';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';
import {
  QUICK_SLOT_COUNT,
  assignQuickSlot,
  clearQuickSlot,
  findInstanceLocation,
  type InventoryState,
  type ItemDefinitionLookup,
} from '../../../domains/character/inventory-v2';
import { itemDisplayName } from './inventory-equip-preview';

export interface InventoryQuickSlotsBarProps {
  state: InventoryState;
  lookup: ItemDefinitionLookup;
  onApplyResult: (next: InventoryState) => void;
  onRefuse: (reason: string) => void;
  pendingAssignInstanceId: string | null;
  onPendingAssignHandled: () => void;
}

type ReplaceConfirm = {
  quickSlotIndex: number;
  instanceId: string;
  previousName: string;
};

export function InventoryQuickSlotsBar({
  state,
  lookup,
  onApplyResult,
  onRefuse,
  pendingAssignInstanceId,
  onPendingAssignHandled,
}: InventoryQuickSlotsBarProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerInstanceId, setPickerInstanceId] = useState<string | null>(null);
  const [replaceConfirm, setReplaceConfirm] = useState<ReplaceConfirm | null>(null);
  const handledPendingRef = useRef<string | null>(null);
  const stateRef = useRef(state);
  const onApplyRef = useRef(onApplyResult);
  const onRefuseRef = useRef(onRefuse);
  const onPendingHandledRef = useRef(onPendingAssignHandled);
  stateRef.current = state;
  onApplyRef.current = onApplyResult;
  onRefuseRef.current = onRefuse;
  onPendingHandledRef.current = onPendingAssignHandled;

  const freeIndices = state.quickSlots
    .map((ref, index) => (ref === null ? index : -1))
    .filter((index) => index >= 0);

  useEffect(() => {
    if (!pendingAssignInstanceId) {
      handledPendingRef.current = null;
      return;
    }
    if (handledPendingRef.current === pendingAssignInstanceId) return;
    handledPendingRef.current = pendingAssignInstanceId;

    const current = stateRef.current;
    const location = findInstanceLocation(current, pendingAssignInstanceId);
    if (location?.kind !== 'base' && location?.kind !== 'equipment') {
      onRefuseRef.current(
        'Nur Gegenstände im Basis-Inventar oder in der Ausrüstung sind schnellzugriff-fähig.',
      );
      onPendingHandledRef.current();
      return;
    }
    const free = current.quickSlots
      .map((ref, index) => (ref === null ? index : -1))
      .filter((index) => index >= 0);
    if (free.length === 1) {
      const result = assignQuickSlot(current, free[0], pendingAssignInstanceId);
      if (result.ok === false) {
        onRefuseRef.current(result.reason);
      } else {
        onApplyRef.current(result.state);
      }
      onPendingHandledRef.current();
      return;
    }
    setPickerInstanceId(pendingAssignInstanceId);
    setPickerOpen(true);
    onPendingHandledRef.current();
  }, [pendingAssignInstanceId]);

  const chooseQuickIndex = (quickSlotIndex: number) => {
    if (!pickerInstanceId) return;
    const currentRef = state.quickSlots[quickSlotIndex];
    if (currentRef && currentRef !== pickerInstanceId) {
      setReplaceConfirm({
        quickSlotIndex,
        instanceId: pickerInstanceId,
        previousName: itemDisplayName(state, lookup, currentRef),
      });
      setPickerOpen(false);
      return;
    }
    const result = assignQuickSlot(state, quickSlotIndex, pickerInstanceId);
    setPickerOpen(false);
    setPickerInstanceId(null);
    if (result.ok === false) {
      onRefuse(result.reason);
      return;
    }
    onApplyResult(result.state);
  };

  const confirmReplace = () => {
    if (!replaceConfirm) return;
    const result = assignQuickSlot(
      state,
      replaceConfirm.quickSlotIndex,
      replaceConfirm.instanceId,
    );
    setReplaceConfirm(null);
    setPickerInstanceId(null);
    if (result.ok === false) {
      onRefuse(result.reason);
      return;
    }
    onApplyResult(result.state);
  };

  const handleClear = (quickSlotIndex: number) => {
    const result = clearQuickSlot(state, quickSlotIndex);
    if (result.ok === false) {
      onRefuse(result.reason);
      return;
    }
    onApplyResult(result.state);
  };

  return (
    <div className="space-y-2" data-inventory-quick-slots aria-label="Schnellzugriff">
      <h3 className="text-sm font-semibold tracking-wide">Schnellzugriff</h3>
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: QUICK_SLOT_COUNT }, (_, index) => {
          const instanceId = state.quickSlots[index];
          const name = instanceId ? itemDisplayName(state, lookup, instanceId) : null;
          return (
            <div
              key={index}
              data-quick-slot={index}
              className={[
                'relative flex min-h-11 flex-col items-center justify-center rounded-lg border p-1 text-center',
                instanceId
                  ? 'border-border bg-card'
                  : 'border-dashed border-border/70 bg-muted/15 text-muted-foreground',
              ].join(' ')}
            >
              <span className="text-[10px] uppercase text-muted-foreground">{index + 1}</span>
              {name ? (
                <>
                  <p className="line-clamp-2 px-1 text-[11px] font-medium leading-tight">{name}</p>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="absolute right-0 top-0 size-7"
                        aria-label={`Schnellzugriff ${index + 1} Aktionen`}
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => handleClear(index)}>
                        Aus Schnellzugriff entfernen
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <span className="text-[11px]">Leer</span>
              )}
            </div>
          );
        })}
      </div>
      {freeIndices.length === 0 && (
        <p className="text-[11px] text-muted-foreground">
          Alle Positionen belegt — Zuweisen ersetzt eine Referenz nach Bestätigung.
        </p>
      )}

      <Dialog
        open={pickerOpen}
        onOpenChange={(open) => {
          setPickerOpen(open);
          if (!open) setPickerInstanceId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schnellzugriff zuweisen</DialogTitle>
            <DialogDescription>Position 1–4 wählen.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 py-2 sm:grid-cols-4">
            {Array.from({ length: QUICK_SLOT_COUNT }, (_, index) => {
              const occupied = state.quickSlots[index];
              return (
                <Button
                  key={index}
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  onClick={() => chooseQuickIndex(index)}
                >
                  {index + 1}
                  {occupied ? ` · ${itemDisplayName(state, lookup, occupied)}` : ' · frei'}
                </Button>
              );
            })}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setPickerOpen(false)}>
              Abbrechen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={replaceConfirm !== null}
        onOpenChange={(open) => {
          if (!open) setReplaceConfirm(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Schnellzugriff ersetzen?</AlertDialogTitle>
            <AlertDialogDescription>
              {replaceConfirm
                ? `Position ${replaceConfirm.quickSlotIndex + 1} verweist derzeit auf „${replaceConfirm.previousName}“. Die Referenz wird ersetzt — der Gegenstand bleibt unverändert.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReplace}>Ersetzen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
