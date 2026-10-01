/**
 * face-anchor-agent-review-v1 — 5-pass visual + deterministic Ground Truth protocol.
 * Location: src/domains/character/avatar/face-anchor-agent-review-v1.ts
 *
 * Pure domain: aggregation and evidence schema only. No React / Three / vision SDK.
 * Visual passes consume screenshot evidence; JSON alone cannot produce agent_reviewed.
 */

import { SAGA_DRIVE_FACE_ANCHOR_IDS, type SagaDriveFaceAnchorId } from './face-anchor-contract';

export const FACE_ANCHOR_AGENT_REVIEW_PROTOCOL_VERSION = 'face-anchor-agent-review-v1' as const;

export const FACE_ANCHOR_AGENT_REVIEW_REQUIRED_PASSES = 5 as const;

/** Controlled camera views for reproducible Playwright capture. */
export const FACE_ANCHOR_AGENT_REVIEW_EVIDENCE_VIEWS = [
  'frontal',
  'yaw_left_35',
  'yaw_right_35',
  'pitch_up',
  'pitch_down',
  'eyes_brows_closeup',
  'mouth_nose_closeup',
] as const;

export type FaceAnchorAgentReviewEvidenceView =
  (typeof FACE_ANCHOR_AGENT_REVIEW_EVIDENCE_VIEWS)[number];

/** Deterministic Playwright camera matrix (degrees + framing). */
export const FACE_ANCHOR_AGENT_REVIEW_CAPTURE_MATRIX = [
  { view: 'frontal' as const, yawDeg: 0, pitchDeg: 0, framing: 'face' as const },
  { view: 'yaw_left_35' as const, yawDeg: -35, pitchDeg: 0, framing: 'face' as const },
  { view: 'yaw_right_35' as const, yawDeg: 35, pitchDeg: 0, framing: 'face' as const },
  { view: 'pitch_up' as const, yawDeg: 0, pitchDeg: 18, framing: 'face' as const },
  { view: 'pitch_down' as const, yawDeg: 0, pitchDeg: -18, framing: 'face' as const },
  { view: 'eyes_brows_closeup' as const, yawDeg: 0, pitchDeg: 8, framing: 'eyes_brows' as const },
  { view: 'mouth_nose_closeup' as const, yawDeg: 0, pitchDeg: -6, framing: 'mouth_nose' as const },
] as const;

export const FACE_ANCHOR_VISUAL_STATUSES = ['pass', 'fail', 'uncertain'] as const;
export type FaceAnchorVisualStatus = (typeof FACE_ANCHOR_VISUAL_STATUSES)[number];

export interface FaceAnchorAgentReviewAnchorFindingV1 {
  readonly anchorId: SagaDriveFaceAnchorId;
  readonly visualStatus: FaceAnchorVisualStatus;
  readonly anatomyStatus: FaceAnchorVisualStatus;
  readonly sideStatus: FaceAnchorVisualStatus;
  readonly surfaceStatus: FaceAnchorVisualStatus;
  readonly evidenceViews: readonly FaceAnchorAgentReviewEvidenceView[];
  readonly conciseReason: string;
  readonly needsHuman: boolean;
}

export interface FaceAnchorAgentReviewPassReportV1 {
  readonly protocolVersion: typeof FACE_ANCHOR_AGENT_REVIEW_PROTOCOL_VERSION;
  readonly passIndex: 1 | 2 | 3 | 4 | 5;
  /** Opaque reviewer slot id (e.g. agent-pass-3). No chain-of-thought. */
  readonly reviewerId: string;
  readonly evidenceManifestSha256: string;
  readonly modelSha256: string;
  readonly anchorsSha256: string;
  readonly topologyFingerprint: string;
  readonly findings: readonly FaceAnchorAgentReviewAnchorFindingV1[];
  readonly reviewedAt: string;
}

export interface FaceAnchorAgentReviewEvidenceShotV1 {
  readonly view: FaceAnchorAgentReviewEvidenceView;
  readonly relativePath: string;
  readonly sha256: string;
  readonly width: number;
  readonly height: number;
}

export interface FaceAnchorAgentReviewEvidenceManifestV1 {
  readonly protocolVersion: typeof FACE_ANCHOR_AGENT_REVIEW_PROTOCOL_VERSION;
  readonly candidateModelPath: string;
  readonly modelSha256: string;
  readonly topologyFingerprint: string;
  readonly anchorsSha256: string;
  readonly neutralPoseId: 'controlled-neutral-v1';
  readonly liveActEnabled: false;
  readonly animationEnabled: false;
  readonly shots: readonly FaceAnchorAgentReviewEvidenceShotV1[];
  readonly createdAt: string;
}

export interface FaceAnchorAgentReviewDeterministicGateV1 {
  readonly pass: boolean;
  readonly anchorCount: number;
  readonly requiredAnchorCount: 21;
  readonly violations: readonly string[];
}

/** Inputs collected before any visual agent pass. Fail-closed. */
export interface FaceAnchorAgentReviewDeterministicGateInputV1 {
  readonly anchorCount: number;
  readonly anchorsStructurallyValid: boolean;
  readonly barycentricAllValid: boolean;
  readonly primitiveNodeAllValid: boolean;
  readonly allowedAvatarSurfaceOnly: boolean;
  readonly noHairSurface: boolean;
  readonly noEquipmentSurface: boolean;
  readonly noHelperDebugSurface: boolean;
  readonly topologyFingerprintMatch: boolean;
  readonly assetShaMatch: boolean;
  readonly anatomyValidatorPass: boolean;
  readonly leftRightSemanticsPlausible: boolean;
  readonly symmetryPlausibleWhereApplicable: boolean;
}

/**
 * Deterministic pre-visual gate. Any FAIL aborts agent review before vision passes.
 */
export function evaluateFaceAnchorAgentReviewDeterministicGate(
  input: FaceAnchorAgentReviewDeterministicGateInputV1,
): FaceAnchorAgentReviewDeterministicGateV1 {
  const violations: string[] = [];
  if (input.anchorCount !== 21) violations.push('anchor_count_not_21');
  if (!input.anchorsStructurallyValid) violations.push('anchors_structurally_invalid');
  if (!input.barycentricAllValid) violations.push('barycentric_invalid');
  if (!input.primitiveNodeAllValid) violations.push('primitive_or_node_invalid');
  if (!input.allowedAvatarSurfaceOnly) violations.push('disallowed_surface');
  if (!input.noHairSurface) violations.push('hair_surface');
  if (!input.noEquipmentSurface) violations.push('equipment_surface');
  if (!input.noHelperDebugSurface) violations.push('helper_or_debug_surface');
  if (!input.topologyFingerprintMatch) violations.push('topology_fingerprint_mismatch');
  if (!input.assetShaMatch) violations.push('asset_sha_mismatch');
  if (!input.anatomyValidatorPass) violations.push('anatomy_validator_fail');
  if (!input.leftRightSemanticsPlausible) violations.push('left_right_semantics_implausible');
  if (!input.symmetryPlausibleWhereApplicable) violations.push('symmetry_implausible');
  return {
    pass: violations.length === 0,
    anchorCount: input.anchorCount,
    requiredAnchorCount: 21,
    violations,
  };
}

/** Relative evidence root under a species run directory (no arbitrary new top-level). */
export const FACE_ANCHOR_AGENT_REVIEW_EVIDENCE_RELDIR = 'agent-review/evidence' as const;

export type FaceAnchorAgentReviewAggregationOutcome =
  | 'agent_reviewed'
  | 'human_review_required';

export interface FaceAnchorAgentReviewAggregationV1 {
  readonly protocolVersion: typeof FACE_ANCHOR_AGENT_REVIEW_PROTOCOL_VERSION;
  readonly outcome: FaceAnchorAgentReviewAggregationOutcome;
  readonly requiredPasses: typeof FACE_ANCHOR_AGENT_REVIEW_REQUIRED_PASSES;
  readonly completedPasses: number;
  readonly deterministicPass: boolean;
  readonly evidenceManifestSha256: string;
  readonly conflictingAnchorIds: readonly SagaDriveFaceAnchorId[];
  readonly reasons: readonly string[];
  readonly aggregatedAt: string;
}

function isEvidenceView(value: string): value is FaceAnchorAgentReviewEvidenceView {
  return (FACE_ANCHOR_AGENT_REVIEW_EVIDENCE_VIEWS as readonly string[]).includes(value);
}

function isVisualStatus(value: string): value is FaceAnchorVisualStatus {
  return (FACE_ANCHOR_VISUAL_STATUSES as readonly string[]).includes(value);
}

export function validateFaceAnchorAgentReviewEvidenceManifest(
  raw: unknown,
): { ok: true; manifest: FaceAnchorAgentReviewEvidenceManifestV1 } | { ok: false; errors: string[] } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: ['manifest_not_object'] };
  }
  const r = raw as Record<string, unknown>;
  const errors: string[] = [];
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
    const views = new Set<string>();
    for (const shot of r.shots) {
      if (!shot || typeof shot !== 'object') {
        errors.push('shot_invalid');
        continue;
      }
      const s = shot as Record<string, unknown>;
      if (typeof s.view !== 'string' || !isEvidenceView(s.view)) errors.push(`shot_view_invalid:${s.view}`);
      else views.add(s.view);
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
  return { ok: true, manifest: raw as FaceAnchorAgentReviewEvidenceManifestV1 };
}

function findingPass(f: FaceAnchorAgentReviewAnchorFindingV1): boolean {
  if (f.needsHuman) return false;
  if (f.visualStatus !== 'pass') return false;
  if (f.anatomyStatus !== 'pass') return false;
  if (f.sideStatus !== 'pass') return false;
  if (f.surfaceStatus !== 'pass') return false;
  return true;
}

export function validateFaceAnchorAgentReviewPassReport(
  raw: unknown,
  expected: {
    evidenceManifestSha256: string;
    modelSha256: string;
    anchorsSha256: string;
    topologyFingerprint: string;
    passIndex: 1 | 2 | 3 | 4 | 5;
  },
): { ok: true; report: FaceAnchorAgentReviewPassReportV1 } | { ok: false; errors: string[] } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: ['pass_not_object'] };
  }
  const r = raw as Record<string, unknown>;
  const errors: string[] = [];
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
    const seen = new Set<string>();
    for (const f of r.findings) {
      if (!f || typeof f !== 'object') {
        errors.push('finding_invalid');
        continue;
      }
      const row = f as Record<string, unknown>;
      const id = String(row.anchorId || '');
      if (!(SAGA_DRIVE_FACE_ANCHOR_IDS as readonly string[]).includes(id)) {
        errors.push(`unknown_anchor:${id}`);
      }
      if (seen.has(id)) errors.push(`duplicate_anchor:${id}`);
      seen.add(id);
      for (const key of ['visualStatus', 'anatomyStatus', 'sideStatus', 'surfaceStatus'] as const) {
        if (!isVisualStatus(String(row[key] || ''))) errors.push(`${id}:${key}_invalid`);
      }
      if (typeof row.needsHuman !== 'boolean') errors.push(`${id}:needsHuman_invalid`);
      if (typeof row.conciseReason !== 'string') errors.push(`${id}:reason_invalid`);
      if (!Array.isArray(row.evidenceViews) || row.evidenceViews.length === 0) {
        errors.push(`${id}:evidenceViews_missing_or_empty`);
      } else {
        const views = row.evidenceViews as unknown[];
        const seenViews = new Set<string>();
        for (const v of views) {
          const view = String(v || '');
          if (!(FACE_ANCHOR_AGENT_REVIEW_EVIDENCE_VIEWS as readonly string[]).includes(view)) {
            errors.push(`${id}:evidenceViews_invalid:${view}`);
          }
          if (seenViews.has(view)) errors.push(`${id}:evidenceViews_duplicate:${view}`);
          seenViews.add(view);
        }
      }
    }
    for (const id of SAGA_DRIVE_FACE_ANCHOR_IDS) {
      if (!seen.has(id)) errors.push(`missing_anchor:${id}`);
    }
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, report: raw as FaceAnchorAgentReviewPassReportV1 };
}

/**
 * Aggregator: compares deterministic gate + five isolated pass reports.
 * No majority voting — any uncertain/fail/needsHuman ⇒ human_review_required.
 */
export function aggregateFaceAnchorAgentReviews(input: {
  deterministic: FaceAnchorAgentReviewDeterministicGateV1;
  evidenceManifestSha256: string;
  passes: readonly FaceAnchorAgentReviewPassReportV1[];
  aggregatedAt: string;
}): FaceAnchorAgentReviewAggregationV1 {
  const reasons: string[] = [];
  const conflicting = new Set<SagaDriveFaceAnchorId>();

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
    if (!indices.has(i as 1 | 2 | 3 | 4 | 5)) reasons.push(`missing_pass_${i}`);
  }

  const reviewerIds: string[] = [];
  for (const pass of input.passes) {
    const rid = typeof pass.reviewerId === 'string' ? pass.reviewerId.trim() : '';
    if (!rid) reasons.push(`pass_${pass.passIndex}_missing_reviewer_id`);
    else reviewerIds.push(rid);
  }
  if (reviewerIds.length === FACE_ANCHOR_AGENT_REVIEW_REQUIRED_PASSES) {
    if (new Set(reviewerIds).size !== reviewerIds.length) {
      reasons.push('duplicate_reviewer_identity');
    }
  }

  for (const pass of input.passes) {
    if (pass.evidenceManifestSha256 !== input.evidenceManifestSha256) {
      reasons.push(`pass_${pass.passIndex}_stale_or_mismatched_evidence`);
    }
    for (const f of pass.findings) {
      if (!findingPass(f)) {
        conflicting.add(f.anchorId);
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

  // Cross-pass consensus: every anchor must be pass on all five reports.
  for (const id of SAGA_DRIVE_FACE_ANCHOR_IDS) {
    const statuses = input.passes.map((p) => p.findings.find((f) => f.anchorId === id));
    if (statuses.some((f) => !f || !findingPass(f))) {
      conflicting.add(id);
    }
    const visual = new Set(statuses.map((f) => f?.visualStatus));
    if (visual.size > 1) {
      conflicting.add(id);
      reasons.push(`consensus_conflict:${id}`);
    }
  }

  const outcome: FaceAnchorAgentReviewAggregationOutcome =
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
    conflictingAnchorIds: [...conflicting].sort() as SagaDriveFaceAnchorId[],
    reasons: [...new Set(reasons)].sort(),
    aggregatedAt: input.aggregatedAt,
  };
}

/**
 * Build a synthetic all-pass finding set for tests / fixtures (not for production vision).
 */
export function buildAllPassAgentReviewFindings(
  evidenceViews: readonly FaceAnchorAgentReviewEvidenceView[] = FACE_ANCHOR_AGENT_REVIEW_EVIDENCE_VIEWS,
): FaceAnchorAgentReviewAnchorFindingV1[] {
  return SAGA_DRIVE_FACE_ANCHOR_IDS.map((anchorId) => ({
    anchorId,
    visualStatus: 'pass' as const,
    anatomyStatus: 'pass' as const,
    sideStatus: 'pass' as const,
    surfaceStatus: 'pass' as const,
    evidenceViews: [...evidenceViews],
    conciseReason: 'fixture_all_pass',
    needsHuman: false,
  }));
}
