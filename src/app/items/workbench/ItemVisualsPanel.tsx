/**
 * ItemVisualsPanel — thumbnail upload + optional Meshy generate for Workbench (#140).
 * 3D remains a placeholder until #141. Location: src/app/items/workbench/ItemVisualsPanel.tsx
 */
import { useRef } from 'react';
import { InventoryItemThumb } from '../../../components/InventoryItemThumb';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import type { ItemDefinition } from '../../../domains/character/inventory-v2';
import type { WorkbenchFormState } from './workbenchForm';
import { useItemAssets } from './useItemAssets';

export interface ItemVisualsPanelProps {
  form: WorkbenchFormState;
  definition: ItemDefinition | null;
  readOnly: boolean;
  onAssetKeyChange: (assetKey: string | undefined) => void;
}

function phaseLabel(phase: string, progress: number): string {
  if (phase === 'uploading') return 'Wird hochgeladen…';
  if (phase === 'starting') return 'Job wird gestartet…';
  if (phase === 'waiting') return `Wartet… (${progress}%)`;
  if (phase === 'generating') return `Wird generiert… (${progress}%)`;
  if (phase === 'failed') return 'Fehlgeschlagen';
  if (phase === 'confirm-generate') return 'Generierung bestätigen';
  return '';
}

export function ItemVisualsPanel({
  form,
  definition,
  readOnly,
  onAssetKeyChange,
}: ItemVisualsPanelProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const assets = useItemAssets({ definition, readOnly, onAssetKeyChange });

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

  const statusText = phaseLabel(assets.phase, assets.progress);

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
        {assets.displayUrl ? (
          <img
            src={assets.displayUrl}
            alt={previewDefinition.name}
            className="size-24 object-contain"
            data-item-thumbnail-preview
          />
        ) : (
          <InventoryItemThumb
            slot="special"
            definition={previewDefinition}
            alt={previewDefinition.name}
            className="size-24"
          />
        )}

        {statusText && (
          <p className="text-center text-sm text-muted-foreground" role="status" data-item-thumbnail-status>
            {statusText}
          </p>
        )}

        {assets.errorMessage && (
          <p className="text-center text-sm text-destructive" role="alert">
            {assets.errorMessage}
          </p>
        )}

        {!assets.canMutate && (
          <p className="text-center text-sm text-muted-foreground">
            {readOnly
              ? 'Vorschaubild (Fallback). Schreibgeschützte Definitionen speichern kein eigenes Thumbnail.'
              : 'Speichere das Item zuerst, um ein Thumbnail hochzuladen oder zu generieren.'}
          </p>
        )}

        {assets.canMutate && (
          <div className="flex w-full flex-col gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              data-item-thumbnail-file
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file) void assets.uploadFile(file);
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="h-11 min-h-11 w-full"
              disabled={assets.busy}
              data-item-thumbnail-upload
              onClick={() => fileRef.current?.click()}
            >
              Thumbnail hochladen
            </Button>

            {assets.meshyConfigured ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="item-thumb-extra" className="text-xs text-muted-foreground">
                    Optionaler Zusatzprompt
                  </Label>
                  <Input
                    id="item-thumb-extra"
                    value={assets.userExtra}
                    onChange={(event) => assets.setUserExtra(event.target.value.slice(0, 120))}
                    maxLength={120}
                    disabled={assets.busy}
                    placeholder="z. B. dunkles Holz, runenverziert"
                    data-item-thumbnail-extra
                  />
                </div>

                {assets.phase === 'confirm-generate' ? (
                  <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-background/40 p-3">
                    <p className="text-sm">
                      Externes Meshy-Bild generieren? Es entsteht genau ein Job.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        className="h-11 min-h-11"
                        disabled={assets.busy}
                        data-item-thumbnail-generate-confirm
                        onClick={() => void assets.confirmGenerate()}
                      >
                        Generieren
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 min-h-11"
                        disabled={assets.busy}
                        onClick={assets.cancelGenerateConfirm}
                      >
                        Abbrechen
                      </Button>
                    </div>
                  </div>
                ) : assets.phase === 'failed' ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 min-h-11 w-full"
                    disabled={assets.busy}
                    data-item-thumbnail-retry
                    onClick={() => void assets.retryGenerate()}
                  >
                    Erneut versuchen
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 min-h-11 w-full"
                    disabled={assets.busy || assets.phase === 'waiting' || assets.phase === 'generating' || assets.phase === 'starting'}
                    data-item-thumbnail-generate
                    onClick={assets.requestGenerate}
                  >
                    Bild generieren
                  </Button>
                )}
              </>
            ) : (
              <p className="text-center text-xs text-muted-foreground" data-item-thumbnail-meshy-off>
                Bildgenerierung ist nicht konfiguriert. Upload bleibt verfügbar.
              </p>
            )}

            {assets.hasAsset && (
              <Button
                type="button"
                variant="ghost"
                className="h-11 min-h-11 w-full"
                disabled={assets.busy}
                data-item-thumbnail-remove
                onClick={() => void assets.removeThumbnail()}
              >
                Thumbnail entfernen
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/50 bg-muted/5 p-6 text-center">
        <p className="text-sm font-medium">3D-Modell</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          Platzhalter für Meshy-3D (#141). Speichern ist ohne Visual möglich.
        </p>
      </div>
    </section>
  );
}
