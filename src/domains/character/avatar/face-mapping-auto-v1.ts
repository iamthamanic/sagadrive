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

export function createEmptyAnchorAuthoringMeta(
  draft: SagaDriveFaceMappingDraftV1,
): FaceMappingDraftAuthoringMeta {
  const meta: FaceMappingDraftAuthoringMeta = {};
  for (const id of SAGA_DRIVE_FACE_ANCHOR_IDS) {
    if (draft.anchors[id]) {
      // Baseline / loaded bindings are treated as manual ground truth until overridden.
      meta[id] = { source: 'manual', reviewed: false };
    }
  }
  return meta;
}

export function isProtectedFaceMappingAnchor(
  meta: FaceMappingAnchorAuthoringMetaV1 | undefined,
): boolean {
  if (!meta) return false;
  if (meta.reviewed === true) return true;
  return meta.source === 'manual' || meta.source === 'manual_override';
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
 * Protected anchors are skipped unless replaceProtected.
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

    const existing = meta[row.anchorId];
    if (!options.replaceProtected && isProtectedFaceMappingAnchor(existing)) {
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
  readonly outlier: boolean;
}

export interface FaceMappingAutoEvalSummaryV1 {
  readonly expectedAnchors: number;
  readonly successfullyMapped: number;
  readonly missing: number;
  readonly raycastMisses: number;
  readonly wrongSurfaceHits: number;
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

/**
 * Compare auto screen points vs manual screen points (same camera/frame).
 * Does not invent pass/fail thresholds — thresholdStatus is always needs-calibration.
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
  let wrongSurfaceHits = 0;

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

  // Wrong-surface: heuristic — different node than majority of midline hits (reporting only).
  const midlineNodes = rows
    .filter((r) => ['noseTip', 'chin', 'forehead', 'mouthUpper', 'mouthLower'].includes(r.anchorId))
    .map((r) => r.meshNodeIdentity)
    .filter((n): n is string => Boolean(n));
  const majority =
    midlineNodes.length > 0
      ? midlineNodes.sort(
          (a, b) =>
            midlineNodes.filter((x) => x === b).length - midlineNodes.filter((x) => x === a).length,
        )[0]
      : null;
  if (majority) {
    for (const row of rows) {
      if (row.meshNodeIdentity && row.meshNodeIdentity !== majority) wrongSurfaceHits += 1;
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
      wrongSurfaceHits,
      lrSwaps,
      medianErrorPx: med,
      p95ErrorPx: percentile(sorted, 0.95),
      maxErrorPx: sorted.length ? sorted[sorted.length - 1]! : null,
      thresholdStatus: FACE_MAPPING_AUTO_EVAL_THRESHOLD_STATUS,
      outlierAnchorIds: outlierIds,
    },
  };
}

export const FACE_MAPPING_COMPARE_EXPORT_KIND = 'SagaDriveFaceMappingCompareV1' as const;

export interface FaceMappingCompareExportScreenV1 {
  readonly x: number;
  readonly y: number;
  readonly meshLabel?: string | null;
}

export interface FaceMappingCompareExportAutoV1 {
  readonly outcome: FaceMappingAutoAnchorOutcome;
  readonly x: number | null;
  readonly y: number | null;
  readonly meshLabel?: string | null;
}

export interface FaceMappingCompareExportAnchorV1 {
  readonly anchorId: SagaDriveFaceAnchorId;
  readonly status: 'missing' | 'set' | 'invalid';
  readonly source: FaceMappingAuthoringSource | null;
  readonly binding: SagaDriveFaceAnchorTriangleBinding | null;
  readonly manualScreen: FaceMappingCompareExportScreenV1 | null;
  readonly auto: FaceMappingCompareExportAutoV1 | null;
  readonly deltaPx: number | null;
}

export interface FaceMappingCompareExportV1 {
  readonly kind: typeof FACE_MAPPING_COMPARE_EXPORT_KIND;
  readonly exportedAt: string;
  readonly setCount: number;
  readonly missingCount: number;
  readonly autoProposalCount: number;
  readonly anchors: readonly FaceMappingCompareExportAnchorV1[];
}

/** Clipboard JSON: manual draft + screen coords + last Auto proposals (no images). */
export function buildFaceMappingCompareExport(input: {
  draft: SagaDriveFaceMappingDraftV1;
  manualCoords: Readonly<
    Partial<Record<SagaDriveFaceAnchorId, { x: number; y: number; meshLabel?: string | null }>>
  >;
  autoCoords: Readonly<
    Partial<
      Record<
        SagaDriveFaceAnchorId,
        {
          outcome: FaceMappingAutoAnchorOutcome;
          x: number | null;
          y: number | null;
          meshLabel?: string | null;
        }
      >
    >
  >;
  meta?: FaceMappingDraftAuthoringMeta;
  nowIso?: string;
}): FaceMappingCompareExportV1 {
  const anchors: FaceMappingCompareExportAnchorV1[] = [];
  let setCount = 0;
  let missingCount = 0;
  let autoProposalCount = 0;

  for (const id of SAGA_DRIVE_FACE_ANCHOR_IDS) {
    const binding = input.draft.anchors[id] ?? null;
    const manual = input.manualCoords[id];
    const auto = input.autoCoords[id];
    if (auto) autoProposalCount += 1;

    let status: 'missing' | 'set' | 'invalid' = 'missing';
    if (binding) {
      // Lightweight: presence only; full validation lives in draft helpers.
      status = 'set';
      setCount += 1;
    } else {
      missingCount += 1;
    }

    let deltaPx: number | null = null;
    if (
      manual &&
      auto &&
      auto.x != null &&
      auto.y != null &&
      Number.isFinite(auto.x) &&
      Number.isFinite(auto.y)
    ) {
      deltaPx = Math.hypot(auto.x - manual.x, auto.y - manual.y);
    }

    anchors.push({
      anchorId: id,
      status,
      source: input.meta?.[id]?.source ?? null,
      binding: binding
        ? {
            nodeIdentity: binding.nodeIdentity,
            primitiveIndex: binding.primitiveIndex,
            triangleIndex: binding.triangleIndex,
            barycentric: { ...binding.barycentric },
          }
        : null,
      manualScreen: manual
        ? {
            x: Math.round(manual.x * 10) / 10,
            y: Math.round(manual.y * 10) / 10,
            ...(manual.meshLabel != null ? { meshLabel: manual.meshLabel } : {}),
          }
        : null,
      auto: auto
        ? {
            outcome: auto.outcome,
            x: auto.x != null ? Math.round(auto.x * 10) / 10 : null,
            y: auto.y != null ? Math.round(auto.y * 10) / 10 : null,
            ...(auto.meshLabel != null ? { meshLabel: auto.meshLabel } : {}),
          }
        : null,
      deltaPx: deltaPx != null ? Math.round(deltaPx * 10) / 10 : null,
    });
  }

  return {
    kind: FACE_MAPPING_COMPARE_EXPORT_KIND,
    exportedAt: input.nowIso ?? new Date().toISOString(),
    setCount,
    missingCount,
    autoProposalCount,
    anchors,
  };
}

export function stringifyFaceMappingCompareExport(
  input: Parameters<typeof buildFaceMappingCompareExport>[0],
): string {
  return `${JSON.stringify(buildFaceMappingCompareExport(input), null, 2)}\n`;
}
