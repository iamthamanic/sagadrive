/**
 * useLiveActViewport — ephemeral LiveAct viewport UI state (#330, #331).
 * Location: src/app/character/liveact/useLiveActViewport.ts
 *
 * Owns Tracking/PiP toggles and binds LiveActEngine. No CharacterEditor state.
 * Per-frame updates stay off React — only status/preview refs change slowly.
 */

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import {
  liveActStatusLabelDe,
  type LiveActFaceDiagnosticsFrameV1,
  type LiveActStatus,
} from '../../../domains/character/liveact';
import {
  LiveActEngine,
  type LiveActEngineState,
} from '../../../infrastructure/character/liveact';

export interface LiveActCameraDeviceOption {
  deviceId: string;
  label: string;
}

export interface UseLiveActViewportOptions {
  /** When false, Tracking cannot start and must not prompt for camera. */
  runtimeReady: boolean;
  enabled?: boolean;
}

export interface UseLiveActViewportResult {
  trackingEnabled: boolean;
  setTrackingEnabled: (enabled: boolean) => void;
  cameraPreviewEnabled: boolean;
  setCameraPreviewEnabled: (enabled: boolean) => void;
  faceOverlayEnabled: boolean;
  setFaceOverlayEnabled: (enabled: boolean) => void;
  bonesEnabled: boolean;
  setBonesEnabled: (enabled: boolean) => void;
  status: LiveActStatus;
  message: string;
  previewVideo: HTMLVideoElement | null;
  devices: readonly LiveActCameraDeviceOption[];
  selectedDeviceId: string | undefined;
  setSelectedDeviceId: (deviceId: string | undefined) => void;
  faceDetected: boolean;
  headConnected: boolean;
  eyesConnected: boolean;
  mouthLimited: boolean;
  calibrationStatus: LiveActEngineState['calibrationStatus'];
  calibrationMessage: string;
  hasNeutralBaseline: boolean;
  canCalibrate: boolean;
  calibrateNeutral: () => Promise<void>;
  diagnosticsRef: RefObject<LiveActFaceDiagnosticsFrameV1 | null>;
}

export function useLiveActViewport({
  runtimeReady,
  enabled = true,
}: UseLiveActViewportOptions): UseLiveActViewportResult {
  const engineRef = useRef<LiveActEngine | null>(null);
  const diagnosticsRef = useRef<LiveActFaceDiagnosticsFrameV1 | null>(null);
  const [trackingEnabled, setTrackingEnabledState] = useState(false);
  const [cameraPreviewEnabled, setCameraPreviewEnabled] = useState(true);
  const [faceOverlayEnabled, setFaceOverlayEnabled] = useState(false);
  const [bonesEnabled, setBonesEnabled] = useState(false);
  const [status, setStatus] = useState<LiveActStatus>('idle');
  const [message, setMessage] = useState(liveActStatusLabelDe('idle'));
  const [previewVideo, setPreviewVideo] = useState<HTMLVideoElement | null>(null);
  const [devices, setDevices] = useState<LiveActCameraDeviceOption[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);
  const [faceDetected, setFaceDetected] = useState(false);
  const [headConnected, setHeadConnected] = useState(false);
  const [eyesConnected, setEyesConnected] = useState(false);
  const [mouthLimited, setMouthLimited] = useState(true);
  const [calibrationStatus, setCalibrationStatus] =
    useState<LiveActEngineState['calibrationStatus']>('idle');
  const [calibrationMessage, setCalibrationMessage] = useState('');
  const [hasNeutralBaseline, setHasNeutralBaseline] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const engine = new LiveActEngine();
    engineRef.current = engine;
    const unsubStatus = engine.subscribeStatus((state: LiveActEngineState) => {
      setStatus(state.status);
      setMessage(state.message);
      setPreviewVideo(engine.getPreviewVideo());
      setCalibrationStatus(state.calibrationStatus);
      setCalibrationMessage(state.calibrationMessage);
      setHasNeutralBaseline(state.hasNeutralBaseline);
      const frame = state.frame;
      const active =
        state.status === 'active' || state.status === 'lost' || state.status === 'paused';
      setFaceDetected(Boolean(active && frame && !frame.trackingLost));
      setHeadConnected(Boolean(active && frame && !frame.trackingLost));
      setEyesConnected(
        Boolean(
          active &&
            frame &&
            !frame.trackingLost &&
            (Math.abs(frame.eyeLeft.x) + Math.abs(frame.eyeLeft.y) > 0.01 ||
              Math.abs(frame.eyeRight.x) + Math.abs(frame.eyeRight.y) > 0.01 ||
              frame.face.eyeBlinkLeft > 0.01 ||
              frame.face.eyeBlinkRight > 0.01),
        ),
      );
      setMouthLimited(true);
    });
    const unsubDiagnostics = engine.subscribeDiagnostics((frame) => {
      diagnosticsRef.current = frame;
    });
    return () => {
      unsubStatus();
      unsubDiagnostics();
      engine.dispose();
      engineRef.current = null;
      diagnosticsRef.current = null;
      setPreviewVideo(null);
    };
  }, [enabled]);

  useEffect(() => {
    if (!trackingEnabled) {
      engineRef.current?.stop();
      setPreviewVideo(null);
      return;
    }
    if (!runtimeReady) {
      setTrackingEnabledState(false);
      return;
    }
    const engine = engineRef.current;
    if (!engine) return;
    let cancelled = false;
    void engine.start().then(async () => {
      if (cancelled) return;
      try {
        if (!navigator.mediaDevices?.enumerateDevices) return;
        const list = await navigator.mediaDevices.enumerateDevices();
        const cams = list
          .filter((d) => d.kind === 'videoinput')
          .map((d, index) => ({
            deviceId: d.deviceId,
            label: d.label?.trim() || `Kamera ${index + 1}`,
          }));
        setDevices(cams);
        setSelectedDeviceId((prev) => prev ?? cams[0]?.deviceId);
      } catch {
        // enumeration is best-effort
      }
    });
    return () => {
      cancelled = true;
      engine.stop();
    };
  }, [trackingEnabled, runtimeReady]);

  useEffect(() => {
    if (runtimeReady) return;
    if (!trackingEnabled) return;
    setTrackingEnabledState(false);
    engineRef.current?.stop();
  }, [runtimeReady, trackingEnabled]);

  const setTrackingEnabled = (next: boolean) => {
    if (next && !runtimeReady) return;
    setTrackingEnabledState(next);
    if (!next) {
      engineRef.current?.stop();
      setPreviewVideo(null);
    }
  };

  const canCalibrate =
    runtimeReady &&
    trackingEnabled &&
    (status === 'active' || status === 'lost') &&
    calibrationStatus !== 'running';

  const calibrateNeutral = useCallback(async () => {
    if (!canCalibrate) return;
    const engine = engineRef.current;
    if (!engine) return;
    await engine.calibrate();
  }, [canCalibrate]);

  return {
    trackingEnabled,
    setTrackingEnabled,
    cameraPreviewEnabled,
    setCameraPreviewEnabled,
    faceOverlayEnabled,
    setFaceOverlayEnabled,
    bonesEnabled,
    setBonesEnabled,
    status,
    message,
    previewVideo,
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    faceDetected,
    headConnected,
    eyesConnected,
    mouthLimited,
    calibrationStatus,
    calibrationMessage,
    hasNeutralBaseline,
    canCalibrate,
    calibrateNeutral,
    diagnosticsRef,
  };
}
