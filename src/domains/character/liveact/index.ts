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
  LIVEACT_RETARGET_PROFILE_VERSION,
  IDENTITY_CHANNEL_RETARGET,
  DEFAULT_LIVEACT_RETARGET_PROFILE,
  createIdentityLiveActRetargetProfile,
  normalizeLiveActRetargetProfile,
  retargetLiveActChannel,
  applyLiveActRetargetProfile,
  type LiveActChannelRetargetV1,
  type LiveActRetargetProfileV1,
} from './liveact-retarget-profile';

export {
  LIVEACT_EYE_LOOK_FACE_CHANNELS,
  isLiveActEyeLookFaceChannel,
  resolveLiveActGazeDrivePath,
  liveActGazePathSkipsEyeLookMorphs,
  liveActGazePathUsesPoseDriver,
  type LiveActEyeLookFaceChannelId,
  type LiveActGazeDrivePath,
} from './liveact-gaze-path';

export {
  LIVEACT_FACE_DIAGNOSTICS_VERSION,
  createEmptyLiveActFaceDiagnosticsFrame,
  assertLiveActFaceDiagnosticsLocalOnly,
  type LiveActFaceLandmark2d,
  type LiveActFaceDiagnosticsContours,
  type LiveActFaceDiagnosticsFrameV1,
} from './liveact-face-diagnostics';

export {
  LIVEACT_DIAGNOSTICS_V2_VERSION,
  LIVEACT_DIAGNOSTICS_V2_STAGES,
  LIVEACT_DIAGNOSTICS_V2_SIGNAL_KEYS,
  snapshotLiveActDiagnosticsV2FromSample,
  snapshotLiveActDiagnosticsV2FromFrame,
  createUnavailableLiveActAppliedValues,
  createNeutralLiveActAppliedValues,
  buildLiveActAppliedValuesFromFace,
  createLiveActDiagnosticsV2Snapshot,
  assertLiveActDiagnosticsV2LocalOnly,
  liveActFaceChannelsToPartial,
  type LiveActDiagnosticsV2StageId,
  type LiveActDiagnosticsV2SignalKey,
  type LiveActAppliedSignalStatus,
  type LiveActAppliedSignalV1,
  type LiveActDiagnosticsV2StageValues,
  type LiveActDiagnosticsV2AppliedValues,
  type LiveActDiagnosticsV2Snapshot,
} from './liveact-diagnostics-v2';

export {
  computeLiveActObjectCoverTransform,
  projectLiveActLandmarkToCanvas,
  type LiveActVideoViewportTransform,
} from './liveact-video-viewport-transform';

export {
  LIVEACT_FACE_METRIC_LANDMARK_INDICES,
  buildLiveActFaceLandmarksFromAnchorScreenPoints,
  computeLiveActFaceMetrics,
  formatLiveActMetric,
  liveActRadiansToDegrees,
  type LiveActFaceMetricsV1,
} from './liveact-face-metrics';

export {
  LIVEACT_CALIBRATION_FRAME_TARGET,
  LIVEACT_CALIBRATION_TIMEOUT_MS,
  LIVEACT_RANGE_CALIBRATION_DURATION_MS,
  LIVEACT_RANGE_CALIBRATION_MIN_FRAMES,
  LIVEACT_RANGE_MIN_SPAN,
  LIVEACT_RANGE_MAX_GAIN,
  createLiveActCalibrationAccumulator,
  isValidLiveActCalibrationSample,
  pushLiveActCalibrationSample,
  finalizeLiveActCalibration,
  applyLiveActNeutralBaseline,
  createLiveActRangeCalibrationAccumulator,
  pushLiveActRangeCalibrationSample,
  finalizeLiveActRangeCalibration,
  applyLiveActRangeCalibration,
  applyLiveActCalibration,
  stepLiveActCalibratedFrame,
  type LiveActNeutralBaselineV1,
  type LiveActCalibrationAccumulator,
  type LiveActRangeCalibrationV1,
  type LiveActRangeCalibrationAccumulator,
  type LiveActCalibrationSetV1,
  type LiveActCalibratedStepV1,
} from './liveact-calibration';

export {
  LIVEACT_UI_STATUS_MAX_HZ,
  LIVEACT_INFERENCE_MAX_IN_FLIGHT,
  liveActUiStatusMinIntervalMs,
  shouldThrottleLiveActUiStatus,
  shouldDropLiveActInferenceTick,
} from './liveact-runtime-policy';
