/**
 * ItemArchiveDialog — archive confirmation; instances remain resolvable (#139).
 * Location: src/app/items/workbench/ItemArchiveDialog.tsx
 */
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

export interface ItemArchiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  saving: boolean;
}

export function ItemArchiveDialog({
  open,
  onOpenChange,
  onConfirm,
  saving,
}: ItemArchiveDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-item-workbench-archive>
        <AlertDialogHeader>
          <AlertDialogTitle>Item archivieren?</AlertDialogTitle>
          <AlertDialogDescription>
            Die Definition verschwindet aus Katalogen für neue Zugänge. Vorhandene Exemplare in
            Charakterinventaren bleiben erhalten und auflösbar.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11 min-h-11" disabled={saving}>
            Abbrechen
          </AlertDialogCancel>
          <AlertDialogAction
            className="h-11 min-h-11"
            disabled={saving}
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
            data-item-workbench-archive-confirm
          >
            {saving ? 'Archivieren…' : 'Archivieren'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
