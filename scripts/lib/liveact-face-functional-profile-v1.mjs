/**
 * liveact-face-functional-profile-v1 — versioned Functional Face QA thresholds (#422).
 * Location: scripts/lib/liveact-face-functional-profile-v1.mjs
 *
 * Generic humanoid only — no m5/f5 / filename exceptions.
 * Thresholds are normalized (ratios, never pixels / absolute world units).
 */

export const FACE_FUNCTIONAL_QA_CONTRACT_VERSION = 'SagaDriveLiveActFaceFunctionalQaV1';
export const FACE_FUNCTIONAL_PROFILE_VERSION = 'liveact-face-functional-profile-v1';

/** Isolated pose weight for V1 (neutral 0 → channel 1). */
export const FACE_FUNCTIONAL_POSE_WEIGHT = 1;

/**
 * Required core channels with functional assertions (design #422).
 * Independent of core-v1/full-v1 inventory profile — missing usable morph = FAIL.
 */
export const FUNCTIONAL_REQUIRED_CHANNELS_V1 = Object.freeze([
  'jawOpen',
  'eyeBlinkLeft',
  'eyeBlinkRight',
  'browInnerUp',
  'mouthSmileLeft',
  'mouthSmileRight',
  'mouthPucker',
]);

/**
 * Hard thresholds from `.qa/design/liveact-functional-face-qa.md`.
 * Bump FACE_FUNCTIONAL_PROFILE_VERSION when changing.
 */
export const FACE_FUNCTIONAL_THRESHOLDS_V1 = Object.freeze({
  jawOpen: Object.freeze({
    minMouthGapDelta: 0.06,
    maxNoseTipDispFaceH: 0.04,
    maxForeheadDispFaceH: 0.025,
  }),
  eyeBlinkLeft: Object.freeze({
    maxOpenRatio: 0.65,
    minOpenDrop: 0.05,
    maxOppositeRelChange: 0.2,
  }),
  eyeBlinkRight: Object.freeze({
    maxOpenRatio: 0.65,
    minOpenDrop: 0.05,
    maxOppositeRelChange: 0.2,
  }),
  browInnerUp: Object.freeze({
    minMeanLiftDelta: 0.03,
    maxDownwardPerSide: 0.01,
  }),
  mouthSmileLeft: Object.freeze({
    minCornerUp: 0.025,
    minCornerMotion: 0.03,
    minUpAdvantageOverOpposite: 0.015,
  }),
  mouthSmileRight: Object.freeze({
    minCornerUp: 0.025,
    minCornerMotion: 0.03,
    minUpAdvantageOverOpposite: 0.015,
  }),
  mouthPucker: Object.freeze({
    maxMouthWidthRatio: 0.92,
  }),
  eps: 1e-8,
});
