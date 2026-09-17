/**
 * AvatarCanvas — React canvas host for the CharacterStudio Three.js runtime.
 * Location: src/app/character/avatar/AvatarCanvas.tsx
 */
import { useEffect, useRef, useState, type RefObject } from 'react';
import type { CharacterAvatarDto } from '../../../domains/character/domain/character.entity';
import type {
  AvatarAnimationActionId,
  AvatarAnimationSupportResult,
  AvatarRigAnalysisResult,
  FacialAvailability,
  FacialCanonicalKey,
  MtoonStyleCompatibility,
} from '../../../domains/character/avatar';
import { CharacterStudioRuntime, type AvatarRuntimeState } from '../../../infrastructure/character/avatar/character-studio-runtime';
import type { AvatarAnimationRuntimeState } from '../../../infrastructure/character/avatar/avatar-animation-runtime';
import type { AvatarFacialRuntimeState } from '../../../infrastructure/character/avatar/avatar-facial-runtime';
import { getAvatarAssetManifest, resolveAvatarModelUrl } from '../../../infrastructure/character/avatar/avatar-asset-manifests';
import { AvatarRigCapabilityPanel } from './AvatarRigCapabilityPanel';
import { AvatarAnimationPreviewControls } from './AvatarAnimationPreviewControls';
import { AvatarFacialPreviewControls } from './AvatarFacialPreviewControls';

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
  const [rigAnalysis, setRigAnalysis] = useState<AvatarRigAnalysisResult | null>(null);
  const [styleNotice, setStyleNotice] = useState<string | null>(null);
  const [animationSupport, setAnimationSupport] = useState<AvatarAnimationSupportResult | null>(null);
  const [activeAnimation, setActiveAnimation] = useState<AvatarAnimationActionId | null>(null);
  const [animationMessage, setAnimationMessage] = useState<string | undefined>(undefined);
  const [facialAvailability, setFacialAvailability] = useState<FacialAvailability | null>(null);
  const [activeFacialKey, setActiveFacialKey] = useState<FacialCanonicalKey | null>(null);
  const [facialMessage, setFacialMessage] = useState<string | undefined>(undefined);
  const manifest = getAvatarAssetManifest(avatar.preset);
  const modelUrl = resolveAvatarModelUrl(avatar);

  useEffect(() => {
    const canvas = targetRef.current;
    if (!canvas) return;

    const onAnimation = (state: AvatarAnimationRuntimeState) => {
      setAnimationSupport(state.support);
      setActiveAnimation(state.activeAction);
      setAnimationMessage(state.message);
    };
    const onFacial = (state: AvatarFacialRuntimeState) => {
      setFacialAvailability(state.availability);
      const entries = Object.entries(state.weights).filter(([, w]) => (w ?? 0) > 0.01);
      const top = entries.sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0];
      setActiveFacialKey((top?.[0] as FacialCanonicalKey | undefined) ?? 'neutral');
      setFacialMessage(state.message);
    };

    const runtime = new CharacterStudioRuntime(
      canvas,
      setRuntimeState,
      setRigAnalysis,
      onAnimation,
      onFacial,
    );
    runtimeRef.current = runtime;

    return () => {
      runtime.dispose();
      runtimeRef.current = undefined;
    };
  }, [targetRef]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => runtimeRef.current?.setPrefersReducedMotion(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;

    if (!modelUrl) {
      setRuntimeState({
        status: 'error',
        message: 'Für dieses Avatar-Preset ist noch kein sicheres VRM/GLB-Modell hinterlegt.',
      });
      setRigAnalysis(null);
      setAnimationSupport(null);
      setActiveAnimation(null);
      setFacialAvailability(null);
      setActiveFacialKey(null);
      return;
    }

    void runtime.loadModel(modelUrl, avatar, manifest);
  }, [manifest, modelUrl]);

  useEffect(() => {
    runtimeRef.current?.applyAppearance(avatar, manifest);
    if (avatar.morph) {
      runtimeRef.current?.applyMorphState(avatar.morph);
    }
    const compatibility: MtoonStyleCompatibility | undefined =
      runtimeRef.current?.getStyleCompatibility();
    setStyleNotice(compatibility?.noticeDe ?? null);
  }, [avatar, manifest]);

  return (
    <div className={className ?? 'relative flex h-full w-full flex-col gap-2 overflow-hidden'}>
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg bg-[#09111F]">
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

        {styleNotice && runtimeState.status === 'ready' ? (
          <div
            className="pointer-events-none absolute inset-x-3 bottom-3 rounded-md border border-amber-400/25 bg-slate-950/80 px-2.5 py-1.5 text-[11px] text-amber-100 backdrop-blur"
            data-testid="avatar-mtoon-style-notice"
            role="status"
          >
            {styleNotice}
          </div>
        ) : null}
      </div>
      <AvatarAnimationPreviewControls
        support={animationSupport}
        activeAction={activeAnimation}
        message={animationMessage}
        disabled={runtimeState.status !== 'ready'}
        onSelect={(actionId) => {
          runtimeRef.current?.playAnimation(actionId);
        }}
      />
      <AvatarFacialPreviewControls
        availability={facialAvailability}
        activeKey={activeFacialKey}
        message={facialMessage}
        disabled={runtimeState.status !== 'ready'}
        onSet={(key, weight) => {
          runtimeRef.current?.setFacialWeight(key, weight);
        }}
        onReset={() => {
          runtimeRef.current?.resetFacialToNeutral();
        }}
      />
      <AvatarRigCapabilityPanel analysis={rigAnalysis} />
    </div>
  );
}
