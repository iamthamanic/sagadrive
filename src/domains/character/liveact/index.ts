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
  LIVEACT_MIRROR_AVATAR,
  liveActHeadPoseFromFacialTransform,
  mapMediaPipeFaceToLiveActSample,
  mirrorLiveActSourceSample,
  mirroredLiveActFaceChannel,
  type LiveActMediaPipeCategory,
  type LiveActMediaPipeFaceInput,
} from './liveact-mediapipe-sample';

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
  LIVEACT_DIAGNOSTICS_PEAKS_VERSION,
  createLiveActDiagnosticsPeaks,
  accumulateLiveActDiagnosticsPeaks,
  exportLiveActDiagnosticsPeaks,
  type LiveActSignalRange,
  type LiveActDiagnosticsPeaksV1,
  type LiveActDiagnosticsPeaksExportV1,
} from './liveact-diagnostics-peaks';

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
  LIVEACT_RANGE_CALIBRATION_STEPS,
  LIVEACT_RANGE_STEP_MIN_FRAMES,
  LIVEACT_RANGE_STEP_MIN_MS,
  LIVEACT_RANGE_CALIBRATION_MIN_FRAMES,
  LIVEACT_RANGE_MIN_SPAN,
  LIVEACT_RANGE_MAX_GAIN,
  liveActCalibrationStepTotal,
  liveActNeutralCalibrationPrompt,
  liveActRangeStepHoldMs,
  liveActRangeStepChannels,
  liveActRangeCalibrationStepPrompt,
  type LiveActRangeStepPhase,
  type LiveActCalibrationStepPeakV1,
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
  type LiveActRangeCalibrationStepId,
  type LiveActCalibrationSetV1,
  type LiveActCalibratedStepV1,
  type LiveActSmoothPathMode,
} from './liveact-calibration';

export {
  LIVEACT_MOTION_TEST_CONTRACT,
  LIVEACT_MOTION_TEST_MIN_FRAMES,
  LIVEACT_MOTION_TEST_STEPS,
  liveActMotionTestStepTotal,
  liveActMotionTestHoldMs,
  liveActMotionTestStepPrompt,
  liveActMotionTestAdvanceLabelDe,
  createLiveActMotionTestHoldAcc,
  motionTestFocusStorageKey,
  pushLiveActMotionTestHoldSample,
  finalizeLiveActMotionTestStepPeaks,
  formatLiveActMotionTestPeak,
  liveActMotionTestFocusModeForPeak,
  buildLiveActMotionTestExport,
  readLiveActMotionTestSignal,
  type LiveActMotionTestFocusMode,
  type LiveActMotionTestFocusV1,
  type LiveActMotionTestStepV1,
  type LiveActMotionTestStepId,
  type LiveActMotionTestStatus,
  type LiveActMotionTestStepPeakV1,
  type LiveActMotionTestStepResultV1,
  type LiveActMotionTestExportV1,
  type LiveActMotionTestHoldAcc,
} from './liveact-motion-test';

export {
  LIVEACT_UI_STATUS_MAX_HZ,
  LIVEACT_INFERENCE_MAX_IN_FLIGHT,
  liveActUiStatusMinIntervalMs,
  shouldThrottleLiveActUiStatus,
  shouldDropLiveActInferenceTick,
} from './liveact-runtime-policy';

export {
  LIVEACT_PERFECT_FIDELITY_CONTRACT,
  LIVEACT_FIDELITY_CAPTURE_CONTRACT,
  LIVEACT_FIDELITY_REPORT_CONTRACT,
  LIVEACT_PERFECT_FIDELITY_TARGETS_VERSION,
  LIVEACT_PERFECT_FIDELITY_BENCHMARK_VERSION,
  LIVEACT_PERFECT_FIDELITY_STAGES,
  LIVEACT_PERFECT_FIDELITY_TARGETS,
  LIVEACT_FIDELITY_METRIC_STATUSES,
  LIVEACT_FIDELITY_MOTION_PHASES,
  LIVEACT_FIDELITY_NOMINAL_SAMPLE_RATE_HZ,
  LIVEACT_FIDELITY_PHASE_SAMPLES_500MS,
  LIVEACT_FIDELITY_CORRELATION_LAG_WINDOW_MS,
  LIVEACT_FIDELITY_RETURN_STABLE_MS,
  LIVEACT_FIDELITY_SATURATION_THRESHOLD,
  LIVEACT_FIDELITY_NEUTRAL_TOLERANCE,
  evaluateFidelityMaxTarget,
  evaluateFidelityMinTarget,
  evaluateFidelityRangeTarget,
  type LiveActPerfectFidelityStageId,
  type LiveActFidelityMetricStatus,
  type LiveActFidelityMotionPhase,
  type LiveActFidelityMetricResultV1,
  type LiveActPerfectFidelityTargets,
} from './liveact-perfect-fidelity-contract';

export {
  fidelityPercentile,
  fidelityMedian,
  fidelityMad,
  fidelityPearson,
  fidelityBestLagCorrelation,
  fidelityAmplitudeRetentionPct,
  fidelityVelocityRetentionPct,
  fidelitySaturationFraction,
  fidelityGazeAngularErrorDeg,
  fidelityContourErrorPctMouthWidth,
  fidelityCountSequenceGaps,
  fidelityOvershoot,
  fidelityLagP95Ms,
} from './liveact-perfect-fidelity-math';

export {
  buildFidelityCaptureSession,
  createEmptyFidelityStageSamples,
  fidelityCaptureDurationMs,
  fidelityStageCoverage,
  extractFidelitySignalSeries,
  extractFidelityPhaseSeries,
  type LiveActFidelityCaptureSessionV1,
  type LiveActFidelityTimeSampleV1,
  type LiveActFidelitySourceKind,
} from './liveact-perfect-fidelity-capture';

export {
  evaluateFidelityMotionProbe,
  evaluateFidelitySpeechChannel,
  evaluateFidelityRuntimeMetrics,
  evaluateFidelityReturnLagMs,
  evaluateFidelityGazeAngular,
  evaluateFidelityContour,
  buildFidelityReport,
  fidelityReportForEquality,
  type LiveActFidelityReportV1,
  type LiveActFidelityMotionProbeResultV1,
  type LiveActFidelitySpeechResultV1,
} from './liveact-perfect-fidelity-evaluate';

export {
  LIVEACT_FIDELITY_SYNTHETIC_FIXTURE_IDS,
  buildFidelityMotionProbeFixture,
  fixturePerfectIdentityJaw,
  fixtureKnownLatency,
  fixtureAmplitudeUnderResponse,
  fixtureAmplitudeOverResponse,
  fixtureCrossTalk,
  fixtureJitter,
  fixtureSaturation,
  fixtureDelayedReturn,
  fixtureDroppedFrames,
  fixtureSpeechShaped,
  fixtureGazeAngularError,
  fixtureContourError,
  fixtureMissingAppliedStage,
} from './liveact-perfect-fidelity-fixtures';

export {
  LIVEACT_DENSE_FACE_FEATURES_CONTRACT,
  LIVEACT_DENSE_SEMANTIC_GEOMETRY_CONTRACT,
  DENSE_SEMANTIC_POINT_IDS,
  unavailableDenseScalar,
  availableDenseScalar,
  createEmptyDenseFaceFeatures,
  assertDenseFaceFeaturesLocalOnly,
  type DenseSemanticPointId,
  type DenseScalarFeatureV1,
  type DenseContourStationsV1,
  type DenseLipsFeaturesV1,
  type DenseEyesFeaturesV1,
  type DenseBrowsFeaturesV1,
  type DenseCheeksFeaturesV1,
  type DenseNoseFeaturesV1,
  type DenseJawFeaturesV1,
  type LiveActDenseFaceFeaturesV1,
  type DenseSemanticPoint3,
  type DenseSemanticGeometryV1,
  type DenseNormalizationStatus,
} from './liveact-dense-face-features-contract';

export {
  buildDenseFaceLocalFrame,
  mapGeometryToDenseLocal,
  toDenseLocalPoint,
  transformDenseSemanticGeometry,
  denseLocalDistance,
  type DenseFaceLocalFrameV1,
  type DenseLocalPointMap,
  type Vec3,
} from './liveact-dense-face-features-normalize';

export {
  extractDenseFaceFeatures,
  denseFeaturesForEquality,
} from './liveact-dense-face-features-extract';

export {
  LIVEACT_DENSE_FIXTURE_IDS,
  buildCanonicalNeutralGeometry,
  buildDenseFixtureGeometry,
  fixtureMouthOpen,
  fixtureSmileLeft,
  fixtureSmileRight,
  fixturePuckerCompression,
  fixtureEyeCloseLeft,
  fixtureEyeCloseRight,
  fixtureEyesBothClosed,
  fixtureBrowInnerRaise,
  fixtureBrowOuterLeft,
  fixtureCheekRaiseLeft,
  fixtureNoseNasolabial,
  fixtureChinDrop,
  fixturePartialMissingMouth,
  fixtureDegenerateScale,
  type LiveActDenseFixtureId,
} from './liveact-dense-face-features-fixtures';

export { evaluateDenseFeatureLipContour } from './liveact-dense-face-features-contour-metric';

export {
  LIVEACT_IRIS_GAZE_CONTRACT,
  LIVEACT_IRIS_EYE_GEOMETRY_CONTRACT,
  LIVEACT_IRIS_GAZE_MAX_YAW_DEG,
  LIVEACT_IRIS_GAZE_MAX_PITCH_DEG,
  LIVEACT_IRIS_GAZE_MIN_CONFIDENCE,
  LIVEACT_IRIS_GAZE_NEUTRAL_ZERO,
  unavailableIrisEyeGaze,
  createEmptyIrisGaze,
  assertIrisGazeLocalOnly,
  yawPitchToNormalizedGaze,
  normalizedGazeToYawPitch,
  type LiveActIrisGazeFallbackState,
  type LiveActIrisEyeGazeV1,
  type LiveActIrisGazeV1,
  type IrisPoint3,
  type IrisEyeGeometryV1,
  type IrisBinocularGeometryV1,
  type LiveActIrisGazeNeutralOffsetV1,
} from './liveact-iris-gaze-contract';

export {
  irisGeometryToDenseSemanticGeometry,
  solveIrisGaze,
  solvePlanarApertureGaze,
  arbitrateLiveActGaze,
  mirrorIrisGaze,
  type BlendshapeGazeSample,
} from './liveact-iris-gaze-solve';

export {
  LIVEACT_IRIS_GAZE_FIXTURE_IDS,
  buildIrisNeutralGeometry,
  buildIrisGazeFixture,
  approximateBlendshapeGazeFromTruth,
  fairBlendshapeGazeFromGeometry,
  encodeNormalizedGazeAsEyeLookCategories,
  type LiveActIrisGazeFixtureId,
  type IrisGazeGroundTruth,
} from './liveact-iris-gaze-fixtures';

export {
  runIrisGazeAbBenchmark,
  LIVEACT_IRIS_AB_MIN_MEDIAN_IMPROVEMENT_DEG,
  type IrisGazeAbReportV1,
  type IrisGazeAbPathErrors,
} from './liveact-iris-gaze-ab';

export {
  irisEyeballRadiusFromHalfWidth,
  gazeDirectionFromYawPitchDeg,
  gazeDirectionAngularErrorDeg,
  solveGazeFromIrisOnSphere,
  buildEyeSphereFrameFromCorners,
  planarApertureGazeFromIris,
  type EyeSphereFrame,
  type GazeVec3,
} from './liveact-iris-gaze-sphere';

export {
  LIVEACT_HYBRID_FACE_CONTRACT,
  LIVEACT_HYBRID_FACE_CONTROL_IDS,
  LIVEACT_HYBRID_AB_MIN_MEDIAN_IMPROVEMENT,
  LIVEACT_HYBRID_AB_NON_DEGRADATION_TOL,
  LIVEACT_HYBRID_DENSE_MIN_CONFIDENCE,
  LIVEACT_HYBRID_DISAGREE_ABS,
  createEmptyHybridFace,
  hybridControlsToFacePartial,
  assertHybridFaceLocalOnly,
  isHybridFaceControlId,
  unavailableHybridControl,
  semanticPassthroughControl,
  type LiveActHybridFaceSourceState,
  type LiveActHybridFaceControlId,
  type LiveActHybridControlResultV1,
  type LiveActHybridControlsV1,
  type LiveActHybridFaceV1,
} from './liveact-hybrid-face-contract';

export {
  solveHybridFace,
  applyHybridFaceToSemantic,
  type SolveHybridFaceInput,
} from './liveact-hybrid-face-solve';

export {
  fuseSemanticDense,
  denseActivationFromSigned,
  combineDenseEvidence,
  readSemantic,
  clamp01 as clampHybrid01,
} from './liveact-hybrid-face-fusion';

export {
  LIVEACT_HYBRID_FACE_FIXTURE_IDS,
  LIVEACT_HYBRID_TUNING_FIXTURE_IDS,
  LIVEACT_HYBRID_VALIDATION_FIXTURE_IDS,
  buildHybridFaceFixture,
  buildHybridSpeechLikeSequence,
  type LiveActHybridFaceFixtureId,
  type HybridFaceLatentTruth,
  type HybridFaceFixtureFrame,
} from './liveact-hybrid-face-fixtures';

export {
  runHybridFaceAbBenchmark,
  type HybridFaceAbReportV1,
  type HybridFaceAbPathErrors,
} from './liveact-hybrid-face-ab';

export {
  LIVEACT_TEMPORAL_CONTRACT,
  LIVEACT_TEMPORAL_POLICY_VERSION,
  LIVEACT_TEMPORAL_SIGNAL_GROUPS,
  LIVEACT_TEMPORAL_POLICIES,
  LIVEACT_TEMPORAL_DEFAULT_DT_MS,
  LIVEACT_TEMPORAL_MIN_DT_MS,
  LIVEACT_TEMPORAL_MAX_DT_MS,
  LIVEACT_TEMPORAL_LONG_GAP_MS,
  LIVEACT_TEMPORAL_TARGETS,
  createEmptyTemporalState,
  temporalGroupForFaceChannel,
  temporalGroupForScalarKey,
  temporalFaceKey,
  type LiveActTemporalSignalGroup,
  type LiveActTemporalLifecycleMode,
  type LiveActTemporalGroupPolicyV1,
  type LiveActTemporalScalarKey,
  type LiveActTemporalStateV1,
} from './liveact-temporal-contract';

export {
  stepAdaptiveTemporal,
  resetAdaptiveTemporal,
  resolveTemporalDtMs,
  temporalAlpha,
  temporalSmoothstep,
  readTemporalScalar,
  type StepAdaptiveTemporalResult,
} from './liveact-temporal-solve';

export {
  buildHeadYawStepSequence,
  buildGazeStepSequence,
  buildLipSineSequence,
  buildHeadJitterSequence,
  buildBlinkSequence,
  buildTemporalSpeechSequence,
  buildLostReacquireSmileSequence,
  buildDroppedFrameLipSequence,
  temporalTimestamps,
  type TemporalMappedSequence,
  type TemporalFixtureKind,
} from './liveact-temporal-fixtures';

export {
  runTemporalAbBenchmark,
  type TemporalAbReportV1,
  type TemporalAbChannelMetrics,
  type TemporalAbPath,
} from './liveact-temporal-ab';

export {
  LIVEACT_PERSONAL_CALIBRATION_CONTRACT,
  LIVEACT_PERSONAL_CALIBRATION_POLICY_VERSION,
  LIVEACT_PERSONAL_CALIBRATION_PHASES,
  LIVEACT_PERSONAL_CALIBRATION_DURATION_MS,
  LIVEACT_PERSONAL_MIN_USABLE_SPAN,
  LIVEACT_PERSONAL_WEAK_SPAN,
  LIVEACT_PERSONAL_MAX_GAIN,
  LIVEACT_PERSONAL_NOISE_DEADZONE_MULT,
  LIVEACT_PERSONAL_MAX_SAMPLE_GAP_MS,
  LIVEACT_PERSONAL_MIN_PHASE_FRAMES,
  LIVEACT_PERSONAL_STORAGE_KEY_PREFIX,
  createLiveActSolverFingerprintV1,
  liveActSolverFingerprintsEqual,
  liveActPersonalCalibrationStorageKey,
  isLiveActPersonalPersistableCharacterId,
  isLiveActPersonalCalibrationScopeComplete,
  type LiveActPersonalCapability,
  type LiveActPersonalProfileStatus,
  type LiveActSolverFingerprintV1,
  type LiveActPersonalChannelCalibV2,
  type LiveActPersonalGazeCalibV2,
  type LiveActPersonalHeadCalibV2,
  type LiveActPersonalSpeechEvidenceV2,
  type LiveActCalibrationProfileV2,
  type LiveActPersonalCalibrationScopeV1,
  type LiveActPersonalCalibrationPhaseId,
} from './liveact-personal-calibration-contract';

export {
  createLiveActPersonalCalibrationSessionV2,
  pushLiveActPersonalCalibrationSample,
  skipLiveActPersonalCalibrationPhase,
  advanceLiveActPersonalCalibrationPhase,
  liveActPersonalCalibrationPhaseElapsed,
  isLiveActPersonalCalibrationPhaseComplete,
  liveActPersonalCalibrationPhaseRemainingSec,
  hasLiveActPersonalCalibrationEnoughValidSamples,
  finalizeLiveActPersonalCalibrationProfile,
  resolveLiveActPersonalProfileStatus,
  liveActCalibrationSetFromPersonalProfile,
  applyLiveActPersonalCalibration,
  assertLiveActPersonalProfileLocalOnly,
  currentLiveActPersonalPhaseId,
  type LiveActPersonalCalibrationSessionV2,
} from './liveact-personal-calibration-solve';

export {
  saveLiveActPersonalCalibrationProfile,
  loadLiveActPersonalCalibrationProfile,
  clearLiveActPersonalCalibrationProfile,
  type LiveActPersonalProfileLoadResult,
} from './liveact-personal-calibration-store';

export { buildPersonalCalibrationActorSession } from './liveact-personal-calibration-fixtures';

export {
  runPersonalCalibrationAbBenchmark,
  LIVEACT_PERSONAL_AB_MAX_GAIN,
  type LiveActPersonalCalibrationAbReportV1,
} from './liveact-personal-calibration-ab';

export {
  SAGADRIVE_PERFORMANCE_FACE_CONTRACT,
  PERFORMANCE_FACE_VALIDATOR_VERSION,
  PERFORMANCE_FACE_MANIFEST_VERSION,
  PERFORMANCE_FACE_AUTHORING_SPEC,
  LIVEACT_ACTIVE_CAPABILITY_CONTRACT,
  PERFORMANCE_FACE_CAPABILITY_LEVELS,
  PERFORMANCE_FACE_LEVEL_LABELS,
  PERFORMANCE_FACE_REQUIRED_PREMIUM_CONTROLS,
  PERFORMANCE_FACE_OPTIONAL_PREMIUM_CONTROLS,
  PERFORMANCE_FACE_ALL_CONTROLS,
  isPerformanceFaceControlId,
  isPerformanceFaceCapabilityLevel,
  clampPerformanceFaceWeight,
  computeCorrectiveWeight,
  parsePerformanceFaceManifestV1,
  type PerformanceFaceCapabilityLevel,
  type PerformanceFaceRequiredControlId,
  type PerformanceFaceOptionalControlId,
  type PerformanceFaceControlId,
  type PerformanceFaceCorrectiveWeightRule,
  type PerformanceFaceCorrectiveDeclarationV1,
  type PerformanceFaceManifestV1,
  type PerformanceFaceCorrectiveCapabilityV1,
  type PerformanceFaceValidationReportV1,
} from './liveact-performance-face-contract';

export {
  PERFORMANCE_FACE_TARGET_ALIASES,
  resolvePerformanceFaceTargets,
  type PerformanceFaceTargetResolution,
} from './liveact-performance-face-aliases';

export {
  validatePerformanceFaceV2,
  composeLiveActWithPerformanceFace,
  evaluatePerformanceFaceForImport,
  formatPerformanceFaceReportDe,
  applyPerformanceFaceWeights,
  type PerformanceFaceInventoryV1,
  type LiveActActiveCapabilityV2,
} from './liveact-performance-face-validate';

export {
  drivePerformanceFaceWeights,
  measurePerformanceFaceContourProxy,
} from './liveact-performance-face-drive';

export {
  LIVEACT_PERFECT_FIDELITY_V2_E2E_CONTRACT,
  buildCoreArkitChannels,
  buildCanonicalFace3Inventory,
  buildExternalPremiumInventory,
  listPerfectFidelityV2AvatarProfiles,
  evaluatePerfectFidelityV2Avatar,
  runPerfectFidelityV2E2e,
  type PerfectFidelityV2AvatarProfile,
  type PerfectFidelityV2AvatarGateResult,
  type PerfectFidelityV2E2eReport,
} from './liveact-perfect-fidelity-v2-e2e';

