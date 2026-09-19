#!/usr/bin/env node
/**
 * avatar-v2-modular-glb-contract-check — deterministic tests for #250.
 * Location: scripts/avatar-v2-modular-glb-contract-check.mjs
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
    console.error(`avatar-v2-modular-glb-contract-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const domain = read('src/domains/character/avatar/modular-glb-contract-v1.ts');
const index = read('src/domains/character/avatar/index.ts');
const spec = read('docs/avatar-v2-modular-glb-spec.md');

check(/MODULAR_AVATAR_GLB_CONTRACT_VERSION/.test(domain), 'version');
check(/body\|wearable\|trait\|prop|MODULAR_AVATAR_GLB_NODE_ROLES/.test(domain), 'roles');
check(/parseModularAvatarGlbExtras/.test(domain), 'parser');
check(/validateModularAvatarGlbNodes/.test(domain), 'validator');
check(!/from ['"]react['"]/.test(domain), 'no react');
check(!/from ['"]three['"]/.test(domain), 'no three');
check(/validateModularAvatarGlbNodes/.test(index), 'barrel');
check(/kein Meshy/.test(spec), 'spec provider-neutral (kein Meshy)');
check(/extras\.sagadrive/.test(spec), 'spec extras');
check(/Body_Base/.test(spec), 'spec Body_Base');

for (const name of [
  'modular-glb-v1.valid.json',
  'modular-glb-v1.invalid-role.json',
  'modular-glb-v1.invalid-version.json',
  'modular-glb-v1.limited-no-extras.json',
]) {
  check(existsSync(join(root, 'fixtures/avatar-v2', name)), `fixture ${name}`);
}

const outDir = join(root, 'node_modules/.cache/avatar-v2-modular-glb-check');
mkdirSync(outDir, { recursive: true });
const outfile = join(outDir, 'modular-glb.mjs');
await build({
  entryPoints: [join(root, 'src/domains/character/avatar/modular-glb-contract-v1.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile,
  logLevel: 'silent',
});
const m = await import(outfile);

const valid = JSON.parse(read('fixtures/avatar-v2/modular-glb-v1.valid.json'));
const validResult = m.validateModularAvatarGlbNodes(valid.nodes);
check(validResult.status === 'valid', `valid status got ${validResult.status}`);
check(validResult.nodes.length === 3, 'valid node count');
check(validResult.nodes.some((n) => n.role === 'body'), 'has body');

const badRole = JSON.parse(read('fixtures/avatar-v2/modular-glb-v1.invalid-role.json'));
const badRoleResult = m.validateModularAvatarGlbNodes(badRole.nodes);
check(badRoleResult.status === 'invalid', 'invalid role');

const badVer = JSON.parse(read('fixtures/avatar-v2/modular-glb-v1.invalid-version.json'));
const badVerResult = m.validateModularAvatarGlbNodes(badVer.nodes);
check(badVerResult.status === 'needs-review', 'version mismatch → needs-review');

const limited = JSON.parse(read('fixtures/avatar-v2/modular-glb-v1.limited-no-extras.json'));
const limitedResult = m.validateModularAvatarGlbNodes(limited.nodes);
check(limitedResult.status === 'limited', 'no extras → limited');

const foreign = m.parseModularAvatarGlbExtras({
  sagadrive: {
    contractVersion: 'SagaDriveModularAvatarGlbV1',
    role: 'wearable',
    slot: 'not-a-slot',
  },
});
check(foreign.extras === null, 'bad slot fail-closed');

console.log('avatar-v2-modular-glb-contract-check PASS');
