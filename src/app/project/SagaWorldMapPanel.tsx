/**
 * SagaWorldMapPanel — Saga → Welt → Karte entry (#702).
 * Same WorldAtlasWorkbench as Library; no duplicate map rows.
 * Location: src/app/project/SagaWorldMapPanel.tsx
 */
import { Loader2 } from 'lucide-react';
import { Button } from '../../shared/ui/button';
import { useSagaOverview } from './hooks/useSagaOverview';
import { WorldAtlasWorkbench } from '../world';
import { pathForLibraryTab } from '../shell';

export type SagaWorldMapPanelProps = {
  readonly sagaPublicId: string;
  readonly onNavigate: (view: string) => void;
};

export function SagaWorldMapPanel({ sagaPublicId, onNavigate }: SagaWorldMapPanelProps) {
  const { model, isLoading, error } = useSagaOverview({ sagaPublicId });
  const worldProfileId = model?.worldProfileId?.trim() || null;
  const canEdit = model?.isGm === true;

  if (isLoading) {
    return (
      <div
        className="flex min-h-[20rem] items-center justify-center gap-2 text-sm text-muted-foreground"
        data-saga-world-map-loading
      >
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Weltkarte wird geladen…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-3" role="alert">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (!worldProfileId) {
    return (
      <div
        className="space-y-3 rounded-lg border border-dashed border-border p-6"
        data-saga-world-map-empty
      >
        <p className="text-sm text-muted-foreground">
          Diese Saga ist noch mit keiner Welt verknüpft. Lege in der Bibliothek eine Welt an
          oder verknüpfe ein Weltprofil, um den Atlas zu nutzen.
        </p>
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          onClick={() => onNavigate(pathForLibraryTab('worlds'))}
        >
          Zur Bibliothek › Welten
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-[28rem] w-full min-w-0" data-saga-world-map>
      <WorldAtlasWorkbench
        worldProfileId={worldProfileId}
        canEdit={canEdit}
        playerView={!canEdit}
        sagaPublicId={sagaPublicId}
        title="Welt → Karte"
      />
    </div>
  );
}
