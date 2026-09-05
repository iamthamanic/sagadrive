/**
 * InventoryItemActions — per-stack action menu for Inventory v2 desktop (#110).
 * Verschieben, Teilen, Zusammenführen, Ausrüsten, Verbrauchen, Entfernen.
 * Impossible actions are hidden; remove uses AlertDialog with character-removal copy.
 * Location: src/app/character/inventory/InventoryItemActions.tsx
 */
import { useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import {
  consumeItem,
  equipItem,
  freeBaseSlotIndices,
  isSameStackFamily,
  mergeStacks,
  removeItem,
  splitStack,
  type EquipmentSlot,
  type InventoryOperationResult,
  type InventoryState,
  type ItemDefinitionLookup,
} from '../../../domains/character/inventory-v2';

export interface InventoryItemActionsProps {
  state: InventoryState;
  lookup: ItemDefinitionLookup;
  instanceId: string;
  slotIndex: number;
  strength: number;
  onApplyResult: (next: InventoryState) => void;
  onRefuse: (reason: string) => void;
  onRequestMove: () => void;
  onRequestSplit: () => void;
}

export function InventoryItemActions({
  state,
  lookup,
  instanceId,
  slotIndex,
  strength,
  onApplyResult,
  onRefuse,
  onRequestMove,
  onRequestSplit,
}: InventoryItemActionsProps) {
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removeAmount, setRemoveAmount] = useState(1);
  const [removeMode, setRemoveMode] = useState<'one' | 'custom' | 'all'>('all');

  const instance = state.instances[instanceId];
  if (!instance) return null;
  const definition = lookup(instance.definitionId);

  const canSplit = Boolean(definition && instance.quantity > 1 && (definition.stackLimit ?? 1) > 1);
  const mergeTargetExists = Object.values(state.instances).some((other) => {
    if (other.instanceId === instanceId) return false;
    if (!isSameStackFamily(instance, other)) return false;
    const otherDef = lookup(other.definitionId);
    if (!otherDef || otherDef.stackLimit <= 1) return false;
    return other.quantity < otherDef.stackLimit;
  });
  const equipSlots = definition?.equipSlots ?? [];
  const canEquip = equipSlots.length > 0;
  const canConsume = definition?.type === 'consumable';

  const applyOrRefuse = (result: InventoryOperationResult) => {
    if (result.ok === false) {
      onRefuse(result.reason);
      return;
    }
    onApplyResult(result.state);
  };

  const handleEquip = () => {
    if (!definition || equipSlots.length === 0) return;
    const preferred: EquipmentSlot = definition.twoHanded
      ? 'mainHand'
      : equipSlots[0];
    const result = equipItem(state, lookup, instanceId, preferred, strength);
    if (result.ok === false) {
      onRefuse(result.reason);
      return;
    }
    onApplyResult(result.state);
    toast.success(`${definition.name} ausgerüstet (Ausrüstungs-UI folgt in #111)`);
  };

  const handleConsume = () => {
    applyOrRefuse(consumeItem(state, lookup, instanceId));
  };

  const handleQuickMerge = () => {
    const target = Object.values(state.instances).find((other) => {
      if (other.instanceId === instanceId) return false;
      if (!isSameStackFamily(instance, other)) return false;
      const otherDef = lookup(other.definitionId);
      if (!otherDef || otherDef.stackLimit <= 1) return false;
      return other.quantity < otherDef.stackLimit;
    });
    if (!target) {
      onRefuse('Kein kompatibler Stapel gefunden.');
      return;
    }
    applyOrRefuse(mergeStacks(state, lookup, instanceId, target.instanceId));
  };

  const openRemove = () => {
    setRemoveMode(instance.quantity > 1 ? 'all' : 'all');
    setRemoveAmount(1);
    setRemoveOpen(true);
  };

  const confirmRemove = () => {
    let amount = instance.quantity;
    if (instance.quantity > 1) {
      if (removeMode === 'one') amount = 1;
      else if (removeMode === 'custom') amount = Math.min(instance.quantity, Math.max(1, removeAmount));
      else amount = instance.quantity;
    }

    if (amount >= instance.quantity) {
      applyOrRefuse(removeItem(state, instanceId));
      setRemoveOpen(false);
      return;
    }

    const free = freeBaseSlotIndices(state).find((index) => index !== slotIndex);
    if (free === undefined) {
      onRefuse('Kein freier Platz zum Abspalten der zu entfernenden Menge.');
      return;
    }
    const split = splitStack(state, lookup, instanceId, amount, { kind: 'base', slotIndex: free });
    if (split.ok === false) {
      onRefuse(split.reason);
      return;
    }
    const splitInstanceId = split.state.baseSlots[free];
    if (!splitInstanceId) {
      onRefuse('Teilmenge konnte nicht abgespalten werden.');
      return;
    }
    applyOrRefuse(removeItem(split.state, splitInstanceId));
    setRemoveOpen(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-8"
            aria-label="Gegenstandsaktionen"
            onClick={(event) => event.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
          <DropdownMenuItem
            onSelect={() => {
              onRequestMove();
            }}
          >
            Verschieben
          </DropdownMenuItem>
          {canSplit && (
            <DropdownMenuItem
              onSelect={() => {
                onRequestSplit();
              }}
            >
              Stapel teilen
            </DropdownMenuItem>
          )}
          {mergeTargetExists && (
            <DropdownMenuItem
              onSelect={() => {
                handleQuickMerge();
              }}
            >
              Mit gleichem Stapel zusammenführen
            </DropdownMenuItem>
          )}
          {canEquip && (
            <DropdownMenuItem
              onSelect={() => {
                handleEquip();
              }}
            >
              Ausrüsten
            </DropdownMenuItem>
          )}
          {canConsume && (
            <DropdownMenuItem
              onSelect={() => {
                handleConsume();
              }}
            >
              Verbrauchen
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={() => {
              openRemove();
            }}
          >
            Aus Inventar entfernen
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <AlertDialogContent onClick={(event) => event.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Aus Inventar entfernen?</AlertDialogTitle>
            <AlertDialogDescription>
              Der Gegenstand wird vom Charakter entfernt — nicht in die Welt abgelegt. Es entsteht
              kein Boden- oder Welt-Loot.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {instance.quantity > 1 && (
            <div className="space-y-3 py-2">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={removeMode === 'one' ? 'default' : 'outline'}
                  onClick={() => setRemoveMode('one')}
                >
                  1
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={removeMode === 'custom' ? 'default' : 'outline'}
                  onClick={() => setRemoveMode('custom')}
                >
                  Menge
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={removeMode === 'all' ? 'default' : 'outline'}
                  onClick={() => setRemoveMode('all')}
                >
                  Gesamten Stapel
                </Button>
              </div>
              {removeMode === 'custom' && (
                <div className="space-y-2">
                  <Label htmlFor={`remove-amount-${instanceId}`}>Menge (1–{instance.quantity})</Label>
                  <Input
                    id={`remove-amount-${instanceId}`}
                    type="number"
                    min={1}
                    max={instance.quantity}
                    value={removeAmount}
                    onChange={(event) =>
                      setRemoveAmount(
                        Math.min(
                          instance.quantity,
                          Math.max(1, Number.parseInt(event.target.value, 10) || 1),
                        ),
                      )
                    }
                  />
                </div>
              )}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemove}>Entfernen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
