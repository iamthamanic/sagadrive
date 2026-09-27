/**
 * MediaPipe Face source for LiveAct — shared WASM/model paths (#329, #331).
 * Location: src/infrastructure/character/liveact/mediapipe-face-source.ts
 *
 * Single first-party MediaPipe asset path; no CDN. Emits LiveActSourceSample
 * with full 52 face channels plus separate local-only diagnostics landmarks.
 * Samples are anatomical (RAW); head axes and gaze sign live in the pure domain mapper, the
 * mirror convention in the engine.
 */

import {
  mapMediaPipeFaceToLiveActSample,
  resolveLiveActQualityProfile,
  type LiveActFaceDiagnosticsFrameV1,
  type LiveActQualityProfile,
  type LiveActSourceSample,
} from '../../../domains/character/liveact';
import { mapMediaPipeLandmarksToLiveActDiagnostics } from './liveact-face-diagnostics';

/** First-party static paths (Vite public/). Never point at CDN/Google at runtime. */
export const MEDIAPIPE_VISION_WASM_PATH = '/mediapipe/wasm';
export const MEDIAPIPE_FACE_LANDMARKER_MODEL_PATH =
  '/mediapipe/models/face_landmarker.task';

export interface LiveActFaceDetectResult {
  samples: LiveActSourceSample[];
  diagnostics: LiveActFaceDiagnosticsFrameV1[];
}

export interface LiveActFaceSource {
  detect(video: HTMLVideoElement, timestampMs: number): LiveActFaceDetectResult;
  dispose(): void;
}

export type LiveActFaceSourceFactory = (
  profile: LiveActQualityProfile,
) => Promise<LiveActFaceSource>;

/**
 * Lazy-load MediaPipe Face Landmarker for LiveAct (full blendshape channels).
 * Returns null when unavailable — caller maps to `unsupported`.
 */
export async function createMediaPipeLiveActFaceSource(
  profile: LiveActQualityProfile = resolveLiveActQualityProfile({}),
): Promise<LiveActFaceSource | null> {
  if (typeof window === 'undefined') return null;
  try {
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

    const connections = {
      faceOval: mod.FaceLandmarker.FACE_LANDMARKS_FACE_OVAL,
      lips: mod.FaceLandmarker.FACE_LANDMARKS_LIPS,
      leftEye: mod.FaceLandmarker.FACE_LANDMARKS_LEFT_EYE,
      rightEye: mod.FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE,
      leftEyebrow: mod.FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW,
      rightEyebrow: mod.FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW,
    };

    return {
      detect(video, timestampMs) {
        const result = landmarker.detectForVideo(video, timestampMs);
        const shapes = result.faceBlendshapes ?? [];
        const rawLandmarks = result.faceLandmarks ?? [];
        if (shapes.length === 0) {
          return { samples: [], diagnostics: [] };
        }
        const samples: LiveActSourceSample[] = shapes.map((shape, index) =>
          mapMediaPipeFaceToLiveActSample({
            categories: shape.categories,
            matrix: result.facialTransformationMatrixes?.[index]?.data,
            enableHeadPose: profile.enableHeadPose,
            faceIndex: index,
            faceCount: shapes.length,
          }),
        );

        const diagnostics = shapes.map((_, index) =>
          mapMediaPipeLandmarksToLiveActDiagnostics({
            landmarks: rawLandmarks[index],
            connections,
            timestampMs,
            sequence: 0,
            faceIndex: index,
            faceCount: shapes.length,
            trackingLost: false,
          }),
        );

        return { samples, diagnostics };
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
    console.warn('[liveact] MediaPipe face source unavailable', error);
    return null;
  }
}
