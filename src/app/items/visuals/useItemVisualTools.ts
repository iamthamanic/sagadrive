/**
 * useItemVisualTools — reusable capabilities + handlers for item →2D / →3D / upload tools.
 * Compose with useItemAssets + useItemModel3dAssets on any item surface.
 * Location: src/app/items/visuals/useItemVisualTools.ts
 */
import { useState } from 'react';
import { toast } from 'sonner';
import type { ItemAssetsPhase } from './useItemAssets';
import type { ItemModel3dPhase } from './useItemAssets';

export type ItemVisualMode = '2d' | '3d';

export interface ItemVisualAssetsSlice {
  canEdit: boolean;
  meshyConfigured: boolean;
  phase: ItemAssetsPhase;
  busy: boolean;
  uploadFile: (file: File) => Promise<void> | void;
  requestGenerate: () => void;
  retryGenerate: () => Promise<void> | void;
}

export interface ItemVisualModel3dSlice {
  canEdit: boolean;
  meshyConfigured: boolean;
  hasThumbnail: boolean;
  previewUrl: string | null;
  busy: boolean;
  phase: ItemModel3dPhase;
  uploadFile: (file: File) => Promise<void> | void;
  requestGenerate: () => void;
}

export interface UseItemVisualToolsOptions {
  mode: ItemVisualMode;
  setMode: (mode: ItemVisualMode) => void;
  assets: ItemVisualAssetsSlice;
  model3d: ItemVisualModel3dSlice;
  /** Capture side-profile PNG from the active 3D preview (dropzone or modal). */
  captureSideProfilePng: () => Promise<File | null | undefined>;
  modelJobActive?: boolean;
}

export function useItemVisualTools({
  mode,
  setMode,
  assets,
  model3d,
  captureSideProfilePng,
  modelJobActive = false,
}: UseItemVisualToolsOptions) {
  const [snapshotBusy, setSnapshotBusy] = useState(false);

  const canPreviewEnlarge = mode === '2d' || Boolean(model3d.previewUrl);

  const canConvertTo3d =
    assets.canEdit &&
    model3d.canEdit &&
    model3d.meshyConfigured &&
    model3d.hasThumbnail &&
    !assets.busy &&
    !model3d.busy &&
    !modelJobActive;

  const canSnapshotTo2d =
    assets.canEdit &&
    Boolean(model3d.previewUrl) &&
    !assets.busy &&
    !snapshotBusy &&
    assets.phase !== 'waiting' &&
    assets.phase !== 'generating' &&
    assets.phase !== 'starting' &&
    assets.phase !== 'uploading';

  const canMeshyGenerate2d =
    assets.canEdit &&
    assets.meshyConfigured &&
    !assets.busy &&
    assets.phase !== 'waiting' &&
    assets.phase !== 'generating' &&
    assets.phase !== 'starting';

  const showConvertTools = assets.canEdit || model3d.canEdit;

  const captureSideProfileTo2d = async () => {
    if (!canSnapshotTo2d) return;
    setSnapshotBusy(true);
    try {
      const file = await captureSideProfilePng();
      if (!file) {
        toast.error('3D-Snapshot fehlgeschlagen — Modell noch nicht bereit.');
        return;
      }
      await assets.uploadFile(file);
      setMode('2d');
      toast.success('Seitenprofil als 2D-Bild gespeichert');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Snapshot fehlgeschlagen');
    } finally {
      setSnapshotBusy(false);
    }
  };

  const handleTo2d = () => {
    if (mode !== '3d') {
      setMode('3d');
      return;
    }
    void captureSideProfileTo2d();
  };

  const handleTo3d = () => {
    if (canConvertTo3d) {
      setMode('3d');
      model3d.requestGenerate();
      return;
    }
    setMode('3d');
  };

  const handleMeshyGenerate2d = () => {
    if (!canMeshyGenerate2d) return;
    if (assets.phase === 'failed') {
      void assets.retryGenerate();
      return;
    }
    assets.requestGenerate();
  };

  const to2dLabel = canSnapshotTo2d
    ? 'Seitenprofil anhalten und als 2D-Snapshot speichern'
    : mode === '3d'
      ? '3D-Modell nötig für Seitenprofil-Snapshot'
      : 'Zuerst 3D-Ansicht öffnen, dann Snapshot';

  const to3dLabel = canConvertTo3d
    ? '2D-Bild in 3D-Modell verwandeln'
    : model3d.canEdit
      ? 'Zur 3D-Ansicht wechseln'
      : '3D nicht verfügbar';

  const meshyGenerate2dLabel = canMeshyGenerate2d
    ? '2D-Bild mit Meshy generieren'
    : 'Meshy nicht verbunden — unter Einstellungen → AI hinterlegen';

  return {
    snapshotBusy,
    canPreviewEnlarge,
    canConvertTo3d,
    canSnapshotTo2d,
    canMeshyGenerate2d,
    showConvertTools,
    canEditModel3d: model3d.canEdit,
    to2dLabel,
    to3dLabel,
    meshyGenerate2dLabel,
    handleTo2d,
    handleTo3d,
    handleMeshyGenerate2d,
    captureSideProfileTo2d,
  };
}

export type ItemVisualToolsApi = ReturnType<typeof useItemVisualTools>;
