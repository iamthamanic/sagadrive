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
  createLiveActCapabilities,
  type LiveActInputCapabilities,
  type LiveActAvatarBoneCapabilities,
  type LiveActAvatarFaceChannelSupport,
  type LiveActCapabilitiesV1,
} from './liveact-capabilities';
