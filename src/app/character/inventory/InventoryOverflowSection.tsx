/**
 * InventoryOverflowSection — legacy overflow recovery UI for Inventory v2 (#110).
 * Shows stacks that did not fit the 20 base slots and offers recovery into a free slot.
 * Location: src/app/character/inventory/InventoryOverflowSection.tsx
 */
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import type {
  InventoryState,
  ItemDefinitionLookup,
} from '../../../domains/character/inventory-v2';
import { freeBaseSlotIndices, recoverOverflowInstance } from '../../../domains/character/inventory-v2';
import { INVENTORY_TYPE_LABELS } from './inventory-ui-labels';

export interface InventoryOverflowSectionProps {
  state: InventoryState;
  lookup: ItemDefinitionLookup;
  onApplyResult: (next: InventoryState) => void;
  onRefuse: (reason: string) => void;
}

export function InventoryOverflowSection({
  state,
  lookup,
  onApplyResult,
  onRefuse,
}: InventoryOverflowSectionProps) {
  if (state.legacyOverflow.length === 0) return null;

  const freeSlots = freeBaseSlotIndices(state);

  const handleRecover = (instanceId: string) => {
    const target = freeSlots[0];
    if (target === undefined) {
      onRefuse('Kein freier Inventarplatz — entferne oder verschiebe erst einen Gegenstand.');
      return;
    }
    const result = recoverOverflowInstance(state, instanceId, target);
    if (result.ok === false) {
      onRefuse(result.reason);
      return;
    }
    onApplyResult(result.state);
  };

  return (
    <section className="space-y-3 rounded-lg border border-amber-500/40 bg-amber-500/5 p-4" data-inventory-overflow>
      <div>
        <h3 className="font-medium">Nicht einsortierte Alt-Gegenstände</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Nichts wurde gelöscht. Diese Stapel passen nicht in die 20 normalen Inventarplätze und
          müssen manuell zurückgeholt werden. Neue Stapel bleiben blockiert, solange Overflow
          vorhanden ist.
        </p>
      </div>
      <ul className="space-y-2">
        {state.legacyOverflow.map((instanceId) => {
          const instance = state.instances[instanceId];
          const definition = instance ? lookup(instance.definitionId) : undefined;
          const name = definition?.name ?? instance?.definitionId ?? instanceId;
          return (
            <li
              key={instanceId}
              className="flex flex-col gap-2 rounded-md border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium">{name}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {definition && (
                    <Badge variant="outline">{INVENTORY_TYPE_LABELS[definition.type]}</Badge>
                  )}
                  {instance && instance.quantity > 1 && (
                    <Badge variant="secondary">×{instance.quantity}</Badge>
                  )}
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                className="min-h-11"
                disabled={freeSlots.length === 0}
                onClick={() => handleRecover(instanceId)}
              >
                In freien Inventarplatz verschieben
              </Button>
            </li>
          );
        })}
      </ul>
      {freeSlots.length === 0 && (
        <p className="text-sm text-destructive">
          Alle 20 Inventarplätze sind belegt — schaffe zuerst Platz, bevor Overflow einsortiert
          werden kann.
        </p>
      )}
    </section>
  );
}
