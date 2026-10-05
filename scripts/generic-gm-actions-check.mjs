#!/usr/bin/env node
/**
 * generic-gm-actions-check — #371 GM action catalog + palette wiring.
 * Location: scripts/generic-gm-actions-check.mjs
 */
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const root = process.cwd();
const require = createRequire(import.meta.url);

function read(rel) {
  return readFileSync(join(root, rel), 'utf8');
}

function mustInclude(file, needles, label) {
  const text = read(file);
  for (const needle of needles) {
    if (!text.includes(needle)) {
      throw new Error(`${label}: missing ${JSON.stringify(needle)} in ${file}`);
    }
  }
}

function mustNotInclude(file, needles, label) {
  const text = read(file);
  for (const needle of needles) {
    if (text.includes(needle)) {
      throw new Error(`${label}: forbidden ${JSON.stringify(needle)} in ${file}`);
    }
  }
}

mustInclude(
  'src/domains/session/contracts/generic-gm-actions.ts',
  [
    'GM_ACTION_CATALOG',
    'composeUnexpectedBeat',
    'resolveGmActionCommand',
    'assertGmActionAllowed',
    'isExecutableGmRuntimeKind',
  ],
  'domain catalog',
);

mustNotInclude(
  'src/domains/session/contracts/generic-gm-actions.ts',
  ['supabase', "from 'react'"],
  'pure domain',
);

mustInclude(
  'src/app/session/GmActionPalette.tsx',
  ['data-gm-action-palette="v1"', 'composeUnexpectedBeat', 'resolveGmActionCommand'],
  'palette UI',
);

mustNotInclude(
  'src/app/session/GmActionPalette.tsx',
  ['JSON.stringify', '<textarea', 'Textarea'],
  'no raw JSON editor',
);

mustInclude(
  'src/app/session/GamemasterLiveScreen.tsx',
  ['GmActionPalette', 'data-gm-generic-action-slot="primary"'],
  'GM live wires palette',
);

const gate = read('scripts/test-gate.mjs');
if (!gate.includes('generic-gm-actions-check.mjs')) {
  throw new Error('test-gate must invoke generic-gm-actions-check.mjs');
}

const esbuild = require('esbuild');
const cacheDir = join(root, 'node_modules/.cache/generic-gm-actions-check');
mkdirSync(cacheDir, { recursive: true });
const out = join(cacheDir, 'gm.mjs');
esbuild.buildSync({
  entryPoints: [join(root, 'src/domains/session/contracts/generic-gm-actions.ts')],
  outfile: out,
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  packages: 'bundle',
});
const mod = await import(pathToFileURL(out).href);

const beat = mod.composeUnexpectedBeat('Taverne anzünden');
if (!beat.includes('change-scene') || !beat.includes('apply-damage')) {
  throw new Error(`unexpected beat composition failed: ${beat.join(',')}`);
}

const cmd = mod.resolveGmActionCommand({
  actionId: 'request-check',
  targetId: 'char-1',
  skill: 'athletics',
});
if (cmd.kind !== 'roll' || cmd.payload.skill !== 'athletics') {
  throw new Error('request-check resolve failed');
}

const gm = { role: 'gamemaster', capabilities: [], characterId: null };
mod.assertGmActionAllowed(gm, mod.getGmAction('apply-damage'));

let blocked = false;
try {
  mod.assertGmActionAllowed(
    { role: 'viewer', capabilities: ['director'], characterId: null },
    mod.getGmAction('apply-damage'),
  );
} catch {
  blocked = true;
}
if (!blocked) throw new Error('director-only viewer must not run gameplay actions');

if (!mod.isExecutableGmRuntimeKind('combat')) throw new Error('combat should be executable');
if (mod.isExecutableGmRuntimeKind('inventory')) throw new Error('inventory not yet executable');

console.log('generic-gm-actions-check: PASS');
