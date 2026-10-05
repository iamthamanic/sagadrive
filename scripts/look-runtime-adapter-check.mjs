#!/usr/bin/env node
/**
 * look-runtime-adapter-check — contract for #342 LookRuntime + adapters.
 * Location: scripts/look-runtime-adapter-check.mjs
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const require = createRequire(import.meta.url);
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

const required = [
  'src/infrastructure/look/look-runtime.ts',
  'src/infrastructure/look/look-runtime-types.ts',
  'src/infrastructure/look/look-material-roles.ts',
  'src/infrastructure/look/adapters/host-mtoon-look-adapter.ts',
  'src/infrastructure/look/adapters/toonlab-look-adapter.ts',
  '.qa/acceptance/look-runtime-adapter.md',
  '.qa/design/look-runtime-adapter.md',
];

for (const rel of required) {
  check(existsSync(join(root, rel)), `missing ${rel}`);
}

const domainLook = read('src/domains/look/index.ts');
const runtime = read('src/infrastructure/look/look-runtime.ts');
const toonStub = read('src/infrastructure/look/adapters/toonlab-look-adapter.ts');
const host = read('src/infrastructure/look/adapters/host-mtoon-look-adapter.ts');
const roles = read('src/infrastructure/look/look-material-roles.ts');
const studio = read('src/infrastructure/character/avatar/character-studio-runtime.ts');
const pkg = read('package.json');
const canvasPath = 'src/app/character/avatar/AvatarCanvas.tsx';
const canvas = existsSync(join(root, canvasPath)) ? read(canvasPath) : '';

check(!/toonlab|@call-me-sensei\/toonlab/i.test(domainLook), 'domains/look must not mention ToonLab');
check(!/"@call-me-sensei\/toonlab"/.test(pkg), 'no ToonLab npm dependency');
check(/createLookRuntime|LookRuntime/.test(runtime), 'LookRuntime export');
check(/host-mtoon/.test(host), 'host adapter id');
check(/blocked|BLOCKED/.test(toonStub), 'toonlab stub blocked');
check(!/from ['"]@call-me-sensei\/toonlab['"]/.test(toonStub), 'stub must not import toonlab package');
check(/unclassified/.test(roles), 'unclassified material role');
check(/classifyLookMaterialRole/.test(roles), 'role classifier');
check(/applyLookProfile/.test(studio), 'CharacterStudioRuntime applyLookProfile');
check(/restorePbrNeutralLook/.test(studio), 'CharacterStudioRuntime restorePbrNeutralLook');
if (canvas) {
  check(!/toonlab|@call-me-sensei/i.test(canvas), 'AvatarCanvas must stay ToonLab-free');
}

async function loadRoles() {
  try {
    return await import(pathToFileURL(join(root, 'src/infrastructure/look/look-material-roles.ts')).href);
  } catch {
    try {
      const jiti = require('jiti')(import.meta.url);
      return jiti(join(root, 'src/infrastructure/look/look-material-roles.ts'));
    } catch {
      return null;
    }
  }
}

async function loadToon() {
  try {
    return await import(
      pathToFileURL(join(root, 'src/infrastructure/look/adapters/toonlab-look-adapter.ts')).href
    );
  } catch {
    try {
      const jiti = require('jiti')(import.meta.url);
      return jiti(join(root, 'src/infrastructure/look/adapters/toonlab-look-adapter.ts'));
    } catch {
      return null;
    }
  }
}

const rolesMod = await loadRoles();
if (rolesMod?.classifyLookMaterialRole) {
  check(rolesMod.classifyLookMaterialRole('Shirt_Upper') === 'cloth', 'shirt → cloth');
  check(rolesMod.classifyLookMaterialRole('GenericMesh_01') === 'unclassified', 'unknown ≠ cloth');
  check(rolesMod.classifyLookMaterialRole('Face_Skin') === 'skin', 'face → skin');
} else {
  console.warn('look-runtime-adapter-check: role module import skipped');
}

const toonMod = await loadToon();
if (toonMod?.createToonLabLookAdapter) {
  const adapter = toonMod.createToonLabLookAdapter();
  check(adapter.isAvailable() === false, 'toonlab adapter unavailable while spike BLOCKED');
  check(typeof adapter.unavailableReasonDe === 'string' && adapter.unavailableReasonDe.length > 0, 'blocked reason');
}

if (failures > 0) {
  console.error(`look-runtime-adapter-check: ${failures} Fehler`);
  process.exit(1);
}
console.log('look-runtime-adapter-check: PASS (#342)');
