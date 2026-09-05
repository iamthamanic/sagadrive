/**
 * InventoryMobileViewSwitch — Inventar | Ausrüstung segment control for #113.
 * Shown below 640px so mobile never squeezes grid + equipment side by side.
 * Exposes selected state via aria-selected for assistive tech.
 * Location: src/app/character/inventory/InventoryMobileViewSwitch.tsx
 */
import { Button } from '../../../components/ui/button';

export type InventoryMobileView = 'inventar' | 'ausruestung';

export interface InventoryMobileViewSwitchProps {
  value: InventoryMobileView;
  onChange: (next: InventoryMobileView) => void;
}

export function InventoryMobileViewSwitch({
  value,
  onChange,
}: InventoryMobileViewSwitchProps) {
  return (
    <div
      className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-muted/30 p-1"
      role="tablist"
      aria-label="Inventar-Ansicht"
      data-inventory-mobile-view-switch
    >
      <Button
        type="button"
        role="tab"
        aria-selected={value === 'inventar'}
        variant={value === 'inventar' ? 'default' : 'ghost'}
        className="min-h-11"
        data-inventory-mobile-view="inventar"
        onClick={() => onChange('inventar')}
      >
        Inventar
      </Button>
      <Button
        type="button"
        role="tab"
        aria-selected={value === 'ausruestung'}
        variant={value === 'ausruestung' ? 'default' : 'ghost'}
        className="min-h-11"
        data-inventory-mobile-view="ausruestung"
        onClick={() => onChange('ausruestung')}
      >
        Ausrüstung
      </Button>
    </div>
  );
}
