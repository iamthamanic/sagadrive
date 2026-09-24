/**
 * LiveActViewportControls — editor viewport chrome host for LiveAct gear + PiP (#330/#420).
 * Location: src/app/character/liveact/LiveActViewportControls.tsx
 *
 * Overlay chrome (settings / markers / PiP) sits on the canvas.
 * Face Mapping panel portals into a host below the AvatarCanvas.
 */

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import type { LiveActCapabilitiesV1 } from '../../../domains/character/liveact';
import type {
  SagaDriveFaceAnchorId,
  SagaDriveFaceAnchorTriangleBinding,
} from '../../../domains/character/avatar/face-anchor-contract';
import {
  clearFaceMappingDraftBinding,
  createEmptyFaceMappingDraft,
  faceMappingDraftToManifest,
  resetFaceMappingDraft,
  selectFaceMappingAnchor,
  setFaceMappingDraftBinding,
  type SagaDriveFaceMappingDraftV1,
} from '../../../domains/character/avatar/face-mapping-draft-v1';
import type { CharacterStudioRuntime } from '../../../infrastructure/character/avatar/character-studio-runtime';
import { AvatarPreviewSettings } from '../avatar/AvatarPreviewSettings';
import { Button } from '../../../shared/ui/button';
import { FaceMappingAuthoringPanel } from './FaceMappingAuthoringPanel';
import { FaceMappingMarkerLayer } from './FaceMappingMarkerLayer';
import { LiveActCameraPreview } from './LiveActCameraPreview';
import { LiveActCharacterFaceOverlay } from './LiveActCharacterFaceOverlay';
import type { UseLiveActViewportResult } from './useLiveActViewport';

interface LiveActViewportControlsProps {
  runtimeReady: boolean;
  mtoonEnabled: boolean;
  onMtoonChange: (enabled: boolean) => void;
  liveAct: UseLiveActViewportResult;
  capabilities: LiveActCapabilitiesV1 | null;
  characterFaceMappingAvailable: boolean;
  studioRuntimeRef?: RefObject<CharacterStudioRuntime | null>;
  /** DOM host below AvatarCanvas for the Face Mapping panel. */
  faceMappingPanelHost?: HTMLElement | null;
  /** Open large face-framed 3D preview modal. */
  onExpandPreview?: () => void;
}

export function LiveActViewportControls({
  runtimeReady,
  mtoonEnabled,
  onMtoonChange,
  liveAct,
  capabilities,
  characterFaceMappingAvailable,
  studioRuntimeRef,
  faceMappingPanelHost = null,
  onExpandPreview,
}: LiveActViewportControlsProps) {
  const [faceMappingOpen, setFaceMappingOpen] = useState(false);
  const [draft, setDraft] = useState<SagaDriveFaceMappingDraftV1 | null>(null);
  const [missMessage, setMissMessage] = useState<string | null>(null);
  const draftRef = useRef<SagaDriveFaceMappingDraftV1 | null>(null);
  draftRef.current = draft;

  const characterOverlayOn =
    !faceMappingOpen &&
    liveAct.faceOverlayEnabled &&
    runtimeReady &&
    characterFaceMappingAvailable;
  const inputLive =
    runtimeReady &&
    liveAct.trackingEnabled &&
    liveAct.faceDetected &&
    (liveAct.status === 'active' || liveAct.status === 'lost');
  const showPip =
    !faceMappingOpen &&
    liveAct.trackingEnabled &&
    liveAct.cameraPreviewEnabled &&
    Boolean(liveAct.previewVideo) &&
    runtimeReady;

  const closeFaceMapping = useCallback(() => {
    studioRuntimeRef?.current?.setFaceMappingAuthoringActive(false);
    setFaceMappingOpen(false);
    setDraft(null);
    setMissMessage(null);
  }, [studioRuntimeRef]);

  const applyFaceMapping = useCallback(() => {
    const runtime = studioRuntimeRef?.current;
    const current = draftRef.current;
    if (!runtime || !current) return;
    const manifest = faceMappingDraftToManifest(current);
    runtime.bindFaceAnchorsManifestSession(manifest);
    closeFaceMapping();
  }, [closeFaceMapping, studioRuntimeRef]);

  const openFaceMapping = useCallback(() => {
    const runtime = studioRuntimeRef?.current;
    if (!runtime || !runtimeReady) return;
    liveAct.setTrackingEnabled(false);
    liveAct.setFaceOverlayEnabled(false);
    liveAct.setBonesEnabled(false);
    // Neutralize + frontal face frame (studio owns camera via applyCameraFrame('face')).
    runtime.setFaceMappingAuthoringActive(true);
    const baseline = runtime.getFaceAnchorsManifest();
    const next = createEmptyFaceMappingDraft(baseline);
    setDraft(next);
    setMissMessage(null);
    setFaceMappingOpen(true);
  }, [liveAct, runtimeReady, studioRuntimeRef]);

  useEffect(() => {
    if (!faceMappingOpen) return;
    if (!runtimeReady) {
      closeFaceMapping();
    }
  }, [closeFaceMapping, faceMappingOpen, runtimeReady]);

  useEffect(() => {
    return () => {
      studioRuntimeRef?.current?.setFaceMappingAuthoringActive(false);
    };
  }, [studioRuntimeRef]);

  const onSelectAnchor = useCallback((anchorId: SagaDriveFaceAnchorId) => {
    setMissMessage(null);
    setDraft((prev) => {
      if (!prev) return prev;
      const next = selectFaceMappingAnchor(prev, anchorId);
      draftRef.current = next;
      return next;
    });
  }, []);

  const onBindingPlaced = useCallback(
    (anchorId: SagaDriveFaceAnchorId, binding: SagaDriveFaceAnchorTriangleBinding | null) => {
      if (!binding) {
        setMissMessage('Kein Treffer auf der Character-Oberfläche — erneut tippen oder ziehen.');
        return;
      }
      setMissMessage(null);
      setDraft((prev) => {
        if (!prev) return prev;
        let next = setFaceMappingDraftBinding(prev, anchorId, binding);
        if (next.selectedAnchorId !== anchorId) {
          next = selectFaceMappingAnchor(next, anchorId);
        }
        draftRef.current = next;
        return next;
      });
    },
    [],
  );

  const panelHost = faceMappingPanelHost;
  const panel =
    faceMappingOpen && draft ? (
      <FaceMappingAuthoringPanel
        draft={draft}
        missMessage={missMessage}
        onSelect={onSelectAnchor}
        onClearSelected={() => {
          setDraft((prev) => {
            if (!prev?.selectedAnchorId) return prev;
            const next = clearFaceMappingDraftBinding(prev, prev.selectedAnchorId);
            draftRef.current = next;
            return next;
          });
        }}
        onReset={() => {
          setMissMessage(null);
          setDraft((prev) => {
            if (!prev) return prev;
            // Full clear: selection + working anchors → baseline (guides empty until rebound).
            const next = resetFaceMappingDraft(prev);
            draftRef.current = next;
            return next;
          });
        }}
        onCancel={closeFaceMapping}
        onApply={applyFaceMapping}
      />
    ) : null;

  return (
    <>
      <LiveActCharacterFaceOverlay
        enabled={characterOverlayOn}
        metricsEnabled={liveAct.metricsEnabled}
        debugHandleRef={liveAct.characterFaceDebugHandleRef}
        diagnosticsV2Ref={liveAct.diagnosticsV2Ref}
      />
      {studioRuntimeRef ? (
        <FaceMappingMarkerLayer
          active={faceMappingOpen}
          draftRef={draftRef}
          studioRuntimeRef={studioRuntimeRef}
          onSelectAnchor={onSelectAnchor}
          onBindingPlaced={onBindingPlaced}
        />
      ) : null}
      {faceMappingOpen ? (
        <div
          className="pointer-events-auto absolute inset-x-3 bottom-3 z-30 flex items-center gap-2 rounded-md border border-white/15 bg-slate-950/95 p-2 shadow-lg backdrop-blur-sm"
          data-testid="face-mapping-viewport-actions"
        >
          <p className="min-w-0 flex-1 px-1 text-[10px] leading-snug text-slate-400">
            Marker setzen, dann speichern — gilt für diese Sitzung (LiveAct-Overlay).
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 shrink-0 border-white/15 text-[11px]"
            onClick={closeFaceMapping}
            data-testid="face-mapping-viewport-cancel"
          >
            Abbrechen
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 shrink-0 bg-primary text-white hover:bg-accent hover:text-accent-foreground"
            onClick={applyFaceMapping}
            data-testid="face-mapping-viewport-save"
          >
            Speichern
          </Button>
        </div>
      ) : null}
      {panelHost && panel ? createPortal(panel, panelHost) : null}
      <AvatarPreviewSettings
        runtimeReady={runtimeReady}
        mtoonEnabled={mtoonEnabled}
        onMtoonChange={onMtoonChange}
        trackingEnabled={liveAct.trackingEnabled}
        onTrackingChange={liveAct.setTrackingEnabled}
        cameraPreviewEnabled={liveAct.cameraPreviewEnabled}
        onCameraPreviewChange={liveAct.setCameraPreviewEnabled}
        faceOverlayEnabled={liveAct.faceOverlayEnabled}
        onFaceOverlayChange={liveAct.setFaceOverlayEnabled}
        characterFaceMappingAvailable={characterFaceMappingAvailable}
        metricsEnabled={liveAct.metricsEnabled}
        onMetricsChange={liveAct.setMetricsEnabled}
        bonesEnabled={liveAct.bonesEnabled}
        bonesAvailable={liveAct.bonesAvailable}
        onBonesChange={liveAct.setBonesEnabled}
        capabilities={capabilities}
        inputLive={inputLive}
        diagnosticsV2Ref={liveAct.diagnosticsV2Ref}
        devices={liveAct.devices}
        selectedDeviceId={liveAct.selectedDeviceId}
        onDeviceChange={liveAct.setSelectedDeviceId}
        status={liveAct.status}
        statusMessage={liveAct.message}
        faceDetected={liveAct.faceDetected}
        headConnected={liveAct.headConnected}
        eyesConnected={liveAct.eyesConnected}
        mouthLimited={liveAct.mouthLimited}
        canCalibrate={liveAct.canCalibrate}
        onCalibrate={() => {
          void liveAct.calibrateNeutral();
        }}
        calibrationMessage={liveAct.calibrationMessage}
        hasNeutralBaseline={liveAct.hasNeutralBaseline}
        faceMappingOpen={faceMappingOpen}
        onOpenFaceMapping={openFaceMapping}
        onExpandPreview={onExpandPreview}
      />
      <LiveActCameraPreview
        video={liveAct.previewVideo}
        status={liveAct.status}
        visible={showPip}
        faceOverlayEnabled={liveAct.faceOverlayEnabled}
        metricsEnabled={liveAct.metricsEnabled}
        diagnosticsRef={liveAct.diagnosticsRef}
        diagnosticsV2Ref={liveAct.diagnosticsV2Ref}
        hasNeutralBaseline={liveAct.hasNeutralBaseline}
      />
    </>
  );
}
