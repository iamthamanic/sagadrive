/**
 * InventoryMoveTargetSheet — numbered base-slot picker for mobile move (#113).
 * Replaces drag & drop / click-to-target on narrow viewports. Previews
 * Verschieben / Zusammenführen / Tauschen before calling parent onPickTarget.
 * Location: src/app/character/inventory/InventoryMoveTargetSheet.tsx
 */
import { Button } from '../../../components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '../../../components/ui/sheet';
import {
  BASE_SLOT_COUNT,
  isSameStackFamily,
  type InventoryState,
  type ItemDefinitionLookup,
} from '../../../domains/character/inventory-v2';

export interface InventoryMoveTargetSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceSlot: number | null;
  state: InventoryState;
  lookup: ItemDefinitionLookup;
  onPickTarget: (targetSlot: number) => void;
}

type TargetPreview = 'move' | 'merge' | 'swap' | 'self';

function previewFor(
  state: InventoryState,
  lookup: ItemDefinitionLookup,
  sourceSlot: number,
  targetSlot: number,
): { kind: TargetPreview; label: string; detail?: string } {
  if (targetSlot === sourceSlot) {
    return { kind: 'self', label: 'Quellplatz' };
  }
  const sourceId = state.baseSlots[sourceSlot];
  const targetId = state.baseSlots[targetSlot];
  if (!sourceId) {
    return { kind: 'move', label: 'Verschieben' };
  }
  if (targetId === null) {
    return { kind: 'move', label: 'Verschieben' };
  }
  const source = state.instances[sourceId];
  const target = state.instances[targetId];
  const sourceDef = source ? lookup(source.definitionId) : undefined;
  const targetDef = target ? lookup(target.definitionId) : undefined;
  if (
    source &&
    target &&
    sourceDef &&
    targetDef &&
    isSameStackFamily(source, target) &&
    targetDef.stackLimit > 1 &&
    target.quantity < targetDef.stackLimit
  ) {
    const room = targetDef.stackLimit - target.quantity;
    const moved = Math.min(source.quantity, room);
    const remainder = source.quantity - moved;
    return {
      kind: 'merge',
      label: 'Zusammenführen',
      detail:
        remainder > 0
          ? `${moved} Einheit(en) mergen · ${remainder} bleiben auf Platz ${sourceSlot + 1}`
          : `Gesamter Stapel → Platz ${targetSlot + 1}`,
    };
  }
  const targetName = targetDef?.name ?? target?.definitionId ?? 'Gegenstand';
  return {
    kind: 'swap',
    label: 'Tauschen',
    detail: `Mit „${targetName}“ tauschen`,
  };
}

export function InventoryMoveTargetSheet({
  open,
  onOpenChange,
  sourceSlot,
  state,
  lookup,
  onPickTarget,
}: InventoryMoveTargetSheetProps) {
  const slots = Array.from({ length: BASE_SLOT_COUNT }, (_, index) => index);

  return (
    <Sheet open={open && sourceSlot !== null} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[85vh] overflow-y-auto"
        data-inventory-move-target-sheet
      >
        <SheetHeader>
          <SheetTitle>Zielplatz wählen</SheetTitle>
          <SheetDescription>
            {sourceSlot !== null
              ? `Verschieben von Platz ${sourceSlot + 1}. Leerer Platz = verschieben, kompatibel = zusammenführen, sonst tauschen.`
              : 'Quellplatz wählen.'}
          </SheetDescription>
        </SheetHeader>
        <div className="grid grid-cols-2 gap-2 px-4 pb-6 sm:grid-cols-4">
          {sourceSlot !== null &&
            slots.map((targetSlot) => {
              const preview = previewFor(state, lookup, sourceSlot, targetSlot);
              const targetId = state.baseSlots[targetSlot];
              const target = targetId ? state.instances[targetId] : undefined;
              const targetDef = target ? lookup(target.definitionId) : undefined;
              const disabled = preview.kind === 'self';
              return (
                <Button
                  key={targetSlot}
                  type="button"
                  variant={preview.kind === 'self' ? 'secondary' : 'outline'}
                  className="min-h-14 h-auto flex-col items-start gap-0.5 whitespace-normal px-3 py-2 text-left"
                  disabled={disabled}
                  aria-label={
                    target
                      ? `Platz ${targetSlot + 1}: ${targetDef?.name ?? 'Gegenstand'}, ${preview.label}`
                      : `Platz ${targetSlot + 1}: leer, ${preview.label}`
                  }
                  onClick={() => {
                    if (disabled) return;
                    onPickTarget(targetSlot);
                  }}
                >
                  <span className="text-xs font-medium text-muted-foreground">
                    Platz {targetSlot + 1}
                  </span>
                  <span className="text-sm font-semibold">
                    {target
                      ? `${targetDef?.name ?? 'Gegenstand'} ×${target.quantity}`
                      : 'Leer'}
                  </span>
                  <span className="text-xs text-muted-foreground">{preview.label}</span>
                  {preview.detail && (
                    <span className="text-[11px] leading-snug text-muted-foreground">
                      {preview.detail}
                    </span>
                  )}
                </Button>
              );
            })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
