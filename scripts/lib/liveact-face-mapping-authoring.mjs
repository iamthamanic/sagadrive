/**
 * liveact-face-mapping-authoring — offline mirror of SagaDriveFaceMappingAuthoringV1 (#419 + agent review).
 * Location: scripts/lib/liveact-face-mapping-authoring.mjs
 *
 * Keep in sync with src/domains/character/avatar/face-mapping-authoring-contract.ts.
 * Mapping source ≠ reviewStatus. Human review stays valid; agent_reviewed needs provenance.
 */

export const FACE_MAPPING_AUTHORING_CONTRACT_VERSION = 'SagaDriveFaceMappingAuthoringV1';

export const FACE_MAPPING_AUTHORING_SOURCES = ['auto', 'manual', 'manual_override'];

export const FACE_MAPPING_REVIEW_STATUSES = ['unreviewed', 'agent_reviewed', 'human_reviewed'];

/**
 * @param {string} value
 * @returns {value is 'auto' | 'manual' | 'manual_override'}
 */
export function isFaceMappingAuthoringSource(value) {
  return FACE_MAPPING_AUTHORING_SOURCES.includes(value);
}

/**
 * @param {string} value
 * @returns {value is 'unreviewed' | 'agent_reviewed' | 'human_reviewed'}
 */
export function isFaceMappingReviewStatus(value) {
  return FACE_MAPPING_REVIEW_STATUSES.includes(value);
}

/**
 * Canonical V1 reviewedAt: UTC ISO with milliseconds (`Date.prototype.toISOString()`).
 * @param {unknown} value
 * @returns {value is string}
 */
export function isValidFaceMappingReviewedAtV1(value) {
  if (typeof value !== 'string' || value.length === 0) return false;
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.(\d{3})Z$/.exec(value);
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

/**
 * @param {unknown} value
 */
function isValidAgentReviewProvenance(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const r = /** @type {Record<string, unknown>} */ (value);
  if (r.protocolVersion !== 'face-anchor-agent-review-v1') return false;
  if (typeof r.evidenceManifestSha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(r.evidenceManifestSha256)) {
    return false;
  }
  if (r.requiredPasses !== 5) return false;
  if (typeof r.completedPasses !== 'number' || r.completedPasses !== 5) return false;
  if (r.aggregationPass !== true) return false;
  return isValidFaceMappingReviewedAtV1(r.aggregatedAt);
}

/**
 * @param {unknown} authoring
 * @returns {'unreviewed' | 'agent_reviewed' | 'human_reviewed'}
 */
export function resolveFaceMappingReviewStatus(authoring) {
  if (!authoring || typeof authoring !== 'object') return 'unreviewed';
  const record = /** @type {Record<string, unknown>} */ (authoring);
  if (typeof record.reviewStatus === 'string' && isFaceMappingReviewStatus(record.reviewStatus)) {
    return record.reviewStatus;
  }
  if (
    record.reviewed === true &&
    (record.source === 'manual' || record.source === 'manual_override') &&
    isValidFaceMappingReviewedAtV1(record.reviewedAt)
  ) {
    return 'human_reviewed';
  }
  return 'unreviewed';
}

/**
 * Publish/QA ground truth: human_reviewed (legacy) OR agent_reviewed with full provenance.
 * @param {unknown} authoring
 */
export function isReviewedFaceMappingGroundTruth(authoring) {
  if (!authoring || typeof authoring !== 'object') return false;
  const record = /** @type {Record<string, unknown>} */ (authoring);
  if (record.contractVersion !== FACE_MAPPING_AUTHORING_CONTRACT_VERSION) return false;
  if (record.reviewed !== true) return false;
  if (!isValidFaceMappingReviewedAtV1(record.reviewedAt)) return false;
  const status = resolveFaceMappingReviewStatus(authoring);
  if (status === 'unreviewed') return false;
  if (status === 'human_reviewed') {
    if (record.source === 'auto') return false;
    return record.source === 'manual' || record.source === 'manual_override';
  }
  if (status === 'agent_reviewed') {
    if (record.source === 'manual' || record.source === 'manual_override') return false;
    if (record.source !== 'auto') return false;
    return isValidAgentReviewProvenance(record.agentReview);
  }
  return false;
}

/**
 * @param {unknown} existing
 * @returns {{ ok: true } | { ok: false; reason: 'human_reviewed_immutable' }}
 */
export function canApplyAgentReviewToAuthoring(existing) {
  if (!existing) return { ok: true };
  if (resolveFaceMappingReviewStatus(existing) === 'human_reviewed') {
    return { ok: false, reason: 'human_reviewed_immutable' };
  }
  return { ok: true };
}

/**
 * @param {unknown} raw
 * @returns {{ ok: boolean; issues: Array<{ code: string; detail: string }> }}
 */
export function validateFaceMappingAuthoringV1(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, issues: [{ code: 'not_object', detail: 'Authoring metadata must be an object.' }] };
  }
  const record = /** @type {Record<string, unknown>} */ (raw);
  /** @type {Array<{ code: string; detail: string }>} */
  const issues = [];

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
    ? /** @type {'unreviewed' | 'agent_reviewed' | 'human_reviewed'} */ (record.reviewStatus)
    : null;

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
    const modelPath = /** @type {Record<string, unknown>} */ (asset).modelPath;
    if (typeof modelPath !== 'string' || !modelPath.trim()) {
      issues.push({ code: 'missing_model_path', detail: 'asset.modelPath is required.' });
    }
  }

  return { ok: issues.length === 0, issues };
}

/**
 * @param {{ modelPath: string; modelSha256?: string; anchorsSha256?: string; topologyFingerprint?: string; cacheBust?: string; note?: string }} input
 */
export function createAutoUnreviewedFaceMappingAuthoring(input) {
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

/**
 * @param {{
 *   modelPath: string;
 *   modelSha256: string;
 *   anchorsSha256: string;
 *   topologyFingerprint: string;
 *   evidenceManifestSha256: string;
 *   aggregatedAt: string;
 *   cacheBust?: string;
 *   note?: string;
 * }} input
 */
export function createAgentReviewedFaceMappingAuthoring(input) {
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
    },
    ...(input.note ? { note: input.note } : {}),
  };
}

/**
 * Sibling path for authoring provenance next to face-anchors.json.
 * @param {string} faceAnchorsPath
 */
export function faceMappingAuthoringPathBesideAnchors(faceAnchorsPath) {
  if (faceAnchorsPath.endsWith('face-anchors.json')) {
    return faceAnchorsPath.replace(/face-anchors\.json$/, 'face-mapping-authoring.json');
  }
  if (faceAnchorsPath.endsWith('-face-anchors.json')) {
    return faceAnchorsPath.replace(/-face-anchors\.json$/, '-face-mapping-authoring.json');
  }
  return `${faceAnchorsPath}.face-mapping-authoring.json`;
}
