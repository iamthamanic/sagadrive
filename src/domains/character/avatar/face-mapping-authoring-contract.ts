/**
 * SagaDriveFaceMappingAuthoringV1 — provenance / review metadata for face anchors (#419).
 * Location: src/domains/character/avatar/face-mapping-authoring-contract.ts
 *
 * Separate from SagaDriveFaceAnchorsV1 runtime bindings. Heuristic/auto proposals are never
 * reviewed ground truth unless explicitly marked. Pure domain — no React / Three.js.
 */

export const FACE_MAPPING_AUTHORING_CONTRACT_VERSION = 'SagaDriveFaceMappingAuthoringV1' as const;

export const FACE_MAPPING_AUTHORING_SOURCES = ['auto', 'manual', 'manual_override'] as const;

export type FaceMappingAuthoringSource = (typeof FACE_MAPPING_AUTHORING_SOURCES)[number];

export interface FaceMappingAuthoringAssetFingerprintV1 {
  /** Public or run-relative model path (allowlisted), without scheme. */
  readonly modelPath: string;
  /** Optional content checksum of the mesh asset when known offline. */
  readonly modelSha256?: string;
  /** Optional topology fingerprint (e.g. vertex/triangle counts). */
  readonly topologyFingerprint?: string;
  /** Cache-bust token mirrored from the published model URL (`?v=`). */
  readonly cacheBust?: string;
}

export interface SagaDriveFaceMappingAuthoringV1 {
  readonly contractVersion: typeof FACE_MAPPING_AUTHORING_CONTRACT_VERSION;
  /** How the anchors were produced. */
  readonly source: FaceMappingAuthoringSource;
  /**
   * True only after human review accepted the mapping for publish/QA.
   * Heuristic/auto output must stay false.
   */
  readonly reviewed: boolean;
  readonly asset: FaceMappingAuthoringAssetFingerprintV1;
  /** ISO timestamp when reviewed (required when reviewed=true). */
  readonly reviewedAt?: string;
  /** Free-form note for ledger / run.json. */
  readonly note?: string;
}

export interface FaceMappingAuthoringValidationIssue {
  readonly code:
    | 'contract_version_mismatch'
    | 'invalid_source'
    | 'reviewed_without_timestamp'
    | 'invalid_reviewed_at'
    | 'auto_marked_reviewed'
    | 'missing_model_path'
    | 'not_object';
  readonly detail: string;
}

/**
 * Canonical V1 reviewedAt: UTC ISO with milliseconds (`Date.prototype.toISOString()`).
 * Fail-closed — rejects impossible calendar dates (no permissive Date.parse alone).
 */
const FACE_MAPPING_REVIEWED_AT_V1_RE =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.(\d{3})Z$/;

export function isValidFaceMappingReviewedAtV1(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0) return false;
  const m = FACE_MAPPING_REVIEWED_AT_V1_RE.exec(value);
  if (!m) return false;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const hour = Number(m[4]);
  const minute = Number(m[5]);
  const second = Number(m[6]);
  const ms = Number(m[7]);
  const dt = new Date(Date.UTC(year, month - 1, day, hour, minute, second, ms));
  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() !== month - 1 ||
    dt.getUTCDate() !== day ||
    dt.getUTCHours() !== hour ||
    dt.getUTCMinutes() !== minute ||
    dt.getUTCSeconds() !== second ||
    dt.getUTCMilliseconds() !== ms
  ) {
    return false;
  }
  return dt.toISOString() === value;
}

export interface FaceMappingAuthoringValidationResult {
  readonly ok: boolean;
  readonly issues: readonly FaceMappingAuthoringValidationIssue[];
}

export function isFaceMappingAuthoringSource(value: string): value is FaceMappingAuthoringSource {
  return (FACE_MAPPING_AUTHORING_SOURCES as readonly string[]).includes(value);
}

/**
 * Fail-closed: heuristic/auto may never appear as reviewed ground truth.
 * Requires canonical V1 reviewedAt (ISO-UTC with milliseconds).
 */
export function isReviewedFaceMappingGroundTruth(
  authoring: SagaDriveFaceMappingAuthoringV1 | null | undefined,
): boolean {
  if (!authoring) return false;
  if (authoring.contractVersion !== FACE_MAPPING_AUTHORING_CONTRACT_VERSION) return false;
  if (!authoring.reviewed) return false;
  if (authoring.source === 'auto') return false;
  if (!(authoring.source === 'manual' || authoring.source === 'manual_override')) return false;
  return isValidFaceMappingReviewedAtV1(authoring.reviewedAt);
}

export function validateFaceMappingAuthoringV1(
  raw: unknown,
): FaceMappingAuthoringValidationResult {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, issues: [{ code: 'not_object', detail: 'Authoring metadata must be an object.' }] };
  }
  const record = raw as Record<string, unknown>;
  const issues: FaceMappingAuthoringValidationIssue[] = [];

  if (record.contractVersion !== FACE_MAPPING_AUTHORING_CONTRACT_VERSION) {
    issues.push({
      code: 'contract_version_mismatch',
      detail: `Expected ${FACE_MAPPING_AUTHORING_CONTRACT_VERSION}.`,
    });
  }

  const source = typeof record.source === 'string' ? record.source : '';
  if (!isFaceMappingAuthoringSource(source)) {
    issues.push({
      code: 'invalid_source',
      detail: 'source must be auto | manual | manual_override.',
    });
  }

  const reviewed = record.reviewed === true;
  if (reviewed && source === 'auto') {
    issues.push({
      code: 'auto_marked_reviewed',
      detail: 'Auto/heuristic mappings cannot be reviewed ground truth.',
    });
  }
  if (reviewed && (typeof record.reviewedAt !== 'string' || !record.reviewedAt.trim())) {
    issues.push({
      code: 'reviewed_without_timestamp',
      detail: 'reviewed=true requires reviewedAt ISO timestamp.',
    });
  } else if (reviewed && !isValidFaceMappingReviewedAtV1(record.reviewedAt)) {
    issues.push({
      code: 'invalid_reviewed_at',
      detail: 'reviewedAt must be canonical UTC ISO with milliseconds (…Z).',
    });
  }

  const asset = record.asset;
  if (!asset || typeof asset !== 'object' || Array.isArray(asset)) {
    issues.push({ code: 'missing_model_path', detail: 'asset.modelPath is required.' });
  } else {
    const modelPath = (asset as Record<string, unknown>).modelPath;
    if (typeof modelPath !== 'string' || !modelPath.trim()) {
      issues.push({ code: 'missing_model_path', detail: 'asset.modelPath is required.' });
    }
  }

  return { ok: issues.length === 0, issues };
}

/** Build unreviewed auto provenance for heuristic authoring exports. */
export function createAutoUnreviewedFaceMappingAuthoring(input: {
  modelPath: string;
  modelSha256?: string;
  topologyFingerprint?: string;
  cacheBust?: string;
  note?: string;
}): SagaDriveFaceMappingAuthoringV1 {
  return {
    contractVersion: FACE_MAPPING_AUTHORING_CONTRACT_VERSION,
    source: 'auto',
    reviewed: false,
    asset: {
      modelPath: input.modelPath,
      ...(input.modelSha256 ? { modelSha256: input.modelSha256 } : {}),
      ...(input.topologyFingerprint ? { topologyFingerprint: input.topologyFingerprint } : {}),
      ...(input.cacheBust ? { cacheBust: input.cacheBust } : {}),
    },
    ...(input.note ? { note: input.note } : {}),
  };
}
