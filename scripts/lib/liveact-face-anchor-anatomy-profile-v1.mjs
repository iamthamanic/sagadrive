/**
 * liveact-face-anchor-anatomy-profile-v1 — thresholds for SagaDriveFaceAnchorAnatomyQaV1.
 * Location: scripts/lib/liveact-face-anchor-anatomy-profile-v1.mjs
 *
 * Independent of morph Semantic QA. Uses normalized head proportions only.
 */

export const FACE_ANCHOR_ANATOMY_QA_CONTRACT_VERSION = 'SagaDriveFaceAnchorAnatomyQaV1';
export const FACE_ANCHOR_ANATOMY_PROFILE_VERSION = 'liveact-face-anchor-anatomy-profile-v1';

/** Versioned gates — not asset-specific. Normalized by face height / interocular. */
export const FACE_ANCHOR_ANATOMY_THRESHOLDS_V1 = {
  /** Min Y gap forehead → brow center, as fraction of face height. */
  minForeheadAboveBrow: 0.02,
  /** Min Y gap brow center → eye upper. */
  minBrowAboveEyeUpper: 0.01,
  /** Min Y gap eye upper → eye lower. */
  minEyeApertureY: 0.004,
  /** Min Y gap nose → mouth upper. */
  minNoseAboveMouth: 0.01,
  /** Min Y gap mouth upper → mouth lower. */
  minMouthApertureY: 0.001,
  /** Min Y gap mouth lower → chin. */
  minMouthAboveChin: 0.01,
  /** Max distance eyeUpper↔forehead / faceH (rejects forehead-as-lid). */
  maxEyeUpperNearForehead: 0.045,
  /** Min separation browLeftInner↔browRightInner / faceW. */
  minBrowInnerSeparation: 0.04,
  /** Max |browCenter.x − midX| / faceW for each side must exceed this (not collapsed). */
  minBrowCenterLateral: 0.06,
  /** Max |eyeOpenL − eyeOpenR| / max(eyeOpen). */
  maxEyeOpenSymRel: 0.35,
  /** Max |browLiftL − browLiftR| / max(browLift). */
  maxBrowLiftSymRel: 0.4,
  /** Eye open ratio (upper-lower)/(inner-outer) plausible band. */
  eyeOpenMin: 0.12,
  eyeOpenMax: 1.15,
  /** Brow lift (browCenter−eyeMid)/eyeW plausible band. */
  browLiftMin: 0.15,
  browLiftMax: 1.4,
  /** Mouth gap (upper-lower)/cornerWidth. */
  mouthGapMin: 0.02,
  mouthGapMax: 0.85,
  /** Mouth mid must be closer to corner mid than to noseTip (distance ratio). */
  maxMouthNearNoseRatio: 0.85,
};
