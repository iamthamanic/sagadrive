/**
 * liveact-face-functional-morph-profile-v1 — channel contracts for GT-aware morph authoring (#423).
 * Location: scripts/lib/liveact-face-functional-morph-profile-v1.mjs
 *
 * Geometric authoring intent only. Functional QA thresholds remain in
 * liveact-face-functional-profile-v1.mjs and are NOT imported here as a tweak loop.
 */

export const FACE_FUNCTIONAL_MORPH_AUTHOR_CONTRACT_VERSION =
  'SagaDriveLiveActFaceFunctionalMorphAuthorV1';
export const FACE_FUNCTIONAL_MORPH_AUTHOR_PROFILE_VERSION =
  'liveact-face-functional-morph-author-profile-v1';

/** Channels supported by this authoring profile (Milestone 1: jawOpen only). */
export const FUNCTIONAL_MORPH_AUTHOR_SUPPORTED_CHANNELS_V1 = Object.freeze(['jawOpen']);

/**
 * @typedef {{
 *   targetAnchors: string[];
 *   fixedAnchors: string[];
 *   requiredAnchors: string[];
 *   moveRadiusFaceH: number;
 *   fixRadiusFaceH: number;
 *   ampFaceH: number;
 *   backBias: number;
 * }} JawOpenAuthorContract
 */

/** @type {Readonly<JawOpenAuthorContract>} */
export const JAW_OPEN_AUTHOR_CONTRACT_V1 = Object.freeze({
  targetAnchors: Object.freeze(['mouthLower', 'chin']),
  fixedAnchors: Object.freeze(['mouthUpper', 'noseTip', 'forehead']),
  requiredAnchors: Object.freeze([
    'mouthUpper',
    'mouthLower',
    'chin',
    'noseTip',
    'forehead',
    'eyeLeftOuter',
    'eyeRightOuter',
  ]),
  /** Neighborhood radius around lower lip / chin as fraction of faceHeight. */
  moveRadiusFaceH: 0.34,
  /** Suppress radius around fixed anchors. */
  fixRadiusFaceH: 0.14,
  /**
   * Peak lower-jaw travel as fraction of faceHeight (geometric intent).
   * Chosen from offline spike that cleared Functional jawOpen without baking QA thresholds.
   */
  ampFaceH: 0.19,
  /** Slight retract along −forward while opening. */
  backBias: 0.25,
});
