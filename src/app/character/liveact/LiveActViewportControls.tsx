/**
 * LiveActViewportControls — editor viewport chrome host for LiveAct gear + PiP (#330).
 * Location: src/app/character/liveact/LiveActViewportControls.tsx
 *
 * Composes AvatarPreviewSettings + LiveActCameraPreview for AvatarSurfaceViewer.
 */

import type { LiveActCapabilitiesV1 } from '../../../domains/character/liveact';
import { AvatarPreviewSettings } from '../avatar/AvatarPreviewSettings';
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
}

export function LiveActViewportControls({
  runtimeReady,
  mtoonEnabled,
  onMtoonChange,
  liveAct,
  capabilities,
  characterFaceMappingAvailable,
}: LiveActViewportControlsProps) {
  const characterOverlayOn =
    liveAct.faceOverlayEnabled && runtimeReady && characterFaceMappingAvailable;
  const inputLive =
    runtimeReady &&
    liveAct.trackingEnabled &&
    liveAct.faceDetected &&
    (liveAct.status === 'active' || liveAct.status === 'lost');
  const showPip =
    liveAct.trackingEnabled &&
    liveAct.cameraPreviewEnabled &&
    Boolean(liveAct.previewVideo) &&
    runtimeReady;

  return (
    <>
      <LiveActCharacterFaceOverlay
        enabled={characterOverlayOn}
        metricsEnabled={liveAct.metricsEnabled}
        debugHandleRef={liveAct.characterFaceDebugHandleRef}
      />
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
      />
      <LiveActCameraPreview
        video={liveAct.previewVideo}
        status={liveAct.status}
        visible={showPip}
        faceOverlayEnabled={liveAct.faceOverlayEnabled}
        metricsEnabled={liveAct.metricsEnabled}
        diagnosticsRef={liveAct.diagnosticsRef}
        diagnosticsV2Ref={liveAct.diagnosticsV2Ref}
      />
    </>
  );
}
