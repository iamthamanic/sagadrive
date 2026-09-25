/**
 * Face-mapping surface semantics V1 — provider-neutral mesh identity classification (#421).
 * Location: src/domains/character/avatar/face-mapping-surface-semantics-v1.ts
 *
 * Classifies raycast hit node identities into surface classes for auto-mapping QA.
 * No asset-specific name hacks (e.g. if (name==="Eyes")). Pure domain — no React / Three / MediaPipe.
 */

import type { SagaDriveFaceAnchorId } from './face-anchor-contract';

export const FACE_MAPPING_SURFACE_SEMANTICS_VERSION =
  'SagaDriveFaceMappingSurfaceSemanticsV1' as const;

export const FACE_MAPPING_SURFACE_CLASSES_V1 = [
  'face_skin',
  'eyeball',
  'eyelid_or_skin',
  'eyelash',
  'eyebrow',
  'hair',
  'equipment',
  'helper',
  'unknown',
] as const;

export type FaceMappingSurfaceClassV1 = (typeof FACE_MAPPING_SURFACE_CLASSES_V1)[number];

function tokenizeNodeIdentity(nodeIdentity: string): readonly string[] {
  return nodeIdentity
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((t) => t.length > 0);
}

/**
 * Case-insensitive token heuristics. More specific matches first (eyelash before eye).
 */
export function classifyFaceMappingSurfaceFromNodeIdentity(
  nodeIdentity: string,
): FaceMappingSurfaceClassV1 {
  const raw = nodeIdentity.trim();
  if (!raw) return 'unknown';
  const tokens = tokenizeNodeIdentity(raw);
  const joined = tokens.join('_');
  const has = (token: string): boolean => tokens.includes(token);
  const hasAny = (...cands: string[]): boolean => cands.some((c) => has(c));

  if (hasAny('helper', 'debug', 'gizmo', 'null', 'empty')) return 'helper';
  if (hasAny('weapon', 'equip', 'equipment', 'armor', 'accessory', 'gear')) return 'equipment';
  if (hasAny('eyelash', 'lash', 'eyelashes', 'lashes') || joined.includes('eyelash') || joined.includes('lash')) {
    return 'eyelash';
  }
  if (
    hasAny('eyebrow', 'brow', 'eyebrows', 'brows') ||
    joined.includes('eyebrow') ||
    (joined.includes('brow') && !joined.includes('elbow'))
  ) {
    return 'eyebrow';
  }
  // eyelid / lid before bare "eye"
  if (hasAny('eyelid', 'eyelids') || joined.includes('eyelid') || (has('lid') && joined.includes('eye'))) {
    return 'eyelid_or_skin';
  }
  if (
    hasAny('eye', 'eyes', 'iris', 'sclera', 'eyeball', 'pupil', 'cornea') ||
    joined.includes('eyeball') ||
    joined.includes('eye')
  ) {
    return 'eyeball';
  }
  if (hasAny('hair', 'scalp', 'wig', 'fringe', 'bangs') || joined.includes('hair')) return 'hair';
  if (
    hasAny('face', 'skin', 'head', 'body', 'cheek', 'jaw', 'forehead', 'nose', 'mouth', 'lip') ||
    joined.includes('face') ||
    joined.includes('head') ||
    joined.includes('skin')
  ) {
    return 'face_skin';
  }
  return 'unknown';
}

const FACE_SKIN_ONLY: readonly FaceMappingSurfaceClassV1[] = ['face_skin'];
const EYE_CANTHUS: readonly FaceMappingSurfaceClassV1[] = ['eyelid_or_skin', 'face_skin'];
const EYE_LID: readonly FaceMappingSurfaceClassV1[] = [
  'eyelid_or_skin',
  'face_skin',
  'eyelash',
];
const BROW: readonly FaceMappingSurfaceClassV1[] = ['eyebrow', 'face_skin'];

/**
 * Expected surface classes per SagaDrive face anchor.
 * Eyeball alone is never the sole/expected hit for eye canthus or lids (mismatch).
 */
export function expectedFaceMappingSurfaceClasses(
  anchorId: SagaDriveFaceAnchorId,
): readonly FaceMappingSurfaceClassV1[] {
  switch (anchorId) {
    case 'mouthUpper':
    case 'mouthLower':
    case 'mouthCornerLeft':
    case 'mouthCornerRight':
    case 'noseTip':
    case 'chin':
    case 'forehead':
      return FACE_SKIN_ONLY;
    case 'eyeLeftInner':
    case 'eyeLeftOuter':
    case 'eyeRightInner':
    case 'eyeRightOuter':
      return EYE_CANTHUS;
    case 'eyeLeftUpper':
    case 'eyeLeftLower':
    case 'eyeRightUpper':
    case 'eyeRightLower':
      return EYE_LID;
    case 'browLeftInner':
    case 'browLeftOuter':
    case 'browLeftCenter':
    case 'browRightInner':
    case 'browRightOuter':
    case 'browRightCenter':
      return BROW;
    default: {
      const _exhaustive: never = anchorId;
      return _exhaustive;
    }
  }
}

/**
 * Ok when actual class is among expected for the anchor.
 * Rules: eye canthus/lids on eyeball = NOT ok; mouth/nose/chin on non-face_skin = NOT ok.
 */
export function isFaceMappingSurfaceSemanticsOk(
  anchorId: SagaDriveFaceAnchorId,
  actualClass: FaceMappingSurfaceClassV1,
): boolean {
  return expectedFaceMappingSurfaceClasses(anchorId).includes(actualClass);
}
