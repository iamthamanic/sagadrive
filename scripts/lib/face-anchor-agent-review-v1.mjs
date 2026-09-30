/**
 * face-anchor-agent-review-v1 — offline mirror of the agent review protocol.
 * Location: scripts/lib/face-anchor-agent-review-v1.mjs
 *
 * Keep in sync with src/domains/character/avatar/face-anchor-agent-review-v1.ts.
 * No majority voting. JSON-only review cannot produce agent_reviewed.
 */

import { createHash } from 'node:crypto';

export const FACE_ANCHOR_AGENT_REVIEW_PROTOCOL_VERSION = 'face-anchor-agent-review-v1';
export const FACE_ANCHOR_AGENT_REVIEW_REQUIRED_PASSES = 5;
export const FACE_ANCHOR_AGENT_REVIEW_EVIDENCE_RELDIR = 'agent-review/evidence';

export const FACE_ANCHOR_AGENT_REVIEW_EVIDENCE_VIEWS = [
  'frontal',
  'yaw_left_35',
  'yaw_right_35',
  'pitch_up',
  'pitch_down',
  'eyes_brows_closeup',
  'mouth_nose_closeup',
];

export const FACE_ANCHOR_VISUAL_STATUSES = ['pass', 'fail', 'uncertain'];

/** Same 21 ids as SagaDriveFaceAnchorsV1 — duplicated for offline scripts. */
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

/**
 * Deterministic camera matrix for Playwright capture (degrees / framing).
 * Neutral pose locked; LiveAct/animation off.
 */
export const FACE_ANCHOR_AGENT_REVIEW_CAPTURE_MATRIX = Object.freeze([
  { view: 'frontal', yawDeg: 0, pitchDeg: 0, framing: 'face' },
  { view: 'yaw_left_35', yawDeg: -35, pitchDeg: 0, framing: 'face' },
  { view: 'yaw_right_35', yawDeg: 35, pitchDeg: 0, framing: 'face' },
  { view: 'pitch_up', yawDeg: 0, pitchDeg: 18, framing: 'face' },
  { view: 'pitch_down', yawDeg: 0, pitchDeg: -18, framing: 'face' },
  { view: 'eyes_brows_closeup', yawDeg: 0, pitchDeg: 8, framing: 'eyes_brows' },
  { view: 'mouth_nose_closeup', yawDeg: 0, pitchDeg: -6, framing: 'mouth_nose' },
]);

/**
 * @param {string | Buffer | Uint8Array} bytes
 */
export function sha256Hex(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

/**
 * @param {unknown} input
 */
export function evaluateFaceAnchorAgentReviewDeterministicGate(input) {
  const r = /** @type {Record<string, unknown>} */ (input || {});
  /** @type {string[]} */
  const violations = [];
  const anchorCount = typeof r.anchorCount === 'number' ? r.anchorCount : -1;
  if (anchorCount !== 21) violations.push('anchor_count_not_21');
  if (r.anchorsStructurallyValid !== true) violations.push('anchors_structurally_invalid');
  if (r.barycentricAllValid !== true) violations.push('barycentric_invalid');
  if (r.primitiveNodeAllValid !== true) violations.push('primitive_or_node_invalid');
  if (r.allowedAvatarSurfaceOnly !== true) violations.push('disallowed_surface');
  if (r.noHairSurface !== true) violations.push('hair_surface');
  if (r.noEquipmentSurface !== true) violations.push('equipment_surface');
  if (r.noHelperDebugSurface !== true) violations.push('helper_or_debug_surface');
  if (r.topologyFingerprintMatch !== true) violations.push('topology_fingerprint_mismatch');
  if (r.assetShaMatch !== true) violations.push('asset_sha_mismatch');
  if (r.anatomyValidatorPass !== true) violations.push('anatomy_validator_fail');
  if (r.leftRightSemanticsPlausible !== true) violations.push('left_right_semantics_implausible');
  if (r.symmetryPlausibleWhereApplicable !== true) violations.push('symmetry_implausible');
  return {
    pass: violations.length === 0,
    anchorCount,
    requiredAnchorCount: 21,
    violations,
  };
}

/**
 * @param {unknown} raw
 */
export function validateFaceAnchorAgentReviewEvidenceManifest(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: ['manifest_not_object'] };
  }
  const r = /** @type {Record<string, unknown>} */ (raw);
  /** @type {string[]} */
  const errors = [];
  if (r.protocolVersion !== FACE_ANCHOR_AGENT_REVIEW_PROTOCOL_VERSION) {
    errors.push('protocol_version_mismatch');
  }
  if (typeof r.candidateModelPath !== 'string' || !r.candidateModelPath.trim()) {
    errors.push('missing_candidate_model_path');
  }
  if (typeof r.modelSha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(r.modelSha256)) {
    errors.push('invalid_model_sha256');
  }
  if (typeof r.anchorsSha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(r.anchorsSha256)) {
    errors.push('invalid_anchors_sha256');
  }
  if (typeof r.topologyFingerprint !== 'string' || !r.topologyFingerprint.trim()) {
    errors.push('missing_topology_fingerprint');
  }
  if (r.neutralPoseId !== 'controlled-neutral-v1') errors.push('invalid_neutral_pose');
  if (r.liveActEnabled !== false) errors.push('liveact_must_be_false');
  if (r.animationEnabled !== false) errors.push('animation_must_be_false');
  if (!Array.isArray(r.shots)) {
    errors.push('shots_missing');
  } else {
    const views = new Set();
    for (const shot of r.shots) {
      if (!shot || typeof shot !== 'object') {
        errors.push('shot_invalid');
        continue;
      }
      const s = /** @type {Record<string, unknown>} */ (shot);
      if (typeof s.view !== 'string' || !FACE_ANCHOR_AGENT_REVIEW_EVIDENCE_VIEWS.includes(s.view)) {
        errors.push(`shot_view_invalid:${s.view}`);
      } else {
        views.add(s.view);
      }
      if (typeof s.relativePath !== 'string' || !s.relativePath) errors.push('shot_path_missing');
      if (typeof s.sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(String(s.sha256))) {
        errors.push('shot_sha_invalid');
      }
      if (typeof s.width !== 'number' || s.width < 640) errors.push('shot_width_too_small');
      if (typeof s.height !== 'number' || s.height < 480) errors.push('shot_height_too_small');
    }
    for (const required of FACE_ANCHOR_AGENT_REVIEW_EVIDENCE_VIEWS) {
      if (!views.has(required)) errors.push(`missing_view:${required}`);
    }
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, manifest: raw };
}

/**
 * @param {FaceAnchorAgentReviewAnchorFindingV1} f
 */
function findingPass(f) {
  if (f.needsHuman) return false;
  if (f.visualStatus !== 'pass') return false;
  if (f.anatomyStatus !== 'pass') return false;
  if (f.sideStatus !== 'pass') return false;
  if (f.surfaceStatus !== 'pass') return false;
  return true;
}

/**
 * @param {unknown} raw
 * @param {{
 *   evidenceManifestSha256: string;
 *   modelSha256: string;
 *   anchorsSha256: string;
 *   topologyFingerprint: string;
 *   passIndex: 1|2|3|4|5;
 * }} expected
 */
export function validateFaceAnchorAgentReviewPassReport(raw, expected) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: ['pass_not_object'] };
  }
  const r = /** @type {Record<string, unknown>} */ (raw);
  /** @type {string[]} */
  const errors = [];
  if (r.protocolVersion !== FACE_ANCHOR_AGENT_REVIEW_PROTOCOL_VERSION) {
    errors.push('protocol_version_mismatch');
  }
  if (r.passIndex !== expected.passIndex) errors.push('pass_index_mismatch');
  if (r.evidenceManifestSha256 !== expected.evidenceManifestSha256) {
    errors.push('evidence_fingerprint_mismatch');
  }
  if (r.modelSha256 !== expected.modelSha256) errors.push('model_sha_mismatch');
  if (r.anchorsSha256 !== expected.anchorsSha256) errors.push('anchors_sha_mismatch');
  if (r.topologyFingerprint !== expected.topologyFingerprint) {
    errors.push('topology_fingerprint_mismatch');
  }
  if (typeof r.reviewerId !== 'string' || !r.reviewerId.trim()) errors.push('missing_reviewer_id');
  if (!Array.isArray(r.findings) || r.findings.length !== SAGA_DRIVE_FACE_ANCHOR_IDS.length) {
    errors.push('findings_count_mismatch');
  } else {
    const seen = new Set();
    for (const f of r.findings) {
      if (!f || typeof f !== 'object') {
        errors.push('finding_invalid');
        continue;
      }
      const row = /** @type {Record<string, unknown>} */ (f);
      const id = String(row.anchorId || '');
      if (!SAGA_DRIVE_FACE_ANCHOR_IDS.includes(id)) errors.push(`unknown_anchor:${id}`);
      if (seen.has(id)) errors.push(`duplicate_anchor:${id}`);
      seen.add(id);
      for (const key of ['visualStatus', 'anatomyStatus', 'sideStatus', 'surfaceStatus']) {
        if (!FACE_ANCHOR_VISUAL_STATUSES.includes(String(row[key] || ''))) {
          errors.push(`${id}:${key}_invalid`);
        }
      }
      if (typeof row.needsHuman !== 'boolean') errors.push(`${id}:needsHuman_invalid`);
      if (typeof row.conciseReason !== 'string') errors.push(`${id}:reason_invalid`);
    }
    for (const id of SAGA_DRIVE_FACE_ANCHOR_IDS) {
      if (!seen.has(id)) errors.push(`missing_anchor:${id}`);
    }
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, report: raw };
}

/**
 * Aggregator: deterministic + five isolated passes. No majority voting.
 * @param {{
 *   deterministic: { pass: boolean; anchorCount: number; violations: readonly string[] };
 *   evidenceManifestSha256: string;
 *   passes: readonly Array<Record<string, unknown>>;
 *   aggregatedAt: string;
 * }} input
 */
export function aggregateFaceAnchorAgentReviews(input) {
  /** @type {string[]} */
  const reasons = [];
  /** @type {Set<string>} */
  const conflicting = new Set();

  if (!input.deterministic.pass) {
    reasons.push('deterministic_gates_failed');
    for (const v of input.deterministic.violations) reasons.push(`deterministic:${v}`);
  }
  if (input.deterministic.anchorCount !== 21) {
    reasons.push('anchor_count_not_21');
  }
  if (input.passes.length !== FACE_ANCHOR_AGENT_REVIEW_REQUIRED_PASSES) {
    reasons.push(`pass_count_${input.passes.length}_of_5`);
  }

  const indices = new Set(input.passes.map((p) => p.passIndex));
  for (let i = 1; i <= 5; i += 1) {
    if (!indices.has(i)) reasons.push(`missing_pass_${i}`);
  }

  for (const pass of input.passes) {
    if (pass.evidenceManifestSha256 !== input.evidenceManifestSha256) {
      reasons.push(`pass_${pass.passIndex}_stale_or_mismatched_evidence`);
    }
    const findings = /** @type {Array<Record<string, unknown>>} */ (pass.findings || []);
    for (const f of findings) {
      if (!findingPass(/** @type {any} */ (f))) {
        conflicting.add(String(f.anchorId));
        if (f.visualStatus === 'uncertain') {
          reasons.push(`pass_${pass.passIndex}:${f.anchorId}:uncertain`);
        } else if (f.visualStatus === 'fail' || f.needsHuman) {
          reasons.push(`pass_${pass.passIndex}:${f.anchorId}:fail_or_needs_human`);
        } else {
          reasons.push(`pass_${pass.passIndex}:${f.anchorId}:non_pass`);
        }
      }
    }
  }

  for (const id of SAGA_DRIVE_FACE_ANCHOR_IDS) {
    const statuses = input.passes.map((p) => {
      const findings = /** @type {Array<Record<string, unknown>>} */ (p.findings || []);
      return findings.find((f) => f.anchorId === id);
    });
    if (statuses.some((f) => !f || !findingPass(/** @type {any} */ (f)))) {
      conflicting.add(id);
    }
    const visual = new Set(statuses.map((f) => f?.visualStatus));
    if (visual.size > 1) {
      conflicting.add(id);
      reasons.push(`consensus_conflict:${id}`);
    }
  }

  const outcome =
    reasons.length === 0 &&
    conflicting.size === 0 &&
    input.deterministic.pass &&
    input.passes.length === 5
      ? 'agent_reviewed'
      : 'human_review_required';

  if (outcome === 'human_review_required' && reasons.length === 0) {
    reasons.push('human_review_required');
  }

  return {
    protocolVersion: FACE_ANCHOR_AGENT_REVIEW_PROTOCOL_VERSION,
    outcome,
    requiredPasses: FACE_ANCHOR_AGENT_REVIEW_REQUIRED_PASSES,
    completedPasses: input.passes.length,
    deterministicPass: input.deterministic.pass,
    evidenceManifestSha256: input.evidenceManifestSha256,
    conflictingAnchorIds: [...conflicting].sort(),
    reasons: [...new Set(reasons)].sort(),
    aggregatedAt: input.aggregatedAt,
  };
}

/**
 * @param {readonly string[]} [evidenceViews]
 */
export function buildAllPassAgentReviewFindings(
  evidenceViews = FACE_ANCHOR_AGENT_REVIEW_EVIDENCE_VIEWS,
) {
  return SAGA_DRIVE_FACE_ANCHOR_IDS.map((anchorId) => ({
    anchorId,
    visualStatus: 'pass',
    anatomyStatus: 'pass',
    sideStatus: 'pass',
    surfaceStatus: 'pass',
    evidenceViews: [...evidenceViews],
    conciseReason: 'fixture_all_pass',
    needsHuman: false,
  }));
}

/**
 * Evidence directory under a species run folder.
 * @param {string} runDir absolute or repo-relative run directory
 */
export function agentReviewEvidenceDir(runDir) {
  return `${runDir.replace(/\/$/, '')}/${FACE_ANCHOR_AGENT_REVIEW_EVIDENCE_RELDIR}`;
}
