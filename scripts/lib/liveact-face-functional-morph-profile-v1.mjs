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

/**
 * Channels supported by this authoring profile.
 * Milestone 1: jawOpen. Milestone 2: blinks. Milestone 3: browInnerUp.
 * Milestone 4: smiles. Milestone 5: mouthPucker.
 */
export const FUNCTIONAL_MORPH_AUTHOR_SUPPORTED_CHANNELS_V1 = Object.freeze([
  'jawOpen',
  'eyeBlinkLeft',
  'eyeBlinkRight',
  'browInnerUp',
  'mouthSmileLeft',
  'mouthSmileRight',
  'mouthPucker',
]);

/**
 * @typedef {{
 *   targetAnchors: string[];
 *   surfaceSeedAnchors: string[];
 *   fixedAnchors: string[];
 *   requiredAnchors: string[];
 *   moveRadiusFaceH: number;
 *   fixRadiusFaceH: number;
 *   ampFaceH: number;
 *   ampMouthWidth: number;
 *   ampNeutralGap: number;
 *   backBias: number;
 *   topoFalloffExp: number;
 * }} JawOpenAuthorContract
 */

/** @type {Readonly<JawOpenAuthorContract>} */
export const JAW_OPEN_AUTHOR_CONTRACT_V1 = Object.freeze({
  targetAnchors: Object.freeze(['mouthLower', 'chin']),
  /** GT-bound triangles that define the authoritative perioral surface (not chin body shell). */
  surfaceSeedAnchors: Object.freeze([
    'mouthUpper',
    'mouthLower',
    'mouthCornerLeft',
    'mouthCornerRight',
  ]),
  fixedAnchors: Object.freeze(['mouthUpper', 'noseTip', 'forehead']),
  requiredAnchors: Object.freeze([
    'mouthUpper',
    'mouthLower',
    'chin',
    'noseTip',
    'forehead',
    'eyeLeftOuter',
    'eyeRightOuter',
    'mouthCornerLeft',
    'mouthCornerRight',
  ]),
  moveRadiusFaceH: 0.28,
  fixRadiusFaceH: 0.14,
  ampFaceH: 0.12,
  /**
   * Geometric amp caps (shared m5/f5, no asset branches):
   * amp = min(faceH*ampFaceH, mouthWidth*ampMouthWidth, neutralMouthGap*ampNeutralGap)
   * Mouth-width + neutral-gap caps prevent post-surface-gate over-open on dense perioral meshes.
   */
  ampMouthWidth: 0.16,
  ampNeutralGap: 0.22,
  backBias: 0.2,
  /** Topology hop falloff exponent on allowed surface (1=linear). */
  topoFalloffExp: 1.25,
});

/**
 * @typedef {{
 *   side: 'left' | 'right';
 *   morphName: 'eyeBlinkLeft' | 'eyeBlinkRight';
 *   upperAnchor: string;
 *   lowerAnchor: string;
 *   innerAnchor: string;
 *   outerAnchor: string;
 *   oppositeUpper: string;
 *   oppositeLower: string;
 *   oppositeInner: string;
 *   oppositeOuter: string;
 *   requiredAnchors: string[];
 *   moveRadiusFaceH: number;
 *   upperCloseFraction: number;
 *   lowerCloseFraction: number;
 *   midplaneSoftFaceH: number;
 * }} EyeBlinkAuthorContract
 */

const EYE_BLINK_SHARED = Object.freeze({
  moveRadiusFaceH: 0.085,
  upperCloseFraction: 0.62,
  lowerCloseFraction: 0.24,
  midplaneSoftFaceH: 0.02,
});

/** @type {Readonly<EyeBlinkAuthorContract>} */
export const EYE_BLINK_LEFT_AUTHOR_CONTRACT_V1 = Object.freeze({
  side: 'left',
  morphName: 'eyeBlinkLeft',
  upperAnchor: 'eyeLeftUpper',
  lowerAnchor: 'eyeLeftLower',
  innerAnchor: 'eyeLeftInner',
  outerAnchor: 'eyeLeftOuter',
  oppositeUpper: 'eyeRightUpper',
  oppositeLower: 'eyeRightLower',
  oppositeInner: 'eyeRightInner',
  oppositeOuter: 'eyeRightOuter',
  requiredAnchors: Object.freeze([
    'eyeLeftUpper',
    'eyeLeftLower',
    'eyeLeftInner',
    'eyeLeftOuter',
    'eyeRightUpper',
    'eyeRightLower',
    'eyeRightInner',
    'eyeRightOuter',
    'noseTip',
    'forehead',
  ]),
  ...EYE_BLINK_SHARED,
});

/** @type {Readonly<EyeBlinkAuthorContract>} */
export const EYE_BLINK_RIGHT_AUTHOR_CONTRACT_V1 = Object.freeze({
  side: 'right',
  morphName: 'eyeBlinkRight',
  upperAnchor: 'eyeRightUpper',
  lowerAnchor: 'eyeRightLower',
  innerAnchor: 'eyeRightInner',
  outerAnchor: 'eyeRightOuter',
  oppositeUpper: 'eyeLeftUpper',
  oppositeLower: 'eyeLeftLower',
  oppositeInner: 'eyeLeftInner',
  oppositeOuter: 'eyeLeftOuter',
  requiredAnchors: Object.freeze([
    'eyeLeftUpper',
    'eyeLeftLower',
    'eyeLeftInner',
    'eyeLeftOuter',
    'eyeRightUpper',
    'eyeRightLower',
    'eyeRightInner',
    'eyeRightOuter',
    'noseTip',
    'forehead',
  ]),
  ...EYE_BLINK_SHARED,
});

/**
 * @typedef {{
 *   morphName: 'browInnerUp';
 *   requiredAnchors: string[];
 *   moveRadiusFaceH: number;
 *   ampEyeW: number;
 *   outerFalloffScale: number;
 * }} BrowInnerUpAuthorContract
 */

/** @type {Readonly<BrowInnerUpAuthorContract>} */
export const BROW_INNER_UP_AUTHOR_CONTRACT_V1 = Object.freeze({
  morphName: 'browInnerUp',
  requiredAnchors: Object.freeze([
    'browLeftInner',
    'browRightInner',
    'browLeftCenter',
    'browRightCenter',
    'browLeftOuter',
    'browRightOuter',
    'eyeLeftInner',
    'eyeRightInner',
    'eyeLeftUpper',
    'eyeRightUpper',
    'eyeLeftLower',
    'eyeRightLower',
    'noseTip',
    'forehead',
    'mouthUpper',
    'chin',
  ]),
  moveRadiusFaceH: 0.14,
  ampEyeW: 0.14,
  outerFalloffScale: 0.35,
});

/**
 * @typedef {{
 *   side: 'left' | 'right';
 *   morphName: 'mouthSmileLeft' | 'mouthSmileRight';
 *   targetCorner: string;
 *   oppositeCorner: string;
 *   requiredAnchors: string[];
 *   moveRadiusFaceH: number;
 *   ampMouthW: number;
 *   upBias: number;
 *   outBias: number;
 *   midplaneSoftFaceH: number;
 * }} MouthSmileAuthorContract
 */

const MOUTH_SMILE_SHARED = Object.freeze({
  moveRadiusFaceH: 0.12,
  ampMouthW: 0.09,
  upBias: 1.0,
  outBias: 0.55,
  midplaneSoftFaceH: 0.025,
});

/** @type {Readonly<MouthSmileAuthorContract>} */
export const MOUTH_SMILE_LEFT_AUTHOR_CONTRACT_V1 = Object.freeze({
  side: 'left',
  morphName: 'mouthSmileLeft',
  targetCorner: 'mouthCornerLeft',
  oppositeCorner: 'mouthCornerRight',
  requiredAnchors: Object.freeze([
    'mouthCornerLeft',
    'mouthCornerRight',
    'mouthUpper',
    'mouthLower',
    'chin',
    'noseTip',
    'forehead',
    'eyeLeftOuter',
    'eyeRightOuter',
    'browLeftInner',
    'browRightInner',
  ]),
  ...MOUTH_SMILE_SHARED,
});

/** @type {Readonly<MouthSmileAuthorContract>} */
export const MOUTH_SMILE_RIGHT_AUTHOR_CONTRACT_V1 = Object.freeze({
  side: 'right',
  morphName: 'mouthSmileRight',
  targetCorner: 'mouthCornerRight',
  oppositeCorner: 'mouthCornerLeft',
  requiredAnchors: Object.freeze([
    'mouthCornerLeft',
    'mouthCornerRight',
    'mouthUpper',
    'mouthLower',
    'chin',
    'noseTip',
    'forehead',
    'eyeLeftOuter',
    'eyeRightOuter',
    'browLeftInner',
    'browRightInner',
  ]),
  ...MOUTH_SMILE_SHARED,
});

/**
 * @typedef {{
 *   morphName: 'mouthPucker';
 *   requiredAnchors: string[];
 *   moveRadiusFaceH: number;
 *   ampMouthW: number;
 *   forwardAmpMouthW: number;
 *   verticalDamp: number;
 * }} MouthPuckerAuthorContract
 */

/** @type {Readonly<MouthPuckerAuthorContract>} */
export const MOUTH_PUCKER_AUTHOR_CONTRACT_V1 = Object.freeze({
  morphName: 'mouthPucker',
  requiredAnchors: Object.freeze([
    'mouthCornerLeft',
    'mouthCornerRight',
    'mouthUpper',
    'mouthLower',
    'chin',
    'noseTip',
    'forehead',
    'eyeLeftOuter',
    'eyeRightOuter',
    'browLeftInner',
    'browRightInner',
  ]),
  // Perioral neighborhood — corners + lip perimeter strongest; falloff before nose/chin.
  moveRadiusFaceH: 0.13,
  // Lateral inward amp as fraction of neutral mouth width (both corners → width shrink).
  ampMouthW: 0.075,
  // Mild local forward protrusion along existing face-frame forward (not whole-mouth translate).
  forwardAmpMouthW: 0.028,
  // Suppress vertical corner drift so pucker is width-led, not jaw lift.
  verticalDamp: 0.12,
});
