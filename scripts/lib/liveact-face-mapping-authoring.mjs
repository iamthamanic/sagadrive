/**
 * liveact-face-mapping-authoring — offline mirror of SagaDriveFaceMappingAuthoringV1 (#419).
 * Location: scripts/lib/liveact-face-mapping-authoring.mjs
 *
 * Keep in sync with src/domains/character/avatar/face-mapping-authoring-contract.ts.
 * Heuristic/auto output is never reviewed ground truth.
 */

export const FACE_MAPPING_AUTHORING_CONTRACT_VERSION = 'SagaDriveFaceMappingAuthoringV1';

export const FACE_MAPPING_AUTHORING_SOURCES = ['auto', 'manual', 'manual_override'];

/**
 * @param {string} value
 * @returns {value is 'auto' | 'manual' | 'manual_override'}
 */
export function isFaceMappingAuthoringSource(value) {
  return FACE_MAPPING_AUTHORING_SOURCES.includes(value);
}

/**
 * Canonical V1 reviewedAt: UTC ISO with milliseconds (`Date.prototype.toISOString()`).
 * Fail-closed — rejects impossible calendar dates (no permissive Date.parse alone).
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
 * Fail-closed: only manual / manual_override with reviewed=true and valid reviewedAt.
 * @param {unknown} authoring
 */
export function isReviewedFaceMappingGroundTruth(authoring) {
  if (!authoring || typeof authoring !== 'object') return false;
  const record = /** @type {Record<string, unknown>} */ (authoring);
  if (record.contractVersion !== FACE_MAPPING_AUTHORING_CONTRACT_VERSION) return false;
  if (record.reviewed !== true) return false;
  if (record.source === 'auto') return false;
  if (!(record.source === 'manual' || record.source === 'manual_override')) return false;
  return isValidFaceMappingReviewedAtV1(record.reviewedAt);
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
    const modelPath = /** @type {Record<string, unknown>} */ (asset).modelPath;
    if (typeof modelPath !== 'string' || !modelPath.trim()) {
      issues.push({ code: 'missing_model_path', detail: 'asset.modelPath is required.' });
    }
  }

  return { ok: issues.length === 0, issues };
}

/**
 * Build unreviewed auto provenance for heuristic authoring exports.
 * @param {{ modelPath: string; modelSha256?: string; anchorsSha256?: string; topologyFingerprint?: string; cacheBust?: string; note?: string }} input
 */
export function createAutoUnreviewedFaceMappingAuthoring(input) {
  return {
    contractVersion: FACE_MAPPING_AUTHORING_CONTRACT_VERSION,
    source: 'auto',
    reviewed: false,
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
