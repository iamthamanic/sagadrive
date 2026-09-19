#!/usr/bin/env node
/**
 * avatar-v2-identity-transfer-spike-check — deterministic tests for #262.
 * Location: scripts/avatar-v2-identity-transfer-spike-check.mjs
 */
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));

function read(rel) {
  return readFileSync(join(root, rel), 'utf8');
}

function check(cond, msg) {
  if (!cond) {
    console.error(`avatar-v2-identity-transfer-spike-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const domain = read('src/domains/character/avatar/identity-transfer-spike-v1.ts');
const index = read('src/domains/character/avatar/index.ts');
const design = read('.qa/design/avatar-v2-identity-transfer-spike.md');
const pipeline = read('.qa/design/avatar-v2-modular-pipeline.md');

check(/IDENTITY_TRANSFER_SPIKE_CONTRACT_VERSION/.test(domain), 'version');
check(/IDENTITY_TRANSFER_GOLDEN_MATRIX_V1/.test(domain), 'matrix');
check(/landmark-morph-fitting/.test(domain), 'morph approach');
check(/texture-projection-bake/.test(domain), 'texture approach');
check(/material-trait-transfer/.test(domain), 'trait approach');
check(/ai-assisted/.test(domain), 'ai approach scored');
check(/bannedFromDefault/.test(domain), 'ban list');
check(/buildIdentityTransferConversionPlan/.test(domain), 'conversion plan');
check(!/from ['"]react['"]/.test(domain), 'no react');
check(!/from ['"]three['"]/.test(domain), 'no three');
check(/resolveIdentityTransferDecision/.test(index), 'barrel decision');
check(/buildIdentityTransferConversionPlan/.test(index), 'barrel plan');
check(/Default pipeline/.test(design) || /Default =/.test(design), 'design default');
check(/Degraded fallback/.test(design) || /degraded/.test(design), 'design fallback');
check(/identity-transfer-spike/.test(pipeline), 'pipeline links spike');

const outDir = join(root, 'node_modules/.cache/avatar-v2-identity-transfer-spike-check');
mkdirSync(outDir, { recursive: true });
const outfile = join(outDir, 'spike.mjs');
await build({
  entryPoints: [join(root, 'src/domains/character/avatar/identity-transfer-spike-v1.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile,
  logLevel: 'silent',
});
const m = await import(outfile + `?t=${Date.now()}`);

const assert = m.assertIdentityTransferSpikeInvariants();
check(assert.ok, `invariants: ${assert.issues.join('; ')}`);

const decision = m.resolveIdentityTransferDecision();
check(decision.defaultApproachIds.includes('landmark-morph-fitting'), 'default morph');
check(decision.defaultApproachIds.includes('material-trait-transfer'), 'default traits');
check(!decision.defaultApproachIds.includes('ai-assisted'), 'no ai default');
check(decision.bannedFromDefault.includes('ai-assisted'), 'ai banned');

const plan = m.buildIdentityTransferConversionPlan();
check(plan.steps.length >= 5, 'plan steps');
check(plan.degradedFallbackSteps.length >= 3, 'fallback steps');
check(plan.targetFamilies.includes('standard'), 'target standard');
check(/capabilities remain empty/.test(plan.outputs.join(' ')), 'no capability invent');

const approaches = new Set(m.IDENTITY_TRANSFER_GOLDEN_MATRIX_V1.map((r) => r.approachId));
check(approaches.size >= 3, '≥3 approaches');
check(m.IDENTITY_TRANSFER_GOLDEN_FIXTURE_IDS.length >= 4, '≥4 fixtures');

const gumo = m.selectTransferPipelineForFixture('gumo-like');
check(gumo.mode === 'degraded', 'gumo degraded');
const human = m.selectTransferPipelineForFixture('human');
check(human.mode === 'default', 'human default');

check(existsSync(join(root, '.qa/acceptance/avatar-v2-identity-transfer-spike.md')), 'acceptance');

console.log('avatar-v2-identity-transfer-spike-check PASS');
