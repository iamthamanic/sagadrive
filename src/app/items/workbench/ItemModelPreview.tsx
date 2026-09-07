/**
 * ItemModelPreview — lazy Workbench GLB canvas; falls back to 2D copy on WebGL failure (#141).
 * Location: src/app/items/workbench/ItemModelPreview.tsx
 */
import { useEffect, useRef, useState } from 'react';
import { Button } from '../../../shared/ui/button';
import type { ItemModelPreviewState } from './ItemModelPreviewRuntime';

export interface ItemModelPreviewProps {
  modelUrl: string | null;
}

export function ItemModelPreview({ modelUrl }: ItemModelPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<{ dispose: () => void; resetView: () => void } | null>(null);
  const [state, setState] = useState<ItemModelPreviewState>({
    status: 'loading',
    message: '3D-Vorschau wird vorbereitet…',
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !modelUrl) {
      setState({ status: 'ready', message: '' });
      runtimeRef.current = null;
      return;
    }

    let cancelled = false;
    let runtime: {
      dispose: () => void;
      loadModel: (url: string) => Promise<void>;
      resetView: () => void;
    } | null = null;

    void import('./ItemModelPreviewRuntime')
      .then(({ ItemModelPreviewRuntime }) => {
        if (cancelled || !canvasRef.current) return;
        const instance = new ItemModelPreviewRuntime(canvasRef.current, (next) => {
          if (!cancelled) setState(next);
        });
        if (cancelled) {
          instance.dispose();
          return;
        }
        runtime = instance;
        runtimeRef.current = instance;
        return instance.loadModel(modelUrl);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const detail = error instanceof Error ? error.message : 'WebGL nicht verfügbar';
        setState({
          status: 'error',
          message: `3D-Vorschau nicht verfügbar (${detail}). Das Modell bleibt gespeichert.`,
        });
      });

    return () => {
      cancelled = true;
      runtime?.dispose();
      runtime = null;
      runtimeRef.current = null;
    };
  }, [modelUrl]);

  if (!modelUrl) {
    return (
      <p className="text-xs text-muted-foreground" data-item-model3d-empty>
        Noch kein 3D-Modell.
      </p>
    );
  }

  return (
    <div className="relative flex w-full flex-col gap-2" data-item-model3d-preview>
      <canvas
        ref={canvasRef}
        className="h-48 w-full rounded-lg bg-muted/20"
        aria-label="3D-Modellvorschau"
      />
      {state.status === 'ready' && (
        <Button
          type="button"
          variant="ghost"
          className="h-11 min-h-11 self-center"
          data-item-model3d-reset-view
          onClick={() => runtimeRef.current?.resetView()}
        >
          Ansicht zurücksetzen
        </Button>
      )}
      {state.status === 'loading' && (
        <p className="text-center text-xs text-muted-foreground" role="status">
          {state.message}
        </p>
      )}
      {state.status === 'error' && (
        <p
          className="text-center text-xs text-muted-foreground"
          role="status"
          data-item-model3d-fallback
        >
          {state.message}
        </p>
      )}
    </div>
  );
}
