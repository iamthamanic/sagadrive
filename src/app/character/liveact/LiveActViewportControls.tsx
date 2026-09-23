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

  const openFaceMapping = useCallback(() => {
    const runtime = studioRuntimeRef?.current;
    if (!runtime || !runtimeReady) return;
    liveAct.setTrackingEnabled(false);
    liveAct.setFaceOverlayEnabled(false);
    liveAct.setBonesEnabled(false);
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
        onSelect={(id) => {
          setMissMessage(null);
          setDraft((prev) => (prev ? selectFaceMappingAnchor(prev, id) : prev));
        }}
        onClearSelected={() => {
          setDraft((prev) => {
            if (!prev?.selectedAnchorId) return prev;
            return clearFaceMappingDraftBinding(prev, prev.selectedAnchorId);
          });
        }}
        onReset={() => {
          setMissMessage(null);
          setDraft((prev) => (prev ? resetFaceMappingDraft(prev) : prev));
        }}
        onCancel={closeFaceMapping}
        onApply={() => {
          const runtime = studioRuntimeRef?.current;
          if (!runtime || !draft) return;
          const manifest = faceMappingDraftToManifest(draft);
          runtime.bindFaceAnchorsManifestSession(manifest);
          closeFaceMapping();
        }}
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
          onBindingPlaced={onBindingPlaced}
        />
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
