#!/usr/bin/env node
/**
 * player-join-character-assignment-check — #478 join + membership resolve.
 * Location: scripts/player-join-character-assignment-check.mjs
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
  'src/domains/session/contracts/player-character-assignment.ts',
  [
    'resolveCharacterAssignmentPick',
    'assertOwnedCharacterId',
    'assertUrlCharacterMatchesMembership',
  ],
  'assignment domain',
);

mustNotInclude(
  'src/domains/session/contracts/player-character-assignment.ts',
  ['supabase', "from 'react'", 'from "react"'],
  'pure assignment domain',
);

mustInclude(
  'src/app/session/SessionJoin.tsx',
  [
    'character_id',
    'characterPublicId',
    'resolveCharacterAssignmentPick',
    'data-join-with-character',
    'data-character-assignment',
  ],
  'SessionJoin sends character_id',
);

mustInclude(
  'src/app/session/PlayerCharacterResolve.tsx',
  ['pathForSessionLive', 'characterId', 'data-player-character-resolve'],
  'player-resolve surface',
);

mustInclude(
  'src/app/session/SessionResourceScreen.tsx',
  ['PlayerCharacterResolve', "liveView === 'player-resolve'"],
  'resolve wired on player-resolve',
);

mustInclude(
  'src/app/session/hooks/usePlayerPanel.ts',
  ['assertUrlCharacterMatchesMembership', 'membership'],
  'PlayerPanel membership authority',
);

mustInclude(
  'src/App.tsx',
  ['meta?.characterPublicId'],
  'App navigates with characterPublicId',
);

const gate = read('scripts/test-gate.mjs');
if (!gate.includes('player-join-character-assignment-check.mjs')) {
  throw new Error('test-gate must invoke player-join-character-assignment-check.mjs');
}

const esbuild = require('esbuild');
const cacheDir = join(root, 'node_modules/.cache/player-join-character-assignment-check');
mkdirSync(cacheDir, { recursive: true });
const out = join(cacheDir, 'assignment.mjs');
esbuild.buildSync({
  entryPoints: [join(root, 'src/domains/session/contracts/player-character-assignment.ts')],
  outfile: out,
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  packages: 'bundle',
});
const mod = await import(pathToFileURL(out).href);

const none = mod.resolveCharacterAssignmentPick({ owned: [] });
if (none.kind !== 'none') throw new Error('expected none for empty owned');

const one = mod.resolveCharacterAssignmentPick({
  owned: [{ id: 'c1', publicId: 'CH-AAAA1', name: 'A' }],
});
if (one.kind !== 'single' || one.character.id !== 'c1') {
  throw new Error('expected single');
}

const many = mod.resolveCharacterAssignmentPick({
  owned: [
    { id: 'c1', publicId: 'CH-AAAA1', name: 'A' },
    { id: 'c2', publicId: 'CH-BBBB2', name: 'B' },
  ],
});
if (many.kind !== 'choose' || many.characters.length !== 2) {
  throw new Error('expected choose');
}

const bound = mod.resolveCharacterAssignmentPick({
  owned: [{ id: 'c1', publicId: 'CH-AAAA1', name: 'A' }],
  boundCharacterId: 'c9',
});
if (bound.kind !== 'bound' || bound.characterId !== 'c9') {
  throw new Error('expected bound');
}

try {
  mod.assertOwnedCharacterId(['c1'], 'c2');
  throw new Error('assertOwned should throw');
} catch (err) {
  if (!(err instanceof Error) || !err.message.includes('nicht zum angemeldeten')) {
    throw err;
  }
}

try {
  mod.assertUrlCharacterMatchesMembership({
    urlCharacterPublicId: 'CH-AAAA1',
    membershipCharacterPublicId: 'CH-BBBB2',
  });
  throw new Error('url mismatch should throw');
} catch (err) {
  if (!(err instanceof Error) || !err.message.includes('nicht mit Session-Membership')) {
    throw err;
  }
}

mod.assertUrlCharacterMatchesMembership({
  urlCharacterPublicId: 'ch-aaaa1',
  membershipCharacterPublicId: 'CH-AAAA1',
});

const resolved = mod.resolveMembershipCharacterPublicId({
  membershipCharacterId: 'c2',
  characters: [
    { id: 'c1', publicId: 'CH-AAAA1', name: 'A' },
    { id: 'c2', publicId: 'ch-bbbb2', name: 'B' },
  ],
});
if (resolved !== 'CH-BBBB2') throw new Error('resolveMembershipCharacterPublicId failed');

console.log('player-join-character-assignment-check: PASS');
