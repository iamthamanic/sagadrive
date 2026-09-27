#!/usr/bin/env node
/**
 * live-session-role-capability-contract-check — #362 access contract.
 * Location: scripts/live-session-role-capability-contract-check.mjs
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
let failures = 0;
let group = '';

function section(name) {
  group = name;
}

function check(condition, message) {
  if (!condition) {
    failures += 1;
    console.error(`FAIL [${group}]: ${message}`);
  }
}

function equal(actual, expected, message) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) {
    failures += 1;
    console.error(`FAIL [${group}]: ${message} — expected ${b}, got ${a}`);
  }
}

function mustInclude(file, needles, label) {
  const text = readFileSync(join(root, file), 'utf8');
  for (const needle of needles) {
    if (!text.includes(needle)) {
      failures += 1;
      console.error(`FAIL [${label}]: missing ${JSON.stringify(needle)} in ${file}`);
    }
  }
}

function mustNotInclude(file, needles, label) {
  const text = readFileSync(join(root, file), 'utf8');
  for (const needle of needles) {
    if (text.includes(needle)) {
      failures += 1;
      console.error(`FAIL [${label}]: forbidden ${JSON.stringify(needle)} in ${file}`);
    }
  }
}

function walkFiles(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) walkFiles(full, acc);
    else if (/\.(ts|tsx)$/.test(entry)) acc.push(full);
  }
  return acc;
}

section('1 · structure');

mustInclude(
  'src/domains/session/contracts/live-session-access.ts',
  [
    'SessionRole',
    'SessionCapability',
    'LiveSurfaceKind',
    'VisibilityAudience',
    'parseSessionRole',
    'validateLiveSessionAccess',
    'canReadVisibilityAudience',
    'canExecuteLiveSessionCommand',
    'filterPayloadForAccess',
    "'director'",
    "'gamemaster'",
    "'viewer'",
  ],
  'domain contract',
);

mustInclude(
  'src/infrastructure/session/live-session-access.resolver.ts',
  [
    'resolveLiveSessionAccessFromMembership',
    'rejectClientCapabilityElevation',
    'getAuthenticatedUserId',
    'Never reads capabilities from URL',
  ],
  'infra resolver',
);

mustInclude(
  'src/domains/session/contracts/index.ts',
  ['live-session-access'],
  'barrel export',
);

mustNotInclude(
  'src/domains/session/contracts/live-session-access.ts',
  ["from 'react'", 'supabase', 'livekit', 'localStorage'],
  'domain purity',
);

for (const file of walkFiles(join(root, 'src/domains/session/contracts'))) {
  if (!file.endsWith('live-session-access.ts')) continue;
  const text = readFileSync(file, 'utf8');
  const codeOnly = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  check(!/\bany\b/.test(codeOnly), 'no any');
}

section('2 · runtime');

const outdir = join(root, 'node_modules', '.cache', 'live-session-role-capability-contract-check');
mkdirSync(outdir, { recursive: true });
const esbuild = join(root, 'node_modules', '.bin', 'esbuild');
execFileSync(
  esbuild,
  [
    join(root, 'src/domains/session/contracts/live-session-access.ts'),
    '--bundle',
    '--format=esm',
    `--outfile=${join(outdir, 'access.mjs')}`,
  ],
  { stdio: 'inherit' },
);

const access = await import(pathToFileURL(join(outdir, 'access.mjs')).href);

equal(access.parseSessionRole('gm'), 'gamemaster', 'legacy gm alias');
equal(access.parseSessionRole('observer'), 'viewer', 'legacy observer alias');
equal(access.parseSessionRole('wizard'), null, 'unknown role fail-closed');

const gm = access.validateLiveSessionAccess({ role: 'gamemaster', capabilities: [] });
check(gm.ok === true, 'gm validates');
check(
  access.canExecuteLiveSessionCommand(gm.access, 'gameplay_mutate') === true,
  'gm can mutate gameplay',
);

const viewerDirector = access.validateLiveSessionAccess({
  role: 'viewer',
  capabilities: ['director'],
});
check(viewerDirector.ok === true, 'viewer+director allowed');
check(
  access.canExecuteLiveSessionCommand(viewerDirector.access, 'gameplay_mutate') === false,
  'director-only cannot mutate gameplay',
);
check(
  access.canExecuteLiveSessionCommand(viewerDirector.access, 'cue') === true,
  'viewer+director can cue',
);
check(
  access.canReadVisibilityAudience(viewerDirector.access, 'gm_only') === false,
  'viewer never sees gm_only',
);

const playerDirector = access.validateLiveSessionAccess({
  role: 'player',
  capabilities: ['director'],
});
check(playerDirector.ok === false, 'player+director rejected by default');

const player = access.validateLiveSessionAccess({
  role: 'player',
  capabilities: [],
  characterId: 'CH-AAAAA',
});
check(player.ok === true, 'player ok');
check(
  access.canReadVisibilityAudience(player.access, 'character_private', {
    characterId: 'CH-AAAAA',
  }) === true,
  'player reads own private',
);
check(
  access.canReadVisibilityAudience(player.access, 'character_private', {
    characterId: 'CH-BBBBB',
  }) === false,
  'player cannot read other character private',
);

const filtered = access.filterPayloadForAccess(viewerDirector.access, {
  shared: 1,
  gm_only: { secret: true },
  character_specific: { hp: 3 },
  publicNote: 'ok',
});
check(filtered.gm_only === undefined, 'gm_only stripped for viewer');
check(filtered.character_specific === undefined, 'character_specific stripped for viewer');
check(filtered.publicNote === 'ok', 'public kept');

if (failures > 0) {
  console.error(`live-session-role-capability-contract-check: ${failures} failure(s)`);
  process.exit(1);
}
console.log('live-session-role-capability-contract-check: PASS');
