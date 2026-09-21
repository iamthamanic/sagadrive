/**
 * infrastructure/character/liveact — LiveAct engine + MediaPipe source + output port.
 * Location: src/infrastructure/character/liveact/index.ts
 */

export type { LiveActAvatarOutput } from './liveact-avatar-output';
export {
  LiveActEngine,
  getActiveLiveActEngine,
  createIdleLiveActFrame,
  type LiveActEngineState,
  type LiveActStatusListener,
  type LiveActFrameListener,
  type LiveActDiagnosticsListener,
  type LiveActCalibrationResult,
  type LiveActCalibrationStatus,
} from './liveact-engine';
export {
  claimLiveActCamera,
  releaseLiveActCamera,
  getActiveLiveActCameraClaim,
} from './liveact-camera-claim';
export {
  MEDIAPIPE_VISION_WASM_PATH,
  MEDIAPIPE_FACE_LANDMARKER_MODEL_PATH,
  createMediaPipeLiveActFaceSource,
  type LiveActFaceSource,
  type LiveActFaceSourceFactory,
} from './mediapipe-face-source';
