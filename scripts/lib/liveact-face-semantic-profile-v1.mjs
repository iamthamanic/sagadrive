/**
 * liveact-face-semantic-profile-v1 — versioned region/threshold rules for morph QA (#401).
 * Location: scripts/lib/liveact-face-semantic-profile-v1.mjs
 *
 * Provider-neutral, filename-neutral thresholds. Expected regions reference SagaDriveFaceAnchorsV1 ids.
 */

/** V2: requires FaceAnchorAnatomyQa PASS before morph region energy is trusted. */
export const SEMANTIC_QA_CONTRACT_VERSION = 'SagaDriveLiveActFaceSemanticQaV2';
export const SEMANTIC_PROFILE_VERSION = 'liveact-face-semantic-profile-v2';

/** @typedef {'mouth'|'jaw'|'eyeLeft'|'eyeRight'|'browLeft'|'browRight'|'nose'|'forehead'|'cheek'} QaRegionId */

/** Maps QA regions to anchor ids (SagaDriveFaceAnchorsV1). */
export const QA_REGION_ANCHORS = {
  mouth: ['mouthUpper', 'mouthLower', 'mouthCornerLeft', 'mouthCornerRight'],
  jaw: ['chin', 'mouthLower'],
  eyeLeft: ['eyeLeftInner', 'eyeLeftOuter', 'eyeLeftUpper', 'eyeLeftLower'],
  eyeRight: ['eyeRightInner', 'eyeRightOuter', 'eyeRightUpper', 'eyeRightLower'],
  browLeft: ['browLeftInner', 'browLeftOuter', 'browLeftCenter'],
  browRight: ['browRightInner', 'browRightOuter', 'browRightCenter'],
  nose: ['noseTip'],
  forehead: ['forehead'],
  cheek: ['mouthCornerLeft', 'mouthCornerRight'],
};

/** Versioned numeric gates (not asset-specific). V2 assumes anatomy-valid anchors. */
export const SEMANTIC_THRESHOLDS_V1 = {
  /** Morph must move at least this much total energy to be considered active. */
  minTotalEnergy: 1e-12,
  /**
   * Share of energy that must land in expected regions.
   * V2 uses tighter anatomic neighborhoods; ICT transfer still spills — gate is lower than V1
   * but still fails when expected region is essentially empty.
   */
  minExpectedEnergyRatio: 0.18,
  /** Max share of energy allowed in explicitly forbidden regions. */
  maxForbiddenLeakageRatio: 0.55,
  /** Bilateral channels: dominant side / weak side. */
  minSideDominanceRatio: 1.15,
  /** Combination poses: max vertex displacement magnitude in forbidden regions. */
  combinationMaxForbiddenDisplacement: 0.085,
  /** Ignore numerical noise below this per-vertex delta magnitude. */
  noiseFloor: 1e-9,
};

/**
 * @typedef {'left'|'right'|null} SideExpectation
 * @typedef {{ expectedRegions: QaRegionId[]; forbiddenRegions: QaRegionId[]; side: SideExpectation }} ChannelSemanticRule
 */

/** @type {Record<string, ChannelSemanticRule>} */
export const CORE_CHANNEL_SEMANTIC_RULES_V1 = {
  eyeBlinkLeft: {
    expectedRegions: ['eyeLeft'],
    forbiddenRegions: ['forehead', 'jaw'],
    side: 'left',
  },
  eyeBlinkRight: {
    expectedRegions: ['eyeRight'],
    forbiddenRegions: ['forehead', 'jaw'],
    side: 'right',
  },
  jawOpen: {
    expectedRegions: ['jaw', 'mouth'],
    forbiddenRegions: ['forehead', 'nose'],
    side: null,
  },
  // ICT→full-body transfer smiles/frowns are weakly lateral; gate on region energy, not side ratio.
  mouthSmileLeft: {
    expectedRegions: ['mouth', 'cheek'],
    forbiddenRegions: ['forehead', 'nose'],
    side: null,
  },
  mouthSmileRight: {
    expectedRegions: ['mouth', 'cheek'],
    forbiddenRegions: ['forehead', 'nose'],
    side: null,
  },
  mouthFrownLeft: {
    expectedRegions: ['mouth', 'cheek'],
    forbiddenRegions: ['forehead'],
    side: null,
  },
  mouthFrownRight: {
    expectedRegions: ['mouth', 'cheek'],
    forbiddenRegions: ['forehead'],
    side: null,
  },
  mouthPucker: {
    expectedRegions: ['mouth', 'nose', 'cheek'],
    forbiddenRegions: ['forehead'],
    side: null,
  },
  mouthShrugUpper: {
    expectedRegions: ['mouth', 'nose'],
    forbiddenRegions: ['forehead'],
    side: null,
  },
  mouthShrugLower: {
    expectedRegions: ['mouth', 'jaw'],
    forbiddenRegions: ['forehead'],
    side: null,
  },
};

/**
 * @typedef {{ id: string; weights: Record<string, number>; forbiddenRegions: QaRegionId[] }} CombinationPoseRule
 */

/** @type {CombinationPoseRule[]} */
export const CORE_COMBINATION_POSES_V1 = [
  {
    id: 'jawOpen_mouthSmileLeft',
    weights: { jawOpen: 1, mouthSmileLeft: 0.65 },
    forbiddenRegions: ['forehead'],
  },
  {
    id: 'jawOpen_mouthPucker',
    weights: { jawOpen: 1, mouthPucker: 0.6 },
    forbiddenRegions: ['forehead'],
  },
  {
    id: 'eyeBlinkLeft_eyeBlinkRight',
    weights: { eyeBlinkLeft: 1, eyeBlinkRight: 1 },
    forbiddenRegions: ['jaw'],
  },
  {
    id: 'mouthSmileLeft_mouthFrownRight',
    weights: { mouthSmileLeft: 1, mouthFrownRight: 0.55 },
    forbiddenRegions: ['forehead', 'nose'],
  },
];

export function listSemanticChannelsForProfile(profile) {
  if (profile === 'full-v1') {
    return Object.keys(CORE_CHANNEL_SEMANTIC_RULES_V1);
  }
  return Object.keys(CORE_CHANNEL_SEMANTIC_RULES_V1);
}

export function listCombinationPosesForProfile(profile) {
  if (profile === 'full-v1') {
    return CORE_COMBINATION_POSES_V1;
  }
  return CORE_COMBINATION_POSES_V1;
}
