#!/usr/bin/env node
/**
 * avatar-v2-custom-creature-contract-check — deterministic tests for #264.
 * Location: scripts/avatar-v2-custom-creature-contract-check.mjs
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
    console.error(`avatar-v2-custom-creature-contract-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const domain = read('src/domains/character/avatar/rig-capability-contract-v2.ts');
const v1 = read('src/domains/character/avatar/rig-contract.ts');
const index = read('src/domains/character/avatar/index.ts');

check(/resolveAvatarRigCapabilitiesV2/.test(domain), 'resolver v2');
check(/listCustomCreatureGoldenFixtures/.test(domain), 'golden fixtures');
check(/assertCustomCreatureContractInvariants/.test(domain), 'invariants');
check(/AVATAR_SAFE_CUSTOM_ANCHORS_V2/.test(domain), 'safe anchors');
check(/custom-creature/.test(domain), 'custom-creature profile');
check(!/from ['"]react['"]/.test(domain), 'no react');
check(!/three/i.test(domain.split('\n').filter((l) => l.includes('import')).join('\n')), 'no three import');
check(/SagaDriveHumanoidRigV1/.test(v1), 'v1 preserved');
check(/resolveAvatarRigCapabilitiesV2/.test(index), 'barrel export');
check(/RIG_CAPABILITY_CONTRACT_V2_VERSION/.test(index), 'barrel version');

for (const id of ['human', 'dwarf', 'faruk-like']) {
  check(
    existsSync(join(root, `fixtures/avatar-v2/golden/rig-profile-${id}.json`)),
    `golden fixture file ${id}`,
  );
}

const outDir = join(root, 'node_modules/.cache/avatar-v2-custom-creature-contract-check');
mkdirSync(outDir, { recursive: true });
const outfile = join(outDir, 'rig-cap-v2.mjs');
await build({
  entryPoints: [join(root, 'src/domains/character/avatar/rig-capability-contract-v2.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile,
  logLevel: 'silent',
});
const m = await import(outfile + `?t=${Date.now()}`);
const assert = m.assertCustomCreatureContractInvariants();
check(assert.ok, `invariants: ${assert.issues.join('; ')}`);

const fixtures = m.listCustomCreatureGoldenFixtures();
check(fixtures.length === 3, 'three golden fixtures');

const faruk = m.resolveGoldenFixtureCapabilities('faruk-like');
check(faruk.profile.kind === 'custom-creature', 'faruk profile');
check(faruk.flags.includes('animated'), 'faruk animated');
check(!faruk.flags.includes('humanoid'), 'faruk not humanoid');
check(faruk.flags.includes('rigid-equipment'), 'faruk rigid via safe anchors');

const human = m.resolveGoldenFixtureCapabilities('human');
check(human.profile.kind === 'humanoid', 'human profile');
check(human.flags.includes('humanoid') && human.flags.includes('vrm-ready'), 'human full');

check(
  existsSync(join(root, '.qa/acceptance/avatar-v2-custom-creature-contract.md')),
  'acceptance',
);
console.log('avatar-v2-custom-creature-contract-check PASS');
