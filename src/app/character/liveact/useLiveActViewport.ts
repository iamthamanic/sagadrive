/**
 * useLiveActViewport — ephemeral LiveAct viewport UI state (#330, #331).
 * Location: src/app/character/liveact/useLiveActViewport.ts
 *
 * Owns Tracking/PiP toggles and binds LiveActEngine. No CharacterEditor state.
 * Per-frame updates stay off React — only status/preview refs change slowly.
 */

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import {
  composeLiveActCapabilities,
  liveActStatusLabelDe,
  type LiveActAvatarCapabilities,
  type LiveActCapabilitiesV1,
  type LiveActFaceDiagnosticsFrameV1,
  type LiveActStatus,
} from '../../../domains/character/liveact';
import type { LiveActEngine, LiveActEngineState } from '../../../infrastructure/character/liveact';
import {
  acquireSharedLiveActEngine,
  acquireSharedLiveActTracking,
  releaseSharedLiveActEngine,
  releaseSharedLiveActTracking,
} from './liveact-engine-singleton';

export interface LiveActCameraDeviceOption {
  deviceId: string;
  label: string;
}

export interface UseLiveActViewportOptions {
  /** When false, Tracking cannot start and must not prompt for camera. */
  runtimeReady: boolean;
  enabled?: boolean;
  /** Avatar-only capability matrix from loaded model (#381). */
  getLiveActAvatarCapabilities?: () => LiveActAvatarCapabilities | null;
  /** Whether the loaded avatar exposes a real skeleton (SkinnedMesh). */
  getBonesAvailable?: () => boolean;
  /** Bump when the studio runtime loads or swaps models. */
  modelRevision?: number;
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
  /** Loaded model has a skinned skeleton for Character Bones overlay. */
  bonesAvailable: boolean;
  status: LiveActStatus;
  message: string;
  fpsCap: number;
  qualityProfileLabelDe: string;
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
  /** Composed Input×Avatar matrix for Capability Inspector (#381). */
  composedCapabilities: LiveActCapabilitiesV1 | null;
  diagnosticsRef: RefObject<LiveActFaceDiagnosticsFrameV1 | null>;
  engineRef: RefObject<LiveActEngine | null>;
}

export function useLiveActViewport({
  runtimeReady,
  enabled = true,
  getLiveActAvatarCapabilities,
  getBonesAvailable,
  modelRevision = 0,
}: UseLiveActViewportOptions): UseLiveActViewportResult {
  const engineRef = useRef<LiveActEngine | null>(null);
  const getAvatarCapsRef = useRef(getLiveActAvatarCapabilities);
  getAvatarCapsRef.current = getLiveActAvatarCapabilities;
  const getBonesRef = useRef(getBonesAvailable);
  getBonesRef.current = getBonesAvailable;
  const diagnosticsRef = useRef<LiveActFaceDiagnosticsFrameV1 | null>(null);
  const [trackingEnabled, setTrackingEnabledState] = useState(false);
  const [cameraPreviewEnabled, setCameraPreviewEnabled] = useState(true);
  const [faceOverlayEnabled, setFaceOverlayEnabled] = useState(false);
  const [bonesEnabled, setBonesEnabledState] = useState(false);
  const [bonesAvailable, setBonesAvailable] = useState(false);
  const [status, setStatus] = useState<LiveActStatus>('idle');
  const [message, setMessage] = useState(liveActStatusLabelDe('idle'));
  const [fpsCap, setFpsCap] = useState(30);
  const [qualityProfileLabelDe, setQualityProfileLabelDe] = useState('Desktop');
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
  const [composedCapabilities, setComposedCapabilities] = useState<LiveActCapabilitiesV1 | null>(
    null,
  );
  const selectedDeviceRef = useRef(selectedDeviceId);
  selectedDeviceRef.current = selectedDeviceId;
  const skipDeviceSwitchAfterStartRef = useRef(false);

  useEffect(() => {
    if (!runtimeReady) {
      setBonesAvailable(false);
      setBonesEnabledState(false);
      return;
    }
    setBonesAvailable(getBonesRef.current?.() ?? false);
  }, [runtimeReady, enabled, modelRevision]);

  const setBonesEnabled = (next: boolean) => {
    if (next && !bonesAvailable) return;
    setBonesEnabledState(next);
  };

  useEffect(() => {
    if (bonesAvailable) return;
    setBonesEnabledState(false);
  }, [bonesAvailable]);

  useEffect(() => {
    if (!enabled) {
      setComposedCapabilities(null);
      return;
    }
    const engine = acquireSharedLiveActEngine();
    engineRef.current = engine;
    const refreshComposed = () => {
      const avatarCaps = getAvatarCapsRef.current?.() ?? null;
      if (!avatarCaps) {
        setComposedCapabilities(null);
        return;
      }
      setComposedCapabilities(
        composeLiveActCapabilities(engine.getInputCapabilities(), avatarCaps),
      );
    };
    refreshComposed();
    const unsubStatus = engine.subscribeStatus((state: LiveActEngineState) => {
      setStatus(state.status);
      setMessage(state.message);
      setFpsCap(state.fpsCap);
      setQualityProfileLabelDe(state.qualityProfileLabelDe);
      setPreviewVideo(engine.getPreviewVideo());
      setCalibrationStatus(state.calibrationStatus);
      setCalibrationMessage(state.calibrationMessage);
      setHasNeutralBaseline(state.hasNeutralBaseline);
      const frame = state.frame;
      const active =
        state.status === 'active' || state.status === 'lost' || state.status === 'paused';
      setFaceDetected(Boolean(active && frame && !frame.trackingLost));
      const avatarCaps = getAvatarCapsRef.current?.();
      const caps: LiveActCapabilitiesV1 | null = avatarCaps
        ? composeLiveActCapabilities(engine.getInputCapabilities(), avatarCaps)
        : null;
      setComposedCapabilities(caps);
      if (caps) {
        setHeadConnected(Boolean(active && caps.avatarBones.head));
        setEyesConnected(
          Boolean(active && (caps.avatarBones.leftEye || caps.avatarBones.rightEye)),
        );
        setMouthLimited(caps.activeFaceChannelCount < 4);
      } else {
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
      }
    });
    const unsubDiagnostics = engine.subscribeDiagnostics((frame) => {
      diagnosticsRef.current = frame;
    });
    return () => {
      unsubStatus();
      unsubDiagnostics();
      releaseSharedLiveActEngine();
      engineRef.current = null;
      diagnosticsRef.current = null;
      setPreviewVideo(null);
      setComposedCapabilities(null);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !runtimeReady) return;
    const engine = engineRef.current;
    const avatarCaps = getAvatarCapsRef.current?.() ?? null;
    if (!engine || !avatarCaps) {
      setComposedCapabilities(null);
      return;
    }
    setComposedCapabilities(
      composeLiveActCapabilities(engine.getInputCapabilities(), avatarCaps),
    );
  }, [runtimeReady, enabled, modelRevision]);

  useEffect(() => {
    if (!trackingEnabled) {
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
    let trackingHeld = false;
    acquireSharedLiveActTracking();
    trackingHeld = true;
    skipDeviceSwitchAfterStartRef.current = true;
    void engine.start(selectedDeviceRef.current).then(async () => {
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
      if (trackingHeld) {
        releaseSharedLiveActTracking();
        trackingHeld = false;
      }
    };
  }, [trackingEnabled, runtimeReady]);

  useEffect(() => {
    if (!trackingEnabled || !runtimeReady) return;
    if (skipDeviceSwitchAfterStartRef.current) {
      skipDeviceSwitchAfterStartRef.current = false;
      return;
    }
    const engine = engineRef.current;
    if (!engine) return;
    void engine.switchCameraDevice(selectedDeviceRef.current);
  }, [selectedDeviceId, trackingEnabled, runtimeReady]);

  useEffect(() => {
    if (runtimeReady) return;
    if (!trackingEnabled) return;
    setTrackingEnabledState(false);
  }, [runtimeReady, trackingEnabled]);

  const setTrackingEnabled = (next: boolean) => {
    if (next && !runtimeReady) return;
    setTrackingEnabledState(next);
    if (!next) {
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
    bonesAvailable,
    status,
    message,
    fpsCap,
    qualityProfileLabelDe,
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
    composedCapabilities,
    diagnosticsRef,
    engineRef,
  };
}
