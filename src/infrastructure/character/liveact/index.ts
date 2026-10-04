/**
 * infrastructure/character/liveact — LiveAct engine + MediaPipe source + output port.
 * Location: src/infrastructure/character/liveact/index.ts
 */

export type { LiveActAvatarOutput } from './liveact-avatar-output';
export { createLiveActAvatarOutput } from './liveact-avatar-output';
export { VrmLiveActAvatarOutput } from './vrm-liveact-avatar-output';
export { GltfLiveActAvatarOutput } from './gltf-liveact-avatar-output';
export {
  LiveActEngine,
  getActiveLiveActEngine,
  createIdleLiveActFrame,
  type LiveActEngineState,
  type LiveActStatusListener,
  type LiveActFrameListener,
  type LiveActDiagnosticsListener,
  type LiveActDenseFaceFeaturesListener,
  type LiveActIrisGazeListener,
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
  type LiveActFaceDetectResult,
} from './mediapipe-face-source';
export {
  MEDIAPIPE_DENSE_SEMANTIC_POINTS_VERSION,
  MEDIAPIPE_DENSE_EXTENSION_MAP_V1,
  mapMediaPipeLandmarksToDenseSemanticGeometry,
} from './mediapipe-dense-semantic-points-v1';
export {
  MEDIAPIPE_IRIS_GEOMETRY_VERSION,
  MEDIAPIPE_LEFT_IRIS_CONTOUR_INDICES,
  MEDIAPIPE_RIGHT_IRIS_CONTOUR_INDICES,
  mapMediaPipeLandmarksToIrisGeometry,
} from './mediapipe-iris-geometry-v1';
export {
  createLiveActRigDebugController,
  type LiveActRigDebugController,
} from './liveact-rig-debug';
export {
  resolveLiveActRetargetProfile,
  type LiveActRetargetProfileSelectionInput,
} from './liveact-retarget-profile-registry';
export {
  LiveActSessionTransport,
  type LiveActSessionTransportOptions,
  type LiveActRemoteApplyTarget,
} from './liveact-session-transport';
