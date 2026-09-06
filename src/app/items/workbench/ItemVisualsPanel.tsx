/**
 * ItemVisualsPanel — thumbnail + 3D placeholder column for Workbench (#139).
 * Real Meshy/upload actions land in #140/#141.
 * Location: src/app/items/workbench/ItemVisualsPanel.tsx
 */
import { InventoryItemThumb } from '../../../components/InventoryItemThumb';
import type { ItemDefinition } from '../../../domains/character/inventory-v2';
import type { WorkbenchFormState } from './workbenchForm';

export interface ItemVisualsPanelProps {
  form: WorkbenchFormState;
  definition: ItemDefinition | null;
}

export function ItemVisualsPanel({ form, definition }: ItemVisualsPanelProps) {
  const previewDefinition: ItemDefinition = definition ?? {
    id: 'preview',
    scope: 'personal',
    name: form.name.trim() || 'Neues Item',
    description: form.description,
    type: form.type,
    load: form.load,
    cost: form.cost,
    stackLimit: form.stackLimit,
    kindKey: form.kindKey,
  };

  return (
    <section
      className="flex flex-col gap-4"
      data-item-workbench-visuals
      aria-label="Visuals"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Visuals
      </h2>

      <div className="flex flex-col items-center gap-3 rounded-xl border border-border/60 bg-muted/10 p-6">
        <InventoryItemThumb
          slot="special"
          definition={previewDefinition}
          alt={previewDefinition.name}
          className="size-24"
        />
        <p className="text-center text-sm text-muted-foreground">
          Vorschaubild (Fallback nach Typ). Upload folgt später.
        </p>
      </div>

      <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/50 bg-muted/5 p-6 text-center">
        <p className="text-sm font-medium">3D-Modell</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          Platzhalter für Meshy-Integration. Speichern ist ohne Visual möglich.
        </p>
      </div>
    </section>
  );
}
