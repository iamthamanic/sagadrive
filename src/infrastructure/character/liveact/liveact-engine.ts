/**
 * LiveActEngine — local webcam/MediaPipe performance-capture core (#329).
 * Location: src/infrastructure/character/liveact/liveact-engine.ts
 *
 * Wraps the shared MediaPipe face source. At most one active camera/detector.
 * Legacy AvatarFaceTrackingRuntime remains a compatibility consumer path.
 */

import {
  DEFAULT_LIVEACT_LIMITS,
  assertLiveActFrameLocalOnly,
  createEmptyLiveActSourceSample,
  createNeutralLiveActFrame,
  liveActStatusLabelDe,
  mapLiveActSourceSample,
  resolveLiveActQualityProfile,
  selectPrimaryLiveActFaceIndex,
  smoothLiveActFrame,
  type LiveActFrameV1,
  type LiveActLimits,
  type LiveActQualityProfile,
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

export interface LiveActEngineState {
  status: LiveActStatus;
  message: string;
  frame: LiveActFrameV1 | null;
  fpsCap: number;
  qualityProfileId: LiveActQualityProfile['id'];
  qualityProfileLabelDe: string;
}

export type LiveActStatusListener = (state: LiveActEngineState) => void;
export type LiveActFrameListener = (frame: LiveActFrameV1) => void;

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
  private sequence = 0;
  private disposed = false;
  private visibilityHandler: (() => void) | null = null;
  private readonly limits: LiveActLimits;
  private readonly qualityProfile: LiveActQualityProfile;
  private readonly fpsCap: number;
  private output: LiveActAvatarOutput | null = null;
  private readonly statusListeners = new Set<LiveActStatusListener>();
  private readonly frameListeners = new Set<LiveActFrameListener>();

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
    this.emitStatus();
  }

  bindOutput(output: LiveActAvatarOutput | null): void {
    this.output = output;
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

  getState(): LiveActEngineState {
    return {
      status: this.status,
      message: this.message,
      frame: this.frame,
      fpsCap: this.fpsCap,
      qualityProfileId: this.qualityProfile.id,
      qualityProfileLabelDe: this.qualityProfile.labelDe,
    };
  }

  getQualityProfile(): LiveActQualityProfile {
    return this.qualityProfile;
  }

  /** Preview video element while tracking (engine remains stream owner). */
  getPreviewVideo(): HTMLVideoElement | null {
    return this.video;
  }

  /** Explicit user action only — never auto-start on construct/reload. */
  async start(): Promise<void> {
    if (this.disposed) return;
    if (this.status === 'active' || this.status === 'starting') return;

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
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: this.fpsCap, max: this.fpsCap },
        },
      });
    } catch (error) {
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

    if (this.disposed || activeLiveActEngine !== this) {
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

    if (this.disposed || activeLiveActEngine !== this) {
      this.cleanupMedia();
      return;
    }

    this.video = document.createElement('video');
    this.video.muted = true;
    this.video.playsInline = true;
    this.video.autoplay = true;
    this.video.srcObject = this.stream;
    await this.video.play().catch(() => undefined);

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

    this.setStatus('active', liveActStatusLabelDe('active'));
    this.lastFrameAt = 0;
    this.loop();
  }

  stop(): void {
    if (this.disposed) return;
    this.cancelLoop();
    this.cleanupMedia();
    this.frame = null;
    this.output?.resetLiveActPose();
    this.releaseActiveClaim();
    this.setStatus('stopped', liveActStatusLabelDe('stopped'));
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.cancelLoop();
    this.cleanupMedia();
    this.frame = null;
    this.output = null;
    this.statusListeners.clear();
    this.frameListeners.clear();
    this.releaseActiveClaim();
    this.setStatus('idle', liveActStatusLabelDe('idle'));
  }

  /** Test helper: push one sample through map/smooth without camera. */
  ingestSampleForTests(sample: LiveActSourceSample, timestampMs = 0): LiveActFrameV1 {
    this.sequence += 1;
    const mapped = mapLiveActSourceSample(sample, {
      timestampMs,
      sequence: this.sequence,
      limits: this.limits,
    });
    this.frame = smoothLiveActFrame(this.frame, mapped, this.limits.smooth);
    assertLiveActFrameLocalOnly(this.frame);
    this.output?.applyLiveActFrame(this.frame);
    this.emitFrame(this.frame);
    if (mapped.trackingLost) {
      this.setStatus('lost', liveActStatusLabelDe('lost'));
    } else if (this.status === 'lost' || this.status === 'active' || this.status === 'idle') {
      this.setStatus('active', liveActStatusLabelDe('active'));
    }
    return this.frame;
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

    let faces: LiveActSourceSample[] = [];
    try {
      faces = source.detect(video, now);
    } catch (error) {
      console.warn('[liveact] detect failed', error);
      this.setStatus('error', liveActStatusLabelDe('error'));
      this.stop();
      return;
    }

    const primary = selectPrimaryLiveActFaceIndex(faces);
    const sample =
      primary >= 0
        ? { ...faces[primary], faceIndex: primary, faceCount: faces.length }
        : createEmptyLiveActSourceSample();

    this.sequence += 1;
    const mapped = mapLiveActSourceSample(sample, {
      timestampMs: now,
      sequence: this.sequence,
      limits: this.limits,
    });
    this.frame = smoothLiveActFrame(this.frame, mapped, this.limits.smooth);
    assertLiveActFrameLocalOnly(this.frame);
    this.output?.applyLiveActFrame(this.frame);
    this.emitFrame(this.frame);

    if (mapped.trackingLost) {
      if (this.status !== 'lost') this.setStatus('lost', liveActStatusLabelDe('lost'));
    } else if (this.status === 'lost') {
      this.setStatus('active', liveActStatusLabelDe('active'));
    } else {
      this.emitStatus();
    }
  };

  private cancelLoop(): void {
    if (this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
  }

  private cleanupMedia(): void {
    if (this.visibilityHandler && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
    try {
      this.source?.dispose();
    } catch {
      // ignore
    }
    this.source = null;
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

  private setStatus(status: LiveActStatus, message: string): void {
    this.status = status;
    this.message = message;
    this.emitStatus();
  }

  private emitStatus(): void {
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
}

/** Neutral empty frame helper for adapters that need a typed placeholder. */
export function createIdleLiveActFrame(): LiveActFrameV1 {
  return createNeutralLiveActFrame({ timestampMs: 0, sequence: 0, trackingLost: true });
}
