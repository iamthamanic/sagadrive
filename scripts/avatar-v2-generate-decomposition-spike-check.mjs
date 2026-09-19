#!/usr/bin/env node
/**
 * avatar-v2-generate-decomposition-spike-check — deterministic tests for #268.
 * Location: scripts/avatar-v2-generate-decomposition-spike-check.mjs
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
    console.error(`avatar-v2-generate-decomposition-spike-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const domain = read('src/domains/character/avatar/modular-generate-decomposition-spike-v1.ts');
const index = read('src/domains/character/avatar/index.ts');
const design = read('.qa/design/avatar-v2-generate-decomposition-spike.md');
const pipeline = read('.qa/design/avatar-v2-modular-pipeline.md');

check(/MODULAR_GENERATE_DECOMPOSITION_MATRIX_V1/.test(domain), 'matrix');
check(/vision-parse-library-body-catalog-wearables/.test(domain), 'default approach');
check(/forbidFullModularFromBlob:\s*true/.test(domain), 'forbid blob');
check(/free-form/.test(domain), 'free-form degrade');
check(/buildModularGenerateHandoffFor269/.test(domain), 'handoff #269');
check(!/from ['"]react['"]/.test(domain), 'no react');
check(/resolveModularGenerateDecompositionDecision/.test(index), 'barrel');
check(/Vision\/Parse|vision-parse|Library Body/.test(design + pipeline), 'design default');
check(/generate-decomposition/.test(pipeline), 'pipeline link');
check(/full modular|full modular/i.test(design), 'honest modularity');

const outDir = join(root, 'node_modules/.cache/avatar-v2-generate-decomposition-spike-check');
mkdirSync(outDir, { recursive: true });
const outfile = join(outDir, 'spike.mjs');
await build({
  entryPoints: [
    join(root, 'src/domains/character/avatar/modular-generate-decomposition-spike-v1.ts'),
  ],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile,
  logLevel: 'silent',
});
const m = await import(outfile + `?t=${Date.now()}`);
const assert = m.assertModularGenerateDecompositionInvariants();
check(assert.ok, `invariants: ${assert.issues.join('; ')}`);

const d = m.resolveModularGenerateDecompositionDecision();
check(d.defaultApproachId === 'vision-parse-library-body-catalog-wearables', 'default');
check(d.forbidFullModularFromBlob === true, 'no blob modular');
check(d.jobGraph.stages.length >= 6, 'stages');
check(m.MODULAR_GENERATE_GOLDEN_FIXTURE_IDS.length >= 5, '≥5 fixtures');

const handoff = m.buildModularGenerateHandoffFor269();
check(handoff.rolePlan.some((r) => r.role === 'skinned-wearable'), 'wearable role');
check(handoff.rolePlan.some((r) => r.role === 'rigid-prop'), 'prop role');

check(
  existsSync(join(root, '.qa/acceptance/avatar-v2-generate-decomposition-spike.md')),
  'acceptance',
);
console.log('avatar-v2-generate-decomposition-spike-check PASS');
