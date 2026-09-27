/**
 * useLiveActViewport — ephemeral LiveAct viewport UI state (#330, #331).
 * Location: src/app/character/liveact/useLiveActViewport.ts
 *
 * Owns Tracking/PiP toggles and binds LiveActEngine. No CharacterEditor state.
 * Per-frame updates stay off React — only status/preview refs change slowly.
 * While calibration or motion test runs, Diagnostics V2 peaks accumulate for clipboard export.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
  type RefObject,
} from 'react';
import {
  accumulateLiveActDiagnosticsPeaks,
  buildLiveActMotionTestExport,
  composeLiveActCapabilities,
  createLiveActDiagnosticsPeaks,
  createLiveActMotionTestHoldAcc,
  exportLiveActDiagnosticsPeaks,
  finalizeLiveActMotionTestStepPeaks,
  LIVEACT_MOTION_TEST_MIN_FRAMES,
  LIVEACT_MOTION_TEST_STEPS,
  liveActMotionTestAdvanceLabelDe,
  liveActMotionTestHoldMs,
  liveActMotionTestStepPrompt,
  liveActStatusLabelDe,
  pushLiveActMotionTestHoldSample,
  readLiveActMotionTestSignal,
  type LiveActAvatarCapabilities,
  type LiveActCapabilitiesV1,
  type LiveActDiagnosticsPeaksV1,
  type LiveActDiagnosticsV2Snapshot,
  type LiveActFaceDiagnosticsFrameV1,
  type LiveActMotionTestHoldAcc,
  type LiveActMotionTestStatus,
  type LiveActMotionTestStepPeakV1,
  type LiveActMotionTestStepResultV1,
  type LiveActRangeStepPhase,
  type LiveActStatus,
} from '../../../domains/character/liveact';
import type { LiveActCharacterFaceDebugHandle } from '../../../infrastructure/character/avatar/character-studio-runtime';
import type { LiveActEngine, LiveActEngineState } from '../../../infrastructure/character/liveact';
import { playLiveActCalibrationCue } from './liveact-calibration-cues';
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
  /** When Face Overlay is on: draw every landmark/anchor (not just contours). */
  faceOverlayFullDetail: boolean;
  setFaceOverlayFullDetail: (enabled: boolean) => void;
  metricsEnabled: boolean;
  setMetricsEnabled: (enabled: boolean) => void;
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
  hasRangeCalibration: boolean;
  canCalibrate: boolean;
  canAdvanceCalibration: boolean;
  calibrationAdvanceLabelDe: 'Weiter' | 'Fertig' | null;
  calibrationCountdownSec: number | null;
  calibrationStepPhase: LiveActEngineState['calibrationStepPhase'];
  canStartCalibrationHold: boolean;
  canRetryCalibrationHold: boolean;
  calibrationStepPeaks: LiveActEngineState['calibrationStepPeaks'];
  calibrateNeutral: () => Promise<void>;
  advanceCalibration: () => void;
  startCalibrationHold: () => void;
  retryCalibrationHold: () => void;
  /** Frames counted into the calibration peak audit (0 until a run collects data). */
  calibrationPeakFrames: number;
  /** True when a calibration audit JSON can be copied (peaks from the last run). */
  canCopyCalibrationAudit: boolean;
  /** Peaks + range gains from the last calibration run (clipboard / paste into chat). */
  getCalibrationAuditJson: () => string;
  /** Read-only fidelity walkthrough (does not change calibration). */
  canMotionTest: boolean;
  motionTestStatus: LiveActMotionTestStatus;
  motionTestMessage: string;
  motionTestStepPhase: LiveActRangeStepPhase | null;
  motionTestCountdownSec: number | null;
  motionTestStepPeaks: readonly LiveActMotionTestStepPeakV1[];
  motionTestStepIndex: number;
  canStartMotionTestHold: boolean;
  canRetryMotionTestHold: boolean;
  canAdvanceMotionTest: boolean;
  motionTestAdvanceLabelDe: 'Weiter' | 'Fertig' | null;
  startMotionTest: () => void;
  startMotionTestHold: () => void;
  retryMotionTestHold: () => void;
  advanceMotionTest: () => void;
  motionTestPeakFrames: number;
  canCopyMotionTestAudit: boolean;
  getMotionTestAuditJson: () => string;
  /** Composed Input×Avatar matrix for Capability Inspector (#381). */
  composedCapabilities: LiveActCapabilitiesV1 | null;
  diagnosticsRef: RefObject<LiveActFaceDiagnosticsFrameV1 | null>;
  /** Diagnostics V2 stage trace (#397) — ref only, never React state per frame. */
  diagnosticsV2Ref: RefObject<LiveActDiagnosticsV2Snapshot | null>;
  /** Character mesh face debug handle — set by AvatarSurfaceViewer when runtime ready (#400). */
  characterFaceDebugHandleRef: MutableRefObject<LiveActCharacterFaceDebugHandle | null>;
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
  const diagnosticsV2Ref = useRef<LiveActDiagnosticsV2Snapshot | null>(null);
  const characterFaceDebugHandleRef = useRef<LiveActCharacterFaceDebugHandle | null>(null);
  const [trackingEnabled, setTrackingEnabledState] = useState(false);
  const [cameraPreviewEnabled, setCameraPreviewEnabled] = useState(true);
  const [faceOverlayEnabled, setFaceOverlayEnabled] = useState(false);
  /** Session-local; only meaningful while Face Overlay is on. */
  const [faceOverlayFullDetail, setFaceOverlayFullDetail] = useState(false);
  /** Session-local; initial true; independent of face overlay (#398). */
  const [metricsEnabled, setMetricsEnabled] = useState(true);
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
  const [hasRangeCalibration, setHasRangeCalibration] = useState(false);
  const [canAdvanceCalibration, setCanAdvanceCalibration] = useState(false);
  const [calibrationAdvanceLabelDe, setCalibrationAdvanceLabelDe] = useState<
    'Weiter' | 'Fertig' | null
  >(null);
  const [calibrationCountdownSec, setCalibrationCountdownSec] = useState<number | null>(null);
  const [calibrationStepPhase, setCalibrationStepPhase] = useState<
    LiveActEngineState['calibrationStepPhase']
  >(null);
  const [canStartCalibrationHold, setCanStartCalibrationHold] = useState(false);
  const [canRetryCalibrationHold, setCanRetryCalibrationHold] = useState(false);
  const [calibrationStepPeaks, setCalibrationStepPeaks] = useState<
    LiveActEngineState['calibrationStepPeaks']
  >([]);
  const [calibrationPeakFrames, setCalibrationPeakFrames] = useState(0);
  const calibrationPeaksRef = useRef<LiveActDiagnosticsPeaksV1>(createLiveActDiagnosticsPeaks());
  const calibrationStatusRef = useRef(calibrationStatus);
  calibrationStatusRef.current = calibrationStatus;
  const prevCountdownRef = useRef<number | null>(null);
  const prevCalibrationStatusRef = useRef(calibrationStatus);

  const [motionTestStatus, setMotionTestStatus] = useState<LiveActMotionTestStatus>('idle');
  const [motionTestMessage, setMotionTestMessage] = useState('');
  const [motionTestStepIndex, setMotionTestStepIndex] = useState(0);
  const [motionTestStepPhase, setMotionTestStepPhase] = useState<LiveActRangeStepPhase | null>(
    null,
  );
  const [motionTestCountdownSec, setMotionTestCountdownSec] = useState<number | null>(null);
  const [motionTestStepPeaks, setMotionTestStepPeaks] = useState<
    readonly LiveActMotionTestStepPeakV1[]
  >([]);
  const motionTestStepPeaksRef = useRef<readonly LiveActMotionTestStepPeakV1[]>([]);
  const [motionTestPeakFrames, setMotionTestPeakFrames] = useState(0);
  const motionTestPeaksRef = useRef<LiveActDiagnosticsPeaksV1>(createLiveActDiagnosticsPeaks());
  const motionTestHoldAccRef = useRef<LiveActMotionTestHoldAcc>(createLiveActMotionTestHoldAcc());
  const motionTestHoldFramesRef = useRef(0);
  const motionTestHoldLastSequenceRef = useRef<number | null>(null);
  const motionTestHoldStartedAtRef = useRef(0);
  const motionTestStepResultsRef = useRef<LiveActMotionTestStepResultV1[]>([]);
  const motionTestStatusRef = useRef(motionTestStatus);
  motionTestStatusRef.current = motionTestStatus;
  const motionTestStepIndexRef = useRef(motionTestStepIndex);
  motionTestStepIndexRef.current = motionTestStepIndex;
  const motionTestStepPhaseRef = useRef(motionTestStepPhase);
  motionTestStepPhaseRef.current = motionTestStepPhase;
  const prevMotionCountdownRef = useRef<number | null>(null);
  const prevMotionStatusRef = useRef(motionTestStatus);

  useEffect(() => {
    const prevStatus = prevCalibrationStatusRef.current;
    const prevSec = prevCountdownRef.current;
    prevCalibrationStatusRef.current = calibrationStatus;
    prevCountdownRef.current = calibrationCountdownSec;

    if (calibrationStatus === 'success' && prevStatus === 'running') {
      playLiveActCalibrationCue('complete');
      return;
    }
    if (calibrationStatus !== 'running') return;

    if (
      typeof calibrationCountdownSec === 'number' &&
      calibrationCountdownSec > 0 &&
      (prevSec === null || prevSec === 0 || calibrationCountdownSec > prevSec)
    ) {
      playLiveActCalibrationCue('start');
      return;
    }
    if (
      typeof calibrationCountdownSec === 'number' &&
      typeof prevSec === 'number' &&
      calibrationCountdownSec < prevSec &&
      calibrationCountdownSec > 0
    ) {
      playLiveActCalibrationCue('tick');
      return;
    }
    if (calibrationCountdownSec === 0 && typeof prevSec === 'number' && prevSec > 0) {
      playLiveActCalibrationCue('done');
    }
  }, [calibrationCountdownSec, calibrationStatus]);

  useEffect(() => {
    const prevStatus = prevMotionStatusRef.current;
    const prevSec = prevMotionCountdownRef.current;
    prevMotionStatusRef.current = motionTestStatus;
    prevMotionCountdownRef.current = motionTestCountdownSec;

    if (motionTestStatus === 'success' && prevStatus === 'running') {
      playLiveActCalibrationCue('complete');
      return;
    }
    if (motionTestStatus !== 'running') return;

    if (
      typeof motionTestCountdownSec === 'number' &&
      motionTestCountdownSec > 0 &&
      (prevSec === null || prevSec === 0 || motionTestCountdownSec > prevSec)
    ) {
      playLiveActCalibrationCue('start');
      return;
    }
    if (
      typeof motionTestCountdownSec === 'number' &&
      typeof prevSec === 'number' &&
      motionTestCountdownSec < prevSec &&
      motionTestCountdownSec > 0
    ) {
      playLiveActCalibrationCue('tick');
      return;
    }
    if (motionTestCountdownSec === 0 && typeof prevSec === 'number' && prevSec > 0) {
      playLiveActCalibrationCue('done');
    }
  }, [motionTestCountdownSec, motionTestStatus]);

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
      setHasRangeCalibration(state.hasRangeCalibration);
      setCanAdvanceCalibration(state.canAdvanceCalibration);
      setCalibrationAdvanceLabelDe(state.calibrationAdvanceLabelDe);
      setCalibrationCountdownSec(state.calibrationCountdownSec);
      setCalibrationStepPhase(state.calibrationStepPhase);
      setCanStartCalibrationHold(state.canStartCalibrationHold);
      setCanRetryCalibrationHold(state.canRetryCalibrationHold);
      setCalibrationStepPeaks(state.calibrationStepPeaks);
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
    const unsubDiagnosticsV2 = engine.subscribeDiagnosticsV2((snapshot) => {
      diagnosticsV2Ref.current = snapshot;
      if (calibrationStatusRef.current === 'running') {
        if (accumulateLiveActDiagnosticsPeaks(calibrationPeaksRef.current, snapshot)) {
          setCalibrationPeakFrames(calibrationPeaksRef.current.frames);
        }
      }
      if (motionTestStatusRef.current === 'running') {
        if (accumulateLiveActDiagnosticsPeaks(motionTestPeaksRef.current, snapshot)) {
          setMotionTestPeakFrames(motionTestPeaksRef.current.frames);
        }
        if (motionTestStepPhaseRef.current === 'holding' && !snapshot.trackingLost) {
          if (snapshot.sequence !== motionTestHoldLastSequenceRef.current) {
            motionTestHoldLastSequenceRef.current = snapshot.sequence;
            const stepIndex = motionTestStepIndexRef.current;
            pushLiveActMotionTestHoldSample(
              motionTestHoldAccRef.current,
              stepIndex,
              (key, stage) => readLiveActMotionTestSignal(snapshot, key, stage),
            );
            motionTestHoldFramesRef.current += 1;
          }
        }
      }
    });
    return () => {
      unsubStatus();
      unsubDiagnostics();
      unsubDiagnosticsV2();
      releaseSharedLiveActEngine();
      engineRef.current = null;
      diagnosticsRef.current = null;
      diagnosticsV2Ref.current = null;
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

  /** Finish a hold when countdown + min frames are met. */
  useEffect(() => {
    if (motionTestStatus !== 'running' || motionTestStepPhase !== 'holding') return;
    const holdMs = liveActMotionTestHoldMs(motionTestStepIndex);
    const tick = () => {
      if (motionTestStatusRef.current !== 'running' || motionTestStepPhaseRef.current !== 'holding') {
        return;
      }
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const elapsed = now - motionTestHoldStartedAtRef.current;
      const remainingSec = Math.max(0, Math.ceil((holdMs - elapsed) / 1000));
      setMotionTestCountdownSec(remainingSec);
      if (
        elapsed >= holdMs &&
        motionTestHoldFramesRef.current >= LIVEACT_MOTION_TEST_MIN_FRAMES
      ) {
        const peaks = finalizeLiveActMotionTestStepPeaks(
          motionTestHoldAccRef.current,
          motionTestStepIndexRef.current,
        );
        motionTestStepPeaksRef.current = peaks;
        setMotionTestStepPeaks(peaks);
        setMotionTestStepPhase('review');
        setMotionTestCountdownSec(0);
      }
    };
    tick();
    const id = window.setInterval(tick, 100);
    return () => window.clearInterval(id);
  }, [motionTestStatus, motionTestStepPhase, motionTestStepIndex]);

  const setTrackingEnabled = (next: boolean) => {
    if (next && !runtimeReady) return;
    setTrackingEnabledState(next);
    if (!next) {
      setPreviewVideo(null);
      if (motionTestStatusRef.current === 'running') {
        setMotionTestStatus('cancelled');
        setMotionTestStepPhase(null);
        setMotionTestMessage('');
        setMotionTestCountdownSec(null);
      }
    }
  };

  const canCalibrate =
    runtimeReady &&
    trackingEnabled &&
    (status === 'active' || status === 'lost') &&
    calibrationStatus !== 'running' &&
    motionTestStatus !== 'running';

  const canMotionTest =
    runtimeReady &&
    trackingEnabled &&
    (status === 'active' || status === 'lost') &&
    calibrationStatus !== 'running' &&
    motionTestStatus !== 'running';

  const beginMotionTestStep = useCallback((stepIndex: number) => {
    setMotionTestStepIndex(stepIndex);
    setMotionTestStepPhase('armed');
    motionTestStepPeaksRef.current = [];
    setMotionTestStepPeaks([]);
    setMotionTestCountdownSec(null);
    motionTestHoldAccRef.current = createLiveActMotionTestHoldAcc();
    motionTestHoldFramesRef.current = 0;
    motionTestHoldLastSequenceRef.current = null;
    setMotionTestMessage(liveActMotionTestStepPrompt(stepIndex));
  }, []);

  const startMotionTest = useCallback(() => {
    if (!canMotionTest) return;
    motionTestPeaksRef.current = createLiveActDiagnosticsPeaks();
    motionTestStepResultsRef.current = [];
    setMotionTestPeakFrames(0);
    setMotionTestStatus('running');
    beginMotionTestStep(0);
  }, [beginMotionTestStep, canMotionTest]);

  const startMotionTestHold = useCallback(() => {
    if (motionTestStatusRef.current !== 'running') return;
    if (motionTestStepPhaseRef.current !== 'armed') return;
    motionTestHoldAccRef.current = createLiveActMotionTestHoldAcc();
    motionTestHoldFramesRef.current = 0;
    motionTestHoldLastSequenceRef.current = null;
    motionTestHoldStartedAtRef.current =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    motionTestStepPeaksRef.current = [];
    setMotionTestStepPeaks([]);
    setMotionTestStepPhase('holding');
    setMotionTestCountdownSec(Math.ceil(liveActMotionTestHoldMs(motionTestStepIndexRef.current) / 1000));
  }, []);

  const retryMotionTestHold = useCallback(() => {
    if (motionTestStatusRef.current !== 'running') return;
    if (motionTestStepPhaseRef.current !== 'review') return;
    beginMotionTestStep(motionTestStepIndexRef.current);
  }, [beginMotionTestStep]);

  const advanceMotionTest = useCallback(() => {
    if (motionTestStatusRef.current !== 'running') return;
    if (motionTestStepPhaseRef.current !== 'review') return;
    const stepIndex = motionTestStepIndexRef.current;
    const step = LIVEACT_MOTION_TEST_STEPS[stepIndex];
    if (step) {
      motionTestStepResultsRef.current = [
        ...motionTestStepResultsRef.current,
        {
          id: step.id,
          labelDe: step.labelDe,
          holdMs: step.holdMs,
          peaks: [...motionTestStepPeaksRef.current],
        },
      ];
    }
    const next = stepIndex + 1;
    if (next >= LIVEACT_MOTION_TEST_STEPS.length) {
      setMotionTestStatus('success');
      setMotionTestStepPhase(null);
      setMotionTestCountdownSec(null);
      setMotionTestMessage('Motion Test fertig — Messwerte kopieren.');
      return;
    }
    beginMotionTestStep(next);
  }, [beginMotionTestStep]);
  const calibrateNeutral = useCallback(async () => {
    if (!canCalibrate) return;
    const engine = engineRef.current;
    if (!engine) return;
    calibrationPeaksRef.current = createLiveActDiagnosticsPeaks();
    setCalibrationPeakFrames(0);
    await engine.calibrate();
  }, [canCalibrate]);

  const advanceCalibration = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.advanceCalibration();
  }, []);

  const startCalibrationHold = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.startCalibrationHold();
  }, []);

  const retryCalibrationHold = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.retryCalibrationHold();
  }, []);

  const getCalibrationAuditJson = useCallback((): string => {
    const engine = engineRef.current;
    const peaks = exportLiveActDiagnosticsPeaks(calibrationPeaksRef.current);
    return JSON.stringify(
      {
        ...peaks,
        rangeGains: engine?.getRangeCalibration()?.gain ?? null,
        hasNeutralBaseline: Boolean(engine?.getState().hasNeutralBaseline),
        hasRangeCalibration: Boolean(engine?.getState().hasRangeCalibration),
      },
      null,
      2,
    );
  }, []);

  const getMotionTestAuditJson = useCallback((): string => {
    const engine = engineRef.current;
    return JSON.stringify(
      buildLiveActMotionTestExport({
        stepResults: motionTestStepResultsRef.current,
        sessionPeaks: motionTestPeaksRef.current,
        hasNeutralBaseline: Boolean(engine?.getState().hasNeutralBaseline),
        hasRangeCalibration: Boolean(engine?.getState().hasRangeCalibration),
      }),
      null,
      2,
    );
  }, []);

  const canCopyCalibrationAudit =
    calibrationPeakFrames > 0 && calibrationStatus !== 'running';

  const canCopyMotionTestAudit =
    motionTestPeakFrames > 0 && motionTestStatus !== 'running';

  const canStartMotionTestHold =
    motionTestStatus === 'running' && motionTestStepPhase === 'armed';
  const canRetryMotionTestHold =
    motionTestStatus === 'running' && motionTestStepPhase === 'review';
  const canAdvanceMotionTest =
    motionTestStatus === 'running' && motionTestStepPhase === 'review';
  const motionTestAdvanceLabelDe =
    motionTestStatus === 'running' && motionTestStepPhase === 'review'
      ? liveActMotionTestAdvanceLabelDe(motionTestStepIndex)
      : null;

  return {
    trackingEnabled,
    setTrackingEnabled,
    cameraPreviewEnabled,
    setCameraPreviewEnabled,
    faceOverlayEnabled,
    setFaceOverlayEnabled,
    faceOverlayFullDetail,
    setFaceOverlayFullDetail,
    metricsEnabled,
    setMetricsEnabled,
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
    hasRangeCalibration,
    canCalibrate,
    canAdvanceCalibration,
    calibrationAdvanceLabelDe,
    calibrationCountdownSec,
    calibrationStepPhase,
    canStartCalibrationHold,
    canRetryCalibrationHold,
    calibrationStepPeaks,
    calibrateNeutral,
    advanceCalibration,
    startCalibrationHold,
    retryCalibrationHold,
    calibrationPeakFrames,
    canCopyCalibrationAudit,
    getCalibrationAuditJson,
    canMotionTest,
    motionTestStatus,
    motionTestMessage,
    motionTestStepPhase,
    motionTestCountdownSec,
    motionTestStepPeaks,
    motionTestStepIndex,
    canStartMotionTestHold,
    canRetryMotionTestHold,
    canAdvanceMotionTest,
    motionTestAdvanceLabelDe,
    startMotionTest,
    startMotionTestHold,
    retryMotionTestHold,
    advanceMotionTest,
    motionTestPeakFrames,
    canCopyMotionTestAudit,
    getMotionTestAuditJson,
    composedCapabilities,
    diagnosticsRef,
    diagnosticsV2Ref,
    characterFaceDebugHandleRef,
    engineRef,
  };
}
