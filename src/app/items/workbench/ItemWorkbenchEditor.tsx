/**
 * ItemWorkbenchEditor — forge Visuals+Art+Basics | Einordnung/Regeln (#139).
 * Location: src/app/items/workbench/ItemWorkbenchEditor.tsx
 */
import { Button } from '../../../shared/ui/button';
import type { ItemDefinition } from '../../../domains/character/inventory-v2';
import type { ItemKindKey } from '../../../domains/items';
import type { WorldProfileVm } from '../../../domains/world/contracts/world.types';
import { ItemAvailabilitySection } from './ItemAvailabilitySection';
import { ItemBasicsSection } from './ItemBasicsSection';
import { ItemKindField } from './ItemKindField';
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
  /** Create: play outward panel animation. Edit/readonly: static. */
  animateExpand: boolean;
  onChange: (next: WorkbenchFormState) => void;
  onKindChange: (kindKey: ItemKindKey) => void;
  onArchive: () => void;
  onRestore: () => void;
  onAssetKeyChange: (assetKey: string | undefined) => void;
  onModel3dChange: (model3d: string | undefined) => void;
  ensureDraftId: () => Promise<string | null>;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
  animateExpand,
  onChange,
  onKindChange,
  onArchive,
  onRestore,
  onAssetKeyChange,
  onModel3dChange,
  ensureDraftId,
}: ItemWorkbenchEditorProps) {
  const playAnim = animateExpand && !prefersReducedMotion();

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden"
      data-item-workbench-editor
      data-item-workbench-expanded="true"
    >
      <div className="relative z-10 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto md:grid md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] md:grid-rows-1 md:gap-5 md:overflow-hidden lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <div
          className={`order-1 flex shrink-0 flex-col gap-4 md:min-h-0 md:overflow-hidden md:pr-1 ${
            playAnim ? 'forge-panel-out-left' : ''
          }`}
          data-item-workbench-panel="visuals-basics"
        >
          <ItemVisualsPanel
            form={form}
            definition={definition}
            readOnly={readOnly}
            compact
            onAssetKeyChange={onAssetKeyChange}
            onModel3dChange={onModel3dChange}
            ensureDraftId={ensureDraftId}
          />
          <ItemKindField form={form} readOnly={readOnly} onKindChange={onKindChange} />
          <ItemBasicsSection form={form} readOnly={readOnly} onChange={onChange} />
        </div>

        <div
          className={`order-2 flex min-h-0 min-w-0 flex-col gap-4 md:flex-1 md:overflow-y-auto md:overscroll-contain md:pr-1 ${
            playAnim ? 'forge-panel-out-right' : ''
          }`}
          data-item-workbench-panel="details"
          data-item-workbench-panel-scroll="details"
        >
          {readOnly && (
            <p
              className="rounded-lg border border-border/60 bg-muted/15 px-3 py-2 text-sm"
              role="status"
              data-item-workbench-readonly-banner
            >
              Diese Definition ist schreibgeschützt (Core/Standard). Du kannst sie als eigenes Item
              verwenden.
            </p>
          )}

          {saveError && (
            <p
              className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              role="alert"
            >
              {saveError}
            </p>
          )}

          <ItemTaxonomySection form={form} readOnly={readOnly} onChange={onChange} />
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
            <div className="flex flex-wrap gap-2 border-t border-border/50 pb-2 pt-3">
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
    </div>
  );
}
