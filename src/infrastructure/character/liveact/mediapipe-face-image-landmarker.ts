/**
 * MediaPipe Face Landmarker IMAGE-mode adapter for Face Mapping Auto (#421).
 * Location: src/infrastructure/character/liveact/mediapipe-face-image-landmarker.ts
 *
 * Short-lived instance — never shares mutable state with the LiveAct VIDEO landmarker.
 * First-party WASM/model paths only (no CDN).
 */

import {
  MEDIAPIPE_FACE_LANDMARKER_MODEL_PATH,
  MEDIAPIPE_VISION_WASM_PATH,
} from './mediapipe-face-source';

export interface MediaPipeImageLandmark2d {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface MediaPipeFaceImageDetectResult {
  readonly faceCount: number;
  /** Normalized landmarks for face 0 (empty when faceCount !== 1). */
  readonly landmarks: readonly MediaPipeImageLandmark2d[];
}

export interface MediaPipeFaceImageLandmarker {
  detect(image: HTMLCanvasElement | HTMLImageElement | ImageBitmap): MediaPipeFaceImageDetectResult;
  dispose(): void;
}

/**
 * Create a dedicated IMAGE-mode FaceLandmarker for character-render auto mapping.
 * Returns null when MediaPipe is unavailable (SSR / missing assets).
 */
export async function createMediaPipeFaceImageLandmarker(): Promise<MediaPipeFaceImageLandmarker | null> {
  if (typeof window === 'undefined') return null;
  try {
    const mod = await import('@mediapipe/tasks-vision');
    const fileset = await mod.FilesetResolver.forVisionTasks(MEDIAPIPE_VISION_WASM_PATH);
    // CPU: still frames + avoids GPU context fights with the Three.js renderer.
    const landmarker = await mod.FaceLandmarker.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath: MEDIAPIPE_FACE_LANDMARKER_MODEL_PATH,
        delegate: 'CPU',
      },
      runningMode: 'IMAGE',
      numFaces: 2,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: false,
    });

    return {
      detect(image) {
        const result = landmarker.detect(image);
        const raw = result.faceLandmarks ?? [];
        const faceCount = raw.length;
        if (faceCount !== 1 || !raw[0]) {
          return { faceCount, landmarks: [] };
        }
        const landmarks = raw[0].map((p) => ({
          x: p.x,
          y: p.y,
          z: typeof p.z === 'number' ? p.z : 0,
        }));
        return { faceCount, landmarks };
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
    console.warn('[face-mapping-auto] MediaPipe IMAGE landmarker unavailable', error);
    return null;
  }
}
