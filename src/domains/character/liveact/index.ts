/**
 * domains/character/liveact — public API for SagaDrive LiveAct contracts.
 * Location: src/domains/character/liveact/index.ts
 */

export {
  LIVEACT_FACE_CONTRACT_VERSION,
  LIVEACT_FACE_CHANNELS,
  isLiveActFaceChannelId,
  clampLiveActChannel,
  createNeutralLiveActFaceChannels,
  mergeLiveActFaceChannels,
  assertLiveActFaceChannelsLocalOnly,
  type LiveActFaceChannelId,
  type LiveActFaceChannels,
  type LiveActFaceChannelPartial,
} from './liveact-face-contract';

export {
  LIVEACT_CONTRACT_VERSION,
  LIVEACT_STATUSES,
  DEFAULT_LIVEACT_LIMITS,
  LIVEACT_QUALITY_PROFILES,
  isLiveActStatus,
  resolveLiveActQualityProfile,
  clampLiveActAngle,
  clampLiveActGaze,
  selectPrimaryLiveActFaceIndex,
  createEmptyLiveActSourceSample,
  createNeutralLiveActFrame,
  mapLiveActSourceSample,
  smoothLiveActFrame,
  liveActStatusLabelDe,
  assertLiveActFrameLocalOnly,
  type LiveActStatus,
  type LiveActHeadPose,
  type LiveActEyeGaze,
  type LiveActFrameV1,
  type LiveActLimits,
  type LiveActQualityProfileId,
  type LiveActQualityProfile,
  type LiveActSourceSample,
} from './liveact-contract';

export {
  LIVEACT_CAPABILITIES_VERSION,
  createEmptyLiveActAvatarFaceSupport,
  createLiveActInputCapabilities,
  createLiveActAvatarCapabilities,
  composeLiveActCapabilities,
  createLiveActCapabilities,
  type LiveActInputCapabilities,
  type LiveActAvatarBoneCapabilities,
  type LiveActAvatarFaceChannelSupport,
  type LiveActAvatarCapabilities,
  type LiveActCapabilitiesV1,
} from './liveact-capabilities';

export {
  buildLiveActCapabilityInspectorRows,
  type LiveActCapabilityInspectorRow,
} from './liveact-capability-inspector';

export {
  LIVEACT_CHANNEL_TARGET_ALIASES,
  resolveLiveActChannelTargets,
  type LiveActChannelTargetResolution,
} from './liveact-channel-target-aliases';

export {
  LIVEACT_FACE_ASSET_CONTRACT_VERSION,
  LIVEACT_FACE_ASSET_CORE_V1_CHANNELS,
  LIVEACT_FACE_ASSET_FULL_V1_CHANNELS,
  LIVEACT_FACE_ASSET_GAZE_MORPH_CHANNELS,
  LIVEACT_FACE_ASSET_EXCLUDED_FROM_V1,
  liveActFaceAssetRequiredChannels,
  isLiveActFaceAssetV1Channel,
  checkLiveActFaceAssetProfile,
  type LiveActFaceAssetProfileId,
  type LiveActFaceAssetGazeMode,
  type LiveActFaceAssetInventory,
  type LiveActFaceAssetProfileCheckResult,
} from './liveact-face-asset-contract';

export {
  LIVEACT_FACE_DIAGNOSTICS_VERSION,
  createEmptyLiveActFaceDiagnosticsFrame,
  assertLiveActFaceDiagnosticsLocalOnly,
  type LiveActFaceLandmark2d,
  type LiveActFaceDiagnosticsContours,
  type LiveActFaceDiagnosticsFrameV1,
} from './liveact-face-diagnostics';

export {
  LIVEACT_CALIBRATION_FRAME_TARGET,
  LIVEACT_CALIBRATION_TIMEOUT_MS,
  createLiveActCalibrationAccumulator,
  isValidLiveActCalibrationSample,
  pushLiveActCalibrationSample,
  finalizeLiveActCalibration,
  applyLiveActNeutralBaseline,
  type LiveActNeutralBaselineV1,
  type LiveActCalibrationAccumulator,
} from './liveact-calibration';

export {
  LIVEACT_UI_STATUS_MAX_HZ,
  LIVEACT_INFERENCE_MAX_IN_FLIGHT,
  liveActUiStatusMinIntervalMs,
  shouldThrottleLiveActUiStatus,
  shouldDropLiveActInferenceTick,
} from './liveact-runtime-policy';
