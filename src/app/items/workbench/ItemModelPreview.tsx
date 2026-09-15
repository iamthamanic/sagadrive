/**
 * ItemModelPreview — lazy Workbench GLB canvas; falls back to 2D copy on WebGL failure (#141).
 * Exposes side-profile PNG capture for 3D → 2D snapshot.
 * Location: src/app/items/workbench/ItemModelPreview.tsx
 */
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Button } from '../../../shared/ui/button';
import type { ItemModelPreviewState } from './ItemModelPreviewRuntime';

export interface ItemModelPreviewProps {
  modelUrl: string | null;
  /** Fill parent height (Visuals dropzone) instead of fixed h-48. */
  fill?: boolean;
}

export interface ItemModelPreviewHandle {
  /** Pause spin, orient to side profile, return a PNG file (or null if not ready). */
  captureSideProfilePng: () => Promise<File | null>;
}

type RuntimeApi = {
  dispose: () => void;
  loadModel: (url: string) => Promise<void>;
  resetView: () => void;
  captureSideProfilePng: () => Promise<Blob | null>;
};

export const ItemModelPreview = forwardRef<ItemModelPreviewHandle, ItemModelPreviewProps>(
  function ItemModelPreview({ modelUrl, fill = false }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const runtimeRef = useRef<RuntimeApi | null>(null);
    const [state, setState] = useState<ItemModelPreviewState>({
      status: 'loading',
      message: '3D-Vorschau wird vorbereitet…',
    });

    useImperativeHandle(ref, () => ({
      captureSideProfilePng: async () => {
        const blob = await runtimeRef.current?.captureSideProfilePng();
        if (!blob) return null;
        return new File([blob], 'item-side-profile.png', { type: 'image/png' });
      },
    }));

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas || !modelUrl) {
        setState({ status: 'ready', message: '' });
        runtimeRef.current = null;
        return;
      }

      let cancelled = false;
      let runtime: RuntimeApi | null = null;

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
      return null;
    }

    return (
      <div
        className={`relative flex w-full flex-col ${fill ? 'h-full min-h-0' : 'gap-2'}`}
        data-item-model3d-preview
      >
        <canvas
          ref={canvasRef}
          className={
            fill
              ? 'h-full min-h-0 w-full rounded-lg bg-muted/20'
              : 'h-48 w-full rounded-lg bg-muted/20'
          }
          aria-label="3D-Modellvorschau"
        />
        {state.status === 'ready' && (
          <Button
            type="button"
            variant="ghost"
            className={
              fill
                ? 'absolute bottom-1 left-1/2 h-8 min-h-8 -translate-x-1/2 px-2 text-xs'
                : 'h-11 min-h-11 self-center'
            }
            data-item-model3d-reset-view
            onClick={(event) => {
              event.stopPropagation();
              runtimeRef.current?.resetView();
            }}
          >
            Ansicht zurücksetzen
          </Button>
        )}
        {state.status === 'loading' && (
          <p
            className={`text-center text-xs text-muted-foreground ${fill ? 'absolute inset-x-2 top-2' : ''}`}
            role="status"
          >
            {state.message}
          </p>
        )}
        {state.status === 'error' && (
          <p
            className={`text-center text-xs text-muted-foreground ${fill ? 'absolute inset-x-2 top-2' : ''}`}
            role="status"
            data-item-model3d-fallback
          >
            {state.message}
          </p>
        )}
      </div>
    );
  },
);
