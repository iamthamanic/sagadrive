/**
 * InventorySummaryBar — sticky desktop summary for Inventory v2 (#110):
 * occupied slots, total load / capacity, overload badges, overflow warning.
 * Location: src/app/character/inventory/InventorySummaryBar.tsx
 */
import { Badge } from '../../../components/ui/badge';
import { RuleHelp } from '../shared/RuleHelp';
import { BASE_SLOT_COUNT } from '../../../domains/character/inventory-v2';
import { inventoryCarryCapacity } from './inventory-ui-labels';

export interface InventorySummaryBarProps {
  occupiedSlots: number;
  totalLoad: number;
  strength: number;
  overflowCount: number;
}

export function InventorySummaryBar({
  occupiedSlots,
  totalLoad,
  strength,
  overflowCount,
}: InventorySummaryBarProps) {
  const capacity = inventoryCarryCapacity(strength);
  const overloaded = totalLoad > capacity;
  const immobile = totalLoad > capacity * 2;
  const loadPercent = capacity > 0 ? Math.min(100, Math.round((totalLoad / capacity) * 100)) : 100;

  return (
    <div className="sticky top-0 z-10 space-y-3 rounded-lg border border-border bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium">
            Inventar {occupiedSlots} / {BASE_SLOT_COUNT}
          </p>
          <div className="mt-1 flex items-center gap-1">
            <p className="text-sm text-muted-foreground">
              Last {totalLoad} / {capacity}
            </p>
            <RuleHelp label="Traglast">
              Traglast = 5 + 2 × Stärke. Gegenstände besitzen normalerweise 0 bis 3 Lastpunkte.
            </RuleHelp>
          </div>
        </div>
        {immobile ? (
          <Badge variant="destructive">Zu schwer</Badge>
        ) : overloaded ? (
          <Badge variant="destructive">Überladen</Badge>
        ) : (
          <Badge variant="outline">Tragbar</Badge>
        )}
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={
            overloaded
              ? 'h-full rounded-full bg-destructive transition-all'
              : 'h-full rounded-full bg-primary transition-all'
          }
          style={{ width: `${loadPercent}%` }}
        />
      </div>

      {overloaded && !immobile && (
        <p className="text-sm text-destructive">
          Über Traglast: Bewegung −3 m und Nachteil auf Athletik und Akrobatik.
        </p>
      )}
      {immobile && (
        <p className="text-sm text-destructive">
          Mehr als doppelte Traglast: normale längere Bewegung ist nicht möglich.
        </p>
      )}
      {overflowCount > 0 && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {overflowCount === 1
            ? '1 Alt-Gegenstand liegt außerhalb der 20 Inventarplätze und muss einsortiert werden.'
            : `${overflowCount} Alt-Gegenstände liegen außerhalb der 20 Inventarplätze und müssen einsortiert werden.`}
        </p>
      )}
    </div>
  );
}
