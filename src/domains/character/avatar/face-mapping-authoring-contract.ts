/**
 * SagaDriveFaceMappingAuthoringV1 — provenance / review metadata for face anchors (#419 + agent review).
 * Location: src/domains/character/avatar/face-mapping-authoring-contract.ts
 *
 * Separate from SagaDriveFaceAnchorsV1 runtime bindings.
 * Mapping `source` (how anchors were produced) ≠ `reviewStatus` (who accepted GT).
 * Pure domain — no React / Three.js.
 */

export const FACE_MAPPING_AUTHORING_CONTRACT_VERSION = 'SagaDriveFaceMappingAuthoringV1' as const;

export const FACE_MAPPING_AUTHORING_SOURCES = ['auto', 'manual', 'manual_override'] as const;

export type FaceMappingAuthoringSource = (typeof FACE_MAPPING_AUTHORING_SOURCES)[number];

/** Who accepted the mapping as publish/QA ground truth. Distinct from `source`. */
export const FACE_MAPPING_REVIEW_STATUSES = [
  'unreviewed',
  'agent_reviewed',
  'human_reviewed',
] as const;

export type FaceMappingReviewStatus = (typeof FACE_MAPPING_REVIEW_STATUSES)[number];

export interface FaceMappingAuthoringAssetFingerprintV1 {
  /** Public or run-relative model path (allowlisted), without scheme. */
  readonly modelPath: string;
  /** Optional content checksum of the mesh asset when known offline. */
  readonly modelSha256?: string;
  /**
   * SHA-256 of the reviewed `face-anchors.json` bytes (hex).
   * Functional QA publish gate requires this so remapped anchors cannot reuse stale reviewed provenance.
   */
  readonly anchorsSha256?: string;
  /** Optional topology fingerprint (e.g. vertex/triangle counts). */
  readonly topologyFingerprint?: string;
  /** Cache-bust token mirrored from the published model URL (`?v=`). */
  readonly cacheBust?: string;
}

/**
 * Compact pointer to a completed `face-anchor-agent-review-v1` ledger.
 * Full pass reports live under the run evidence directory — not in this sidecar.
 */
export interface FaceMappingAgentReviewProvenanceV1 {
  readonly protocolVersion: 'face-anchor-agent-review-v1';
  /** SHA-256 of the evidence manifest JSON bytes. */
  readonly evidenceManifestSha256: string;
  readonly requiredPasses: 5;
  readonly completedPasses: number;
  readonly aggregationPass: boolean;
  /** ISO-UTC with milliseconds when aggregation finalized. */
  readonly aggregatedAt: string;
  /**
   * Path to the `agent-review/` ledger directory (absolute or repo-relative).
   * Required so Ground Truth cannot be faked from sidecar literals alone.
   */
  readonly ledgerDir: string;
}

export interface SagaDriveFaceMappingAuthoringV1 {
  readonly contractVersion: typeof FACE_MAPPING_AUTHORING_CONTRACT_VERSION;
  /** How the anchors were produced (auto / human authoring). Never use `manual` to fake agent review. */
  readonly source: FaceMappingAuthoringSource;
  /**
   * Legacy boolean mirror of review acceptance.
   * Prefer `reviewStatus`. When absent, migrate: reviewed+manual* → human_reviewed.
   */
  readonly reviewed: boolean;
  /**
   * Explicit review kind. Required for new agent-reviewed runs.
   * Legacy human GT may omit this and be resolved via {@link resolveFaceMappingReviewStatus}.
   */
  readonly reviewStatus?: FaceMappingReviewStatus;
  readonly asset: FaceMappingAuthoringAssetFingerprintV1;
  /** ISO timestamp when reviewed (required when reviewed=true / non-unreviewed). */
  readonly reviewedAt?: string;
  /** Present when reviewStatus=agent_reviewed. */
  readonly agentReview?: FaceMappingAgentReviewProvenanceV1;
  /** Free-form note for ledger / run.json. */
  readonly note?: string;
}

export interface FaceMappingAuthoringValidationIssue {
  readonly code:
    | 'contract_version_mismatch'
    | 'invalid_source'
    | 'invalid_review_status'
    | 'reviewed_without_timestamp'
    | 'invalid_reviewed_at'
    | 'auto_marked_reviewed'
    | 'agent_review_requires_provenance'
    | 'agent_review_incomplete'
    | 'manual_source_fakes_agent_review'
    | 'human_reviewed_requires_manual_source'
    | 'reviewed_status_mismatch'
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

export function isFaceMappingReviewStatus(value: string): value is FaceMappingReviewStatus {
  return (FACE_MAPPING_REVIEW_STATUSES as readonly string[]).includes(value);
}

/**
 * Resolve review status with controlled legacy migration.
 * Never upgrades unreviewed → agent_reviewed.
 */
export function resolveFaceMappingReviewStatus(
  authoring: SagaDriveFaceMappingAuthoringV1 | null | undefined,
): FaceMappingReviewStatus {
  if (!authoring) return 'unreviewed';
  if (authoring.reviewStatus && isFaceMappingReviewStatus(authoring.reviewStatus)) {
    return authoring.reviewStatus;
  }
  // Legacy: reviewed + manual* ⇒ human_reviewed. Never treat as agent_reviewed.
  if (
    authoring.reviewed === true &&
    (authoring.source === 'manual' || authoring.source === 'manual_override') &&
    isValidFaceMappingReviewedAtV1(authoring.reviewedAt)
  ) {
    return 'human_reviewed';
  }
  return 'unreviewed';
}

function isValidAgentReviewProvenance(value: unknown): value is FaceMappingAgentReviewProvenanceV1 {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const r = value as Record<string, unknown>;
  if (r.protocolVersion !== 'face-anchor-agent-review-v1') return false;
  if (typeof r.evidenceManifestSha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(r.evidenceManifestSha256)) {
    return false;
  }
  if (r.requiredPasses !== 5) return false;
  if (typeof r.completedPasses !== 'number' || r.completedPasses !== 5) return false;
  if (r.aggregationPass !== true) return false;
  if (typeof r.ledgerDir !== 'string' || !r.ledgerDir.trim()) return false;
  return isValidFaceMappingReviewedAtV1(r.aggregatedAt);
}

/**
 * Publish/QA ground truth: human_reviewed (legacy-compatible) OR agent_reviewed with provenance.
 * JSON-only `reviewed:true` without reviewStatus/provenance is not agent GT.
 */
export function isReviewedFaceMappingGroundTruth(
  authoring: SagaDriveFaceMappingAuthoringV1 | null | undefined,
): boolean {
  if (!authoring) return false;
  if (authoring.contractVersion !== FACE_MAPPING_AUTHORING_CONTRACT_VERSION) return false;
  const status = resolveFaceMappingReviewStatus(authoring);
  if (status === 'unreviewed') return false;
  if (!authoring.reviewed) return false;
  if (!isValidFaceMappingReviewedAtV1(authoring.reviewedAt)) return false;

  if (status === 'human_reviewed') {
    if (authoring.source === 'auto') return false;
    if (!(authoring.source === 'manual' || authoring.source === 'manual_override')) return false;
    return true;
  }

  if (status === 'agent_reviewed') {
    // Must not invent human source to fake agent path.
    if (authoring.source === 'manual' || authoring.source === 'manual_override') {
      // Allowed only if reviewStatus is explicitly agent_reviewed AND provenance present —
      // but product rule: source=manual must NOT be used to pretend agent review.
      return false;
    }
    if (authoring.source !== 'auto') return false;
    return isValidAgentReviewProvenance(authoring.agentReview);
  }

  return false;
}

/**
 * Refuse applying agent review when existing GT is human_reviewed.
 */
export function canApplyAgentReviewToAuthoring(
  existing: SagaDriveFaceMappingAuthoringV1 | null | undefined,
): { ok: true } | { ok: false; reason: 'human_reviewed_immutable' } {
  if (!existing) return { ok: true };
  if (resolveFaceMappingReviewStatus(existing) === 'human_reviewed') {
    return { ok: false, reason: 'human_reviewed_immutable' };
  }
  return { ok: true };
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

  const hasExplicitStatus =
    typeof record.reviewStatus === 'string' && record.reviewStatus.length > 0;
  if (hasExplicitStatus && !isFaceMappingReviewStatus(String(record.reviewStatus))) {
    issues.push({
      code: 'invalid_review_status',
      detail: 'reviewStatus must be unreviewed | agent_reviewed | human_reviewed.',
    });
  }

  const reviewed = record.reviewed === true;
  const statusRaw = hasExplicitStatus
    ? (record.reviewStatus as FaceMappingReviewStatus)
    : null;

  // Legacy auto+reviewed without agent path.
  if (reviewed && source === 'auto' && statusRaw !== 'agent_reviewed') {
    issues.push({
      code: 'auto_marked_reviewed',
      detail: 'Auto mappings cannot be human GT; use reviewStatus=agent_reviewed with provenance.',
    });
  }

  if (statusRaw === 'agent_reviewed') {
    if (source === 'manual' || source === 'manual_override') {
      issues.push({
        code: 'manual_source_fakes_agent_review',
        detail: 'source=manual must not be used to pretend agent review.',
      });
    }
    if (!isValidAgentReviewProvenance(record.agentReview)) {
      issues.push({
        code: 'agent_review_requires_provenance',
        detail: 'agent_reviewed requires complete face-anchor-agent-review-v1 provenance.',
      });
    } else if (
      (record.agentReview as FaceMappingAgentReviewProvenanceV1).completedPasses !== 5 ||
      (record.agentReview as FaceMappingAgentReviewProvenanceV1).aggregationPass !== true
    ) {
      issues.push({
        code: 'agent_review_incomplete',
        detail: 'agent review must have 5/5 completed passes and aggregationPass=true.',
      });
    }
    if (!reviewed) {
      issues.push({
        code: 'reviewed_status_mismatch',
        detail: 'reviewStatus=agent_reviewed requires reviewed=true.',
      });
    }
  }

  if (statusRaw === 'human_reviewed') {
    if (!(source === 'manual' || source === 'manual_override')) {
      issues.push({
        code: 'human_reviewed_requires_manual_source',
        detail: 'human_reviewed requires source manual | manual_override.',
      });
    }
    if (!reviewed) {
      issues.push({
        code: 'reviewed_status_mismatch',
        detail: 'reviewStatus=human_reviewed requires reviewed=true.',
      });
    }
  }

  if (
    reviewed &&
    (typeof record.reviewedAt !== 'string' || !record.reviewedAt.trim())
  ) {
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
  anchorsSha256?: string;
  topologyFingerprint?: string;
  cacheBust?: string;
  note?: string;
}): SagaDriveFaceMappingAuthoringV1 {
  return {
    contractVersion: FACE_MAPPING_AUTHORING_CONTRACT_VERSION,
    source: 'auto',
    reviewed: false,
    reviewStatus: 'unreviewed',
    asset: {
      modelPath: input.modelPath,
      ...(input.modelSha256 ? { modelSha256: input.modelSha256 } : {}),
      ...(input.anchorsSha256 ? { anchorsSha256: input.anchorsSha256 } : {}),
      ...(input.topologyFingerprint ? { topologyFingerprint: input.topologyFingerprint } : {}),
      ...(input.cacheBust ? { cacheBust: input.cacheBust } : {}),
    },
    ...(input.note ? { note: input.note } : {}),
  };
}

/** Build agent_reviewed authoring after successful 5/5 aggregation (source stays auto). */
export function createAgentReviewedFaceMappingAuthoring(input: {
  modelPath: string;
  modelSha256: string;
  anchorsSha256: string;
  topologyFingerprint: string;
  evidenceManifestSha256: string;
  aggregatedAt: string;
  /** Path to completed `agent-review/` ledger (required for verifiable GT). */
  ledgerDir: string;
  cacheBust?: string;
  note?: string;
}): SagaDriveFaceMappingAuthoringV1 {
  return {
    contractVersion: FACE_MAPPING_AUTHORING_CONTRACT_VERSION,
    source: 'auto',
    reviewed: true,
    reviewStatus: 'agent_reviewed',
    reviewedAt: input.aggregatedAt,
    asset: {
      modelPath: input.modelPath,
      modelSha256: input.modelSha256,
      anchorsSha256: input.anchorsSha256,
      topologyFingerprint: input.topologyFingerprint,
      ...(input.cacheBust ? { cacheBust: input.cacheBust } : {}),
    },
    agentReview: {
      protocolVersion: 'face-anchor-agent-review-v1',
      evidenceManifestSha256: input.evidenceManifestSha256,
      requiredPasses: 5,
      completedPasses: 5,
      aggregationPass: true,
      aggregatedAt: input.aggregatedAt,
      ledgerDir: input.ledgerDir,
    },
    ...(input.note ? { note: input.note } : {}),
  };
}
