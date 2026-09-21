/**
 * useLiveActViewport — ephemeral LiveAct viewport UI state (#330).
 * Location: src/app/character/liveact/useLiveActViewport.ts
 *
 * Owns Tracking/PiP toggles and binds LiveActEngine. No CharacterEditor state.
 * Per-frame updates stay off React — only status/preview refs change slowly.
 */

import { useEffect, useRef, useState } from 'react';
import {
  liveActStatusLabelDe,
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
}

export function useLiveActViewport({
  runtimeReady,
  enabled = true,
}: UseLiveActViewportOptions): UseLiveActViewportResult {
  const engineRef = useRef<LiveActEngine | null>(null);
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

  useEffect(() => {
    if (!enabled) return;
    const engine = new LiveActEngine();
    engineRef.current = engine;
    const unsub = engine.subscribeStatus((state: LiveActEngineState) => {
      setStatus(state.status);
      setMessage(state.message);
      setPreviewVideo(engine.getPreviewVideo());
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
      // Mouth/facial capability reporting stays conservative until 4/7 output.
      setMouthLimited(true);
    });
    return () => {
      unsub();
      engine.dispose();
      engineRef.current = null;
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
  };
}
