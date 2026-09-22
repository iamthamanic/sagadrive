/**
 * liveact-face-anchor-ids — canonical SagaDriveFaceAnchorsV1 ids for offline scripts (#399).
 * Location: scripts/lib/liveact-face-anchor-ids.mjs
 */

export const FACE_ANCHORS_CONTRACT_VERSION = 'SagaDriveFaceAnchorsV1';

export const SAGA_DRIVE_FACE_ANCHOR_IDS = [
  'mouthUpper',
  'mouthLower',
  'mouthCornerLeft',
  'mouthCornerRight',
  'eyeLeftInner',
  'eyeLeftOuter',
  'eyeLeftUpper',
  'eyeLeftLower',
  'eyeRightInner',
  'eyeRightOuter',
  'eyeRightUpper',
  'eyeRightLower',
  'browLeftInner',
  'browLeftOuter',
  'browLeftCenter',
  'browRightInner',
  'browRightOuter',
  'browRightCenter',
  'noseTip',
  'chin',
  'forehead',
];

export function isSagaDriveFaceAnchorId(id) {
  return SAGA_DRIVE_FACE_ANCHOR_IDS.includes(id);
}
