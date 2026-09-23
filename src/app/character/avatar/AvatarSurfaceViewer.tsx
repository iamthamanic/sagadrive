/**
 * AvatarSurfaceViewer — shared portrait / compact-3d / full-3d host for #9 / #330.
 * Location: src/app/character/avatar/AvatarSurfaceViewer.tsx
 *
 * Editor Surface owns permanent viewport gear chrome (also on fallback „CH“).
 * LiveAct state lives in useLiveActViewport — not CharacterEditor (#334: all surfaces).
 */

import { useEffect, useRef, useState, type MutableRefObject, type RefObject } from 'react';
import type { CharacterAvatarDto } from '../../../domains/character/domain/character.entity';
import type { LiveActCapabilitiesV1 } from '../../../domains/character/liveact';
import {
  resolveAvatarSurfaceView,
  type AvatarRenderMode,
  type AvatarSurfaceId,
  type AvatarSurfaceRef,
} from '../../../domains/character/avatar';
import { resolveLiveActRetargetProfile } from '../../../infrastructure/character/liveact';
import { AvatarCanvas, type AvatarPortraitCaptureHandle } from './AvatarCanvas';
import {
  LiveActSurfaceControls,
  LiveActViewportControls,
  useLiveActViewport,
} from '../liveact';
import type { CharacterStudioRuntime } from '../../../infrastructure/character/avatar/character-studio-runtime';

interface AvatarSurfaceViewerProps {
  surface: AvatarSurfaceId;
  surfaceRef: AvatarSurfaceRef;
  /** Required when mode resolves to WebGL — compact appearance avatar DTO. */
  avatar?: CharacterAvatarDto;
  mode?: AvatarRenderMode;
  live3dCount?: number;
  className?: string;
  canvasRef?: RefObject<HTMLCanvasElement>;
  captureApiRef?: MutableRefObject<AvatarPortraitCaptureHandle | null>;
  onRuntimeReady?: () => void;
  /** Portrait/list density — fixed aspect box to avoid layout jump. */
  size?: 'sm' | 'md' | 'lg';
  /** Override Face Tracking on 3D surfaces. Default: on for editor/player-panel, off for tiny session strip. */
  enableFaceTracking?: boolean;
}

const SIZE_CLASS = {
  sm: 'h-14 w-14',
  md: 'aspect-[4/5] w-full min-h-[12rem]',
  lg: 'aspect-[4/5] w-full min-h-[18rem]',
} as const;

function detectWebGl(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
  } catch {
    return false;
  }
}

export function AvatarSurfaceViewer({
  surface,
  surfaceRef,
  avatar,
  mode,
  live3dCount = 0,
  className,
  canvasRef,
  captureApiRef,
  onRuntimeReady,
  size = 'md',
  enableFaceTracking,
}: AvatarSurfaceViewerProps) {
  const [webGlAvailable, setWebGlAvailable] = useState(true);
  const [imageFailed, setImageFailed] = useState(false);
  const [runtimeReady, setRuntimeReady] = useState(false);
  const [mtoonEnabled, setMtoonEnabled] = useState(true);
  const mtoonHandlerRef = useRef<((enabled: boolean) => void) | null>(null);
  const studioRuntimeRef = useRef<CharacterStudioRuntime | null>(null);
  const [faceMappingPanelHost, setFaceMappingPanelHost] = useState<HTMLDivElement | null>(null);
  const [modelEpoch, setModelEpoch] = useState(0);
  const [liveActCapabilities, setLiveActCapabilities] = useState<LiveActCapabilitiesV1 | null>(
    null,
  );
  const [characterFaceMappingAvailable, setCharacterFaceMappingAvailable] = useState(false);
  const checkedRef = useRef(false);

  const handleMtoonState = useRef(
    (enabled: boolean, apply: (next: boolean) => void) => {
      setMtoonEnabled(enabled);
      mtoonHandlerRef.current = apply;
    },
  ).current;

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;
    setWebGlAvailable(detectWebGl());
  }, []);

  const view = resolveAvatarSurfaceView({
    surface,
    ref: surfaceRef,
    mode,
    webGlAvailable,
    live3dCount,
  });

  const boxClass = SIZE_CLASS[size];
  const show3d = view.useWebGl && Boolean(avatar);
  const liveSurface = surface === 'player-panel' || surface === 'session';
  const isEditorSurface = !liveSurface;
  const faceTrackingOn =
    enableFaceTracking ?? (liveSurface ? size !== 'sm' : true);
  const controlMode = liveSurface ? 'live' : 'editor';

  // 3D canvas owns its own aspect + controls below; don't lock the outer box to 4/5
  // or Animation/Facial panels steal height from the character viewport.
  const shellClass = show3d
    ? `relative w-full ${className ?? ''}`
    : `relative overflow-hidden rounded-lg border border-border bg-[#0B1220] ${boxClass} ${className ?? ''}`;

  const liveActEnabled = show3d && (isEditorSurface || (liveSurface && faceTrackingOn));

  const liveAct = useLiveActViewport({
    runtimeReady: runtimeReady && show3d,
    enabled: liveActEnabled,
    getLiveActAvatarCapabilities: () =>
      studioRuntimeRef.current?.getLiveActAvatarCapabilities() ?? null,
    getBonesAvailable: () => studioRuntimeRef.current?.hasLiveActSkeleton() ?? false,
    modelRevision: modelEpoch,
  });

  useEffect(() => {
    setLiveActCapabilities(liveAct.composedCapabilities);
  }, [liveAct.composedCapabilities]);

  useEffect(() => {
    if (!isEditorSurface || !runtimeReady) {
      studioRuntimeRef.current?.setLiveActRigDebugEnabled(false);
      return;
    }
    studioRuntimeRef.current?.setLiveActRigDebugEnabled(
      liveAct.bonesEnabled && liveAct.bonesAvailable,
    );
  }, [
    isEditorSurface,
    runtimeReady,
    modelEpoch,
    liveAct.bonesEnabled,
    liveAct.bonesAvailable,
  ]);

  useEffect(() => {
    const runtime = studioRuntimeRef.current;
    if (!runtimeReady || !runtime) {
      setCharacterFaceMappingAvailable(false);
      liveAct.characterFaceDebugHandleRef.current = null;
      studioRuntimeRef.current?.setLiveActCharacterFaceDebugEnabled(false);
      return;
    }
    const syncMapping = (): void => {
      liveAct.characterFaceDebugHandleRef.current = runtime.getLiveActCharacterFaceDebugHandle();
      setCharacterFaceMappingAvailable(runtime.hasLiveActCharacterFaceMapping());
    };
    syncMapping();
    const t1 = window.setTimeout(syncMapping, 400);
    const t2 = window.setTimeout(syncMapping, 1200);
    const t3 = window.setTimeout(syncMapping, 2500);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [runtimeReady, modelEpoch, liveAct.characterFaceDebugHandleRef]);

  useEffect(() => {
    if (!isEditorSurface || !runtimeReady) {
      studioRuntimeRef.current?.setLiveActCharacterFaceDebugEnabled(false);
      return;
    }
    const enabled =
      liveAct.faceOverlayEnabled &&
      characterFaceMappingAvailable &&
      liveAct.trackingEnabled;
    studioRuntimeRef.current?.setLiveActCharacterFaceDebugEnabled(enabled);
  }, [
    isEditorSurface,
    runtimeReady,
    modelEpoch,
    liveAct.faceOverlayEnabled,
    liveAct.trackingEnabled,
    characterFaceMappingAvailable,
  ]);

  useEffect(() => {
    const engine = liveAct.engineRef.current;
    if (!engine || !liveActEnabled) return;
    if (!liveAct.trackingEnabled || !runtimeReady) {
      engine.bindOutput(null);
      return;
    }
    const output = studioRuntimeRef.current?.getLiveActAvatarOutput() ?? null;
    engine.bindOutput(output);
    engine.setRetargetProfile(
      resolveLiveActRetargetProfile({
        avatarCapabilities: output?.getAvatarCapabilities() ?? null,
      }),
    );
    return () => {
      engine.bindOutput(null);
    };
  }, [
    liveActEnabled,
    liveAct.trackingEnabled,
    runtimeReady,
    modelEpoch,
    liveAct.engineRef,
  ]);

  useEffect(() => {
    if (show3d) return;
    setRuntimeReady(false);
    mtoonHandlerRef.current = null;
  }, [show3d]);

  const handleRuntimeReady = () => {
    setRuntimeReady(true);
    setModelEpoch((value) => value + 1);
    onRuntimeReady?.();
  };

  return (
    <div
      className={shellClass}
      data-avatar-surface={view.surface}
      data-avatar-render-mode={view.mode}
      data-avatar-use-webgl={view.useWebGl ? 'true' : 'false'}
      data-avatar-face-tracking-bound={show3d && faceTrackingOn ? 'true' : 'false'}
      data-avatar-viewport-settings={isEditorSurface ? 'true' : 'false'}
      aria-label={`Avatar ${view.displayName}`}
    >
      {show3d && avatar ? (
        <div className="relative w-full">
          <AvatarCanvas
            avatar={avatar}
            canvasRef={canvasRef}
            captureApiRef={captureApiRef}
            onRuntimeReady={handleRuntimeReady}
            className="relative flex w-full flex-col gap-2"
            controlMode={controlMode}
            enableFaceTracking={false}
            hideEditorFaceTrackingBar={isEditorSurface}
            hideMtoonToggle={isEditorSurface}
            onMtoonState={handleMtoonState}
            studioRuntimeRef={studioRuntimeRef}
            belowViewportSlot={
              isEditorSurface ? (
                <div
                  ref={setFaceMappingPanelHost}
                  className="w-full empty:hidden"
                  data-testid="face-mapping-panel-host"
                  data-avatar-below-viewport="true"
                />
              ) : null
            }
          />
          {isEditorSurface ? (
            <div
              className="pointer-events-none absolute inset-x-0 top-0 z-20 aspect-[4/5] w-full"
              data-avatar-viewport-chrome="true"
            >
              <div className="pointer-events-none relative h-full w-full">
                <LiveActViewportControls
                  runtimeReady={runtimeReady}
                  mtoonEnabled={mtoonEnabled}
                  onMtoonChange={(enabled) => {
                    mtoonHandlerRef.current?.(enabled);
                    setMtoonEnabled(enabled);
                  }}
                  liveAct={liveAct}
                  capabilities={liveActCapabilities}
                  characterFaceMappingAvailable={characterFaceMappingAvailable}
                  studioRuntimeRef={studioRuntimeRef}
                  faceMappingPanelHost={faceMappingPanelHost}
                />
              </div>
            </div>
          ) : null}
          {liveSurface && faceTrackingOn ? (
            <LiveActSurfaceControls liveAct={liveAct} disabled={!runtimeReady} />
          ) : null}
        </div>
      ) : (
        <div className="relative h-full w-full">
          {view.portraitUrl && !imageFailed ? (
            <img
              src={view.portraitUrl}
              alt={`Portrait von ${view.displayName}`}
              className="h-full w-full object-cover"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center bg-muted/40 px-2 text-center text-xs text-muted-foreground"
              data-avatar-surface-fallback="true"
            >
              {view.displayName.slice(0, 2).toUpperCase()}
            </div>
          )}
          {isEditorSurface ? (
            <LiveActViewportControls
              runtimeReady={false}
              mtoonEnabled={mtoonEnabled}
              onMtoonChange={setMtoonEnabled}
              liveAct={liveAct}
              capabilities={null}
              characterFaceMappingAvailable={false}
            />
          ) : null}
        </div>
      )}
      {view.fallbackReason && show3d === false ? (
        <span className="sr-only">{view.fallbackReason}</span>
      ) : null}
    </div>
  );
}
