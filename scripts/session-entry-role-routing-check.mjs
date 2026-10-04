#!/usr/bin/env node
/**
 * session-entry-role-routing-check — Canonical session entry (#477).
 * Location: scripts/session-entry-role-routing-check.mjs
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
  'src/domains/session/contracts/session-entry-routing.ts',
  [
    'resolveCanonicalLiveEntry',
    'buildSessionJoinPath',
    'assertPlayerNotRoutedToGamemaster',
    'decideLegacyGamemasterOpen',
  ],
  'entry routing domain',
);

mustNotInclude(
  'src/domains/session/contracts/session-entry-routing.ts',
  ['supabase', "from 'react'", 'from "react"'],
  'pure entry domain',
);

mustInclude(
  'src/App.tsx',
  ['resolveCanonicalLiveEntry', 'assertPlayerNotRoutedToGamemaster'],
  'App uses canonical entry',
);

mustNotInclude(
  'src/App.tsx',
  ["handleNavigate('gamemaster')"],
  'App must not fall back join → legacy gamemaster',
);

mustInclude(
  'src/app/project/SagaResourceScreen.tsx',
  ['buildSessionJoinPath', 'sagaPublicId'],
  'Saga sessions preserve saga query',
);

mustInclude(
  'src/app/library/Library.tsx',
  ['/sagas/', '/sessions'],
  'Library GM opens saga sessions not /gamemaster',
);

mustNotInclude(
  'src/app/library/Library.tsx',
  ["onNavigate('gamemaster')"],
  'Library GM must not use legacy gamemaster',
);

const gate = read('scripts/test-gate.mjs');
if (!gate.includes('session-entry-role-routing-check.mjs')) {
  throw new Error('test-gate must invoke session-entry-role-routing-check.mjs');
}

const esbuild = require('esbuild');
const cacheDir = join(root, 'node_modules/.cache/session-entry-role-routing-check');
mkdirSync(cacheDir, { recursive: true });
const out = join(cacheDir, 'entry.mjs');
esbuild.buildSync({
  entryPoints: [join(root, 'src/domains/session/contracts/session-entry-routing.ts')],
  outfile: out,
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  packages: 'bundle',
});
const mod = await import(pathToFileURL(out).href);

const gm = mod.resolveCanonicalLiveEntry({
  role: 'gamemaster',
  sagaPublicId: 'sa-abc12',
  sessionPublicId: 'se-xyz99',
});
if (gm.kind !== 'live' || gm.liveView !== 'gamemaster' || gm.sagaPublicId !== 'SA-ABC12') {
  throw new Error('GM live entry failed');
}

const player = mod.resolveCanonicalLiveEntry({
  role: 'player',
  sagaPublicId: 'SA-ABC12',
  sessionPublicId: 'SE-XYZ99',
});
if (player.kind !== 'live' || player.liveView !== 'player') {
  throw new Error('Player must route to player live');
}

let blocked = false;
try {
  mod.assertPlayerNotRoutedToGamemaster('player', 'gamemaster');
} catch {
  blocked = true;
}
if (!blocked) throw new Error('player→gamemaster must throw');

const joinPath = mod.buildSessionJoinPath({
  sagaPublicId: 'SA-ABC12',
  projectId: 'uuid-1',
  intent: 'join',
});
if (!joinPath.includes('saga=SA-ABC12') || !joinPath.includes('intent=join')) {
  throw new Error('buildSessionJoinPath missing context');
}

const legacy = mod.decideLegacyGamemasterOpen({
  hasAuthorizedGmMembership: false,
  sagaPublicId: null,
  sessionPublicId: null,
});
if (legacy.kind !== 'legacy-blocked') {
  throw new Error('unauthorized legacy gamemaster must be blocked');
}

console.log('session-entry-role-routing-check PASS');
