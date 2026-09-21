/**
 * LiveActViewportControls — editor viewport chrome host for LiveAct gear + PiP (#330).
 * Location: src/app/character/liveact/LiveActViewportControls.tsx
 *
 * Composes AvatarPreviewSettings + LiveActCameraPreview for AvatarSurfaceViewer.
 */

import { AvatarPreviewSettings } from '../avatar/AvatarPreviewSettings';
import { LiveActCameraPreview } from './LiveActCameraPreview';
import type { UseLiveActViewportResult } from './useLiveActViewport';

interface LiveActViewportControlsProps {
  runtimeReady: boolean;
  mtoonEnabled: boolean;
  onMtoonChange: (enabled: boolean) => void;
  liveAct: UseLiveActViewportResult;
}

export function LiveActViewportControls({
  runtimeReady,
  mtoonEnabled,
  onMtoonChange,
  liveAct,
}: LiveActViewportControlsProps) {
  const showPip =
    liveAct.trackingEnabled &&
    liveAct.cameraPreviewEnabled &&
    Boolean(liveAct.previewVideo) &&
    runtimeReady;

  return (
    <>
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
        bonesEnabled={liveAct.bonesEnabled}
        onBonesChange={liveAct.setBonesEnabled}
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
        diagnosticsRef={liveAct.diagnosticsRef}
      />
    </>
  );
}
