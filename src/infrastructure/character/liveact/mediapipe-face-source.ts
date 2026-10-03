/**
 * MediaPipe Face source for LiveAct — shared WASM/model paths (#329, #331, #445).
 * Location: src/infrastructure/character/liveact/mediapipe-face-source.ts
 *
 * Single first-party MediaPipe asset path; no CDN. Emits LiveActSourceSample
 * with full 52 face channels plus separate local-only diagnostics landmarks and
 * a Dense Feature side-channel (#445). V1 samples/frames stay landmark-free.
 * Samples are anatomical (RAW); head axes and gaze sign live in the pure domain mapper, the
 * mirror convention in the engine.
 */

import {
  extractDenseFaceFeatures,
  mapMediaPipeFaceToLiveActSample,
  resolveLiveActQualityProfile,
  type LiveActDenseFaceFeaturesV1,
  type LiveActFaceDiagnosticsFrameV1,
  type LiveActQualityProfile,
  type LiveActSourceSample,
} from '../../../domains/character/liveact';
import { mapMediaPipeLandmarksToLiveActDiagnostics } from './liveact-face-diagnostics';
import { mapMediaPipeLandmarksToDenseSemanticGeometry } from './mediapipe-dense-semantic-points-v1';

/** First-party static paths (Vite public/). Never point at CDN/Google at runtime. */
export const MEDIAPIPE_VISION_WASM_PATH = '/mediapipe/wasm';
export const MEDIAPIPE_FACE_LANDMARKER_MODEL_PATH =
  '/mediapipe/models/face_landmarker.task';

export interface LiveActFaceDetectResult {
  samples: LiveActSourceSample[];
  diagnostics: LiveActFaceDiagnosticsFrameV1[];
  /** Provider-neutral dense features — side-channel; not part of LiveActFrameV1. */
  denseFeatures: LiveActDenseFaceFeaturesV1[];
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
          return { samples: [], diagnostics: [], denseFeatures: [] };
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

        // Dense features side-channel (#445): landmarks → semantic points → extract.
        // Raw landmark arrays are not retained on the returned dense frame.
        const denseFeatures = shapes.map((_, index) => {
          const geometry = mapMediaPipeLandmarksToDenseSemanticGeometry({
            landmarks: rawLandmarks[index],
            faceConfidence: 1,
          });
          return extractDenseFaceFeatures({
            geometry,
            sequence: 0,
            timestampMs,
          });
        });

        return { samples, diagnostics, denseFeatures };
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
