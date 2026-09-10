/**
 * ItemVisualsPanel — fixed-size 2D/3D dropzone (click + drag-drop) + generate actions (#140/#141).
 * Location: src/app/items/workbench/ItemVisualsPanel.tsx
 */
import { useEffect, useRef, useState, type DragEvent } from 'react';
import { InventoryItemThumb } from '../../character';
import { Button } from '../../../shared/ui/button';
import { Input } from '../../../shared/ui/input';
import { Label } from '../../../shared/ui/label';
import type { ItemDefinition } from '../../../domains/character/inventory-v2';
import { ItemModelPreview } from './ItemModelPreview';
import type { WorkbenchFormState } from './workbenchForm';
import { useItemAssets, useItemModel3dAssets } from './useItemAssets';

export interface ItemVisualsPanelProps {
  form: WorkbenchFormState;
  definition: ItemDefinition | null;
  readOnly: boolean;
  /** Tighter spacing for the forge layout. */
  compact?: boolean;
  onAssetKeyChange: (assetKey: string | undefined) => void;
  onModel3dChange: (model3d: string | undefined) => void;
  /** Creates a draft definition so asset upload works before Speichern. */
  ensureDraftId: () => Promise<string | null>;
  /** Optional mirror of thumbnail URL for external previews. */
  onPreviewUrlChange?: (url: string | null) => void;
}

type VisualMode = '2d' | '3d';

function phaseLabel(phase: string, progress: number): string {
  if (phase === 'uploading') return 'Wird hochgeladen…';
  if (phase === 'starting') return 'Job wird gestartet…';
  if (phase === 'waiting') return `Wartet… (${progress}%)`;
  if (phase === 'generating') return `Wird generiert… (${progress}%)`;
  if (phase === 'failed') return 'Fehlgeschlagen';
  if (phase === 'confirm-generate') return 'Generierung bestätigen';
  return '';
}

function isImageFile(file: File): boolean {
  return file.type === 'image/png' || file.type === 'image/jpeg';
}

function isGlbFile(file: File): boolean {
  if (file.type === 'model/gltf-binary') return true;
  return file.name.toLowerCase().endsWith('.glb');
}

export function ItemVisualsPanel({
  form,
  definition,
  readOnly,
  compact = false,
  onAssetKeyChange,
  onModel3dChange,
  ensureDraftId,
  onPreviewUrlChange,
}: ItemVisualsPanelProps) {
  const [mode, setMode] = useState<VisualMode>('2d');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const modelFileRef = useRef<HTMLInputElement>(null);
  const assets = useItemAssets({ definition, readOnly, onAssetKeyChange, ensureDraftId });
  const model3d = useItemModel3dAssets({ definition, readOnly, onModel3dChange, ensureDraftId });

  useEffect(() => {
    onPreviewUrlChange?.(assets.displayUrl ?? null);
  }, [assets.displayUrl, onPreviewUrlChange]);

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

  const statusText =
    mode === '2d'
      ? phaseLabel(assets.phase, assets.progress)
      : phaseLabel(model3d.phase, model3d.progress);
  const errorMessage = mode === '2d' ? assets.errorMessage : model3d.errorMessage;
  const modelJobActive =
    model3d.phase === 'waiting' ||
    model3d.phase === 'generating' ||
    model3d.phase === 'starting' ||
    model3d.phase === 'uploading';

  const dropEnabled =
    !readOnly &&
    (mode === '2d' ? assets.canEdit && !assets.busy : model3d.canEdit && !model3d.busy && !modelJobActive);

  const openFilePicker = () => {
    if (!dropEnabled) return;
    if (mode === '2d') fileRef.current?.click();
    else modelFileRef.current?.click();
  };

  const onDragEnter = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (dropEnabled) setDragOver(true);
  };

  const onDragOver = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (dropEnabled) setDragOver(true);
  };

  const onDragLeave = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOver(false);
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOver(false);
    if (!dropEnabled) return;
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    if (mode === '2d') {
      if (isImageFile(file)) void assets.uploadFile(file);
      return;
    }
    if (isGlbFile(file)) void model3d.uploadFile(file);
  };

  const dropHint =
    mode === '2d'
      ? 'Bild hochladen — klicken oder Datei hierher ziehen (PNG/JPEG)'
      : 'GLB hochladen — klicken oder Datei hierher ziehen';

  return (
    <section
      className={`flex flex-col ${compact ? 'gap-2' : 'gap-4'}`}
      data-item-workbench-visuals
      data-item-workbench-visual-mode={mode}
      aria-label="Visuals"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Visuals
      </h2>

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
      <input
        ref={modelFileRef}
        type="file"
        accept=".glb,model/gltf-binary"
        className="hidden"
        data-item-model3d-file
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void model3d.uploadFile(file);
        }}
      />

      <div
        role={dropEnabled ? 'button' : undefined}
        tabIndex={dropEnabled ? 0 : undefined}
        className={`relative flex h-44 w-full shrink-0 flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed p-3 pt-9 transition-colors ${
          dragOver
            ? 'border-primary bg-primary/10'
            : 'border-border/60 bg-muted/10'
        } ${dropEnabled ? 'cursor-pointer hover:border-border' : ''}`}
        data-item-workbench-visual-dropzone
        data-item-thumbnail-upload={mode === '2d' ? true : undefined}
        data-item-model3d-upload={mode === '3d' ? true : undefined}
        aria-label={dropEnabled ? dropHint : 'Visuals-Vorschau'}
        onClick={openFilePicker}
        onKeyDown={(event) => {
          if (!dropEnabled) return;
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openFilePicker();
          }
        }}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <div
          className="absolute right-1.5 top-1.5 z-10 inline-flex rounded-md border border-border/70 bg-background/90 p-px"
          role="group"
          aria-label="2D oder 3D"
          data-item-workbench-visual-toggle
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <Button
            type="button"
            size="sm"
            variant={mode === '2d' ? 'default' : 'ghost'}
            className="h-7 min-h-7 px-2 text-xs"
            aria-pressed={mode === '2d'}
            data-item-workbench-visual-2d
            onClick={() => setMode('2d')}
          >
            2D
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === '3d' ? 'default' : 'ghost'}
            className="h-7 min-h-7 px-2 text-xs"
            aria-pressed={mode === '3d'}
            data-item-workbench-visual-3d
            onClick={() => setMode('3d')}
          >
            3D
          </Button>
        </div>

        {mode === '2d' ? (
          <div className="flex h-full min-h-0 w-full flex-col items-center justify-center gap-1.5">
            {assets.displayUrl ? (
              <img
                src={assets.displayUrl}
                alt={previewDefinition.name}
                className="h-[calc(100%-1.25rem)] max-h-32 w-auto max-w-full object-contain"
                data-item-thumbnail-preview
              />
            ) : (
              <InventoryItemThumb
                slot="special"
                definition={previewDefinition}
                alt={previewDefinition.name}
                className="size-32 p-0"
              />
            )}
            {dropEnabled && (
              <p className="shrink-0 px-2 text-center text-[0.7rem] leading-tight text-muted-foreground">
                {dropHint}
              </p>
            )}
          </div>
        ) : (
          <div
            className="flex h-full w-full flex-col items-center justify-center gap-1"
            data-item-workbench-model3d
          >
            {model3d.previewUrl ? (
              <div
                className="h-full min-h-0 w-full"
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
                <ItemModelPreview modelUrl={model3d.previewUrl} fill />
              </div>
            ) : (
              dropEnabled && (
                <p className="px-2 text-center text-xs text-muted-foreground">{dropHint}</p>
              )
            )}
          </div>
        )}
      </div>

      {statusText && (
        <p
          className="text-center text-sm text-muted-foreground"
          role="status"
          data-item-thumbnail-status={mode === '2d' ? true : undefined}
          data-item-model3d-status={mode === '3d' ? true : undefined}
        >
          {statusText}
        </p>
      )}

      {errorMessage && (
        <p className="text-center text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      )}

      {readOnly && (
        <p className="text-center text-sm text-muted-foreground">
          {mode === '2d'
            ? 'Vorschaubild (Fallback). Schreibgeschützte Definitionen speichern kein eigenes Thumbnail.'
            : 'Schreibgeschützte Definitionen speichern kein 3D-Modell.'}
        </p>
      )}

      {mode === '2d' && assets.canEdit && (
        <div className="flex w-full flex-col gap-2">
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
                  disabled={
                    assets.busy ||
                    assets.phase === 'waiting' ||
                    assets.phase === 'generating' ||
                    assets.phase === 'starting'
                  }
                  data-item-thumbnail-generate
                  onClick={assets.requestGenerate}
                >
                  Bild generieren
                </Button>
              )}
            </>
          ) : (
            <p
              className="text-center text-xs text-muted-foreground"
              data-item-thumbnail-meshy-off
            >
              Bildgenerierung ist nicht konfiguriert. Upload bleibt verfügbar.
            </p>
          )}

          {assets.canMutate && assets.hasAsset && (
            <Button
              type="button"
              variant="ghost"
              className="h-11 min-h-11 w-full"
              disabled={assets.busy}
              data-item-thumbnail-remove
              onClick={() => void assets.removeThumbnail()}
            >
              Bild entfernen
            </Button>
          )}
        </div>
      )}

      {mode === '3d' && model3d.canEdit && (
        <div className="flex w-full flex-col gap-2">
          {model3d.meshyConfigured ? (
            <>
              {!model3d.hasThumbnail && (
                <p className="text-xs text-muted-foreground" data-item-model3d-need-thumb>
                  Aus Bild generieren ist erst verfügbar, wenn unter 2D ein Thumbnail gespeichert
                  ist.
                </p>
              )}

              {model3d.phase === 'confirm-generate' ? (
                <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-background/40 p-3 text-left">
                  <p className="text-sm">
                    Meshy Image-to-3D aus dem gespeicherten Thumbnail starten? Es entsteht genau
                    ein Job.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      className="h-11 min-h-11"
                      disabled={model3d.busy}
                      data-item-model3d-generate-confirm
                      onClick={() => void model3d.confirmGenerate()}
                    >
                      Generieren
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 min-h-11"
                      disabled={model3d.busy}
                      onClick={model3d.cancelGenerateConfirm}
                    >
                      Abbrechen
                    </Button>
                  </div>
                </div>
              ) : model3d.phase === 'failed' ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 min-h-11 w-full"
                  disabled={model3d.busy || !model3d.hasThumbnail}
                  data-item-model3d-retry
                  onClick={() => void model3d.retryGenerate()}
                >
                  Erneut versuchen
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 min-h-11 w-full"
                  disabled={model3d.busy || modelJobActive || !model3d.hasThumbnail}
                  data-item-model3d-generate
                  onClick={model3d.requestGenerate}
                >
                  Aus Bild generieren
                </Button>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground" data-item-model3d-meshy-off>
              3D-Generierung ist nicht konfiguriert. GLB-Upload bleibt verfügbar.
            </p>
          )}

          {model3d.canMutate && model3d.hasModel && (
            <Button
              type="button"
              variant="ghost"
              className="h-11 min-h-11 w-full"
              disabled={model3d.busy || modelJobActive}
              data-item-model3d-remove
              onClick={() => void model3d.removeModel()}
            >
              3D-Modell entfernen
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
