import { useEffect, useRef, useState, type RefObject } from 'react';
import type { CharacterAvatarDto } from '../types/character.types';
import { CharacterStudioRuntime, type AvatarRuntimeState } from './characterStudio/CharacterStudioRuntime';
import { getAvatarAssetManifest, resolveAvatarModelUrl } from './manifests';

interface AvatarCanvasProps {
  avatar: CharacterAvatarDto;
  canvasRef?: RefObject<HTMLCanvasElement>;
  className?: string;
}

const initialState: AvatarRuntimeState = {
  status: 'loading',
  message: '3D-Runtime wird gestartet …',
};

export function AvatarCanvas({ avatar, canvasRef, className }: AvatarCanvasProps) {
  const localRef = useRef<HTMLCanvasElement>(null);
  const targetRef = canvasRef ?? localRef;
  const runtimeRef = useRef<CharacterStudioRuntime>();
  const [runtimeState, setRuntimeState] = useState<AvatarRuntimeState>(initialState);
  const manifest = getAvatarAssetManifest(avatar.preset);
  const modelUrl = resolveAvatarModelUrl(avatar);

  useEffect(() => {
    const canvas = targetRef.current;
    if (!canvas) return;

    const runtime = new CharacterStudioRuntime(canvas, setRuntimeState);
    runtimeRef.current = runtime;

    return () => {
      runtime.dispose();
      runtimeRef.current = undefined;
    };
  }, [targetRef]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;

    if (!modelUrl) {
      setRuntimeState({
        status: 'error',
        message: 'Für dieses Avatar-Preset ist noch kein sicheres VRM/GLB-Modell hinterlegt.',
      });
      return;
    }

    void runtime.loadModel(modelUrl, avatar, manifest);
  }, [manifest, modelUrl]);

  useEffect(() => {
    runtimeRef.current?.applyAppearance(avatar, manifest);
  }, [avatar, manifest]);

  return (
    <div className={className ?? 'relative h-full w-full overflow-hidden rounded-lg bg-[#09111F]'}>
      <canvas
        ref={targetRef}
        className="h-full w-full touch-none outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={`Interaktive echte 3D-Vorschau für ${manifest.displayName}`}
        tabIndex={0}
      />

      {runtimeState.status !== 'ready' && (
        <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-md border border-white/10 bg-black/45 px-2.5 py-1.5 text-[11px] text-slate-200 backdrop-blur-sm">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              runtimeState.status === 'error' ? 'bg-red-400' : 'animate-pulse bg-amber-400'
            }`}
          />
          <span>{runtimeState.message}</span>
        </div>
      )}

      {runtimeState.status === 'error' && (
        <div className="pointer-events-none absolute inset-x-4 bottom-4 rounded-lg border border-red-400/30 bg-slate-950/85 p-3 text-center text-xs text-slate-200 backdrop-blur">
          Die 3D-Runtime ist aktiv, aber das Modell konnte nicht geladen werden. Hinterlege ein selbst gehostetes Asset über
          <code className="mx-1 text-red-200">VITE_AVATAR_ASSET_BASE_URL</code>
          oder speichere eine gültige VRM/GLB-URL am Avatar.
        </div>
      )}
    </div>
  );
}
