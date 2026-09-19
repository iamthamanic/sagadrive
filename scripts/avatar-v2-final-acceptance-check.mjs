#!/usr/bin/env node
/**
 * avatar-v2-final-acceptance-check — Golden Matrix + docs + security closeout (#270).
 * Location: scripts/avatar-v2-final-acceptance-check.mjs
 */
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { build } from 'esbuild';
import { performance } from 'node:perf_hooks';

const root = fileURLToPath(new URL('..', import.meta.url));
function read(rel) {
  return readFileSync(join(root, rel), 'utf8');
}
function check(cond, msg) {
  if (!cond) {
    console.error(`avatar-v2-final-acceptance-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const domain = read('src/domains/character/avatar/final-acceptance-matrix-v1.ts');
const index = read('src/domains/character/avatar/index.ts');
const glbDoc = read('docs/avatar-v2-modular-glb-spec.md');
const pipeline = read('.qa/design/avatar-v2-modular-pipeline.md');
const securityDoc = read('.qa/design/avatar-v2-final-security-matrix.md');

check(/AVATAR_V2_GOLDEN_MATRIX_V1/.test(domain), 'matrix');
check(/AVATAR_V2_SECURITY_MATRIX_V1/.test(domain), 'security');
check(/AVATAR_V2_PERF_BUDGETS_V1/.test(domain), 'perf');
check(!/from ['"]react['"]/.test(domain), 'no react');
check(/assertAvatarV2FinalAcceptanceInvariants/.test(index), 'barrel');
check(/SagaDrive Modular Avatar GLB v1/.test(glbDoc), 'glb title');
check(/provider-neutral|provider-neutral/i.test(glbDoc), 'glb provider-neutral');
check(/Capabilities|Fähigkeiten/.test(glbDoc), 'glb capabilities section');
check(/final-acceptance|Golden Matrix/.test(pipeline), 'pipeline closeout');
check(/cross-owner|extras\.sagadrive|provider-success/i.test(securityDoc), 'security doc');

const outDir = join(root, 'node_modules/.cache/avatar-v2-final-acceptance-check');
mkdirSync(outDir, { recursive: true });
const outfile = join(outDir, 'matrix.mjs');
await build({
  entryPoints: [join(root, 'src/domains/character/avatar/final-acceptance-matrix-v1.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile,
  logLevel: 'silent',
});
const m = await import(outfile + `?t=${Date.now()}`);
const assert = m.assertAvatarV2FinalAcceptanceInvariants();
check(assert.ok, `invariants: ${assert.issues.join('; ')}`);

check(m.AVATAR_V2_GOLDEN_MATRIX_V1.length >= 12, '≥12 journeys');
check(m.AVATAR_V2_SECURITY_MATRIX_V1.length >= 4, '≥4 security');

// Fixture presence for matrix refs that are files
for (const j of m.AVATAR_V2_GOLDEN_MATRIX_V1) {
  if (j.fixtureRef.startsWith('fixtures/')) {
    check(existsSync(join(root, j.fixtureRef)), `fixture ${j.fixtureRef}`);
  }
  for (const script of j.requiredChecks) {
    check(existsSync(join(root, 'scripts', script)), `check script ${script}`);
  }
}

// Soft perf budgets on pure domain builds (already bundled)
const t0 = performance.now();
m.assertAvatarV2FinalAcceptanceInvariants();
const elapsed = performance.now() - t0;
check(elapsed < 100, `matrix assert budget (${elapsed.toFixed(1)}ms)`);

check(existsSync(join(root, '.qa/acceptance/avatar-v2-final-acceptance.md')), 'acceptance');
check(existsSync(join(root, 'docs/avatar-v2-modular-glb-spec.md')), 'glb doc');
console.log('avatar-v2-final-acceptance-check PASS');
