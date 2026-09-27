#!/usr/bin/env node
/**
 * look-profile-domain-check — contract for #339 LookProfile domain.
 * Location: scripts/look-profile-domain-check.mjs
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
    if (stat.isDirectory()) {
      walkFiles(full, acc);
      continue;
    }
    if (/\.(ts|tsx|js|jsx|mjs)$/.test(entry)) acc.push(full);
  }
  return acc;
}

section('1 · ownership & structure');

mustInclude(
  'src/domains/look/index.ts',
  [
    'LookProfile',
    'LookProfileVersion',
    'LookSource',
    'LookReference',
    'LookScope',
    'LookCapability',
    'LookExecutionMode',
    'resolveLookProfileId',
    'LOOK_SOURCES',
    'LOOK_EXECUTION_MODES',
    'LOOK_FUNCTIONAL_CAPABILITIES',
    'LOOK_RESERVED_CAPABILITIES',
  ],
  'look barrel',
);

mustInclude(
  'src/domains/look/types.ts',
  [
    "'manual'",
    "'preset'",
    "'reference-analysis'",
    "'imported'",
    "'realtime'",
    "'rendered'",
    "'character'",
    "'lighting'",
    "'postFx'",
    "'environment'",
    "'sky'",
    "'water'",
    "'vegetation'",
    "'terrain'",
    "'props'",
    "'vfx'",
    "'style'",
    "'content'",
  ],
  'look types enums',
);

mustInclude('.qa/design/look-system.md', ['LookProfile', 'World look', 'Player-character'], 'design doc');

mustNotInclude('src/domains/look/index.ts', ['toonlab', 'ToonLab', 'from \'react\'', 'supabase'], 'no provider/react/supabase');

const lookDir = join(root, 'src/domains/look');
for (const file of walkFiles(lookDir)) {
  const text = readFileSync(file, 'utf8');
  const rel = file.slice(root.length + 1);
  check(!/\bfrom\s+['"]react(?:\/|$)/.test(text), `${rel}: no React import`);
  check(!/from\s+['"][^'"]*supabase[^'"]*['"]/i.test(text), `${rel}: no Supabase import`);
  const codeOnly = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  check(!/\bany\b/.test(codeOnly), `${rel}: no any`);
  check(!/\bas\s+unknown\b/.test(codeOnly), `${rel}: no as unknown`);
  check(!/\bas\s+any\b/.test(codeOnly), `${rel}: no as any`);
}

section('2 · runtime resolve / parse / invariants');

const outdir = join(root, 'node_modules', '.cache', 'look-profile-domain-check');
mkdirSync(outdir, { recursive: true });
const esbuild = join(root, 'node_modules', '.bin', 'esbuild');

execFileSync(
  esbuild,
  [
    join(root, 'src/domains/look/index.ts'),
    '--bundle',
    '--format=esm',
    `--outfile=${join(outdir, 'look.mjs')}`,
  ],
  { stdio: 'inherit' },
);

const look = await import(pathToFileURL(join(outdir, 'look.mjs')).href);

const baseCtx = {
  systemDefaultProfileId: 'look.system.default',
  sagaDefaultProfileId: null,
  sessionOverrideProfileId: null,
  personalOverrideProfileId: null,
  playerOverridesAllowed: true,
};

equal(
  look.resolveLookProfileId('world', baseCtx),
  {
    profileId: 'look.system.default',
    scopeApplied: 'system',
    reason: 'system-default',
  },
  'saga missing → system default',
);

equal(
  look.resolveLookProfileId('world', {
    ...baseCtx,
    sagaDefaultProfileId: 'look.saga.default',
  }),
  {
    profileId: 'look.saga.default',
    scopeApplied: 'saga',
    reason: 'saga-default',
  },
  'session missing → saga default',
);

equal(
  look.resolveLookProfileId('world', {
    ...baseCtx,
    sagaDefaultProfileId: 'look.saga.default',
    sessionOverrideProfileId: 'look.session.override',
  }),
  {
    profileId: 'look.session.override',
    scopeApplied: 'session',
    reason: 'session-override',
  },
  'world: session beats saga',
);

equal(
  look.resolveLookProfileId('player-character', {
    ...baseCtx,
    sagaDefaultProfileId: 'look.saga.default',
    sessionOverrideProfileId: 'look.session.override',
    personalOverrideProfileId: 'look.pc.personal',
    playerOverridesAllowed: true,
  }),
  {
    profileId: 'look.pc.personal',
    scopeApplied: 'player-character',
    reason: 'personal-override',
  },
  'pc: personal when allowed',
);

equal(
  look.resolveLookProfileId('player-character', {
    ...baseCtx,
    sagaDefaultProfileId: 'look.saga.default',
    sessionOverrideProfileId: 'look.session.override',
    personalOverrideProfileId: 'look.pc.personal',
    playerOverridesAllowed: false,
  }),
  {
    profileId: 'look.session.override',
    scopeApplied: 'session',
    reason: 'session-override',
  },
  'pc: personal ignored when GM disables overrides',
);

check(
  look.parseLookCapability('cyber-glow') === null,
  'unknown capability parses to null (no crash)',
);
equal(
  look.parseLookCapabilities(['character', 'cyber-glow', 'postFx', 'sky']),
  ['character', 'postFx', 'sky'],
  'unknown capabilities dropped; reserved kept',
);

const version = look.parseLookProfileVersion({
  profileId: 'look.demo',
  version: 1,
  source: 'preset',
  displayName: 'Demo Look',
  references: [
    { id: 'ref.style.1', kind: 'style', uri: 'asset://style-a' },
    { id: 'ref.content.1', kind: 'content', uri: 'asset://content-a' },
  ],
  capabilities: ['character', 'lighting', 'postFx', 'environment'],
  executionModes: ['realtime', 'rendered'],
  createdAtIso: '2026-09-27T00:00:00.000Z',
});
check(version !== null, 'valid LookProfileVersion parses');
check(
  look.assertLookProfileVersionInvariants(version).ok === true,
  'valid version passes invariants',
);

const kindSwap = look.assertLookReferenceKindSemantics([
  { id: 'same', kind: 'style', uri: 'a' },
  { id: 'same', kind: 'content', uri: 'b' },
]);
check(kindSwap.ok === false, 'style/content kind collision rejected');

const badSource = look.parseLookProfileVersion({
  profileId: 'look.demo',
  version: 1,
  source: 'toonlab-secret',
  displayName: 'X',
  references: [],
  capabilities: [],
  executionModes: ['realtime'],
  createdAtIso: '2026-09-27T00:00:00.000Z',
});
check(badSource === null, 'unknown LookSource fail-closed');

check(
  look.LOOK_SOURCES.includes('manual') &&
    look.LOOK_SOURCES.includes('preset') &&
    look.LOOK_SOURCES.includes('reference-analysis') &&
    look.LOOK_SOURCES.includes('imported'),
  'LookSource set complete',
);
check(
  look.LOOK_EXECUTION_MODES.includes('realtime') &&
    look.LOOK_EXECUTION_MODES.includes('rendered'),
  'LookExecutionMode set complete',
);

if (failures > 0) {
  console.error(`look-profile-domain-check: ${failures} failure(s)`);
  process.exit(1);
}

console.log('look-profile-domain-check: PASS');
