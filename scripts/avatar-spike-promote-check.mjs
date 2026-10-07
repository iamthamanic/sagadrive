#!/usr/bin/env node
/**
 * avatar-spike-promote-check — #323 Option 1 promote/rename gate.
 * Location: scripts/avatar-spike-promote-check.mjs
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const root = process.cwd();
let failures = 0;

function check(cond, msg) {
  if (!cond) {
    failures += 1;
    console.error(`FAIL: ${msg}`);
  }
}

function read(rel) {
  return readFileSync(join(root, rel), 'utf8');
}

const promoted = [
  'src/domains/character/avatar/identity-transfer-v1.ts',
  'src/domains/character/avatar/custom-rig-decision-v1.ts',
  'src/domains/character/avatar/modular-generate-decomposition-v1.ts',
];
const banned = [
  'src/domains/character/avatar/identity-transfer-spike-v1.ts',
  'src/domains/character/avatar/custom-rig-benchmark-v1.ts',
  'src/domains/character/avatar/modular-generate-decomposition-spike-v1.ts',
  'scripts/avatar-v2-identity-transfer-spike-check.mjs',
  'scripts/avatar-v2-custom-rig-benchmark-check.mjs',
  'scripts/avatar-v2-generate-decomposition-spike-check.mjs',
];

for (const rel of promoted) {
  check(existsSync(join(root, rel)), `missing promoted ${rel}`);
}
for (const rel of banned) {
  check(!existsSync(join(root, rel)), `stale path still present: ${rel}`);
}

const index = read('src/domains/character/avatar/index.ts');
check(/from '\.\/identity-transfer-v1'/.test(index), 'barrel identity-transfer-v1');
check(/from '\.\/custom-rig-decision-v1'/.test(index), 'barrel custom-rig-decision-v1');
check(/from '\.\/modular-generate-decomposition-v1'/.test(index), 'barrel modular-generate-decomposition-v1');
check(!/identity-transfer-spike-v1|custom-rig-benchmark-v1|modular-generate-decomposition-spike-v1/.test(index), 'barrel no stale paths');

const body = read('src/domains/character/avatar/body-conversion-flow-v1.ts');
check(/from '\.\/identity-transfer-v1'/.test(body), 'body-conversion import');
const creature = read('src/domains/character/avatar/custom-creature-flow-v1.ts');
check(/from '\.\/custom-rig-decision-v1'/.test(creature), 'custom-creature import');
const modular = read('src/domains/character/avatar/modular-generate-flow-v1.ts');
check(/from '\.\/modular-generate-decomposition-v1'/.test(modular), 'modular-generate import');

const gate = read('scripts/test-gate.mjs');
check(/avatar-v2-identity-transfer-check\.mjs/.test(gate), 'test-gate identity');
check(/avatar-v2-custom-rig-decision-check\.mjs/.test(gate), 'test-gate rig decision');
check(/avatar-v2-generate-decomposition-check\.mjs/.test(gate), 'test-gate decomposition');
check(!/avatar-v2-identity-transfer-spike-check|avatar-v2-custom-rig-benchmark-check|avatar-v2-generate-decomposition-spike-check/.test(gate), 'test-gate no stale scripts');

const idDomain = read('src/domains/character/avatar/identity-transfer-v1.ts');
check(/IDENTITY_TRANSFER_CONTRACT_VERSION/.test(idDomain), 'promoted version const');
check(!/IDENTITY_TRANSFER_SPIKE_CONTRACT_VERSION/.test(idDomain), 'no spike version const');
check(/assertIdentityTransferInvariants/.test(idDomain), 'promoted assert name');

check(existsSync(join(root, '.qa/acceptance/avatar-spike-promote.md')), 'acceptance');

if (failures > 0) {
  console.error(`avatar-spike-promote-check: ${failures} failure(s)`);
  process.exit(1);
}
console.log('avatar-spike-promote-check: PASS');
