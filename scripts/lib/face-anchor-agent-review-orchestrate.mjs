/**
 * face-anchor-agent-review-orchestrate — 5 independent visual passes + aggregation.
 * Location: scripts/lib/face-anchor-agent-review-orchestrate.mjs
 *
 * Each pass receives a fresh context: evidence paths + anchor JSON as supplement only.
 * Prior pass results are never visible to subsequent reviewers. No majority voting.
 */

import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  FACE_ANCHOR_AGENT_REVIEW_PROTOCOL_VERSION,
  FACE_ANCHOR_AGENT_REVIEW_REQUIRED_PASSES,
  aggregateFaceAnchorAgentReviews,
  evaluateFaceAnchorAgentReviewDeterministicGate,
  sha256Hex,
  validateFaceAnchorAgentReviewEvidenceManifest,
  validateFaceAnchorAgentReviewPassReport,
} from './face-anchor-agent-review-v1.mjs';

/**
 * Isolated review context — no other pass results, no annotations from prior reviews.
 * @typedef {{
 *   passIndex: 1|2|3|4|5;
 *   reviewerId: string;
 *   protocolVersion: string;
 *   evidenceDir: string;
 *   evidenceManifest: Record<string, unknown>;
 *   evidenceManifestSha256: string;
 *   screenshotPaths: Record<string, string>;
 *   anchorsJson: unknown;
 *   modelSha256: string;
 *   anchorsSha256: string;
 *   topologyFingerprint: string;
 *   candidateModelPath: string;
 * }} FaceAnchorAgentReviewPassContext
 */

/**
 * @param {{
 *   runDir: string;
 *   evidenceManifest: Record<string, unknown>;
 *   deterministicInput: Record<string, unknown>;
 *   anchorsJson: unknown;
 *   modelSha256: string;
 *   anchorsSha256: string;
 *   topologyFingerprint: string;
 *   candidateModelPath: string;
 *   reviewPassFn: (ctx: FaceAnchorAgentReviewPassContext) => Promise<Record<string, unknown>> | Record<string, unknown>;
 *   reviewerIdPrefix?: string;
 *   nowIso?: string;
 *   skipVisualIfDeterministicFail?: boolean;
 * }} opts
 */
export async function runFaceAnchorAgentReviewOrchestration(opts) {
  const ledgerDir = join(opts.runDir, 'agent-review');
  mkdirSync(ledgerDir, { recursive: true });
  mkdirSync(join(ledgerDir, 'passes'), { recursive: true });

  const evidenceValidation = validateFaceAnchorAgentReviewEvidenceManifest(opts.evidenceManifest);
  if (!evidenceValidation.ok) {
    const aggregation = {
      protocolVersion: FACE_ANCHOR_AGENT_REVIEW_PROTOCOL_VERSION,
      outcome: 'human_review_required',
      requiredPasses: FACE_ANCHOR_AGENT_REVIEW_REQUIRED_PASSES,
      completedPasses: 0,
      deterministicPass: false,
      evidenceManifestSha256: '',
      conflictingAnchorIds: [],
      reasons: [
        'missing_or_invalid_screenshot_evidence',
        ...evidenceValidation.errors.map((e) => `evidence:${e}`),
      ].sort(),
      aggregatedAt: opts.nowIso || new Date().toISOString(),
    };
    writeFileSync(join(ledgerDir, 'aggregation.json'), `${JSON.stringify(aggregation, null, 2)}\n`);
    return { outcome: 'human_review_required', aggregation, passes: [], blocked: 'evidence' };
  }

  const evidenceBytes = Buffer.from(`${JSON.stringify(opts.evidenceManifest)}\n`, 'utf8');
  const evidenceManifestSha256 = sha256Hex(evidenceBytes);
  writeFileSync(join(ledgerDir, 'evidence-manifest.json'), evidenceBytes);

  // Stale evidence: fingerprints on manifest must match candidate.
  /** @type {string[]} */
  const fingerprintErrors = [];
  if (opts.evidenceManifest.modelSha256 !== opts.modelSha256) {
    fingerprintErrors.push('evidence_model_sha_stale');
  }
  if (opts.evidenceManifest.anchorsSha256 !== opts.anchorsSha256) {
    fingerprintErrors.push('evidence_anchors_sha_stale');
  }
  if (opts.evidenceManifest.topologyFingerprint !== opts.topologyFingerprint) {
    fingerprintErrors.push('evidence_topology_stale');
  }
  if (opts.evidenceManifest.candidateModelPath !== opts.candidateModelPath) {
    fingerprintErrors.push('evidence_candidate_path_mismatch');
  }

  const deterministic = evaluateFaceAnchorAgentReviewDeterministicGate(opts.deterministicInput);
  writeFileSync(
    join(ledgerDir, 'deterministic-gate.json'),
    `${JSON.stringify(deterministic, null, 2)}\n`,
  );

  if (fingerprintErrors.length) {
    const aggregation = {
      protocolVersion: FACE_ANCHOR_AGENT_REVIEW_PROTOCOL_VERSION,
      outcome: 'human_review_required',
      requiredPasses: FACE_ANCHOR_AGENT_REVIEW_REQUIRED_PASSES,
      completedPasses: 0,
      deterministicPass: deterministic.pass,
      evidenceManifestSha256,
      conflictingAnchorIds: [],
      reasons: fingerprintErrors.sort(),
      aggregatedAt: opts.nowIso || new Date().toISOString(),
    };
    writeFileSync(join(ledgerDir, 'aggregation.json'), `${JSON.stringify(aggregation, null, 2)}\n`);
    return { outcome: 'human_review_required', aggregation, passes: [], blocked: 'stale_evidence' };
  }

  const skipVisual = opts.skipVisualIfDeterministicFail !== false;
  if (!deterministic.pass && skipVisual) {
    const aggregation = aggregateFaceAnchorAgentReviews({
      deterministic,
      evidenceManifestSha256,
      passes: [],
      aggregatedAt: opts.nowIso || new Date().toISOString(),
    });
    writeFileSync(join(ledgerDir, 'aggregation.json'), `${JSON.stringify(aggregation, null, 2)}\n`);
    return {
      outcome: 'human_review_required',
      aggregation,
      passes: [],
      blocked: 'deterministic',
    };
  }

  /** @type {Record<string, string>} */
  const screenshotPaths = {};
  const evidenceDir = join(opts.runDir, 'agent-review', 'evidence');
  for (const shot of /** @type {Array<Record<string, unknown>>} */ (opts.evidenceManifest.shots)) {
    screenshotPaths[String(shot.view)] = join(evidenceDir, String(shot.relativePath));
  }

  /** @type {Array<Record<string, unknown>>} */
  const passes = [];
  const prefix = opts.reviewerIdPrefix || 'agent-pass';

  for (let i = 1; i <= FACE_ANCHOR_AGENT_REVIEW_REQUIRED_PASSES; i += 1) {
    const passIndex = /** @type {1|2|3|4|5} */ (i);
    /** @type {FaceAnchorAgentReviewPassContext} */
    const ctx = {
      passIndex,
      reviewerId: `${prefix}-${passIndex}`,
      protocolVersion: FACE_ANCHOR_AGENT_REVIEW_PROTOCOL_VERSION,
      evidenceDir,
      evidenceManifest: structuredClone(opts.evidenceManifest),
      evidenceManifestSha256,
      screenshotPaths: { ...screenshotPaths },
      // Supplement only — reviewers must not treat this as visual proof.
      anchorsJson: structuredClone(opts.anchorsJson),
      modelSha256: opts.modelSha256,
      anchorsSha256: opts.anchorsSha256,
      topologyFingerprint: opts.topologyFingerprint,
      candidateModelPath: opts.candidateModelPath,
    };

    // Fresh context: do not attach prior `passes` to ctx.
    const report = await opts.reviewPassFn(ctx);
    const validated = validateFaceAnchorAgentReviewPassReport(report, {
      evidenceManifestSha256,
      modelSha256: opts.modelSha256,
      anchorsSha256: opts.anchorsSha256,
      topologyFingerprint: opts.topologyFingerprint,
      passIndex,
    });
    if (!validated.ok) {
      const aggregation = {
        protocolVersion: FACE_ANCHOR_AGENT_REVIEW_PROTOCOL_VERSION,
        outcome: 'human_review_required',
        requiredPasses: FACE_ANCHOR_AGENT_REVIEW_REQUIRED_PASSES,
        completedPasses: passes.length,
        deterministicPass: deterministic.pass,
        evidenceManifestSha256,
        conflictingAnchorIds: [],
        reasons: [
          `pass_${passIndex}_invalid`,
          ...validated.errors.map((e) => `pass_${passIndex}:${e}`),
        ].sort(),
        aggregatedAt: opts.nowIso || new Date().toISOString(),
      };
      writeFileSync(join(ledgerDir, 'aggregation.json'), `${JSON.stringify(aggregation, null, 2)}\n`);
      return {
        outcome: 'human_review_required',
        aggregation,
        passes,
        blocked: `pass_${passIndex}_invalid`,
      };
    }

    const passPath = join(ledgerDir, 'passes', `pass-${passIndex}.json`);
    writeFileSync(passPath, `${JSON.stringify(validated.report, null, 2)}\n`);
    passes.push(/** @type {Record<string, unknown>} */ (validated.report));
  }

  const aggregation = aggregateFaceAnchorAgentReviews({
    deterministic,
    evidenceManifestSha256,
    passes: /** @type {any} */ (passes),
    aggregatedAt: opts.nowIso || new Date().toISOString(),
  });
  writeFileSync(join(ledgerDir, 'aggregation.json'), `${JSON.stringify(aggregation, null, 2)}\n`);

  const provenance = {
    protocolVersion: FACE_ANCHOR_AGENT_REVIEW_PROTOCOL_VERSION,
    candidateModelPath: opts.candidateModelPath,
    modelSha256: opts.modelSha256,
    topologyFingerprint: opts.topologyFingerprint,
    anchorsSha256: opts.anchorsSha256,
    evidenceManifestSha256,
    requiredPasses: FACE_ANCHOR_AGENT_REVIEW_REQUIRED_PASSES,
    completedPasses: passes.length,
    passResults: passes.map((p) => ({
      passIndex: p.passIndex,
      reviewerId: p.reviewerId,
      reviewedAt: p.reviewedAt,
    })),
    aggregationOutcome: aggregation.outcome,
    finalReviewStatus:
      aggregation.outcome === 'agent_reviewed' ? 'agent_reviewed' : 'human_review_required',
    aggregatedAt: aggregation.aggregatedAt,
  };
  writeFileSync(join(ledgerDir, 'provenance.json'), `${JSON.stringify(provenance, null, 2)}\n`);

  return {
    outcome: aggregation.outcome,
    aggregation,
    passes,
    evidenceManifestSha256,
    provenance,
  };
}

/**
 * Refuse JSON-only agent review: screenshots must exist on disk with matching hashes.
 * @param {Record<string, unknown>} evidenceManifest
 * @param {string} evidenceDir
 */
export function assertScreenshotEvidenceOnDisk(evidenceManifest, evidenceDir) {
  /** @type {string[]} */
  const errors = [];
  const shots = /** @type {Array<Record<string, unknown>>} */ (evidenceManifest.shots || []);
  if (!shots.length) errors.push('no_shots');
  for (const shot of shots) {
    const rel = String(shot.relativePath || '');
    const full = join(evidenceDir, rel);
    if (!existsSync(full)) {
      errors.push(`missing_file:${rel}`);
      continue;
    }
    const buf = readFileSync(full);
    const got = sha256Hex(buf);
    if (got !== shot.sha256) errors.push(`sha_mismatch:${rel}`);
  }
  return { ok: errors.length === 0, errors };
}
