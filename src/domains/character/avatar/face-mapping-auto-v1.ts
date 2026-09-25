/**
 * SagaDriveFaceMappingAutoV1 — provider-neutral auto-mapping result + merge + eval (#421).
 * Location: src/domains/character/avatar/face-mapping-auto-v1.ts
 *
 * Auto is always a proposal (source=auto, reviewed=false). Never auto-publish.
 * Pure domain — no React / Three.js / MediaPipe.
 */

import {
  SAGA_DRIVE_FACE_ANCHOR_IDS,
  type SagaDriveFaceAnchorId,
  type SagaDriveFaceAnchorTriangleBinding,
} from './face-anchor-contract';
import type { FaceMappingAuthoringSource } from './face-mapping-authoring-contract';
import {
  createEmptyFaceMappingDraft,
  setFaceMappingDraftBinding,
  type SagaDriveFaceMappingDraftV1,
} from './face-mapping-draft-v1';
import {
  classifyFaceMappingSurfaceFromNodeIdentity,
  expectedFaceMappingSurfaceClasses,
  isFaceMappingSurfaceSemanticsOk,
  type FaceMappingSurfaceClassV1,
} from './face-mapping-surface-semantics-v1';

export const FACE_MAPPING_AUTO_CONTRACT_VERSION = 'SagaDriveFaceMappingAutoV1' as const;

export const FACE_MAPPING_AUTO_SESSION_STATUSES = [
  'proposed',
  'incomplete',
  'no_face',
  'multi_face',
  'failed',
] as const;

export type FaceMappingAutoSessionStatus = (typeof FACE_MAPPING_AUTO_SESSION_STATUSES)[number];

export const FACE_MAPPING_AUTO_ANCHOR_OUTCOMES = [
  'mapped',
  'missing_landmark',
  'low_confidence',
  'raycast_miss',
  'skipped_protected',
] as const;

export type FaceMappingAutoAnchorOutcome = (typeof FACE_MAPPING_AUTO_ANCHOR_OUTCOMES)[number];

export interface FaceMappingAnchorAuthoringMetaV1 {
  readonly source: FaceMappingAuthoringSource;
  readonly confidence?: number;
  readonly reviewed?: boolean;
  /** ISO timestamp when reviewed=true (required for GT publish/sidecar). */
  readonly reviewedAt?: string;
}

export type FaceMappingDraftAuthoringMeta = Partial<
  Record<SagaDriveFaceAnchorId, FaceMappingAnchorAuthoringMetaV1>
>;

export interface FaceMappingAutoAnchorResultV1 {
  readonly anchorId: SagaDriveFaceAnchorId;
  readonly outcome: FaceMappingAutoAnchorOutcome;
  readonly binding: SagaDriveFaceAnchorTriangleBinding | null;
  readonly confidence: number | null;
  readonly landmarkAvailability: number | null;
  readonly screenX: number | null;
  readonly screenY: number | null;
  readonly meshNodeIdentity: string | null;
  readonly laterality: 'left' | 'right' | 'center' | null;
}

export interface FaceMappingAutoSessionResultV1 {
  readonly contractVersion: typeof FACE_MAPPING_AUTO_CONTRACT_VERSION;
  readonly status: FaceMappingAutoSessionStatus;
  readonly faceCount: number;
  readonly messageDe: string;
  readonly anchors: readonly FaceMappingAutoAnchorResultV1[];
  /** Map version string from infrastructure (opaque to domain consumers). */
  readonly mapVersion: string;
}

/**
 * Seed authoring meta for anchors that already have draft bindings.
 * Default (options omitted): source='auto', reviewed=false — fail-closed;
 * never invent reviewed ground truth for baseline/sidecar seeds.
 * Callers that know true manual provenance pass `defaultSource: 'manual'`.
 * `defaultReviewed` is ignored when source is auto (authoring contract forbids auto+reviewed).
 */
export function createEmptyAnchorAuthoringMeta(
  draft: SagaDriveFaceMappingDraftV1,
  options?: { defaultSource?: FaceMappingAuthoringSource; defaultReviewed?: boolean },
): FaceMappingDraftAuthoringMeta {
  const source = options?.defaultSource ?? 'auto';
  const reviewed =
    source === 'auto' ? false : (options?.defaultReviewed ?? false);
  const meta: FaceMappingDraftAuthoringMeta = {};
  for (const id of SAGA_DRIVE_FACE_ANCHOR_IDS) {
    if (draft.anchors[id]) {
      meta[id] = { source, reviewed };
    }
  }
  return meta;
}

/**
 * Protected only when a draft binding EXISTS and meta marks manual / manual_override / reviewed.
 * Meta alone (orphaned) does not protect.
 */
export function isProtectedFaceMappingAnchor(
  meta: FaceMappingAnchorAuthoringMetaV1 | undefined,
  binding: SagaDriveFaceAnchorTriangleBinding | null | undefined,
): boolean {
  if (!binding) return false;
  if (!meta) return false;
  if (meta.reviewed === true) return true;
  return meta.source === 'manual' || meta.source === 'manual_override';
}

/** Remove authoring meta for one anchor (e.g. after clear). */
export function clearFaceMappingAuthoringMetaForAnchor(
  meta: FaceMappingDraftAuthoringMeta,
  anchorId: SagaDriveFaceAnchorId,
): FaceMappingDraftAuthoringMeta {
  if (!(anchorId in meta)) return meta;
  const next: FaceMappingDraftAuthoringMeta = { ...meta };
  delete next[anchorId];
  return next;
}

export interface ApplyAutoMappingOptions {
  /** When true, overwrite protected manual / manual_override / reviewed anchors. */
  readonly replaceProtected: boolean;
  /** Landmark availability below this → low_confidence (still may bind). */
  readonly minAvailability?: number;
}

export interface ApplyAutoMappingResult {
  readonly draft: SagaDriveFaceMappingDraftV1;
  readonly meta: FaceMappingDraftAuthoringMeta;
  readonly appliedCount: number;
  readonly skippedProtectedCount: number;
  readonly mappedCount: number;
  readonly missCount: number;
}

/**
 * Merge auto proposals into a draft. Never sets reviewed=true.
 * Protected anchors are skipped unless replaceProtected — only when draft binding exists AND meta protected.
 */
export function applyAutoMappingToDraft(
  draft: SagaDriveFaceMappingDraftV1,
  session: FaceMappingAutoSessionResultV1,
  metaIn: FaceMappingDraftAuthoringMeta,
  options: ApplyAutoMappingOptions,
): ApplyAutoMappingResult {
  const minAvailability = options.minAvailability ?? 0.5;
  let draftNext = draft;
  const meta: FaceMappingDraftAuthoringMeta = { ...metaIn };
  let appliedCount = 0;
  let skippedProtectedCount = 0;
  let mappedCount = 0;
  let missCount = 0;

  for (const row of session.anchors) {
    if (row.outcome === 'mapped' && row.binding) mappedCount += 1;
    if (row.outcome === 'raycast_miss' || row.outcome === 'missing_landmark') missCount += 1;

    if (!row.binding || row.outcome !== 'mapped') continue;
    if (
      row.landmarkAvailability != null &&
      row.landmarkAvailability < minAvailability &&
      row.outcome === 'mapped'
    ) {
      // Treat as mapped but still apply — UI can show amber via confidence.
    }

    const existingBinding = draftNext.anchors[row.anchorId];
    const existingMeta = meta[row.anchorId];
    if (
      !options.replaceProtected &&
      isProtectedFaceMappingAnchor(existingMeta, existingBinding)
    ) {
      skippedProtectedCount += 1;
      continue;
    }

    draftNext = setFaceMappingDraftBinding(draftNext, row.anchorId, row.binding);
    meta[row.anchorId] = {
      source: 'auto',
      reviewed: false,
      ...(row.confidence != null ? { confidence: row.confidence } : {}),
    };
    appliedCount += 1;
  }

  return {
    draft: draftNext,
    meta,
    appliedCount,
    skippedProtectedCount,
    mappedCount,
    missCount,
  };
}

/** Mark a manually placed/edited anchor as manual_override (after auto) or manual. */
export function markFaceMappingAnchorManual(
  meta: FaceMappingDraftAuthoringMeta,
  anchorId: SagaDriveFaceAnchorId,
  hadAuto: boolean,
): FaceMappingDraftAuthoringMeta {
  return {
    ...meta,
    [anchorId]: {
      source: hadAuto || meta[anchorId]?.source === 'auto' ? 'manual_override' : 'manual',
      reviewed: false,
    },
  };
}

/**
 * Mark every bound anchor as reviewed manual ground truth.
 * Auto → manual_override (never auto+reviewed — forbidden by authoring contract).
 * Existing manual / manual_override keep their source; missing meta → manual.
 */
export function markAllBoundFaceMappingAnchorsAsReviewedManual(
  meta: FaceMappingDraftAuthoringMeta,
  draft: SagaDriveFaceMappingDraftV1,
  nowIso: string,
): FaceMappingDraftAuthoringMeta {
  const next: FaceMappingDraftAuthoringMeta = { ...meta };
  for (const id of SAGA_DRIVE_FACE_ANCHOR_IDS) {
    if (!draft.anchors[id]) continue;
    const existing = meta[id];
    const source: FaceMappingAuthoringSource =
      existing?.source === 'auto'
        ? 'manual_override'
        : (existing?.source ?? 'manual');
    next[id] = {
      source,
      reviewed: true,
      reviewedAt: nowIso,
      ...(existing?.confidence != null ? { confidence: existing.confidence } : {}),
    };
  }
  return next;
}

export function resetFaceMappingDraftAndMeta(
  draft: SagaDriveFaceMappingDraftV1,
): { draft: SagaDriveFaceMappingDraftV1; meta: FaceMappingDraftAuthoringMeta } {
  const next = createEmptyFaceMappingDraft(draft.baseline);
  return { draft: next, meta: createEmptyAnchorAuthoringMeta(next) };
}

/** Auto-vs-manual eval — thresholds are non-normative until empirically calibrated. */
export const FACE_MAPPING_AUTO_EVAL_THRESHOLD_STATUS = 'needs-calibration' as const;

export interface FaceMappingAutoEvalAnchorRowV1 {
  readonly anchorId: SagaDriveFaceAnchorId;
  readonly manualPresent: boolean;
  readonly autoPresent: boolean;
  readonly screenErrorPx: number | null;
  readonly normalizedFaceError: number | null;
  readonly landmarkAvailability: number | null;
  readonly confidence: number | null;
  readonly raycastHit: boolean;
  readonly meshNodeIdentity: string | null;
  readonly lateralityOk: boolean | null;
  readonly actualSurfaceClass: FaceMappingSurfaceClassV1 | null;
  readonly expectedSurfaceClasses: readonly FaceMappingSurfaceClassV1[];
  readonly surfaceSemanticsOk: boolean | null;
  readonly outlier: boolean;
}

export interface FaceMappingAutoEvalSummaryV1 {
  readonly expectedAnchors: number;
  readonly successfullyMapped: number;
  readonly missing: number;
  readonly raycastMisses: number;
  readonly wrongSurfaceHits: number;
  readonly surfaceMismatchCount: number;
  readonly lrSwaps: number;
  readonly medianErrorPx: number | null;
  readonly p95ErrorPx: number | null;
  readonly maxErrorPx: number | null;
  readonly thresholdStatus: typeof FACE_MAPPING_AUTO_EVAL_THRESHOLD_STATUS;
  readonly outlierAnchorIds: readonly SagaDriveFaceAnchorId[];
}

export interface FaceMappingAutoEvalReportV1 {
  readonly contractVersion: 'SagaDriveFaceMappingAutoEvalV1';
  readonly rows: readonly FaceMappingAutoEvalAnchorRowV1[];
  readonly summary: FaceMappingAutoEvalSummaryV1;
}

function percentile(sorted: readonly number[], p: number): number | null {
  if (sorted.length === 0) return null;
  if (sorted.length === 1) return sorted[0] ?? null;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1));
  return sorted[idx] ?? null;
}

function median(sorted: readonly number[]): number | null {
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid] ?? null;
  const a = sorted[mid - 1];
  const b = sorted[mid];
  if (a == null || b == null) return null;
  return (a + b) / 2;
}

function countsAsGroundTruthMeta(meta: FaceMappingAnchorAuthoringMetaV1 | undefined): boolean {
  if (!meta) return false;
  // source=auto + reviewed=false must NOT count as GT.
  if (meta.source === 'auto' && meta.reviewed !== true) return false;
  if (meta.reviewed === true) return true;
  return meta.source === 'manual' || meta.source === 'manual_override';
}

/**
 * Compare auto screen points vs manual screen points (same camera/frame).
 * Does not invent pass/fail thresholds — thresholdStatus is always needs-calibration.
 * Surface semantics use provider-neutral node-identity classification.
 */
export function evaluateAutoVsManualScreenPoints(input: {
  manualScreen: Readonly<Partial<Record<SagaDriveFaceAnchorId, { x: number; y: number }>>>;
  autoSession: FaceMappingAutoSessionResultV1;
  /** Optional face bbox width in px for normalized error; when absent normalizedFaceError is null. */
  faceWidthPx?: number;
  /** Errors above this multiple of median are flagged outlier (reporting only). */
  outlierMedianFactor?: number;
}): FaceMappingAutoEvalReportV1 {
  const factor = input.outlierMedianFactor ?? 3;
  const faceWidth = input.faceWidthPx;
  const errors: number[] = [];
  const rows: FaceMappingAutoEvalAnchorRowV1[] = [];

  let successfullyMapped = 0;
  let missing = 0;
  let raycastMisses = 0;
  let lrSwaps = 0;
  let surfaceMismatchCount = 0;

  const autoById = new Map(input.autoSession.anchors.map((a) => [a.anchorId, a]));

  for (const id of SAGA_DRIVE_FACE_ANCHOR_IDS) {
    const manual = input.manualScreen[id];
    const auto = autoById.get(id);
    const manualPresent = Boolean(manual);
    const autoPresent = Boolean(auto?.binding);
    if (auto?.outcome === 'raycast_miss') raycastMisses += 1;
    if (!autoPresent) missing += 1;
    else successfullyMapped += 1;

    let screenErrorPx: number | null = null;
    let normalizedFaceError: number | null = null;
    if (manual && auto?.screenX != null && auto.screenY != null) {
      screenErrorPx = Math.hypot(auto.screenX - manual.x, auto.screenY - manual.y);
      errors.push(screenErrorPx);
      if (faceWidth && faceWidth > 1e-6) {
        normalizedFaceError = screenErrorPx / faceWidth;
      }
    }

    // L/R check: left anchors should have smaller screen X than paired right when both auto present.
    let lateralityOk: boolean | null = null;
    if (id.endsWith('Left') || id.includes('Left')) {
      const rightId = id.replace('Left', 'Right') as SagaDriveFaceAnchorId;
      const leftAuto = auto;
      const rightAuto = autoById.get(rightId);
      if (
        leftAuto?.screenX != null &&
        rightAuto?.screenX != null &&
        Number.isFinite(leftAuto.screenX) &&
        Number.isFinite(rightAuto.screenX)
      ) {
        // Unmirrored frontal render: subject's left appears on image-right (higher x).
        lateralityOk = leftAuto.screenX > rightAuto.screenX;
        if (!lateralityOk) lrSwaps += 1;
      }
    }

    const expectedSurface = expectedFaceMappingSurfaceClasses(id);
    let actualSurfaceClass: FaceMappingSurfaceClassV1 | null = null;
    let surfaceSemanticsOk: boolean | null = null;
    if (auto?.meshNodeIdentity) {
      actualSurfaceClass = classifyFaceMappingSurfaceFromNodeIdentity(auto.meshNodeIdentity);
      surfaceSemanticsOk = isFaceMappingSurfaceSemanticsOk(id, actualSurfaceClass);
      if (!surfaceSemanticsOk) surfaceMismatchCount += 1;
    }

    rows.push({
      anchorId: id,
      manualPresent,
      autoPresent,
      screenErrorPx,
      normalizedFaceError,
      landmarkAvailability: auto?.landmarkAvailability ?? null,
      confidence: auto?.confidence ?? null,
      raycastHit: Boolean(auto?.binding),
      meshNodeIdentity: auto?.meshNodeIdentity ?? null,
      lateralityOk,
      actualSurfaceClass,
      expectedSurfaceClasses: expectedSurface,
      surfaceSemanticsOk,
      outlier: false,
    });
  }

  const sorted = [...errors].sort((a, b) => a - b);
  const med = median(sorted);
  const outlierIds: SagaDriveFaceAnchorId[] = [];
  if (med != null && med > 0) {
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      if (!row || row.screenErrorPx == null) continue;
      if (row.screenErrorPx > med * factor) {
        outlierIds.push(row.anchorId);
        rows[i] = { ...row, outlier: true };
      }
    }
  }

  return {
    contractVersion: 'SagaDriveFaceMappingAutoEvalV1',
    rows,
    summary: {
      expectedAnchors: SAGA_DRIVE_FACE_ANCHOR_IDS.length,
      successfullyMapped,
      missing,
      raycastMisses,
      wrongSurfaceHits: surfaceMismatchCount,
      surfaceMismatchCount,
      lrSwaps,
      medianErrorPx: med,
      p95ErrorPx: percentile(sorted, 0.95),
      maxErrorPx: sorted.length ? sorted[sorted.length - 1]! : null,
      thresholdStatus: FACE_MAPPING_AUTO_EVAL_THRESHOLD_STATUS,
      outlierAnchorIds: outlierIds,
    },
  };
}

// ---------------------------------------------------------------------------
// Ground-truth reference freeze (#421)
// ---------------------------------------------------------------------------

export const FACE_MAPPING_GROUND_TRUTH_REFERENCE_VERSION =
  'SagaDriveFaceMappingGroundTruthReferenceV1' as const;

export const FACE_MAPPING_GROUND_TRUTH_REFERENCE_STATUSES = [
  'reviewed_manual_complete',
  'partial_reviewed_manual',
  'unreviewed_auto',
  'missing_reviewed_ground_truth',
] as const;

export type FaceMappingGroundTruthReferenceStatusV1 =
  (typeof FACE_MAPPING_GROUND_TRUTH_REFERENCE_STATUSES)[number];

export interface FaceMappingGroundTruthScreenV1 {
  readonly x: number;
  readonly y: number;
  readonly meshLabel?: string | null;
}

export interface FaceMappingGroundTruthReferenceAnchorV1 {
  readonly anchorId: SagaDriveFaceAnchorId;
  readonly binding: SagaDriveFaceAnchorTriangleBinding;
  readonly screen: FaceMappingGroundTruthScreenV1 | null;
  readonly source: FaceMappingAuthoringSource;
  readonly reviewed: boolean;
}

export interface FaceMappingGroundTruthReferenceV1 {
  readonly contractVersion: typeof FACE_MAPPING_GROUND_TRUTH_REFERENCE_VERSION;
  readonly status: FaceMappingGroundTruthReferenceStatusV1;
  readonly validForGroundTruthComparison: boolean;
  readonly frozenAt: string;
  readonly assetFingerprint: string | null;
  readonly topologyFingerprint: string | null;
  readonly anchors: readonly FaceMappingGroundTruthReferenceAnchorV1[];
}

export type FaceMappingScreenCoordMap = Readonly<
  Partial<
    Record<SagaDriveFaceAnchorId, { x: number; y: number; meshLabel?: string | null }>
  >
>;

/**
 * Freeze a reviewed/manual draft as ground-truth reference for auto comparison.
 * valid=true only when all 21 anchors have bindings and each is reviewed OR source manual/manual_override.
 * source=auto && !reviewed never counts as GT.
 */
export function freezeFaceMappingGroundTruthReference(input: {
  draft: SagaDriveFaceMappingDraftV1;
  meta: FaceMappingDraftAuthoringMeta;
  screenCoords: FaceMappingScreenCoordMap;
  assetFingerprint?: string | null;
  topologyFingerprint?: string | null;
  nowIso?: string;
}): FaceMappingGroundTruthReferenceV1 {
  const anchors: FaceMappingGroundTruthReferenceAnchorV1[] = [];
  let boundCount = 0;
  let gtCount = 0;
  let autoUnreviewedBound = 0;

  for (const id of SAGA_DRIVE_FACE_ANCHOR_IDS) {
    const binding = input.draft.anchors[id];
    if (!binding) continue;
    boundCount += 1;
    const m = input.meta[id];
    const source: FaceMappingAuthoringSource = m?.source ?? 'auto';
    const reviewed = m?.reviewed === true;
    if (countsAsGroundTruthMeta(m)) gtCount += 1;
    if (source === 'auto' && !reviewed) autoUnreviewedBound += 1;

    const screenRaw = input.screenCoords[id];
    anchors.push({
      anchorId: id,
      binding: {
        nodeIdentity: binding.nodeIdentity,
        primitiveIndex: binding.primitiveIndex,
        triangleIndex: binding.triangleIndex,
        barycentric: { ...binding.barycentric },
      },
      screen: screenRaw
        ? {
            x: screenRaw.x,
            y: screenRaw.y,
            ...(screenRaw.meshLabel != null ? { meshLabel: screenRaw.meshLabel } : {}),
          }
        : null,
      source,
      reviewed,
    });
  }

  let status: FaceMappingGroundTruthReferenceStatusV1;
  let validForGroundTruthComparison = false;

  if (boundCount === 0) {
    status = 'missing_reviewed_ground_truth';
  } else if (gtCount === SAGA_DRIVE_FACE_ANCHOR_IDS.length) {
    status = 'reviewed_manual_complete';
    validForGroundTruthComparison = true;
  } else if (gtCount > 0) {
    status = 'partial_reviewed_manual';
  } else if (autoUnreviewedBound > 0) {
    status = 'unreviewed_auto';
  } else {
    status = 'missing_reviewed_ground_truth';
  }

  return {
    contractVersion: FACE_MAPPING_GROUND_TRUTH_REFERENCE_VERSION,
    status,
    validForGroundTruthComparison,
    frozenAt: input.nowIso ?? new Date().toISOString(),
    assetFingerprint: input.assetFingerprint ?? null,
    topologyFingerprint: input.topologyFingerprint ?? null,
    anchors,
  };
}

// ---------------------------------------------------------------------------
// Compare export (#421) — GT reference vs auto proposal
// ---------------------------------------------------------------------------

export const FACE_MAPPING_COMPARE_EXPORT_KIND = 'SagaDriveFaceMappingCompareV1' as const;

export interface FaceMappingCompareExportScreenV1 {
  readonly x: number;
  readonly y: number;
  readonly meshLabel?: string | null;
}

export interface FaceMappingCompareReferenceAnchorV1 {
  readonly anchorId: SagaDriveFaceAnchorId;
  readonly binding: SagaDriveFaceAnchorTriangleBinding;
  readonly screen: FaceMappingCompareExportScreenV1 | null;
  readonly source: FaceMappingAuthoringSource;
  readonly reviewed: boolean;
}

export interface FaceMappingCompareProposalAnchorV1 {
  readonly anchorId: SagaDriveFaceAnchorId;
  readonly binding: SagaDriveFaceAnchorTriangleBinding | null;
  readonly screen: FaceMappingCompareExportScreenV1 | null;
  readonly source: 'auto';
  readonly confidence: number | null;
  readonly outcome: FaceMappingAutoAnchorOutcome | null;
  readonly meshNodeIdentity: string | null;
  readonly actualSurfaceClass: FaceMappingSurfaceClassV1 | null;
  readonly expectedSurfaceClasses: readonly FaceMappingSurfaceClassV1[];
  readonly surfaceSemanticsOk: boolean | null;
}

export interface FaceMappingCompareAnchorDeltaV1 {
  readonly anchorId: SagaDriveFaceAnchorId;
  readonly screenErrorPx: number | null;
  readonly normalizedFaceError: number | null;
  readonly lateralityOk: boolean | null;
  readonly surfaceSemanticsOk: boolean | null;
  readonly outlier: boolean;
}

export interface FaceMappingCompareExportSummaryV1 {
  readonly expectedAnchors: number;
  readonly mapped: number;
  readonly missing: number;
  readonly medianErrorPx: number | null;
  readonly p95ErrorPx: number | null;
  readonly maxErrorPx: number | null;
  readonly lrSwaps: number;
  readonly surfaceMismatchCount: number;
  readonly thresholdStatus: typeof FACE_MAPPING_AUTO_EVAL_THRESHOLD_STATUS;
}

export interface FaceMappingCompareExportV1 {
  readonly kind: typeof FACE_MAPPING_COMPARE_EXPORT_KIND;
  readonly exportedAt: string;
  readonly validForGroundTruthComparison: boolean;
  readonly referenceStatus: FaceMappingGroundTruthReferenceStatusV1 | null;
  readonly assetFingerprint: string | null;
  readonly reference: {
    readonly anchors: readonly FaceMappingCompareReferenceAnchorV1[];
  } | null;
  readonly proposal: {
    readonly anchors: readonly FaceMappingCompareProposalAnchorV1[];
  } | null;
  /**
   * Per-anchor deltas — only populated when validForGroundTruthComparison.
   * When !valid, comparison is null (do not treat draftAfter as manualScreen).
   */
  readonly comparison: {
    readonly anchors: readonly FaceMappingCompareAnchorDeltaV1[];
  } | null;
  readonly summary: FaceMappingCompareExportSummaryV1;
  /** Optional display provenance after apply — not used as GT manualScreen. */
  readonly draftAfterProvenance?: {
    readonly setCount: number;
    readonly metaSources: Readonly<Partial<Record<SagaDriveFaceAnchorId, FaceMappingAuthoringSource>>>;
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function screenFromCoords(
  coords: FaceMappingScreenCoordMap | undefined,
  id: SagaDriveFaceAnchorId,
  fallbackX: number | null,
  fallbackY: number | null,
  meshLabel?: string | null,
): FaceMappingCompareExportScreenV1 | null {
  const c = coords?.[id];
  if (c) {
    return {
      x: round1(c.x),
      y: round1(c.y),
      ...(c.meshLabel != null ? { meshLabel: c.meshLabel } : {}),
    };
  }
  if (fallbackX != null && fallbackY != null && Number.isFinite(fallbackX) && Number.isFinite(fallbackY)) {
    return {
      x: round1(fallbackX),
      y: round1(fallbackY),
      ...(meshLabel != null ? { meshLabel } : {}),
    };
  }
  return null;
}

/**
 * Build GT-vs-auto compare report.
 * draftAfter / metaAfter are display provenance only — never used as manualScreen for deltas.
 */
export function buildFaceMappingCompareExport(input: {
  reference: FaceMappingGroundTruthReferenceV1 | null;
  autoSession: FaceMappingAutoSessionResultV1 | null;
  /** Current draft only for display provenance after apply — NOT used as manualScreen. */
  draftAfter?: SagaDriveFaceMappingDraftV1;
  metaAfter?: FaceMappingDraftAuthoringMeta;
  /** Optional override screens for proposal (else session screenX/Y). */
  proposalScreens?: FaceMappingScreenCoordMap;
  assetFingerprint?: string | null;
  faceWidthPx?: number;
  outlierMedianFactor?: number;
  nowIso?: string;
}): FaceMappingCompareExportV1 {
  const valid = input.reference?.validForGroundTruthComparison === true;
  const referenceStatus = input.reference?.status ?? null;
  const factor = input.outlierMedianFactor ?? 3;
  const faceWidth = input.faceWidthPx;

  const refById = new Map(
    (input.reference?.anchors ?? []).map((a) => [a.anchorId, a] as const),
  );
  const autoById = new Map(
    (input.autoSession?.anchors ?? []).map((a) => [a.anchorId, a] as const),
  );

  const referenceAnchors: FaceMappingCompareReferenceAnchorV1[] = [];
  for (const id of SAGA_DRIVE_FACE_ANCHOR_IDS) {
    const ref = refById.get(id);
    if (!ref) continue;
    referenceAnchors.push({
      anchorId: id,
      binding: ref.binding,
      screen: ref.screen
        ? {
            x: round1(ref.screen.x),
            y: round1(ref.screen.y),
            ...(ref.screen.meshLabel != null ? { meshLabel: ref.screen.meshLabel } : {}),
          }
        : null,
      source: ref.source,
      reviewed: ref.reviewed,
    });
  }

  const proposalAnchors: FaceMappingCompareProposalAnchorV1[] = [];
  let mapped = 0;
  let missing = 0;
  let surfaceMismatchCount = 0;

  for (const id of SAGA_DRIVE_FACE_ANCHOR_IDS) {
    const auto = autoById.get(id);
    const expected = expectedFaceMappingSurfaceClasses(id);
    const meshNodeIdentity = auto?.meshNodeIdentity ?? auto?.binding?.nodeIdentity ?? null;
    let actualSurfaceClass: FaceMappingSurfaceClassV1 | null = null;
    let surfaceSemanticsOk: boolean | null = null;
    if (meshNodeIdentity) {
      actualSurfaceClass = classifyFaceMappingSurfaceFromNodeIdentity(meshNodeIdentity);
      surfaceSemanticsOk = isFaceMappingSurfaceSemanticsOk(id, actualSurfaceClass);
      if (surfaceSemanticsOk === false) surfaceMismatchCount += 1;
    }

    const hasBinding = Boolean(auto?.binding);
    if (hasBinding) mapped += 1;
    else missing += 1;

    proposalAnchors.push({
      anchorId: id,
      binding: auto?.binding
        ? {
            nodeIdentity: auto.binding.nodeIdentity,
            primitiveIndex: auto.binding.primitiveIndex,
            triangleIndex: auto.binding.triangleIndex,
            barycentric: { ...auto.binding.barycentric },
          }
        : null,
      screen: screenFromCoords(
        input.proposalScreens,
        id,
        auto?.screenX ?? null,
        auto?.screenY ?? null,
        meshNodeIdentity,
      ),
      source: 'auto',
      confidence: auto?.confidence ?? null,
      outcome: auto?.outcome ?? null,
      meshNodeIdentity,
      actualSurfaceClass,
      expectedSurfaceClasses: expected,
      surfaceSemanticsOk,
    });
  }

  let comparison: FaceMappingCompareExportV1['comparison'] = null;
  let medianErrorPx: number | null = null;
  let p95ErrorPx: number | null = null;
  let maxErrorPx: number | null = null;
  let lrSwaps = 0;

  if (valid && input.reference) {
    const errors: number[] = [];
    const deltas: FaceMappingCompareAnchorDeltaV1[] = [];
    const proposalScreenById = new Map(
      proposalAnchors.map((p) => [p.anchorId, p] as const),
    );

    for (const id of SAGA_DRIVE_FACE_ANCHOR_IDS) {
      const ref = refById.get(id);
      const prop = proposalScreenById.get(id);
      let screenErrorPx: number | null = null;
      let normalizedFaceError: number | null = null;
      if (ref?.screen && prop?.screen) {
        screenErrorPx = Math.hypot(prop.screen.x - ref.screen.x, prop.screen.y - ref.screen.y);
        errors.push(screenErrorPx);
        if (faceWidth && faceWidth > 1e-6) {
          normalizedFaceError = screenErrorPx / faceWidth;
        }
      }

      let lateralityOk: boolean | null = null;
      if (id.endsWith('Left') || id.includes('Left')) {
        const rightId = id.replace('Left', 'Right') as SagaDriveFaceAnchorId;
        const leftScreen = prop?.screen;
        const rightScreen = proposalScreenById.get(rightId)?.screen;
        if (leftScreen && rightScreen) {
          lateralityOk = leftScreen.x > rightScreen.x;
          if (!lateralityOk) lrSwaps += 1;
        }
      }

      deltas.push({
        anchorId: id,
        screenErrorPx: screenErrorPx != null ? round1(screenErrorPx) : null,
        normalizedFaceError,
        lateralityOk,
        surfaceSemanticsOk: prop?.surfaceSemanticsOk ?? null,
        outlier: false,
      });
    }

    const sorted = [...errors].sort((a, b) => a - b);
    medianErrorPx = median(sorted);
    p95ErrorPx = percentile(sorted, 0.95);
    maxErrorPx = sorted.length ? sorted[sorted.length - 1]! : null;

    if (medianErrorPx != null && medianErrorPx > 0) {
      for (let i = 0; i < deltas.length; i += 1) {
        const d = deltas[i];
        if (!d || d.screenErrorPx == null) continue;
        if (d.screenErrorPx > medianErrorPx * factor) {
          deltas[i] = { ...d, outlier: true };
        }
      }
    }

    comparison = { anchors: deltas };
  }

  let draftAfterProvenance: FaceMappingCompareExportV1['draftAfterProvenance'];
  if (input.draftAfter) {
    let setCount = 0;
    const metaSources: Partial<Record<SagaDriveFaceAnchorId, FaceMappingAuthoringSource>> = {};
    for (const id of SAGA_DRIVE_FACE_ANCHOR_IDS) {
      if (input.draftAfter.anchors[id]) setCount += 1;
      const src = input.metaAfter?.[id]?.source;
      if (src) metaSources[id] = src;
    }
    draftAfterProvenance = { setCount, metaSources };
  }

  return {
    kind: FACE_MAPPING_COMPARE_EXPORT_KIND,
    exportedAt: input.nowIso ?? new Date().toISOString(),
    validForGroundTruthComparison: valid,
    referenceStatus,
    assetFingerprint: input.assetFingerprint ?? input.reference?.assetFingerprint ?? null,
    reference: input.reference ? { anchors: referenceAnchors } : null,
    proposal: input.autoSession ? { anchors: proposalAnchors } : null,
    comparison,
    summary: {
      expectedAnchors: SAGA_DRIVE_FACE_ANCHOR_IDS.length,
      mapped,
      missing,
      medianErrorPx: valid ? (medianErrorPx != null ? round1(medianErrorPx) : null) : null,
      p95ErrorPx: valid ? (p95ErrorPx != null ? round1(p95ErrorPx) : null) : null,
      maxErrorPx: valid ? (maxErrorPx != null ? round1(maxErrorPx) : null) : null,
      lrSwaps: valid ? lrSwaps : 0,
      surfaceMismatchCount,
      thresholdStatus: FACE_MAPPING_AUTO_EVAL_THRESHOLD_STATUS,
    },
    ...(draftAfterProvenance ? { draftAfterProvenance } : {}),
  };
}

export function stringifyFaceMappingCompareExport(
  input: Parameters<typeof buildFaceMappingCompareExport>[0],
): string {
  return `${JSON.stringify(buildFaceMappingCompareExport(input), null, 2)}\n`;
}
