/**
 * avatar-face-tracking-runtime — local MediaPipe/webcam adapter (#12 / #243 / #244).
 * Location: src/infrastructure/character/avatar/avatar-face-tracking-runtime.ts
 *
 * Camera + landmarks stay in-browser. Explicit start only; stop/unmount revokes tracks.
 * MediaPipe WASM + model are first-party under /mediapipe/** (no CDN at runtime).
 * Detector is injectable so CI can run without MediaPipe WASM.
 * At most one active tracker app-wide (singleton claim on start).
 */

import {
  DEFAULT_FACE_TRACKING_LIMITS,
  assertFaceTrackingDriveLocalOnly,
  createEmptyFaceTrackingSample,
  faceTrackingStatusLabelDe,
  mapFaceTrackingSample,
  resolveFaceTrackingQualityProfile,
  selectPrimaryFaceIndex,
  smoothFaceTrackingDrive,
  type FaceTrackingDrive,
  type FaceTrackingLimits,
  type FaceTrackingQualityProfile,
  type FaceTrackingSample,
  type FaceTrackingStatus,
} from '../../../domains/character/avatar/face-tracking-contract';
import {
  MEDIAPIPE_FACE_LANDMARKER_MODEL_PATH,
  MEDIAPIPE_VISION_WASM_PATH,
} from '../liveact/mediapipe-face-source';
import {
  claimLiveActCamera,
  releaseLiveActCamera,
} from '../liveact/liveact-camera-claim';

/** Re-export shared first-party MediaPipe paths (owned by LiveAct source). */
export { MEDIAPIPE_VISION_WASM_PATH, MEDIAPIPE_FACE_LANDMARKER_MODEL_PATH };

export interface FaceTrackingRuntimeState {
  status: FaceTrackingStatus;
  message: string;
  drive: FaceTrackingDrive | null;
  fpsCap: number;
  qualityProfileId: FaceTrackingQualityProfile['id'];
  qualityProfileLabelDe: string;
}

export type FaceTrackingStateListener = (state: FaceTrackingRuntimeState) => void;

/** Pluggable detector — MediaPipe or test double. */
export interface FaceTrackingDetector {
  detect(video: HTMLVideoElement, timestampMs: number): FaceTrackingSample[];
  dispose(): void;
}

export type FaceTrackingDetectorFactory = (
  profile: FaceTrackingQualityProfile,
) => Promise<FaceTrackingDetector>;

export interface FaceTrackingApplyTarget {
  applyFaceTrackingDrive(drive: FaceTrackingDrive): void;
  resetFaceTrackingPose(): void;
}

function isMobileHint(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Mobi|Android/i.test(navigator.userAgent) || (navigator.maxTouchPoints ?? 0) > 1;
}

/** At most one live webcam/detector — Editor vs Session must not dual-claim the cam (#244). */
let activeFaceTrackingRuntime: AvatarFaceTrackingRuntime | null = null;

export function getActiveFaceTrackingRuntime(): AvatarFaceTrackingRuntime | null {
  return activeFaceTrackingRuntime;
}

/**
 * Build a FaceTrackingSample list from MediaPipe-like blendshape/matrix payloads.
 * Kept here so the loader can stay thin.
 */
export function samplesFromBlendshapeFaces(
  faces: readonly {
    presence?: number;
    headYaw?: number;
    headPitch?: number;
    headRoll?: number;
    eyeLookX?: number;
    eyeLookY?: number;
    blinkLeft?: number;
    blinkRight?: number;
    smile?: number;
    browDown?: number;
    jawOpen?: number;
  }[],
): FaceTrackingSample[] {
  return faces.map((face, index) => ({
    presence: face.presence ?? 0,
    headYaw: face.headYaw ?? 0,
    headPitch: face.headPitch ?? 0,
    headRoll: face.headRoll ?? 0,
    eyeLookX: face.eyeLookX ?? 0,
    eyeLookY: face.eyeLookY ?? 0,
    blinkLeft: face.blinkLeft ?? 0,
    blinkRight: face.blinkRight ?? 0,
    smile: face.smile ?? 0,
    browDown: face.browDown ?? 0,
    jawOpen: face.jawOpen ?? 0,
    faceIndex: index,
    faceCount: faces.length,
  }));
}

/**
 * Lazy-load MediaPipe Face Landmarker from pinned npm package + first-party assets.
 * Returns null when unavailable — caller maps to `unsupported`.
 */
export async function createMediaPipeFaceTrackingDetector(
  profile: FaceTrackingQualityProfile = resolveFaceTrackingQualityProfile({}),
): Promise<FaceTrackingDetector | null> {
  if (typeof window === 'undefined') return null;
  try {
    // Dynamic import of pinned dependency — only after explicit user start.
    const mod = await import('@mediapipe/tasks-vision');
    const fileset = await mod.FilesetResolver.forVisionTasks(MEDIAPIPE_VISION_WASM_PATH);
    const landmarker = await mod.FaceLandmarker.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath: MEDIAPIPE_FACE_LANDMARKER_MODEL_PATH,
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numFaces: 1,
      outputFaceBlendshapes: profile.outputFaceBlendshapes,
      outputFacialTransformationMatrixes: profile.outputFacialTransformationMatrixes,
    });

    const scoreOf = (
      categories: Array<{ categoryName: string; score: number }> | undefined,
      name: string,
    ): number => {
      if (!categories) return 0;
      const hit = categories.find((c) => c.categoryName === name);
      return hit?.score ?? 0;
    };

    return {
      detect(video, timestampMs) {
        const result = landmarker.detectForVideo(video, timestampMs);
        const shapes = result.faceBlendshapes ?? [];
        if (shapes.length === 0) return [];
        const faces = shapes.map((shape, index) => {
          const cats = shape.categories;
          let headYaw = 0;
          let headPitch = 0;
          let headRoll = 0;
          if (profile.enableHeadPose) {
            const matrix = result.facialTransformationMatrixes?.[index]?.data;
            if (matrix && matrix.length >= 11) {
              const r00 = Number(matrix[0]);
              const r10 = Number(matrix[1]);
              const r20 = Number(matrix[2]);
              const r21 = Number(matrix[6]);
              const r22 = Number(matrix[10]);
              headYaw = Math.atan2(r10, r00);
              headPitch = Math.atan2(-r20, Math.hypot(r21, r22));
              headRoll = Math.atan2(r21, r22);
            }
          }
          return {
            presence: 1,
            headYaw,
            headPitch,
            headRoll,
            eyeLookX:
              scoreOf(cats, 'eyeLookOutLeft') -
              scoreOf(cats, 'eyeLookInLeft') +
              (scoreOf(cats, 'eyeLookOutRight') - scoreOf(cats, 'eyeLookInRight')),
            eyeLookY:
              scoreOf(cats, 'eyeLookUpLeft') +
              scoreOf(cats, 'eyeLookUpRight') -
              (scoreOf(cats, 'eyeLookDownLeft') + scoreOf(cats, 'eyeLookDownRight')),
            blinkLeft: scoreOf(cats, 'eyeBlinkLeft'),
            blinkRight: scoreOf(cats, 'eyeBlinkRight'),
            smile: Math.max(scoreOf(cats, 'mouthSmileLeft'), scoreOf(cats, 'mouthSmileRight')),
            browDown: Math.max(scoreOf(cats, 'browDownLeft'), scoreOf(cats, 'browDownRight')),
            jawOpen: scoreOf(cats, 'jawOpen'),
          };
        });
        return samplesFromBlendshapeFaces(faces);
      },
      dispose() {
        try {
          landmarker.close?.();
        } catch {
          // ignore
        }
      },
    };
  } catch (error) {
    console.warn('[face-tracking] MediaPipe unavailable', error);
    return null;
  }
}

export class AvatarFaceTrackingRuntime {
  private status: FaceTrackingStatus = 'idle';
  private message = faceTrackingStatusLabelDe('idle');
  private stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;
  private detector: FaceTrackingDetector | null = null;
  private raf = 0;
  private lastFrameAt = 0;
  private drive: FaceTrackingDrive | null = null;
  private disposed = false;
  private visibilityHandler: (() => void) | null = null;
  private readonly limits: FaceTrackingLimits;
  private readonly qualityProfile: FaceTrackingQualityProfile;
  private readonly fpsCap: number;
  private target: FaceTrackingApplyTarget | null = null;

  constructor(
    private readonly onStateChange?: FaceTrackingStateListener,
    private readonly detectorFactory: FaceTrackingDetectorFactory = async (profile) => {
      const detector = await createMediaPipeFaceTrackingDetector(profile);
      if (!detector) {
        throw new Error('unsupported');
      }
      return detector;
    },
    limits: FaceTrackingLimits = DEFAULT_FACE_TRACKING_LIMITS,
  ) {
    this.limits = limits;
    this.qualityProfile = resolveFaceTrackingQualityProfile({
      isMobile: isMobileHint(),
      maxTouchPoints: typeof navigator !== 'undefined' ? navigator.maxTouchPoints : 0,
      limits,
    });
    this.fpsCap = this.qualityProfile.fpsCap;
    this.emit();
  }

  bindTarget(target: FaceTrackingApplyTarget | null): void {
    this.target = target;
  }

  getState(): FaceTrackingRuntimeState {
    return {
      status: this.status,
      message: this.message,
      drive: this.drive,
      fpsCap: this.fpsCap,
      qualityProfileId: this.qualityProfile.id,
      qualityProfileLabelDe: this.qualityProfile.labelDe,
    };
  }

  getQualityProfile(): FaceTrackingQualityProfile {
    return this.qualityProfile;
  }

  /** Explicit user action only — never auto-start on construct/reload. */
  async start(): Promise<void> {
    if (this.disposed) return;
    if (this.status === 'active' || this.status === 'starting') return;

    // Fail-closed singleton: stop the other surface before claiming the camera (#244 / #329).
    if (activeFaceTrackingRuntime && activeFaceTrackingRuntime !== this) {
      activeFaceTrackingRuntime.stop();
    }
    claimLiveActCamera(this);
    activeFaceTrackingRuntime = this;

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      this.setStatus('unsupported', faceTrackingStatusLabelDe('unsupported'));
      this.releaseActiveClaim();
      return;
    }

    this.setStatus('starting', faceTrackingStatusLabelDe('starting'));

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
        this.setStatus('denied', faceTrackingStatusLabelDe('denied'));
        this.releaseActiveClaim();
        return;
      }
      if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        this.setStatus('unsupported', 'Keine Kamera gefunden.');
        this.releaseActiveClaim();
        return;
      }
      this.setStatus('error', faceTrackingStatusLabelDe('error'));
      this.releaseActiveClaim();
      return;
    }

    if (this.disposed || activeFaceTrackingRuntime !== this) {
      this.cleanupMedia();
      return;
    }

    try {
      this.detector = await this.detectorFactory(this.qualityProfile);
    } catch {
      this.cleanupMedia();
      this.setStatus('unsupported', faceTrackingStatusLabelDe('unsupported'));
      this.releaseActiveClaim();
      return;
    }

    if (this.disposed || activeFaceTrackingRuntime !== this) {
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
          this.setStatus('paused', faceTrackingStatusLabelDe('paused'));
        }
      } else if (this.status === 'paused') {
        this.setStatus('active', faceTrackingStatusLabelDe('active'));
      }
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);

    this.setStatus('active', faceTrackingStatusLabelDe('active'));
    this.lastFrameAt = 0;
    this.loop();
  }

  stop(): void {
    if (this.disposed) return;
    this.cancelLoop();
    this.cleanupMedia();
    this.drive = null;
    this.target?.resetFaceTrackingPose();
    this.releaseActiveClaim();
    this.setStatus('stopped', faceTrackingStatusLabelDe('stopped'));
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.cancelLoop();
    this.cleanupMedia();
    this.drive = null;
    this.target = null;
    this.releaseActiveClaim();
    this.setStatus('idle', faceTrackingStatusLabelDe('idle'));
  }

  /** Test/helper: push one sample through the same map/smooth path. */
  ingestSampleForTests(sample: FaceTrackingSample): FaceTrackingDrive {
    const mapped = mapFaceTrackingSample(sample, this.limits);
    this.drive = smoothFaceTrackingDrive(this.drive, mapped, this.limits.smooth);
    assertFaceTrackingDriveLocalOnly(this.drive);
    this.target?.applyFaceTrackingDrive(this.drive);
    if (mapped.trackingLost) {
      this.setStatus('lost', faceTrackingStatusLabelDe('lost'));
    } else if (this.status === 'lost' || this.status === 'active') {
      this.setStatus('active', faceTrackingStatusLabelDe('active'));
    }
    return this.drive;
  }

  private releaseActiveClaim(): void {
    if (activeFaceTrackingRuntime === this) {
      activeFaceTrackingRuntime = null;
    }
    releaseLiveActCamera(this);
  }

  private loop = (): void => {
    if (this.disposed || this.status === 'stopped' || this.status === 'idle') return;
    this.raf = requestAnimationFrame(this.loop);

    if (this.status === 'paused') return;
    const video = this.video;
    const detector = this.detector;
    if (!video || !detector || video.readyState < 2) return;

    const now = performance.now();
    const minDelta = 1000 / Math.max(1, this.fpsCap);
    if (now - this.lastFrameAt < minDelta) return;
    this.lastFrameAt = now;

    let faces: FaceTrackingSample[] = [];
    try {
      faces = detector.detect(video, now);
    } catch (error) {
      console.warn('[face-tracking] detect failed', error);
      this.setStatus('error', faceTrackingStatusLabelDe('error'));
      this.stop();
      return;
    }

    const primary = selectPrimaryFaceIndex(faces);
    const sample =
      primary >= 0
        ? { ...faces[primary], faceIndex: primary, faceCount: faces.length }
        : createEmptyFaceTrackingSample();

    const mapped = mapFaceTrackingSample(sample, this.limits);
    this.drive = smoothFaceTrackingDrive(this.drive, mapped, this.limits.smooth);
    assertFaceTrackingDriveLocalOnly(this.drive);
    this.target?.applyFaceTrackingDrive(this.drive);

    if (mapped.trackingLost) {
      if (this.status !== 'lost') this.setStatus('lost', faceTrackingStatusLabelDe('lost'));
    } else if (this.status === 'lost') {
      this.setStatus('active', faceTrackingStatusLabelDe('active'));
    } else {
      this.emit();
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
      this.detector?.dispose();
    } catch {
      // ignore
    }
    this.detector = null;
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

  private setStatus(status: FaceTrackingStatus, message: string): void {
    this.status = status;
    this.message = message;
    this.emit();
  }

  private emit(): void {
    this.onStateChange?.(this.getState());
  }
}
