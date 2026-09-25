/**
 * AvatarCanvas — React canvas host for the CharacterStudio Three.js runtime.
 * Location: src/app/character/avatar/AvatarCanvas.tsx
 */
import { useEffect, useRef, useState, type MutableRefObject, type ReactNode, type RefObject } from 'react';
import type { CharacterAvatarDto } from '../../../domains/character/domain/character.entity';
import type {
  AvatarAnimationActionId,
  AvatarAnimationSupportResult,
  AvatarRigAnalysisResult,
  FacialAvailability,
  FacialCanonicalKey,
  MtoonStyleCompatibility,
} from '../../../domains/character/avatar';
import { CharacterStudioRuntime, type AvatarRuntimeState, type AvatarCameraFrameId } from '../../../infrastructure/character/avatar/character-studio-runtime';
import type { AvatarAnimationRuntimeState } from '../../../infrastructure/character/avatar/avatar-animation-runtime';
import type { AvatarFacialRuntimeState } from '../../../infrastructure/character/avatar/avatar-facial-runtime';
import { getAvatarAssetManifest, resolveAvatarModelUrl } from '../../../infrastructure/character/avatar/avatar-asset-manifests';
import { AvatarRigCapabilityPanel } from './AvatarRigCapabilityPanel';
import { AvatarAnimationPreviewControls } from './AvatarAnimationPreviewControls';
import { AvatarFacialPreviewControls } from './AvatarFacialPreviewControls';
import { AvatarCameraViewControls } from './AvatarCameraViewControls';
import { AvatarMtoonStyleToggle } from './AvatarMtoonStyleToggle';

/** Imperative portrait snapshot API for CharacterEditor (manual + auto after Meshy/import). */
export type AvatarPortraitCaptureHandle = {
  isReady: () => boolean;
  capturePortraitBlob: () => Promise<Blob | null>;
};

interface AvatarCanvasProps {
  avatar: CharacterAvatarDto;
  canvasRef?: RefObject<HTMLCanvasElement>;
  captureApiRef?: MutableRefObject<AvatarPortraitCaptureHandle | null>;
  /** Fires when the 3D model reaches ready (after load). Used for auto-portrait. */
  onRuntimeReady?: () => void;
  className?: string;
  /**
   * editor = full preview controls; live = compact chrome only (Session/Player #244 / #334 LiveAct).
   * Default editor.
   */
  controlMode?: 'editor' | 'live';
  /** @deprecated LiveAct owns tracking via AvatarSurfaceViewer (#334). Kept for API compat. */
  enableFaceTracking?: boolean;
  /** Editor Surface hosts LiveAct gear (#330) — hide legacy bar under canvas. */
  hideEditorFaceTrackingBar?: boolean;
  /** Editor Surface hosts MToon in viewport gear (#330). */
  hideMtoonToggle?: boolean;
  /** Notify Surface chrome of MToon state + apply callback. */
  onMtoonState?: (enabled: boolean, apply: (enabled: boolean) => void) => void;
  /** Imperative access to CharacterStudioRuntime (LiveAct bind). */
  studioRuntimeRef?: MutableRefObject<CharacterStudioRuntime | null>;
  /**
   * Rendered immediately under the aspect-[4/5] 3D frame (before camera/anim controls).
   * Used for Face Mapping panel host (#420).
   */
  belowViewportSlot?: ReactNode;
  /** Camera frame applied once the model reaches ready (e.g. expand modal → face). */
  initialCameraFrame?: AvatarCameraFrameId;
}

async function dataUrlToPngBlob(dataUrl: string): Promise<Blob | null> {
  try {
    const response = await fetch(dataUrl);
    if (!response.ok) return null;
    const blob = await response.blob();
    return blob.type ? blob : new Blob([blob], { type: 'image/png' });
  } catch {
    return null;
  }
}

const initialState: AvatarRuntimeState = {
  status: 'loading',
  message: '3D-Runtime wird gestartet …',
};

export function AvatarCanvas({
  avatar,
  canvasRef,
  captureApiRef,
  onRuntimeReady,
  className,
  controlMode = 'editor',
  enableFaceTracking: _enableFaceTracking = false,
  hideEditorFaceTrackingBar = false,
  hideMtoonToggle = false,
  onMtoonState,
  studioRuntimeRef,
  belowViewportSlot,
  initialCameraFrame = 'full',
}: AvatarCanvasProps) {
  const localRef = useRef<HTMLCanvasElement>(null);
  const targetRef = canvasRef ?? localRef;
  const runtimeRef = useRef<CharacterStudioRuntime>();
  const onRuntimeReadyRef = useRef(onRuntimeReady);
  onRuntimeReadyRef.current = onRuntimeReady;
  const initialCameraFrameRef = useRef(initialCameraFrame);
  initialCameraFrameRef.current = initialCameraFrame;
  const [runtimeState, setRuntimeState] = useState<AvatarRuntimeState>(initialState);
  const [rigAnalysis, setRigAnalysis] = useState<AvatarRigAnalysisResult | null>(null);
  const [styleNotice, setStyleNotice] = useState<string | null>(null);
  const [animationSupport, setAnimationSupport] = useState<AvatarAnimationSupportResult | null>(null);
  const [activeAnimation, setActiveAnimation] = useState<AvatarAnimationActionId | null>(null);
  const [animationMessage, setAnimationMessage] = useState<string | undefined>(undefined);
  const [facialAvailability, setFacialAvailability] = useState<FacialAvailability | null>(null);
  const [activeFacialKey, setActiveFacialKey] = useState<FacialCanonicalKey | null>(null);
  const [facialMessage, setFacialMessage] = useState<string | undefined>(undefined);
  const [inspectMode, setInspectMode] = useState(false);
  const [activeFrame, setActiveFrame] = useState<AvatarCameraFrameId | null>(initialCameraFrame);
  const [mtoonStyleEnabled, setMtoonStyleEnabled] = useState(true);
  const manifest = getAvatarAssetManifest(avatar.preset);
  const modelUrl = resolveAvatarModelUrl(avatar);
  const showEditorControls = controlMode === 'editor';
  const showMtoonToggle = showEditorControls && !hideMtoonToggle;

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
    const onStateChange = (state: AvatarRuntimeState) => {
      setRuntimeState(state);
      if (state.status === 'ready') {
        const frame = initialCameraFrameRef.current;
        if (frame && frame !== 'full') {
          runtimeRef.current?.applyCameraFrame(frame);
          setActiveFrame(frame);
          setInspectMode(runtimeRef.current?.isInspectMode() ?? true);
        }
        onRuntimeReadyRef.current?.();
      }
    };

    const runtime = new CharacterStudioRuntime(
      canvas,
      onStateChange,
      setRigAnalysis,
      onAnimation,
      onFacial,
    );
    runtimeRef.current = runtime;
    if (studioRuntimeRef) studioRuntimeRef.current = runtime;

    if (captureApiRef) {
      captureApiRef.current = {
        isReady: () => Boolean(runtimeRef.current?.isPortraitReady()),
        capturePortraitBlob: async () => {
          const active = runtimeRef.current;
          if (!active?.isPortraitReady()) return null;
          // Let layout/resize settle one frame before snapshot.
          await new Promise<void>((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
          });
          if (!runtimeRef.current?.isPortraitReady()) return null;
          return dataUrlToPngBlob(runtimeRef.current.capturePortraitDataUrl());
        },
      };
    }

    return () => {
      if (captureApiRef) captureApiRef.current = null;
      runtime.dispose();
      runtimeRef.current = undefined;
      if (studioRuntimeRef) studioRuntimeRef.current = null;
    };
  }, [targetRef, captureApiRef, studioRuntimeRef]);

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
    setInspectMode(false);
    setActiveFrame(initialCameraFrameRef.current);
    setMtoonStyleEnabled(true);
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

  useEffect(() => {
    const apply = (enabled: boolean) => {
      runtimeRef.current?.setMtoonStyleEnabled(enabled);
      setMtoonStyleEnabled(enabled);
      const compatibility = runtimeRef.current?.getStyleCompatibility();
      setStyleNotice(compatibility?.noticeDe ?? null);
    };
    onMtoonState?.(mtoonStyleEnabled, apply);
  }, [mtoonStyleEnabled, onMtoonState, runtimeState.status]);

  return (
    <div className={className ?? 'relative flex w-full flex-col gap-2'}>
      <div
        className="relative aspect-[4/5] w-full overflow-hidden rounded-lg border border-border bg-[#09111F] shadow-inner"
        data-avatar-canvas-viewport="true"
      >
        <canvas
          ref={targetRef}
          className="absolute inset-0 h-full w-full touch-none outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={`Interaktive echte 3D-Vorschau für ${manifest.displayName}`}
          tabIndex={0}
        />

        {showMtoonToggle ? (
          <AvatarMtoonStyleToggle
            enabled={mtoonStyleEnabled}
            disabled={runtimeState.status !== 'ready'}
            onChange={(enabled) => {
              runtimeRef.current?.setMtoonStyleEnabled(enabled);
              setMtoonStyleEnabled(enabled);
              const compatibility = runtimeRef.current?.getStyleCompatibility();
              setStyleNotice(compatibility?.noticeDe ?? null);
            }}
          />
        ) : null}

        {runtimeState.status !== 'ready' && (
          <div className="pointer-events-none absolute left-3 top-3 z-[1] flex items-center gap-2 rounded-md border border-white/10 bg-black/45 px-2.5 py-1.5 text-[11px] text-slate-200 backdrop-blur-sm">
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                runtimeState.status === 'error' ? 'bg-red-400' : 'animate-pulse bg-amber-400'
              }`}
            />
            <span>{runtimeState.message}</span>
          </div>
        )}

        {runtimeState.status === 'error' && (
          <div className="pointer-events-none absolute inset-x-4 bottom-4 z-[1] rounded-lg border border-red-400/30 bg-slate-950/85 p-3 text-center text-xs text-slate-200 backdrop-blur">
            Die 3D-Runtime ist aktiv, aber das Modell konnte nicht geladen werden. Hinterlege ein selbst gehostetes Asset über
            <code className="mx-1 text-red-200">VITE_AVATAR_ASSET_BASE_URL</code>
            oder speichere eine gültige VRM/GLB-URL am Avatar.
          </div>
        )}

        {styleNotice && runtimeState.status === 'ready' ? (
          <div
            className="pointer-events-none absolute inset-x-3 bottom-3 z-[1] rounded-md border border-amber-400/25 bg-slate-950/80 px-2.5 py-1.5 text-[11px] text-amber-100 backdrop-blur"
            data-testid="avatar-mtoon-style-notice"
            role="status"
          >
            {styleNotice}
          </div>
        ) : null}
      </div>
      {belowViewportSlot}
      {showEditorControls ? (
        <AvatarCameraViewControls
          inspectMode={inspectMode}
          activeFrame={activeFrame}
          disabled={runtimeState.status !== 'ready'}
          onInspectChange={(enabled) => {
            runtimeRef.current?.setInspectMode(enabled);
            setInspectMode(enabled);
          }}
          onFrame={(frame) => {
            runtimeRef.current?.applyCameraFrame(frame);
            setActiveFrame(frame);
            setInspectMode(runtimeRef.current?.isInspectMode() ?? frame !== 'full');
          }}
          onReset={() => {
            runtimeRef.current?.resetCamera();
            setInspectMode(false);
            setActiveFrame('full');
          }}
        />
      ) : null}
      {showEditorControls ? (
        <AvatarAnimationPreviewControls
          support={animationSupport}
          activeAction={activeAnimation}
          message={animationMessage}
          disabled={runtimeState.status !== 'ready'}
          onSelect={(actionId) => {
            runtimeRef.current?.playAnimation(actionId);
          }}
        />
      ) : null}
      {showEditorControls ? (
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
      ) : null}
      {showEditorControls ? <AvatarRigCapabilityPanel analysis={rigAnalysis} /> : null}
    </div>
  );
}
