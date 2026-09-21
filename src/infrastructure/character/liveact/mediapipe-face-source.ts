/**
 * MediaPipe Face source for LiveAct — shared WASM/model paths (#329, #331).
 * Location: src/infrastructure/character/liveact/mediapipe-face-source.ts
 *
 * Single first-party MediaPipe asset path; no CDN. Emits LiveActSourceSample
 * with full 52 face channels plus separate local-only diagnostics landmarks.
 */

import {
  LIVEACT_FACE_CHANNELS,
  resolveLiveActQualityProfile,
  type LiveActFaceChannelId,
  type LiveActFaceChannelPartial,
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

function scoreOf(
  categories: Array<{ categoryName: string; score: number }> | undefined,
  name: string,
): number {
  if (!categories) return 0;
  const hit = categories.find((c) => c.categoryName === name);
  return hit?.score ?? 0;
}

function channelsFromCategories(
  categories: Array<{ categoryName: string; score: number }> | undefined,
): LiveActFaceChannelPartial {
  if (!categories || categories.length === 0) return {};
  const byName = new Map(categories.map((c) => [c.categoryName, c.score]));
  const out: Partial<Record<LiveActFaceChannelId, number>> = {};
  for (const id of LIVEACT_FACE_CHANNELS) {
    const score = byName.get(id);
    if (typeof score === 'number') {
      out[id] = score;
    }
  }
  return out;
}

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
        const samples = shapes.map((shape, index) => {
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
            eyeLeftX: scoreOf(cats, 'eyeLookOutLeft') - scoreOf(cats, 'eyeLookInLeft'),
            eyeLeftY: scoreOf(cats, 'eyeLookUpLeft') - scoreOf(cats, 'eyeLookDownLeft'),
            eyeRightX: scoreOf(cats, 'eyeLookOutRight') - scoreOf(cats, 'eyeLookInRight'),
            eyeRightY: scoreOf(cats, 'eyeLookUpRight') - scoreOf(cats, 'eyeLookDownRight'),
            face: channelsFromCategories(cats),
            faceIndex: index,
            faceCount: shapes.length,
          } satisfies LiveActSourceSample;
        });

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
