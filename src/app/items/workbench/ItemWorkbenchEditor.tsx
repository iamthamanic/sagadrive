/**
 * ItemWorkbenchEditor — desktop 2-col / mobile single-col parameter layout (#139).
 * Location: src/app/items/workbench/ItemWorkbenchEditor.tsx
 */
import { Button } from '../../../components/ui/button';
import type { ItemDefinition } from '../../../domains/character/inventory-v2';
import type { WorldProfileVm } from '../../../modules/worlds/types/world.types';
import { ItemAvailabilitySection } from './ItemAvailabilitySection';
import { ItemBasicsSection } from './ItemBasicsSection';
import { ItemRulesSection } from './ItemRulesSection';
import { ItemTaxonomySection } from './ItemTaxonomySection';
import { ItemVisualsPanel } from './ItemVisualsPanel';
import type { WorkbenchFormState } from './workbenchForm';

export interface ItemWorkbenchEditorProps {
  form: WorkbenchFormState;
  definition: ItemDefinition | null;
  readOnly: boolean;
  scopeLocked: boolean;
  archived: boolean;
  worlds: WorldProfileVm[];
  worldsLoading: boolean;
  saveError: string;
  onChange: (next: WorkbenchFormState) => void;
  onRequestTypePicker: () => void;
  onArchive: () => void;
  onRestore: () => void;
}

export function ItemWorkbenchEditor({
  form,
  definition,
  readOnly,
  scopeLocked,
  archived,
  worlds,
  worldsLoading,
  saveError,
  onChange,
  onRequestTypePicker,
  onArchive,
  onRestore,
}: ItemWorkbenchEditorProps) {
  return (
    <div
      className="grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]"
      data-item-workbench-editor
    >
      <ItemVisualsPanel form={form} definition={definition} />

      <div className="flex min-w-0 flex-col gap-8">
        {readOnly && (
          <p
            className="rounded-lg border border-border/60 bg-muted/15 px-4 py-3 text-sm"
            role="status"
            data-item-workbench-readonly-banner
          >
            Diese Definition ist schreibgeschützt (Core/Standard). Du kannst sie als eigenes Item
            verwenden.
          </p>
        )}

        {saveError && (
          <p
            className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            role="alert"
          >
            {saveError}
          </p>
        )}

        <ItemBasicsSection form={form} readOnly={readOnly} onChange={onChange} />
        <ItemTaxonomySection
          form={form}
          readOnly={readOnly}
          onChange={onChange}
          onRequestTypePicker={onRequestTypePicker}
        />
        <ItemRulesSection form={form} readOnly={readOnly} onChange={onChange} />
        <ItemAvailabilitySection
          form={form}
          readOnly={readOnly}
          scopeLocked={scopeLocked}
          worlds={worlds}
          worldsLoading={worldsLoading}
          onChange={onChange}
        />

        {!readOnly && scopeLocked && (
          <div className="flex flex-wrap gap-2 border-t border-border/50 pt-4">
            {archived ? (
              <Button
                type="button"
                variant="outline"
                className="h-11 min-h-11"
                onClick={onRestore}
                data-item-workbench-restore
              >
                Wiederherstellen
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="h-11 min-h-11"
                onClick={onArchive}
                data-item-workbench-archive-open
              >
                Archivieren
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
