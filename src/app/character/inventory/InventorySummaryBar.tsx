/**
 * InventorySummaryBar — sticky summary for Inventory v2 (#110/#113/#32):
 * occupied slots, total load / capacity, abstract resources 0–5, overload badges.
 * Remains visible on both mobile Inventar and Ausrüstung segments.
 * Location: src/app/character/inventory/InventorySummaryBar.tsx
 */
import { Badge } from '../../../shared/ui/badge';
import { Label } from '../../../shared/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../shared/ui/select';
import { RuleHelp } from '../shared/RuleHelp';
import { BASE_SLOT_COUNT } from '../../../domains/character/inventory-v2';
import {
  ABSTRACT_RESOURCE_LEVELS,
  type AbstractResourceLevel,
} from '../../../domains/rules/sagadrive/items';
import { inventoryCarryCapacity } from './inventory-ui-labels';

export interface InventorySummaryBarProps {
  occupiedSlots: number;
  totalLoad: number;
  strength: number;
  overflowCount: number;
  /** Character abstract resources 0–5 (§10.3 / #32). */
  resources: AbstractResourceLevel;
  onResourcesChange: (next: AbstractResourceLevel) => void;
}

export function InventorySummaryBar({
  occupiedSlots,
  totalLoad,
  strength,
  overflowCount,
  resources,
  onResourcesChange,
}: InventorySummaryBarProps) {
  const capacity = inventoryCarryCapacity(strength);
  const overloaded = totalLoad > capacity;
  const immobile = totalLoad > capacity * 2;
  const loadPercent = capacity > 0 ? Math.min(100, Math.round((totalLoad / capacity) * 100)) : 100;

  return (
    <div
      className="sticky top-0 z-10 space-y-3 rounded-lg border border-border bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/80"
      data-inventory-summary-bar
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium">
            Inventar {occupiedSlots} / {BASE_SLOT_COUNT}
          </p>
          <div className="mt-1 flex items-center gap-1">
            <p className="text-sm text-muted-foreground" data-inventory-load>
              Last {totalLoad} / {capacity}
            </p>
            <RuleHelp label="Traglast">
              Inventory v2: genau 20 Basisplätze; 1 Stapel = 1 Platz. Traglast = 5 + 2 × Stärke
              (Lastpunkte) — Stärke vergibt keine zusätzlichen Plätze. Ausgerüstete Gegenstände
              liegen in Ausrüstungsslots, nicht in den Basisplätzen. Gegenstände besitzen
              normalerweise 0 bis 3 Lastpunkte.
            </RuleHelp>
          </div>
        </div>
        {immobile ? (
          <Badge variant="destructive" data-inventory-load-status="immobile">
            Zu schwer
          </Badge>
        ) : overloaded ? (
          <Badge variant="destructive" data-inventory-load-status="overloaded">
            Überladen
          </Badge>
        ) : (
          <Badge variant="outline" data-inventory-load-status="ok">
            Tragbar
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <Label htmlFor="character-abstract-resources" className="text-sm">
              Ressourcen
            </Label>
            <RuleHelp label="Ressourcen">
              Abstraktes Ressourcenmodell 0–5 (§10.3). Gegenstände haben Kosten 0–5. Kauf mit
              Kosten gleich Ressourcen senkt die Zahl vorübergehend um 1; Geschenk/Quest ändert
              sie nicht. Keine Währung in diesem Editor.
            </RuleHelp>
          </div>
          <Select
            value={String(resources)}
            onValueChange={(value) =>
              onResourcesChange(Number.parseInt(value, 10) as AbstractResourceLevel)
            }
          >
            <SelectTrigger
              id="character-abstract-resources"
              className="w-28"
              data-character-resources
              data-resources-value={String(resources)}
              aria-label="Charakter-Ressourcen"
            >
              {/* String() so level 0 is visible (raw {0} can collapse in SelectValue). */}
              <SelectValue placeholder="—">{String(resources)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {ABSTRACT_RESOURCE_LEVELS.map((level) => (
                <SelectItem key={level} value={String(level)}>
                  {String(level)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
        <p className="text-sm text-destructive" data-inventory-overload-hint>
          Über Traglast: Bewegung −3 m und Nachteil auf Athletik und Akrobatik.
        </p>
      )}
      {immobile && (
        <p className="text-sm text-destructive" data-inventory-immobile-hint>
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
