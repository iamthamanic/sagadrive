/**
 * LiveActEngine — local webcam/MediaPipe performance-capture core (#329, #331).
 * Location: src/infrastructure/character/liveact/liveact-engine.ts
 *
 * Wraps the shared MediaPipe face source. At most one active camera/detector.
 * Legacy AvatarFaceTrackingRuntime is compatibility-only (no productive canvas consumer).
 * RAW is the tracker's anatomical sample; everything from MAPPED on (calibration included) is in
 * avatar orientation (LIVEACT_MIRROR_AVATAR).
 */

import {
  DEFAULT_LIVEACT_LIMITS,
  LIVEACT_CALIBRATION_FRAME_TARGET,
  LIVEACT_CALIBRATION_TIMEOUT_MS,
  LIVEACT_MIRROR_AVATAR,
  LIVEACT_RANGE_CALIBRATION_STEPS,
  LIVEACT_RANGE_STEP_MIN_FRAMES,
  LIVEACT_RANGE_STEP_MIN_MS,
  assertLiveActFrameLocalOnly,
  applyLiveActRetargetProfile,
  DEFAULT_LIVEACT_RETARGET_PROFILE,
  assertLiveActDiagnosticsV2LocalOnly,
  createEmptyLiveActFaceDiagnosticsFrame,
  createEmptyLiveActSourceSample,
  createLiveActCalibrationAccumulator,
  createLiveActDiagnosticsV2Snapshot,
  createLiveActInputCapabilities,
  createLiveActRangeCalibrationAccumulator,
  createNeutralLiveActFrame,
  createUnavailableLiveActAppliedValues,
  finalizeLiveActCalibration,
  finalizeLiveActRangeCalibration,
  liveActNeutralCalibrationPrompt,
  liveActRangeCalibrationStepPrompt,
  liveActRangeStepChannels,
  liveActRangeStepHoldMs,
  liveActStatusLabelDe,
  mapLiveActSourceSample,
  mirrorLiveActSourceSample,
  pushLiveActCalibrationSample,
  pushLiveActRangeCalibrationSample,
  resolveLiveActQualityProfile,
  selectPrimaryLiveActFaceIndex,
  shouldDropLiveActInferenceTick,
  shouldThrottleLiveActUiStatus,
  snapshotLiveActDiagnosticsV2FromFrame,
  snapshotLiveActDiagnosticsV2FromSample,
  stepLiveActCalibratedFrame,
  type LiveActCalibratedStepV1,
  type LiveActCalibrationAccumulator,
  type LiveActCalibrationStepPeakV1,
  type LiveActDiagnosticsV2Snapshot,
  type LiveActFaceDiagnosticsFrameV1,
  type LiveActFaceChannelId,
  type LiveActFrameV1,
  type LiveActInputCapabilities,
  type LiveActLimits,
  type LiveActNeutralBaselineV1,
  type LiveActQualityProfile,
  type LiveActRangeCalibrationAccumulator,
  type LiveActRangeCalibrationV1,
  type LiveActRangeStepPhase,
  type LiveActRetargetProfileV1,
  type LiveActSourceSample,
  type LiveActStatus,
} from '../../../domains/character/liveact';
import type { LiveActAvatarOutput } from './liveact-avatar-output';
import {
  createMediaPipeLiveActFaceSource,
  type LiveActFaceSource,
  type LiveActFaceSourceFactory,
} from './mediapipe-face-source';
import { claimLiveActCamera, releaseLiveActCamera } from './liveact-camera-claim';

export type LiveActCalibrationStatus = 'idle' | 'running' | 'success' | 'failed';

export interface LiveActCalibrationResult {
  ok: boolean;
  messageDe: string;
}

export interface LiveActEngineState {
  status: LiveActStatus;
  message: string;
  frame: LiveActFrameV1 | null;
  fpsCap: number;
  qualityProfileId: LiveActQualityProfile['id'];
  qualityProfileLabelDe: string;
  calibrationStatus: LiveActCalibrationStatus;
  calibrationMessage: string;
  hasNeutralBaseline: boolean;
  /** Max pass succeeded — at least one face channel carries a range gain. */
  hasRangeCalibration: boolean;
  /** True while review phase — Weiter / Fertig unlocked. */
  canAdvanceCalibration: boolean;
  /** Label for the advance control while in review; null otherwise. */
  calibrationAdvanceLabelDe: 'Weiter' | 'Fertig' | null;
  /** armed = wait for Start; holding = countdown; review = show peaks. Null outside range steps. */
  calibrationStepPhase: LiveActRangeStepPhase | null;
  /** True when Start is available for the current expression. */
  canStartCalibrationHold: boolean;
  /** True when Wiederholen is available (review). */
  canRetryCalibrationHold: boolean;
  /** Peak RAW values for the focus channels of the current step (after hold). */
  calibrationStepPeaks: readonly LiveActCalibrationStepPeakV1[];
  /**
   * Whole seconds left in the current hold (neutral or holding). Null when not counting down.
   */
  calibrationCountdownSec: number | null;
  /** Inference ticks dropped due to in-flight backpressure (UI-throttled metric). */
  droppedInferenceFrames: number;
}

export type LiveActStatusListener = (state: LiveActEngineState) => void;
export type LiveActFrameListener = (frame: LiveActFrameV1) => void;
export type LiveActDiagnosticsListener = (frame: LiveActFaceDiagnosticsFrameV1) => void;
export type LiveActDiagnosticsV2Listener = (snapshot: LiveActDiagnosticsV2Snapshot) => void;

function isMobileHint(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Mobi|Android/i.test(navigator.userAgent) || (navigator.maxTouchPoints ?? 0) > 1;
}

/** At most one live LiveAct camera/detector app-wide. */
let activeLiveActEngine: LiveActEngine | null = null;

export function getActiveLiveActEngine(): LiveActEngine | null {
  return activeLiveActEngine;
}

export class LiveActEngine {
  private status: LiveActStatus = 'idle';
  private message = liveActStatusLabelDe('idle');
  private stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;
  private source: LiveActFaceSource | null = null;
  private raf = 0;
  private lastFrameAt = 0;
  private frame: LiveActFrameV1 | null = null;
  private pipelineStep: LiveActCalibratedStepV1 | null = null;
  private sequence = 0;
  private disposed = false;
  private visibilityHandler: (() => void) | null = null;
  private readonly limits: LiveActLimits;
  private readonly qualityProfile: LiveActQualityProfile;
  private readonly fpsCap: number;
  private output: LiveActAvatarOutput | null = null;
  private readonly statusListeners = new Set<LiveActStatusListener>();
  private readonly frameListeners = new Set<LiveActFrameListener>();
  private readonly diagnosticsListeners = new Set<LiveActDiagnosticsListener>();
  private readonly diagnosticsV2Listeners = new Set<LiveActDiagnosticsV2Listener>();
  private diagnosticsV2: LiveActDiagnosticsV2Snapshot | null = null;
  private neutralBaseline: LiveActNeutralBaselineV1 | null = null;
  private rangeCalibration: LiveActRangeCalibrationV1 | null = null;
  private calibrating = false;
  private calibrationPhase: 'neutral' | 'range' = 'neutral';
  private calibrationAccumulator: LiveActCalibrationAccumulator = createLiveActCalibrationAccumulator();
  private rangeAccumulator: LiveActRangeCalibrationAccumulator =
    createLiveActRangeCalibrationAccumulator();
  /** Index into LIVEACT_RANGE_CALIBRATION_STEPS while phase === 'range'. */
  private rangeStepIndex = 0;
  private rangeStepStartedAtMs = 0;
  private rangeStepFrameCount = 0;
  private rangeStepHoldMs: number = LIVEACT_RANGE_STEP_MIN_MS;
  private rangeStepPhase: LiveActRangeStepPhase = 'armed';
  private rangeStepPeakMax: Partial<Record<LiveActFaceChannelId, number>> = {};
  private rangeStepPeaks: LiveActCalibrationStepPeakV1[] = [];
  private lastEmittedCountdownSec: number | null = null;
  private calibrationStartedAtMs = 0;
  private calibrationResolve: ((result: LiveActCalibrationResult) => void) | null = null;
  private calibrationStatus: LiveActCalibrationStatus = 'idle';
  private calibrationMessage = '';
  private canAdvanceCalibration = false;
  private startGeneration = 0;
  private inferenceInFlight = 0;
  private droppedInferenceFrames = 0;
  private lastStatusEmitMs = 0;
  private pendingStatusCoalesce = false;
  private statusCoalesceTimer: ReturnType<typeof setTimeout> | null = null;
  private preferredDeviceId: string | undefined;
  private deviceChangeHandler: (() => void) | null = null;
  private retargetProfile: LiveActRetargetProfileV1 = DEFAULT_LIVEACT_RETARGET_PROFILE;

  constructor(
    private readonly sourceFactory: LiveActFaceSourceFactory = async (profile) => {
      const source = await createMediaPipeLiveActFaceSource(profile);
      if (!source) {
        throw new Error('unsupported');
      }
      return source;
    },
    limits: LiveActLimits = DEFAULT_LIVEACT_LIMITS,
  ) {
    this.limits = limits;
    this.qualityProfile = resolveLiveActQualityProfile({
      isMobile: isMobileHint(),
      maxTouchPoints: typeof navigator !== 'undefined' ? navigator.maxTouchPoints : 0,
      limits,
    });
    this.fpsCap = this.qualityProfile.fpsCap;
    this.emitStatus(true);
  }

  bindOutput(output: LiveActAvatarOutput | null): void {
    this.output = output;
    // Model swap must not leak prior applied values into the next adapter generation.
    if (!output) {
      this.diagnosticsV2 = null;
    }
  }

  /** First-party retarget profile (identity by default; no filename-based selection). */
  setRetargetProfile(profile: LiveActRetargetProfileV1 | null | undefined): void {
    this.retargetProfile = profile ?? DEFAULT_LIVEACT_RETARGET_PROFILE;
  }

  subscribeStatus(listener: LiveActStatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.getState());
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  subscribeFrame(listener: LiveActFrameListener): () => void {
    this.frameListeners.add(listener);
    if (this.frame) listener(this.frame);
    return () => {
      this.frameListeners.delete(listener);
    };
  }

  subscribeDiagnostics(listener: LiveActDiagnosticsListener): () => void {
    this.diagnosticsListeners.add(listener);
    return () => {
      this.diagnosticsListeners.delete(listener);
    };
  }

  /** Diagnostics V2 stage trace (#397) — ref-friendly; no hot-path React state. */
  subscribeDiagnosticsV2(listener: LiveActDiagnosticsV2Listener): () => void {
    this.diagnosticsV2Listeners.add(listener);
    if (this.diagnosticsV2) listener(this.diagnosticsV2);
    return () => {
      this.diagnosticsV2Listeners.delete(listener);
    };
  }

  getDiagnosticsV2(): LiveActDiagnosticsV2Snapshot | null {
    return this.diagnosticsV2;
  }

  /** Session range gains from the last successful max pass; null until then. */
  getRangeCalibration(): LiveActRangeCalibrationV1 | null {
    return this.rangeCalibration;
  }

  getState(): LiveActEngineState {
    return {
      status: this.status,
      message: this.message,
      frame: this.frame,
      fpsCap: this.fpsCap,
      qualityProfileId: this.qualityProfile.id,
      qualityProfileLabelDe: this.qualityProfile.labelDe,
      calibrationStatus: this.calibrationStatus,
      calibrationMessage: this.calibrationMessage,
      hasNeutralBaseline: this.neutralBaseline !== null,
      hasRangeCalibration: this.rangeCalibration !== null,
      canAdvanceCalibration: this.computeCanAdvanceCalibration(),
      calibrationAdvanceLabelDe: this.computeCalibrationAdvanceLabel(),
      calibrationStepPhase:
        this.calibrating && this.calibrationPhase === 'range' ? this.rangeStepPhase : null,
      canStartCalibrationHold: this.computeCanStartCalibrationHold(),
      canRetryCalibrationHold: this.computeCanRetryCalibrationHold(),
      calibrationStepPeaks: this.rangeStepPeaks,
      calibrationCountdownSec: this.computeCalibrationCountdownSec(),
      droppedInferenceFrames: this.droppedInferenceFrames,
    };
  }

  /** Switch active camera device without releasing the global claim. */
  async switchCameraDevice(deviceId: string | undefined): Promise<void> {
    if (this.disposed) return;
    const sameDevice =
      deviceId === this.preferredDeviceId &&
      Boolean(this.stream?.getVideoTracks().some((track) => track.readyState === 'live'));
    if (sameDevice) return;
    this.preferredDeviceId = deviceId;
    if (this.status !== 'active' && this.status !== 'lost' && this.status !== 'paused') {
      return;
    }
    const gen = this.startGeneration;
    await this.reopenCameraStream(gen);
  }

  getQualityProfile(): LiveActQualityProfile {
    return this.qualityProfile;
  }

  /**
   * Engine/face-source input support only (#381) — never derived from avatar mesh.
   * Available before tracking starts (quality profile); face always true for MediaPipe Face.
   */
  getInputCapabilities(): LiveActInputCapabilities {
    return createLiveActInputCapabilities({
      face: true,
      headPose: this.qualityProfile.enableHeadPose,
      eyeGaze: true,
    });
  }

  /** Preview video element while tracking (engine remains stream owner). */
  getPreviewVideo(): HTMLVideoElement | null {
    return this.video;
  }

  /**
   * Step 1: 30 valid neutral frames within 2 s (on failure the previous calibration is kept).
   * Then one max-pass expression at a time; the user advances with {@link advanceCalibration}.
   */
  calibrate(): Promise<LiveActCalibrationResult> {
    if (this.disposed) {
      return Promise.resolve({
        ok: false,
        messageDe: 'LiveAct ist nicht verfügbar.',
      });
    }
    if (this.status !== 'active' && this.status !== 'lost') {
      return Promise.resolve({
        ok: false,
        messageDe: 'Kalibrierung erfordert aktives Tracking.',
      });
    }
    if (this.calibrating) {
      return Promise.resolve({
        ok: false,
        messageDe: 'Kalibrierung läuft bereits.',
      });
    }

    return new Promise((resolve) => {
      this.calibrating = true;
      this.calibrationPhase = 'neutral';
      this.canAdvanceCalibration = false;
      this.rangeStepIndex = 0;
      this.rangeStepFrameCount = 0;
      this.rangeStepPhase = 'armed';
      this.rangeStepPeaks = [];
      this.rangeStepPeakMax = {};
      this.lastEmittedCountdownSec = Math.ceil(LIVEACT_CALIBRATION_TIMEOUT_MS / 1000);
      this.calibrationAccumulator = createLiveActCalibrationAccumulator();
      this.calibrationStartedAtMs =
        typeof performance !== 'undefined' ? performance.now() : Date.now();
      this.calibrationResolve = resolve;
      this.setCalibrationUi('running', liveActNeutralCalibrationPrompt());
      this.emitStatus(true);
    });
  }

  /** Begin the countdown/hold for the current armed expression. */
  startCalibrationHold(): void {
    if (!this.computeCanStartCalibrationHold()) return;
    this.rangeStepPhase = 'holding';
    this.rangeStepFrameCount = 0;
    this.rangeStepPeakMax = {};
    this.rangeStepPeaks = [];
    this.canAdvanceCalibration = false;
    this.rangeStepStartedAtMs =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.lastEmittedCountdownSec = Math.ceil(this.rangeStepHoldMs / 1000);
    this.emitStatus(true);
  }

  /** Discard the last hold and wait for Start again. */
  retryCalibrationHold(): void {
    if (!this.computeCanRetryCalibrationHold()) return;
    this.beginRangeStep(this.rangeStepIndex);
    this.emitStatus(true);
  }

  /**
   * Advance from review to the next expression, or finish after the last.
   * No-op until the hold is complete and reviewed.
   */
  advanceCalibration(): void {
    if (!this.calibrating || this.calibrationPhase !== 'range') return;
    if (!this.computeCanAdvanceCalibration()) return;
    const next = this.rangeStepIndex + 1;
    if (next >= LIVEACT_RANGE_CALIBRATION_STEPS.length) {
      this.completeRangeCalibration();
      return;
    }
    this.beginRangeStep(next);
    this.emitStatus(true);
  }

  /** Explicit user action only — never auto-start on construct/reload. */
  async start(deviceId?: string): Promise<void> {
    if (this.disposed) return;
    if (this.status === 'active' || this.status === 'starting') return;

    if (typeof deviceId === 'string' && deviceId.length > 0) {
      this.preferredDeviceId = deviceId;
    }

    const generation = ++this.startGeneration;

    if (activeLiveActEngine && activeLiveActEngine !== this) {
      activeLiveActEngine.stop();
    }
    claimLiveActCamera(this);
    activeLiveActEngine = this;

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      this.setStatus('unsupported', liveActStatusLabelDe('unsupported'));
      this.releaseActiveClaim();
      return;
    }

    this.setStatus('starting', liveActStatusLabelDe('starting'));

    try {
      this.stream = await this.openCameraStream();
    } catch (error) {
      if (generation !== this.startGeneration) {
        return;
      }
      const name = error instanceof DOMException ? error.name : '';
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        this.setStatus('denied', liveActStatusLabelDe('denied'));
        this.releaseActiveClaim();
        return;
      }
      if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        this.setStatus('unsupported', 'Keine Kamera gefunden.');
        this.releaseActiveClaim();
        return;
      }
      this.setStatus('error', liveActStatusLabelDe('error'));
      this.releaseActiveClaim();
      return;
    }

    if (this.disposed || activeLiveActEngine !== this || generation !== this.startGeneration) {
      this.cleanupMedia();
      return;
    }

    try {
      this.source = await this.sourceFactory(this.qualityProfile);
    } catch {
      this.cleanupMedia();
      this.setStatus('unsupported', liveActStatusLabelDe('unsupported'));
      this.releaseActiveClaim();
      return;
    }

    if (
      this.disposed ||
      activeLiveActEngine !== this ||
      generation !== this.startGeneration
    ) {
      this.cleanupMedia();
      return;
    }

    this.video = document.createElement('video');
    this.video.muted = true;
    this.video.playsInline = true;
    this.video.autoplay = true;
    this.video.srcObject = this.stream;
    await this.video.play().catch(() => undefined);

    if (generation !== this.startGeneration) {
      this.cleanupMedia();
      return;
    }

    this.attachRuntimeListeners();

    this.setStatus('active', liveActStatusLabelDe('active'));
    this.lastFrameAt = 0;
    this.droppedInferenceFrames = 0;
    this.loop();
  }

  stop(): void {
    if (this.disposed) return;
    this.startGeneration += 1;
    this.cancelCalibration('LiveAct gestoppt.');
    this.cancelLoop();
    this.cleanupMedia();
    this.frame = null;
    this.pipelineStep = null;
    this.diagnosticsV2 = null;
    this.output?.resetLiveActPose();
    this.releaseActiveClaim();
    this.setStatus('stopped', liveActStatusLabelDe('stopped'));
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.startGeneration += 1;
    this.cancelCalibration('LiveAct beendet.');
    this.neutralBaseline = null;
    this.rangeCalibration = null;
    this.cancelLoop();
    this.cleanupMedia();
    this.frame = null;
    this.pipelineStep = null;
    this.diagnosticsV2 = null;
    this.output = null;
    this.statusListeners.clear();
    this.frameListeners.clear();
    this.diagnosticsListeners.clear();
    this.diagnosticsV2Listeners.clear();
    this.releaseActiveClaim();
    this.setStatus('idle', liveActStatusLabelDe('idle'));
    this.setCalibrationUi('idle', '');
  }

  /** Test helper: push one sample through map/smooth without camera. */
  ingestSampleForTests(sample: LiveActSourceSample, timestampMs = 0): LiveActFrameV1 {
    return this.processSample(sample, timestampMs, null);
  }

  private releaseActiveClaim(): void {
    if (activeLiveActEngine === this) {
      activeLiveActEngine = null;
    }
    releaseLiveActCamera(this);
  }

  private loop = (): void => {
    if (this.disposed || this.status === 'stopped' || this.status === 'idle') return;
    this.raf = requestAnimationFrame(this.loop);

    if (this.status === 'paused') return;
    const video = this.video;
    const source = this.source;
    if (!video || !source || video.readyState < 2) return;

    const now = performance.now();
    const minDelta = 1000 / Math.max(1, this.fpsCap);
    if (now - this.lastFrameAt < minDelta) return;
    this.lastFrameAt = now;

    if (shouldDropLiveActInferenceTick(this.inferenceInFlight)) {
      this.droppedInferenceFrames += 1;
      this.scheduleCoalescedStatusEmit();
      return;
    }

    this.inferenceInFlight += 1;
    let detect;
    try {
      detect = source.detect(video, now);
    } catch (error) {
      console.warn('[liveact] detect failed', error);
      this.setStatus('error', liveActStatusLabelDe('error'));
      this.stop();
      return;
    } finally {
      this.inferenceInFlight = Math.max(0, this.inferenceInFlight - 1);
    }

    const primary = selectPrimaryLiveActFaceIndex(detect.samples);
    const sample =
      primary >= 0
        ? { ...detect.samples[primary], faceIndex: primary, faceCount: detect.samples.length }
        : createEmptyLiveActSourceSample();

    const diagnosticsRaw =
      primary >= 0 && detect.diagnostics[primary]
        ? detect.diagnostics[primary]
        : createEmptyLiveActFaceDiagnosticsFrame({ timestampMs: now, sequence: this.sequence + 1 });

    this.processSample(sample, now, diagnosticsRaw);
  };

  private processSample(
    sample: LiveActSourceSample,
    timestampMs: number,
    diagnosticsSeed: LiveActFaceDiagnosticsFrameV1 | null,
  ): LiveActFrameV1 {
    this.sequence += 1;
    const oriented = LIVEACT_MIRROR_AVATAR ? mirrorLiveActSourceSample(sample) : sample;
    const mapped = mapLiveActSourceSample(oriented, {
      timestampMs,
      sequence: this.sequence,
      limits: this.limits,
    });

    this.tickCalibration(oriented);

    const step = stepLiveActCalibratedFrame(
      this.pipelineStep,
      mapped,
      { neutral: this.neutralBaseline, range: this.rangeCalibration },
      this.limits,
    );
    this.pipelineStep = step;
    const { smoothed, calibrated } = step;
    assertLiveActFrameLocalOnly(calibrated);
    this.frame = calibrated;
    const retargeted = applyLiveActRetargetProfile(calibrated, this.retargetProfile);
    this.output?.applyLiveActFrame(retargeted);
    this.emitFrame(calibrated);

    const applied = this.output
      ? this.output.getAppliedDiagnostics()
      : createUnavailableLiveActAppliedValues();

    const diagnosticsV2 = createLiveActDiagnosticsV2Snapshot({
      timestampMs,
      sequence: this.sequence,
      trackingLost: mapped.trackingLost,
      raw: snapshotLiveActDiagnosticsV2FromSample(sample),
      mapped: snapshotLiveActDiagnosticsV2FromFrame(mapped),
      smoothed: snapshotLiveActDiagnosticsV2FromFrame(smoothed),
      calibrated: snapshotLiveActDiagnosticsV2FromFrame(calibrated),
      retargeted: snapshotLiveActDiagnosticsV2FromFrame(retargeted),
      applied,
    });
    assertLiveActDiagnosticsV2LocalOnly(diagnosticsV2);
    this.diagnosticsV2 = diagnosticsV2;
    this.emitDiagnosticsV2(diagnosticsV2);

    const diagnostics: LiveActFaceDiagnosticsFrameV1 = diagnosticsSeed
      ? {
          ...diagnosticsSeed,
          timestampMs,
          sequence: this.sequence,
          trackingLost: mapped.trackingLost,
          faceIndex: sample.faceIndex,
          faceCount: sample.faceCount,
        }
      : createEmptyLiveActFaceDiagnosticsFrame({
          timestampMs,
          sequence: this.sequence,
        });
    this.emitDiagnostics(diagnostics);

    if (mapped.trackingLost) {
      if (this.status !== 'lost') this.setStatus('lost', liveActStatusLabelDe('lost'));
    } else if (this.status === 'lost') {
      this.setStatus('active', liveActStatusLabelDe('active'));
    } else {
      this.emitStatus(false);
    }

    return calibrated;
  }

  private async openCameraStream(): Promise<MediaStream> {
    const videoConstraints: MediaTrackConstraints = {
      facingMode: 'user',
      width: { ideal: 640 },
      height: { ideal: 480 },
      frameRate: { ideal: this.fpsCap, max: this.fpsCap },
    };
    if (this.preferredDeviceId) {
      videoConstraints.deviceId = { exact: this.preferredDeviceId };
      delete videoConstraints.facingMode;
    }
    return navigator.mediaDevices.getUserMedia({
      audio: false,
      video: videoConstraints,
    });
  }

  private async reopenCameraStream(generation: number): Promise<void> {
    this.cleanupStreamOnly();
    if (generation !== this.startGeneration || this.disposed) return;
    try {
      this.stream = await this.openCameraStream();
    } catch {
      this.setStatus('unsupported', 'Kamera nicht verfügbar.');
      this.stop();
      return;
    }
    if (generation !== this.startGeneration || this.disposed) {
      this.cleanupStreamOnly();
      return;
    }
    this.video = document.createElement('video');
    this.video.muted = true;
    this.video.playsInline = true;
    this.video.autoplay = true;
    this.video.srcObject = this.stream;
    await this.video.play().catch(() => undefined);
    if (generation !== this.startGeneration) {
      this.cleanupStreamOnly();
    }
  }

  private attachRuntimeListeners(): void {
    if (typeof document !== 'undefined' && !this.visibilityHandler) {
      this.visibilityHandler = () => {
        if (typeof document === 'undefined') return;
        if (document.visibilityState === 'hidden') {
          if (this.status === 'active') {
            this.setStatus('paused', liveActStatusLabelDe('paused'));
          }
        } else if (this.status === 'paused') {
          this.setStatus('active', liveActStatusLabelDe('active'));
        }
      };
      document.addEventListener('visibilitychange', this.visibilityHandler);
    }
    if (typeof navigator !== 'undefined' && navigator.mediaDevices && !this.deviceChangeHandler) {
      this.deviceChangeHandler = () => {
        if (this.status !== 'active' && this.status !== 'lost' && this.status !== 'paused') {
          return;
        }
        void this.switchCameraDevice(this.preferredDeviceId);
      };
      navigator.mediaDevices.addEventListener('devicechange', this.deviceChangeHandler);
    }
  }

  private cleanupStreamOnly(): void {
    if (this.video) {
      this.video.pause();
      this.video.srcObject = null;
      this.video = null;
    }
    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        track.stop();
      }
      this.stream = null;
    }
  }

  private tickCalibration(sample: LiveActSourceSample): void {
    if (!this.calibrating) return;

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (this.calibrationPhase === 'range') {
      this.tickRangeCalibration(sample, now);
      return;
    }
    this.emitCountdownIfChanged();
    if (now - this.calibrationStartedAtMs > LIVEACT_CALIBRATION_TIMEOUT_MS) {
      this.failCalibration('Kalibrierung fehlgeschlagen — zu wenig gültige Frames.');
      return;
    }

    const pushed = pushLiveActCalibrationSample(this.calibrationAccumulator, sample, {
      headPoseSupported: this.qualityProfile.enableHeadPose,
      limits: this.limits,
    });
    if (!pushed) {
      this.failCalibration('Gesicht verloren — Kalibrierung abgebrochen.');
      return;
    }
    if (this.calibrationAccumulator.count >= LIVEACT_CALIBRATION_FRAME_TARGET) {
      this.completeCalibration();
    }
  }

  private completeCalibration(): void {
    const next = finalizeLiveActCalibration(this.calibrationAccumulator);
    if (!next) {
      this.failCalibration('Kalibrierung fehlgeschlagen.');
      return;
    }
    this.neutralBaseline = next;
    // Range gains are spans above the neutral pose — a new baseline invalidates them.
    this.rangeCalibration = null;
    this.calibrationPhase = 'range';
    this.rangeAccumulator = createLiveActRangeCalibrationAccumulator();
    this.beginRangeStep(0);
    this.emitStatus(true);
  }

  private beginRangeStep(stepIndex: number): void {
    this.rangeStepIndex = stepIndex;
    this.rangeStepFrameCount = 0;
    this.canAdvanceCalibration = false;
    this.rangeStepHoldMs = liveActRangeStepHoldMs(stepIndex);
    this.rangeStepPhase = 'armed';
    this.rangeStepPeakMax = {};
    this.rangeStepPeaks = [];
    this.lastEmittedCountdownSec = null;
    this.setCalibrationUi('running', liveActRangeCalibrationStepPrompt(stepIndex));
  }

  private computeCanStartCalibrationHold(): boolean {
    return (
      this.calibrating &&
      this.calibrationPhase === 'range' &&
      this.rangeStepPhase === 'armed'
    );
  }

  private computeCanRetryCalibrationHold(): boolean {
    return (
      this.calibrating &&
      this.calibrationPhase === 'range' &&
      this.rangeStepPhase === 'review'
    );
  }

  private computeCanAdvanceCalibration(): boolean {
    return (
      this.calibrating &&
      this.calibrationPhase === 'range' &&
      this.rangeStepPhase === 'review'
    );
  }

  private computeCalibrationAdvanceLabel(): 'Weiter' | 'Fertig' | null {
    if (!this.computeCanAdvanceCalibration()) return null;
    return this.rangeStepIndex >= LIVEACT_RANGE_CALIBRATION_STEPS.length - 1
      ? 'Fertig'
      : 'Weiter';
  }

  private computeCalibrationCountdownSec(): number | null {
    if (!this.calibrating || this.calibrationStatus !== 'running') return null;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (this.calibrationPhase === 'neutral') {
      const remaining = LIVEACT_CALIBRATION_TIMEOUT_MS - (now - this.calibrationStartedAtMs);
      return Math.max(0, Math.ceil(remaining / 1000));
    }
    if (this.rangeStepPhase !== 'holding') return null;
    const remaining = this.rangeStepHoldMs - (now - this.rangeStepStartedAtMs);
    return Math.max(0, Math.ceil(remaining / 1000));
  }

  private emitCountdownIfChanged(): void {
    const sec = this.computeCalibrationCountdownSec();
    if (sec === this.lastEmittedCountdownSec) return;
    this.lastEmittedCountdownSec = sec;
    this.emitStatus(true);
  }

  private tickRangeCalibration(sample: LiveActSourceSample, now: number): void {
    if (this.rangeStepPhase !== 'holding') return;

    const pushed = pushLiveActRangeCalibrationSample(this.rangeAccumulator, sample, this.limits);
    if (pushed) {
      this.rangeStepFrameCount += 1;
      for (const channel of liveActRangeStepChannels(this.rangeStepIndex)) {
        const value = sample.face[channel];
        if (typeof value !== 'number' || !Number.isFinite(value)) continue;
        const prev = this.rangeStepPeakMax[channel] ?? 0;
        if (value > prev) this.rangeStepPeakMax[channel] = value;
      }
    }
    this.emitCountdownIfChanged();

    const holdDone =
      this.rangeStepFrameCount >= LIVEACT_RANGE_STEP_MIN_FRAMES &&
      now - this.rangeStepStartedAtMs >= this.rangeStepHoldMs;

    if (!holdDone) return;

    this.rangeStepPeaks = liveActRangeStepChannels(this.rangeStepIndex).map((channel) => ({
      channel,
      max: Math.round((this.rangeStepPeakMax[channel] ?? 0) * 1000) / 1000,
    }));
    this.rangeStepPhase = 'review';
    this.canAdvanceCalibration = true;
    this.lastEmittedCountdownSec = 0;
    this.emitStatus(true);
  }

  private completeRangeCalibration(): void {
    const baseline = this.neutralBaseline;
    const range = baseline
      ? finalizeLiveActRangeCalibration(this.rangeAccumulator, baseline)
      : null;
    this.rangeCalibration = range;
    this.calibrating = false;
    this.calibrationPhase = 'neutral';
    this.canAdvanceCalibration = false;
    this.rangeStepPhase = 'armed';
    this.rangeStepPeaks = [];
    this.lastEmittedCountdownSec = null;
    const resolve = this.calibrationResolve;
    this.calibrationResolve = null;
    const channelCount = range ? Object.keys(range.gain).length : 0;
    const messageDe = range
      ? `Kalibriert: Neutral + Maximal (${channelCount} Kanäle, nur diese Sitzung).`
      : 'Neutral gespeichert — Maximal-Schritt ohne genug Bewegung, Ausschlag bleibt 1:1.';
    if (!range) {
      console.warn('[liveact] range calibration skipped', {
        frames: this.rangeAccumulator.count,
      });
    }
    this.setCalibrationUi('success', messageDe);
    resolve?.({ ok: true, messageDe });
    this.emitStatus(true);
  }

  private failCalibration(messageDe: string): void {
    this.calibrating = false;
    this.calibrationPhase = 'neutral';
    this.canAdvanceCalibration = false;
    this.rangeStepPhase = 'armed';
    this.rangeStepPeaks = [];
    this.lastEmittedCountdownSec = null;
    const resolve = this.calibrationResolve;
    this.calibrationResolve = null;
    this.setCalibrationUi('failed', messageDe);
    resolve?.({ ok: false, messageDe });
    this.emitStatus(true);
  }

  private cancelCalibration(messageDe: string): void {
    if (!this.calibrating) return;
    this.calibrating = false;
    this.calibrationPhase = 'neutral';
    this.canAdvanceCalibration = false;
    this.rangeStepPhase = 'armed';
    this.rangeStepPeaks = [];
    this.lastEmittedCountdownSec = null;
    const resolve = this.calibrationResolve;
    this.calibrationResolve = null;
    this.setCalibrationUi('idle', messageDe);
    resolve?.({ ok: false, messageDe });
  }

  private setCalibrationUi(status: LiveActCalibrationStatus, message: string): void {
    this.calibrationStatus = status;
    this.calibrationMessage = message;
  }

  private cancelLoop(): void {
    if (this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
  }

  private cleanupMedia(): void {
    if (this.statusCoalesceTimer !== null) {
      clearTimeout(this.statusCoalesceTimer);
      this.statusCoalesceTimer = null;
    }
    this.pendingStatusCoalesce = false;
    if (this.visibilityHandler && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
    if (this.deviceChangeHandler && typeof navigator !== 'undefined' && navigator.mediaDevices) {
      navigator.mediaDevices.removeEventListener('devicechange', this.deviceChangeHandler);
      this.deviceChangeHandler = null;
    }
    try {
      this.source?.dispose();
    } catch {
      // ignore
    }
    this.source = null;
    this.cleanupStreamOnly();
    this.inferenceInFlight = 0;
  }

  private setStatus(status: LiveActStatus, message: string): void {
    this.status = status;
    this.message = message;
    this.emitStatus(true);
  }

  private scheduleCoalescedStatusEmit(): void {
    if (this.pendingStatusCoalesce || this.statusCoalesceTimer !== null) return;
    this.pendingStatusCoalesce = true;
    const delay = Math.max(50, 1000 / 5);
    this.statusCoalesceTimer = setTimeout(() => {
      this.statusCoalesceTimer = null;
      this.pendingStatusCoalesce = false;
      this.emitStatus(false);
    }, delay);
  }

  private emitStatus(force: boolean): void {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (!force && shouldThrottleLiveActUiStatus(this.lastStatusEmitMs, now)) {
      this.scheduleCoalescedStatusEmit();
      return;
    }
    this.lastStatusEmitMs = now;
    const state = this.getState();
    for (const listener of this.statusListeners) {
      listener(state);
    }
  }

  private emitFrame(frame: LiveActFrameV1): void {
    for (const listener of this.frameListeners) {
      listener(frame);
    }
  }

  private emitDiagnostics(frame: LiveActFaceDiagnosticsFrameV1): void {
    for (const listener of this.diagnosticsListeners) {
      listener(frame);
    }
  }

  private emitDiagnosticsV2(snapshot: LiveActDiagnosticsV2Snapshot): void {
    for (const listener of this.diagnosticsV2Listeners) {
      listener(snapshot);
    }
  }
}

/** Neutral empty frame helper for adapters that need a typed placeholder. */
export function createIdleLiveActFrame(): LiveActFrameV1 {
  return createNeutralLiveActFrame({ timestampMs: 0, sequence: 0, trackingLost: true });
}
