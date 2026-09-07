/**
 * ItemTypePickerDialog — Hick-law type entry modal for Item Workbench (#139).
 * Location: src/app/items/workbench/ItemTypePickerDialog.tsx
 */
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../shared/ui/dialog';
import { WORKBENCH_TYPE_ENTRIES } from './workbenchLabels';
import type { WorkbenchTypeEntry } from './workbenchForm';

export interface ItemTypePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (entry: WorkbenchTypeEntry) => void;
}

export function ItemTypePickerDialog({ open, onOpenChange, onSelect }: ItemTypePickerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90dvh] w-[calc(100%-1rem)] overflow-y-auto sm:max-w-2xl"
        data-item-workbench-type-picker
      >
        <DialogHeader>
          <DialogTitle>Item-Typ wählen</DialogTitle>
          <DialogDescription>
            Die Auswahl setzt sinnvolle Defaults. Alle Werte bleiben danach editierbar.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {WORKBENCH_TYPE_ENTRIES.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className="flex min-h-11 flex-col items-start gap-0.5 rounded-lg border border-border/70 bg-background px-4 py-3 text-left transition hover:border-primary/60 hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => onSelect(entry)}
              data-item-workbench-type-option={entry.id}
            >
              <span className="font-medium">{entry.label}</span>
              <span className="text-xs text-muted-foreground">{entry.description}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
