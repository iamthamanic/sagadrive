#!/usr/bin/env node
/**
 * face-anchor-agent-review-check — contract proofs for face-anchor-agent-review-v1.
 * Location: scripts/face-anchor-agent-review-check.mjs
 *
 * Proves: JSON-only cannot agent_reviewed; missing evidence/passes block; 4/5 + uncertain/fail
 * block; deterministic FAIL blocks; 5/5 + gates PASS allows; human_reviewed immutable;
 * stale evidence rejected.
 */
import { createHash, randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { build } from 'esbuild';
import {
  FACE_ANCHOR_AGENT_REVIEW_PROTOCOL_VERSION,
  FACE_ANCHOR_AGENT_REVIEW_REQUIRED_PASSES,
  FACE_ANCHOR_AGENT_REVIEW_EVIDENCE_VIEWS,
  FACE_ANCHOR_AGENT_REVIEW_CAPTURE_MATRIX,
  aggregateFaceAnchorAgentReviews,
  buildAllPassAgentReviewFindings,
  evaluateFaceAnchorAgentReviewDeterministicGate,
  sha256Hex,
  validateFaceAnchorAgentReviewEvidenceManifest,
  validateFaceAnchorAgentReviewPassReport,
} from './lib/face-anchor-agent-review-v1.mjs';
import {
  assertScreenshotEvidenceOnDisk,
  runFaceAnchorAgentReviewOrchestration,
  verifyCompletedAgentReviewLedger,
} from './lib/face-anchor-agent-review-orchestrate.mjs';
import {
  canApplyAgentReviewToAuthoring,
  createAgentReviewedFaceMappingAuthoring,
  createAutoUnreviewedFaceMappingAuthoring,
  isReviewedFaceMappingGroundTruth,
  resolveFaceMappingReviewStatus,
  validateFaceMappingAuthoringV1,
} from './lib/liveact-face-mapping-authoring.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));

function check(cond, msg) {
  if (!cond) {
    console.error(`face-anchor-agent-review-check FAIL: ${msg}`);
    process.exit(1);
  }
}

function read(rel) {
  return readFileSync(join(root, rel), 'utf8');
}

const domain = read('src/domains/character/avatar/face-anchor-agent-review-v1.ts');
const authoring = read('src/domains/character/avatar/face-mapping-authoring-contract.ts');
const barrel = read('src/domains/character/avatar/index.ts');
const faceDoc = read('assets/species-3d/FACE-AUTHORING.md');
const gate = read('scripts/test-gate.mjs');
const capture = read('scripts/face-anchor-agent-review-evidence-capture.mjs');
const orch = read('scripts/lib/face-anchor-agent-review-orchestrate.mjs');

check(/face-anchor-agent-review-v1/.test(domain), 'protocol version in domain');
check(/FACE_ANCHOR_AGENT_REVIEW_REQUIRED_PASSES/.test(domain), 'required passes = 5');
check(/aggregateFaceAnchorAgentReviews/.test(domain), 'aggregator present');
check(/evaluateFaceAnchorAgentReviewDeterministicGate/.test(domain), 'deterministic gate');
check(/yaw_left_35/.test(domain), 'multi-view matrix');
check(!/from ['"]three['"]/.test(domain), 'domain pure');
check(/reviewStatus/.test(authoring), 'authoring reviewStatus');
check(/agent_reviewed/.test(authoring), 'agent_reviewed status');
check(/canApplyAgentReviewToAuthoring/.test(authoring), 'human immutable guard');
check(/createAgentReviewedFaceMappingAuthoring/.test(authoring), 'agent authoring builder');
check(/face-anchor-agent-review-v1/.test(barrel), 'barrel exports agent review');
check(/agent_reviewed|face-anchor-agent-review-v1/.test(faceDoc), 'FACE-AUTHORING docs');
check(/checkFaceAnchorAgentReview|face-anchor-agent-review-check/.test(gate), 'test-gate wiring');
check(/FACE_ANCHOR_AGENT_REVIEW_CAPTURE_MATRIX|yaw_left_35/.test(capture), 'capture matrix');
check(/assertScreenshotEvidenceOnDisk/.test(orch), 'orch exports disk assert');
check(/verifyCompletedAgentReviewLedger/.test(orch), 'orch exports ledger verify');
check(existsSync(join(root, 'public/face-agent-review-capture.html')), 'harness html');
check(existsSync(join(root, 'public/face-agent-review-capture.mjs')), 'harness module');
check(/__SAGA_FACE_AGENT_REVIEW_CAPTURE__/.test(read('public/face-agent-review-capture.mjs')), 'harness hook');
check(/face-agent-review-capture\.html/.test(capture), 'capture serves harness page');
check(/ledgerDir/.test(authoring), 'authoring provenance requires ledgerDir');

const SHAF = (s) => createHash('sha256').update(s).digest('hex');
const modelSha = SHAF('model-bytes');
const anchorsSha = SHAF('anchors-bytes');
const topo = 'v1:t1000:m50';
const now = '2026-09-30T12:00:00.000Z';

function allPassDeterministicInput(overrides = {}) {
  return {
    anchorCount: 21,
    anchorsStructurallyValid: true,
    barycentricAllValid: true,
    primitiveNodeAllValid: true,
    allowedAvatarSurfaceOnly: true,
    noHairSurface: true,
    noEquipmentSurface: true,
    noHelperDebugSurface: true,
    topologyFingerprintMatch: true,
    assetShaMatch: true,
    anatomyValidatorPass: true,
    leftRightSemanticsPlausible: true,
    symmetryPlausibleWhereApplicable: true,
    ...overrides,
  };
}

function allPassDeterministic(overrides = {}) {
  return evaluateFaceAnchorAgentReviewDeterministicGate(allPassDeterministicInput(overrides));
}

check(allPassDeterministic().pass === true, 'deterministic all-pass');
check(allPassDeterministic({ anchorCount: 20 }).pass === false, 'deterministic 20/21 fails');
check(
  allPassDeterministic({ anatomyValidatorPass: false }).violations.includes('anatomy_validator_fail'),
  'anatomy fail listed',
);

const pngBytes = randomBytes(64);
const shotSha = sha256Hex(pngBytes);

function buildManifest(overrides = {}) {
  return {
    protocolVersion: FACE_ANCHOR_AGENT_REVIEW_PROTOCOL_VERSION,
    candidateModelPath: 'assets/species-3d/human/runs/fixture/candidate.glb',
    modelSha256: modelSha,
    topologyFingerprint: topo,
    anchorsSha256: anchorsSha,
    neutralPoseId: 'controlled-neutral-v1',
    liveActEnabled: false,
    animationEnabled: false,
    shots: FACE_ANCHOR_AGENT_REVIEW_EVIDENCE_VIEWS.map((view) => ({
      view,
      relativePath: `shots/${view}.png`,
      sha256: shotSha,
      width: 1280,
      height: 720,
    })),
    createdAt: now,
    ...overrides,
  };
}

const manifestOk = validateFaceAnchorAgentReviewEvidenceManifest(buildManifest());
check(manifestOk.ok, 'valid evidence manifest');
const missingView = buildManifest();
missingView.shots = missingView.shots.filter((s) => s.view !== 'frontal');
check(!validateFaceAnchorAgentReviewEvidenceManifest(missingView).ok, 'missing frontal blocked');

function makePass(passIndex, mutateFinding) {
  const findings = buildAllPassAgentReviewFindings();
  if (mutateFinding) mutateFinding(findings);
  return {
    protocolVersion: FACE_ANCHOR_AGENT_REVIEW_PROTOCOL_VERSION,
    passIndex,
    reviewerId: `agent-pass-${passIndex}`,
    evidenceManifestSha256: 'e'.repeat(64),
    modelSha256: modelSha,
    anchorsSha256: anchorsSha,
    topologyFingerprint: topo,
    findings,
    reviewedAt: now,
  };
}

const evidenceSha = 'e'.repeat(64);

// Happy path aggregation
{
  const passes = [1, 2, 3, 4, 5].map((i) => makePass(/** @type {any} */ (i)));
  const agg = aggregateFaceAnchorAgentReviews({
    deterministic: allPassDeterministic(),
    evidenceManifestSha256: evidenceSha,
    passes,
    aggregatedAt: now,
  });
  check(agg.outcome === 'agent_reviewed', '5/5 + deterministic PASS → agent_reviewed');
}

// 4 passes only
{
  const passes = [1, 2, 3, 4].map((i) => makePass(/** @type {any} */ (i)));
  const agg = aggregateFaceAnchorAgentReviews({
    deterministic: allPassDeterministic(),
    evidenceManifestSha256: evidenceSha,
    passes,
    aggregatedAt: now,
  });
  check(agg.outcome === 'human_review_required', '<5 reviews block');
  check(agg.reasons.some((r) => r.includes('pass_count')), 'pass_count reason');
}

// 4 PASS + 1 uncertain
{
  const passes = [1, 2, 3, 4, 5].map((i) =>
    makePass(/** @type {any} */ (i), (findings) => {
      if (i === 5) {
        findings[0].visualStatus = 'uncertain';
        findings[0].conciseReason = 'insufficient_evidence';
      }
    }),
  );
  const agg = aggregateFaceAnchorAgentReviews({
    deterministic: allPassDeterministic(),
    evidenceManifestSha256: evidenceSha,
    passes,
    aggregatedAt: now,
  });
  check(agg.outcome === 'human_review_required', '4 PASS + 1 uncertain blocks');
  check(agg.conflictingAnchorIds.includes('mouthUpper'), 'uncertain anchor listed');
}

// 4 PASS + 1 FAIL
{
  const passes = [1, 2, 3, 4, 5].map((i) =>
    makePass(/** @type {any} */ (i), (findings) => {
      if (i === 3) {
        findings[2].visualStatus = 'fail';
        findings[2].needsHuman = true;
        findings[2].conciseReason = 'wrong_lip';
      }
    }),
  );
  const agg = aggregateFaceAnchorAgentReviews({
    deterministic: allPassDeterministic(),
    evidenceManifestSha256: evidenceSha,
    passes,
    aggregatedAt: now,
  });
  check(agg.outcome === 'human_review_required', '4 PASS + 1 FAIL blocks');
}

// 5 PASS + deterministic FAIL
{
  const passes = [1, 2, 3, 4, 5].map((i) => makePass(/** @type {any} */ (i)));
  const agg = aggregateFaceAnchorAgentReviews({
    deterministic: allPassDeterministic({ assetShaMatch: false }),
    evidenceManifestSha256: evidenceSha,
    passes,
    aggregatedAt: now,
  });
  check(agg.outcome === 'human_review_required', '5 PASS + deterministic FAIL blocks');
}

// Duplicate reviewer identity across 5 passes
{
  const passes = [1, 2, 3, 4, 5].map((i) => {
    const p = makePass(/** @type {any} */ (i));
    p.reviewerId = 'same-reviewer';
    return p;
  });
  const agg = aggregateFaceAnchorAgentReviews({
    deterministic: allPassDeterministic(),
    evidenceManifestSha256: evidenceSha,
    passes,
    aggregatedAt: now,
  });
  check(agg.outcome === 'human_review_required', 'duplicate reviewerId blocks');
  check(agg.reasons.includes('duplicate_reviewer_identity'), 'duplicate_reviewer_identity reason');
}

// evidenceViews required on each finding
{
  const pass = makePass(1, (findings) => {
    delete findings[0].evidenceViews;
  });
  const validated = validateFaceAnchorAgentReviewPassReport(pass, {
    evidenceManifestSha256: evidenceSha,
    modelSha256: modelSha,
    anchorsSha256: anchorsSha,
    topologyFingerprint: topo,
    passIndex: 1,
  });
  check(!validated.ok, 'missing evidenceViews blocked');
  check(
    validated.errors.some((e) => e.includes('evidenceViews_missing_or_empty')),
    'evidenceViews_missing_or_empty',
  );
}
{
  const pass = makePass(1, (findings) => {
    findings[0].evidenceViews = [];
  });
  check(
    !validateFaceAnchorAgentReviewPassReport(pass, {
      evidenceManifestSha256: evidenceSha,
      modelSha256: modelSha,
      anchorsSha256: anchorsSha,
      topologyFingerprint: topo,
      passIndex: 1,
    }).ok,
    'empty evidenceViews blocked',
  );
}
{
  const pass = makePass(1, (findings) => {
    findings[0].evidenceViews = ['not_a_view'];
  });
  check(
    !validateFaceAnchorAgentReviewPassReport(pass, {
      evidenceManifestSha256: evidenceSha,
      modelSha256: modelSha,
      anchorsSha256: anchorsSha,
      topologyFingerprint: topo,
      passIndex: 1,
    }).ok,
    'invalid evidenceViews blocked',
  );
}

// Domain bundle parity
const runsDir = join(root, '.qa/runs');
mkdirSync(runsDir, { recursive: true });
const domainOut = join(runsDir, 'face-anchor-agent-review-v1-domain-bundle.mjs');
await build({
  entryPoints: [join(root, 'src/domains/character/avatar/face-anchor-agent-review-v1.ts')],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  outfile: domainOut,
  logLevel: 'silent',
});
const domainMod = await import(`${domainOut}?t=${Date.now()}`);
check(
  domainMod.aggregateFaceAnchorAgentReviews({
    deterministic: domainMod.evaluateFaceAnchorAgentReviewDeterministicGate({
      anchorCount: 21,
      anchorsStructurallyValid: true,
      barycentricAllValid: true,
      primitiveNodeAllValid: true,
      allowedAvatarSurfaceOnly: true,
      noHairSurface: true,
      noEquipmentSurface: true,
      noHelperDebugSurface: true,
      topologyFingerprintMatch: true,
      assetShaMatch: true,
      anatomyValidatorPass: true,
      leftRightSemanticsPlausible: true,
      symmetryPlausibleWhereApplicable: true,
    }),
    evidenceManifestSha256: evidenceSha,
    passes: [1, 2, 3, 4, 5].map((i) => ({
      protocolVersion: FACE_ANCHOR_AGENT_REVIEW_PROTOCOL_VERSION,
      passIndex: i,
      reviewerId: `x-${i}`,
      evidenceManifestSha256: evidenceSha,
      modelSha256: modelSha,
      anchorsSha256: anchorsSha,
      topologyFingerprint: topo,
      findings: domainMod.buildAllPassAgentReviewFindings(),
      reviewedAt: now,
    })),
    aggregatedAt: now,
  }).outcome === 'agent_reviewed',
  'domain bundle 5/5 agent_reviewed',
);

// Authoring GT paths
const authoringOut = join(runsDir, 'liveact-face-mapping-authoring-domain-bundle.mjs');
await build({
  entryPoints: [join(root, 'src/domains/character/avatar/face-mapping-authoring-contract.ts')],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  outfile: authoringOut,
  logLevel: 'silent',
});
const authMod = await import(`${authoringOut}?t=${Date.now()}`);

const human = {
  contractVersion: authMod.FACE_MAPPING_AUTHORING_CONTRACT_VERSION,
  source: 'manual',
  reviewed: true,
  reviewStatus: 'human_reviewed',
  reviewedAt: now,
  asset: { modelPath: 'assets/x.glb' },
};
check(authMod.isReviewedFaceMappingGroundTruth(human), 'human_reviewed remains GT');
check(authMod.canApplyAgentReviewToAuthoring(human).ok === false, 'human cannot be overwritten');
check(
  authMod.canApplyAgentReviewToAuthoring(human).reason === 'human_reviewed_immutable',
  'immutable reason',
);

const legacyHuman = {
  contractVersion: authMod.FACE_MAPPING_AUTHORING_CONTRACT_VERSION,
  source: 'manual',
  reviewed: true,
  reviewedAt: now,
  asset: { modelPath: 'assets/x.glb' },
};
check(authMod.resolveFaceMappingReviewStatus(legacyHuman) === 'human_reviewed', 'legacy migrate human');
check(authMod.isReviewedFaceMappingGroundTruth(legacyHuman), 'legacy human GT');

const jsonOnlyReviewed = {
  contractVersion: authMod.FACE_MAPPING_AUTHORING_CONTRACT_VERSION,
  source: 'auto',
  reviewed: true,
  reviewedAt: now,
  asset: { modelPath: 'assets/x.glb' },
};
check(!authMod.isReviewedFaceMappingGroundTruth(jsonOnlyReviewed), 'JSON-only reviewed≠agent GT');
check(!authMod.validateFaceMappingAuthoringV1(jsonOnlyReviewed).ok, 'JSON-only fails validation');

const manualFakesAgent = {
  ...human,
  reviewStatus: 'agent_reviewed',
  agentReview: {
    protocolVersion: 'face-anchor-agent-review-v1',
    evidenceManifestSha256: 'a'.repeat(64),
    requiredPasses: 5,
    completedPasses: 5,
    aggregationPass: true,
    aggregatedAt: now,
    ledgerDir: '/tmp/nonexistent-agent-review-ledger',
  },
};
check(!authMod.isReviewedFaceMappingGroundTruth(manualFakesAgent), 'manual cannot fake agent');
check(
  authMod.validateFaceMappingAuthoringV1(manualFakesAgent).issues.some(
    (i) => i.code === 'manual_source_fakes_agent_review',
  ),
  'manual_source_fakes_agent_review issue',
);

// Fake completedPasses/aggregation without ledger must not be offline GT
const fakeAgentNoLedger = authMod.createAgentReviewedFaceMappingAuthoring({
  modelPath: 'assets/x.glb',
  modelSha256: modelSha,
  anchorsSha256: anchorsSha,
  topologyFingerprint: topo,
  evidenceManifestSha256: 'b'.repeat(64),
  aggregatedAt: now,
  ledgerDir: '.qa/runs/does-not-exist-agent-review',
});
check(fakeAgentNoLedger.reviewStatus === 'agent_reviewed', 'builder agent status');
check(authMod.isReviewedFaceMappingGroundTruth(fakeAgentNoLedger), 'domain accepts ledgerDir pointer shape');
check(authMod.validateFaceMappingAuthoringV1(fakeAgentNoLedger).ok, 'agent authoring validates shape');
check(!isReviewedFaceMappingGroundTruth(fakeAgentNoLedger), 'offline rejects missing ledger');

check(resolveFaceMappingReviewStatus(legacyHuman) === 'human_reviewed', 'offline legacy');
check(canApplyAgentReviewToAuthoring(human).ok === false, 'offline immutable');
check(createAutoUnreviewedFaceMappingAuthoring({ modelPath: 'a' }).reviewStatus === 'unreviewed', 'offline unreviewed');

// Orchestration temps live under .qa/runs (never commit generated evidence).
const fixtureRoot = join(root, '.qa/runs/face-anchor-agent-review-v1-orch');
const runTmp = join(fixtureRoot, 'tmp-run');
rmSync(fixtureRoot, { recursive: true, force: true });
mkdirSync(join(runTmp, 'agent-review', 'evidence', 'shots'), { recursive: true });

const manifest = buildManifest();
const evidenceDir = join(runTmp, 'agent-review', 'evidence');

// Write real PNGs matching hashes
for (const view of FACE_ANCHOR_AGENT_REVIEW_EVIDENCE_VIEWS) {
  writeFileSync(join(evidenceDir, 'shots', `${view}.png`), pngBytes);
}

const disk = assertScreenshotEvidenceOnDisk(manifest, evidenceDir);
check(disk.ok, 'screenshot evidence on disk');

// Valid manifest but missing files on disk → orch fail closed before reviewers
const missingShotsRun = join(fixtureRoot, 'tmp-missing-shots');
mkdirSync(join(missingShotsRun, 'agent-review', 'evidence'), { recursive: true });
let missingShotVision = 0;
const missingShotsOrch = await runFaceAnchorAgentReviewOrchestration({
  runDir: missingShotsRun,
  evidenceManifest: manifest,
  deterministicInput: allPassDeterministicInput(),
  anchorsJson: {},
  modelSha256: modelSha,
  anchorsSha256: anchorsSha,
  topologyFingerprint: topo,
  candidateModelPath: manifest.candidateModelPath,
  nowIso: now,
  reviewPassFn: async () => {
    missingShotVision += 1;
    throw new Error('should not run without screenshot bytes');
  },
});
check(missingShotsOrch.outcome === 'human_review_required', 'missing screenshot bytes block orch');
check(missingShotsOrch.blocked === 'evidence', 'missing shots blocked=evidence');
check(missingShotVision === 0, 'no reviewer without screenshots');

// JSON-only: empty evidence dir
const emptyRun = join(fixtureRoot, 'tmp-json-only');
rmSync(emptyRun, { recursive: true, force: true });
mkdirSync(join(emptyRun, 'agent-review', 'evidence'), { recursive: true });
const jsonOnlyDisk = assertScreenshotEvidenceOnDisk(manifest, join(emptyRun, 'agent-review', 'evidence'));
check(!jsonOnlyDisk.ok, 'JSON-only (no screenshots) blocked');

const jsonOnlyOrch = await runFaceAnchorAgentReviewOrchestration({
  runDir: emptyRun,
  evidenceManifest: { protocolVersion: 'wrong' },
  deterministicInput: allPassDeterministicInput(),
  anchorsJson: { contractVersion: 'SagaDriveFaceAnchorsV1', anchors: {} },
  modelSha256: modelSha,
  anchorsSha256: anchorsSha,
  topologyFingerprint: topo,
  candidateModelPath: manifest.candidateModelPath,
  nowIso: now,
  reviewPassFn: async () => {
    throw new Error('should not run vision without evidence');
  },
});
check(jsonOnlyOrch.outcome === 'human_review_required', 'orch blocks invalid evidence');
check(jsonOnlyOrch.blocked === 'evidence', 'blocked=evidence');

// Stale evidence fingerprints
const staleOrch = await runFaceAnchorAgentReviewOrchestration({
  runDir: join(fixtureRoot, 'tmp-stale'),
  evidenceManifest: buildManifest({ modelSha256: 'c'.repeat(64) }),
  deterministicInput: allPassDeterministicInput(),
  anchorsJson: {},
  modelSha256: modelSha,
  anchorsSha256: anchorsSha,
  topologyFingerprint: topo,
  candidateModelPath: manifest.candidateModelPath,
  nowIso: now,
  reviewPassFn: async () => {
    throw new Error('should not run on stale evidence');
  },
});
check(staleOrch.outcome === 'human_review_required', 'stale evidence rejected');
check(staleOrch.blocked === 'stale_evidence', 'blocked=stale_evidence');

// Deterministic fail skips vision
let visionCalls = 0;
const detFailOrch = await runFaceAnchorAgentReviewOrchestration({
  runDir: join(fixtureRoot, 'tmp-det-fail'),
  evidenceManifest: manifest,
  deterministicInput: allPassDeterministicInput({ anatomyValidatorPass: false }),
  anchorsJson: {},
  modelSha256: modelSha,
  anchorsSha256: anchorsSha,
  topologyFingerprint: topo,
  candidateModelPath: manifest.candidateModelPath,
  nowIso: now,
  reviewPassFn: async () => {
    visionCalls += 1;
    throw new Error('vision should not run');
  },
});
check(detFailOrch.blocked === 'deterministic', 'deterministic blocks before vision');
check(visionCalls === 0, 'no vision wasted on det fail');

// Full 5-pass success via orchestration
const evidenceManifestSha = sha256Hex(Buffer.from(`${JSON.stringify(manifest)}\n`, 'utf8'));
const fullOrch = await runFaceAnchorAgentReviewOrchestration({
  runDir: runTmp,
  evidenceManifest: manifest,
  deterministicInput: allPassDeterministicInput(),
  anchorsJson: { note: 'supplement_only' },
  modelSha256: modelSha,
  anchorsSha256: anchorsSha,
  topologyFingerprint: topo,
  candidateModelPath: manifest.candidateModelPath,
  nowIso: now,
  reviewPassFn: async (ctx) => {
    // Prove isolation: no priorPasses field
    check(!('priorPasses' in ctx), 'no priorPasses on ctx');
    check(ctx.screenshotPaths.frontal, 'pass gets screenshot paths');
    check(ctx.evidenceManifestSha256 === evidenceManifestSha, 'pass sees evidence hash');
    return {
      protocolVersion: FACE_ANCHOR_AGENT_REVIEW_PROTOCOL_VERSION,
      passIndex: ctx.passIndex,
      reviewerId: ctx.reviewerId,
      evidenceManifestSha256: ctx.evidenceManifestSha256,
      modelSha256: ctx.modelSha256,
      anchorsSha256: ctx.anchorsSha256,
      topologyFingerprint: ctx.topologyFingerprint,
      findings: buildAllPassAgentReviewFindings(),
      reviewedAt: now,
    };
  },
});
check(fullOrch.outcome === 'agent_reviewed', 'orch 5/5 → agent_reviewed');
check(existsSync(join(runTmp, 'agent-review', 'provenance.json')), 'provenance persisted');
check(existsSync(join(runTmp, 'agent-review', 'passes', 'pass-5.json')), 'pass-5 persisted');

const ledgerDir = join(runTmp, 'agent-review');
const ledgerOk = verifyCompletedAgentReviewLedger({
  ledgerDir,
  expectedEvidenceManifestSha256: fullOrch.evidenceManifestSha256,
  expectedModelSha256: modelSha,
  expectedAnchorsSha256: anchorsSha,
  expectedTopologyFingerprint: topo,
});
check(ledgerOk.ok, `completed ledger verifies (${ledgerOk.errors?.join(',') || 'ok'})`);

const built = createAgentReviewedFaceMappingAuthoring({
  modelPath: manifest.candidateModelPath,
  modelSha256: modelSha,
  anchorsSha256: anchorsSha,
  topologyFingerprint: topo,
  evidenceManifestSha256: fullOrch.evidenceManifestSha256,
  aggregatedAt: now,
  ledgerDir,
});
check(isReviewedFaceMappingGroundTruth(built), 'final authoring GT from orch ledger');
check(validateFaceMappingAuthoringV1(built).ok, 'offline validates agent with ledger');

// Hand-written completedPasses=5 without real ledger artifacts
const fakeCompleted = {
  ...built,
  agentReview: {
    ...built.agentReview,
    ledgerDir: join(fixtureRoot, 'tmp-missing-shots', 'agent-review'),
  },
};
check(!isReviewedFaceMappingGroundTruth(fakeCompleted), 'fake completedPasses without ledger blocked');

// Copied/reused pass identity via orch reviewer slot mismatch
const copiedRun = join(fixtureRoot, 'tmp-copied-pass');
mkdirSync(join(copiedRun, 'agent-review', 'evidence', 'shots'), { recursive: true });
for (const view of FACE_ANCHOR_AGENT_REVIEW_EVIDENCE_VIEWS) {
  writeFileSync(join(copiedRun, 'agent-review', 'evidence', 'shots', `${view}.png`), pngBytes);
}
const copiedOrch = await runFaceAnchorAgentReviewOrchestration({
  runDir: copiedRun,
  evidenceManifest: manifest,
  deterministicInput: allPassDeterministicInput(),
  anchorsJson: {},
  modelSha256: modelSha,
  anchorsSha256: anchorsSha,
  topologyFingerprint: topo,
  candidateModelPath: manifest.candidateModelPath,
  nowIso: now,
  reviewPassFn: async (ctx) => {
    // Copy pass-1 identity onto every slot
    return {
      protocolVersion: FACE_ANCHOR_AGENT_REVIEW_PROTOCOL_VERSION,
      passIndex: ctx.passIndex,
      reviewerId: 'agent-pass-1',
      evidenceManifestSha256: ctx.evidenceManifestSha256,
      modelSha256: ctx.modelSha256,
      anchorsSha256: ctx.anchorsSha256,
      topologyFingerprint: ctx.topologyFingerprint,
      findings: buildAllPassAgentReviewFindings(),
      reviewedAt: now,
    };
  },
});
check(copiedOrch.outcome === 'human_review_required', 'copied reviewerId blocked by orch');
check(
  String(copiedOrch.blocked || '').includes('invalid') ||
    (copiedOrch.aggregation?.reasons || []).some((r) => String(r).includes('reviewer')),
  'copied reviewer reason present',
);

// Acceptance + design docs
check(existsSync(join(root, '.qa/design/face-anchor-agent-review-v1.md')), 'design doc');
check(existsSync(join(root, '.qa/acceptance/face-anchor-agent-review-v1.md')), 'acceptance doc');

console.log('face-anchor-agent-review-check OK');
