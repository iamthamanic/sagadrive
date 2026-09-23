/**
 * SagaDriveFaceMappingDraftV1 — session-local manual face-mapping draft (#420).
 * Location: src/domains/character/avatar/face-mapping-draft-v1.ts
 *
 * Pure draft/status/validation for the 21 SagaDriveFaceAnchorsV1 markers.
 * No React / Three.js. Runtime format stays SagaDriveFaceAnchorsV1.
 */

import {
  FACE_ANCHORS_CONTRACT_VERSION,
  SAGA_DRIVE_FACE_ANCHOR_IDS,
  type SagaDriveFaceAnchorId,
  type SagaDriveFaceAnchorTriangleBinding,
  type SagaDriveFaceAnchorsManifestV1,
  validateFaceAnchorTriangleBinding,
} from './face-anchor-contract';

export const FACE_MAPPING_DRAFT_CONTRACT_VERSION = 'SagaDriveFaceMappingDraftV1' as const;

export const FACE_MAPPING_MARKER_STATUSES = [
  'missing',
  'set',
  'invalid',
  'reviewed',
] as const;

export type FaceMappingMarkerStatus = (typeof FACE_MAPPING_MARKER_STATUSES)[number];

export const FACE_MAPPING_MARKER_GROUPS = [
  'mouth',
  'eyeLeft',
  'eyeRight',
  'brow',
  'face',
] as const;

export type FaceMappingMarkerGroupId = (typeof FACE_MAPPING_MARKER_GROUPS)[number];

export interface FaceMappingMarkerGroupV1 {
  readonly id: FaceMappingMarkerGroupId;
  /** German UI label. */
  readonly labelDe: string;
  readonly anchorIds: readonly SagaDriveFaceAnchorId[];
}

/** Canonical UI grouping for the 21 markers. */
export const FACE_MAPPING_MARKER_GROUP_DEFS: readonly FaceMappingMarkerGroupV1[] = [
  {
    id: 'mouth',
    labelDe: 'Mund',
    anchorIds: ['mouthUpper', 'mouthLower', 'mouthCornerLeft', 'mouthCornerRight'],
  },
  {
    id: 'eyeLeft',
    labelDe: 'Linkes Auge',
    anchorIds: ['eyeLeftInner', 'eyeLeftOuter', 'eyeLeftUpper', 'eyeLeftLower'],
  },
  {
    id: 'eyeRight',
    labelDe: 'Rechtes Auge',
    anchorIds: ['eyeRightInner', 'eyeRightOuter', 'eyeRightUpper', 'eyeRightLower'],
  },
  {
    id: 'brow',
    labelDe: 'Brauen',
    anchorIds: [
      'browLeftInner',
      'browLeftOuter',
      'browLeftCenter',
      'browRightInner',
      'browRightOuter',
      'browRightCenter',
    ],
  },
  {
    id: 'face',
    labelDe: 'Gesicht',
    anchorIds: ['noseTip', 'chin', 'forehead'],
  },
];

/** German labels for marker list rows. */
export const FACE_MAPPING_ANCHOR_LABEL_DE: Readonly<Record<SagaDriveFaceAnchorId, string>> = {
  mouthUpper: 'Oberlippe',
  mouthLower: 'Unterlippe',
  mouthCornerLeft: 'Mundwinkel links',
  mouthCornerRight: 'Mundwinkel rechts',
  eyeLeftInner: 'Auge links innen',
  eyeLeftOuter: 'Auge links außen',
  eyeLeftUpper: 'Auge links oben',
  eyeLeftLower: 'Auge links unten',
  eyeRightInner: 'Auge rechts innen',
  eyeRightOuter: 'Auge rechts außen',
  eyeRightUpper: 'Auge rechts oben',
  eyeRightLower: 'Auge rechts unten',
  browLeftInner: 'Braue links innen',
  browLeftOuter: 'Braue links außen',
  browLeftCenter: 'Braue links Mitte',
  browRightInner: 'Braue rechts innen',
  browRightOuter: 'Braue rechts außen',
  browRightCenter: 'Braue rechts Mitte',
  noseTip: 'Nasenspitze',
  chin: 'Kinn',
  forehead: 'Stirn',
};

/** Short German labels for 3D overlay (readable next to dots). */
export const FACE_MAPPING_ANCHOR_SHORT_DE: Readonly<Record<SagaDriveFaceAnchorId, string>> = {
  mouthUpper: 'Mund ↑',
  mouthLower: 'Mund ↓',
  mouthCornerLeft: 'Mund L',
  mouthCornerRight: 'Mund R',
  eyeLeftInner: 'Auge L ·',
  eyeLeftOuter: 'Auge L ·',
  eyeLeftUpper: 'Auge L ↑',
  eyeLeftLower: 'Auge L ↓',
  eyeRightInner: 'Auge R ·',
  eyeRightOuter: 'Auge R ·',
  eyeRightUpper: 'Auge R ↑',
  eyeRightLower: 'Auge R ↓',
  browLeftInner: 'Braue L ·',
  browLeftOuter: 'Braue L ·',
  browLeftCenter: 'Braue L',
  browRightInner: 'Braue R ·',
  browRightOuter: 'Braue R ·',
  browRightCenter: 'Braue R',
  noseTip: 'Nase',
  chin: 'Kinn',
  forehead: 'Stirn',
};

export type FaceMappingDraftAnchors = Partial<
  Record<SagaDriveFaceAnchorId, SagaDriveFaceAnchorTriangleBinding | null>
>;

export interface SagaDriveFaceMappingDraftV1 {
  readonly contractVersion: typeof FACE_MAPPING_DRAFT_CONTRACT_VERSION;
  /** Snapshot when Face Setup opened (Cancel / Reset target). */
  readonly baseline: SagaDriveFaceAnchorsManifestV1 | null;
  /** Working bindings; null value = explicitly cleared. */
  readonly anchors: FaceMappingDraftAnchors;
  readonly selectedAnchorId: SagaDriveFaceAnchorId | null;
  readonly dirty: boolean;
}

export function createEmptyFaceMappingDraft(
  baseline: SagaDriveFaceAnchorsManifestV1 | null = null,
): SagaDriveFaceMappingDraftV1 {
  const anchors: FaceMappingDraftAnchors = {};
  if (baseline) {
    for (const id of SAGA_DRIVE_FACE_ANCHOR_IDS) {
      const binding = baseline.anchors[id];
      if (binding) anchors[id] = { ...binding, barycentric: { ...binding.barycentric } };
    }
  }
  return {
    contractVersion: FACE_MAPPING_DRAFT_CONTRACT_VERSION,
    baseline,
    anchors,
    selectedAnchorId: null,
    dirty: false,
  };
}

export function selectFaceMappingAnchor(
  draft: SagaDriveFaceMappingDraftV1,
  anchorId: SagaDriveFaceAnchorId | null,
): SagaDriveFaceMappingDraftV1 {
  return { ...draft, selectedAnchorId: anchorId };
}

export function setFaceMappingDraftBinding(
  draft: SagaDriveFaceMappingDraftV1,
  anchorId: SagaDriveFaceAnchorId,
  binding: SagaDriveFaceAnchorTriangleBinding,
): SagaDriveFaceMappingDraftV1 {
  return {
    ...draft,
    anchors: { ...draft.anchors, [anchorId]: binding },
    dirty: true,
  };
}

export function clearFaceMappingDraftBinding(
  draft: SagaDriveFaceMappingDraftV1,
  anchorId: SagaDriveFaceAnchorId,
): SagaDriveFaceMappingDraftV1 {
  return {
    ...draft,
    anchors: { ...draft.anchors, [anchorId]: null },
    dirty: true,
  };
}

/** Reset working anchors to the baseline captured at open. */
export function resetFaceMappingDraft(draft: SagaDriveFaceMappingDraftV1): SagaDriveFaceMappingDraftV1 {
  return createEmptyFaceMappingDraft(draft.baseline);
}

export function resolveFaceMappingMarkerStatus(
  draft: SagaDriveFaceMappingDraftV1,
  anchorId: SagaDriveFaceAnchorId,
  options?: { reviewedAnchorIds?: ReadonlySet<SagaDriveFaceAnchorId> },
): FaceMappingMarkerStatus {
  const binding = draft.anchors[anchorId];
  if (binding == null) return 'missing';
  const validation = validateFaceAnchorTriangleBinding(binding, anchorId);
  if (!validation.ok) return 'invalid';
  if (options?.reviewedAnchorIds?.has(anchorId)) return 'reviewed';
  return 'set';
}

export function faceMappingDraftToManifest(
  draft: SagaDriveFaceMappingDraftV1,
): SagaDriveFaceAnchorsManifestV1 {
  const anchors: Partial<Record<SagaDriveFaceAnchorId, SagaDriveFaceAnchorTriangleBinding>> = {};
  for (const id of SAGA_DRIVE_FACE_ANCHOR_IDS) {
    const binding = draft.anchors[id];
    if (!binding) continue;
    const validation = validateFaceAnchorTriangleBinding(binding, id);
    if (!validation.ok) continue;
    anchors[id] = binding;
  }
  return {
    contractVersion: FACE_ANCHORS_CONTRACT_VERSION,
    anchors,
  };
}

export interface FaceMappingDraftValidationResult {
  readonly ok: boolean;
  readonly setCount: number;
  readonly missingCount: number;
  readonly invalidCount: number;
}

export function validateFaceMappingDraft(
  draft: SagaDriveFaceMappingDraftV1,
): FaceMappingDraftValidationResult {
  let setCount = 0;
  let missingCount = 0;
  let invalidCount = 0;
  for (const id of SAGA_DRIVE_FACE_ANCHOR_IDS) {
    const status = resolveFaceMappingMarkerStatus(draft, id);
    if (status === 'missing') missingCount += 1;
    else if (status === 'invalid') invalidCount += 1;
    else setCount += 1;
  }
  return {
    ok: invalidCount === 0 && setCount > 0,
    setCount,
    missingCount,
    invalidCount,
  };
}
