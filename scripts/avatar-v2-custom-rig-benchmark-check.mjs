#!/usr/bin/env node
/**
 * avatar-v2-custom-rig-benchmark-check — deterministic tests for #265.
 * Location: scripts/avatar-v2-custom-rig-benchmark-check.mjs
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
    console.error(`avatar-v2-custom-rig-benchmark-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const domain = read('src/domains/character/avatar/custom-rig-benchmark-v1.ts');
const index = read('src/domains/character/avatar/index.ts');
const design = read('.qa/design/avatar-v2-custom-rig-benchmark.md');
const pipeline = read('.qa/design/avatar-v2-modular-pipeline.md');
const provider = read('src/domains/character/avatar/rigging-provider-contract.ts');

check(/CUSTOM_RIG_BENCHMARK_MATRIX_V1/.test(domain), 'matrix');
check(/meshy-full-rig/.test(domain) && /skintokens-full-rig/.test(domain), 'meshy+skintokens');
check(/unirig-prior-art/.test(domain), 'prior art');
check(/import-existing-rig/.test(domain), 'import existing');
check(/capabilitiesAfterProviderSuccess/.test(domain), 'pending helper');
check(!/from ['"]react['"]/.test(domain), 'no react');
check(/resolveCustomRigBenchmarkDecision/.test(index), 'barrel');
check(/Humanoid Default/.test(design) || /meshy-full-rig/.test(design), 'design humanoid');
check(/Auto-Rig explizit optional|auto-rig.*optional/i.test(design + pipeline), 'custom optional');
check(/custom-rig-benchmark/.test(pipeline), 'pipeline link');
check(/RIGGING_PROVIDER_IDS/.test(provider), 'provider contract still present');
check(existsSync(join(root, 'fixtures/avatar-v2/golden/rig-profile-gumo-like.json')), 'gumo fixture');
check(existsSync(join(root, 'fixtures/avatar-v2/golden/rig-profile-alien.json')), 'alien fixture');

const outDir = join(root, 'node_modules/.cache/avatar-v2-custom-rig-benchmark-check');
mkdirSync(outDir, { recursive: true });
const outfile = join(outDir, 'bench.mjs');
await build({
  entryPoints: [join(root, 'src/domains/character/avatar/custom-rig-benchmark-v1.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile,
  logLevel: 'silent',
});
const m = await import(outfile + `?t=${Date.now()}`);
const assert = m.assertCustomRigBenchmarkInvariants();
check(assert.ok, `invariants: ${assert.issues.join('; ')}`);

const d = m.resolveCustomRigBenchmarkDecision();
check(d.capabilitiesAlwaysPending === true, 'pending');
check(d.skintokensWorkerStatus === 'unavailable', 'skintokens unavailable');
check(m.capabilitiesAfterProviderSuccess() === 'pending', 'provider→pending');

const paths = new Set(m.CUSTOM_RIG_BENCHMARK_MATRIX_V1.map((c) => c.pathId));
check(paths.size >= 3, '≥3 paths');
check(m.CUSTOM_RIG_BENCHMARK_FIXTURE_IDS.length >= 5, '≥5 fixtures');

check(existsSync(join(root, '.qa/acceptance/avatar-v2-custom-rig-benchmark.md')), 'acceptance');
console.log('avatar-v2-custom-rig-benchmark-check PASS');
