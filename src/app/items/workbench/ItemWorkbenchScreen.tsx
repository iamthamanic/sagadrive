/**
 * ItemWorkbenchScreen — create / edit / readonly / fork surface for ItemDefinitions (#139).
 * Wired from App shell routes `/items/create` and `/items/:itemId`.
 * Location: src/app/items/workbench/ItemWorkbenchScreen.tsx
 */
import { Button } from '../../../shared/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../shared/ui/alert-dialog';
import { ItemArchiveDialog } from './ItemArchiveDialog';
import { ItemForkDialog } from './ItemForkDialog';
import { ItemTypePickerDialog } from './ItemTypePickerDialog';
import { ItemWorkbenchEditor } from './ItemWorkbenchEditor';
import { ItemWorkbenchLanding } from './ItemWorkbenchLanding';
import { ItemWorkbenchTopbar } from './ItemWorkbenchTopbar';
import { useItemEditor } from './useItemEditor';

export interface ItemWorkbenchScreenProps {
  route: 'create' | 'detail';
  itemId?: string | null;
  onBack: () => void;
  onNavigateToItem: (itemId: string) => void;
}

export function ItemWorkbenchScreen({
  route,
  itemId = null,
  onBack,
  onNavigateToItem,
}: ItemWorkbenchScreenProps) {
  const editor = useItemEditor({
    route,
    itemId,
    onBack,
    onCreated: onNavigateToItem,
  });

  const title =
    editor.mode === 'landing'
      ? 'Neues Item'
      : editor.form.name.trim() || (editor.mode === 'create' ? 'Neues Item' : 'Item');

  const primaryLabel =
    editor.mode === 'readonly' ? 'Als eigenes Item verwenden' : 'Speichern';

  const handlePrimary = () => {
    if (editor.mode === 'readonly') {
      editor.setForkOpen(true);
      return;
    }
    void editor.handleSave();
  };

  if (editor.loading) {
    return (
      <div className="mx-auto max-w-6xl p-4 md:p-6" data-item-workbench="loading">
        <p className="text-sm text-muted-foreground" role="status">
          Gegenstand wird geladen…
        </p>
      </div>
    );
  }

  if (editor.loadError) {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-4 p-6" data-item-workbench="error">
        <h1 className="text-2xl font-bold tracking-wide">Item</h1>
        <p className="text-sm text-destructive" role="alert">
          {editor.loadError}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" className="h-11 min-h-11" onClick={editor.reload}>
            Erneut versuchen
          </Button>
          <Button type="button" variant="outline" className="h-11 min-h-11" onClick={onBack}>
            Zurück zu Items
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6" data-item-workbench={editor.mode}>
      <ItemWorkbenchTopbar
        title={title}
        primaryLabel={primaryLabel}
        primaryDisabled={editor.mode === 'landing'}
        saving={editor.saving && editor.mode !== 'readonly'}
        onBack={editor.handleBack}
        onPrimary={handlePrimary}
      />

      {editor.mode === 'landing' ? (
        <ItemWorkbenchLanding onStart={editor.openLanding} />
      ) : (
        <ItemWorkbenchEditor
          form={editor.form}
          definition={editor.definition}
          readOnly={editor.mode === 'readonly'}
          scopeLocked={editor.mode === 'edit'}
          archived={editor.archived}
          worlds={editor.worlds}
          worldsLoading={editor.worldsLoading}
          saveError={editor.saveError}
          onChange={editor.setForm}
          onRequestTypePicker={() => editor.setTypePickerOpen(true)}
          onArchive={() => editor.setArchiveOpen(true)}
          onRestore={() => {
            void editor.handleRestore();
          }}
          onAssetKeyChange={editor.applyAssetKey}
          onModel3dChange={editor.applyModel3d}
        />
      )}

      <ItemTypePickerDialog
        open={editor.typePickerOpen}
        onOpenChange={editor.setTypePickerOpen}
        onSelect={editor.requestTypeChange}
      />

      <ItemForkDialog
        open={editor.forkOpen}
        onOpenChange={editor.setForkOpen}
        worlds={editor.worlds}
        saving={editor.saving}
        onConfirm={(target) => {
          void editor.handleFork(target);
        }}
      />

      <ItemArchiveDialog
        open={editor.archiveOpen}
        onOpenChange={editor.setArchiveOpen}
        saving={editor.saving}
        onConfirm={() => {
          void editor.handleArchive();
        }}
      />

      <AlertDialog
        open={editor.pendingTypeEntry !== null}
        onOpenChange={(open) => {
          if (!open) editor.setPendingTypeEntry(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Typ ändern?</AlertDialogTitle>
            <AlertDialogDescription>
              Typabhängige Werte (z. B. Schaden, Schutz, Kapazität) gehen verloren. Gemeinsame
              Felder wie Name und Beschreibung bleiben erhalten.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 min-h-11">Abbrechen</AlertDialogCancel>
            <AlertDialogAction className="h-11 min-h-11" onClick={editor.confirmPendingTypeChange}>
              Fortfahren
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
