#!/usr/bin/env node
/**
 * player-test-instrumentation-runbook-check — contract for #304 / Epic #210 Phase 9–10.
 * Location: scripts/player-test-instrumentation-runbook-check.mjs
 */
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const root = process.cwd();
const require = createRequire(import.meta.url);

function read(rel) {
  return readFileSync(join(root, rel), 'utf8');
}

function mustExist(rel, label) {
  if (!existsSync(join(root, rel))) {
    throw new Error(`${label}: missing ${rel}`);
  }
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

const EVIDENCE = '.qa/evidence/player-test-instrumentation-runbook';

const REQUIRED_DOCS = [
  `${EVIDENCE}/README.md`,
  `${EVIDENCE}/runbook.md`,
  `${EVIDENCE}/feedback-form.md`,
  `${EVIDENCE}/observation-event-protocol.md`,
  `${EVIDENCE}/dogfood-checklist.md`,
  `${EVIDENCE}/player-test-ready-gate.md`,
  '.qa/design/player-test-instrumentation-runbook.md',
  '.qa/acceptance/player-test-instrumentation-runbook.md',
  'src/domains/session/contracts/player-test-instrumentation.ts',
];

for (const rel of REQUIRED_DOCS) {
  mustExist(rel, 'instrumentation pack');
}

mustInclude(
  `${EVIDENCE}/runbook.md`,
  ['Discord', 'Meet', 'player-test-ready-gate.md', 'dogfood-checklist.md'],
  'runbook voice + gate links',
);

// Allow either en-dash or hyphen in duration phrasing — require 60 and 90 nearby.
{
  const runbook = read(`${EVIDENCE}/runbook.md`);
  if (!(/60/.test(runbook) && /90/.test(runbook))) {
    throw new Error('runbook must document 60–90 minute adventure length');
  }
  if (!runbook.includes('Discord') || !runbook.includes('Meet')) {
    throw new Error('runbook must document Discord/Meet voice dependency');
  }
}

mustInclude(
  `${EVIDENCE}/feedback-form.md`,
  [
    'Join-Zeit',
    'Player-Action',
    'GM-Erklärungen',
    'Sync',
    'Reconnect',
    'Regel',
    'Combat-Rundenzeit',
    'Immersion',
    'nächste Session',
    'vermissen',
  ],
  'feedback Phase 10 metrics',
);

mustInclude(
  `${EVIDENCE}/observation-event-protocol.md`,
  [
    'join_time_until_ready',
    'time_to_first_player_action',
    'gm_software_explanations_count',
    'sync_reconnect_incidents',
    'rule_confusion_events',
    'ui_confusion_misclicks',
    'combat_round_duration',
    'P0',
  ],
  'observation protocol metric keys',
);

mustInclude(
  `${EVIDENCE}/dogfood-checklist.md`,
  [
    'Test 1',
    'Test 2',
    '30 Minuten',
    '3–4',
    'P0',
    'runs/',
    'Discord',
  ],
  'dogfood checklist',
);

mustInclude(
  `${EVIDENCE}/player-test-ready-gate.md`,
  [
    'Functional',
    'Security',
    'Quality',
    'Product',
    'Discord/Meet',
    '60–90',
    'Feedbackbogen',
    '#210',
  ],
  'ready gate mirror',
);

mustInclude(
  `${EVIDENCE}/runbook.md`,
  ['player-test-ready-gate.md'],
  'runbook links ready gate',
);

mustInclude(
  'src/domains/session/contracts/player-test-instrumentation.ts',
  [
    'PHASE10_PRIMARY_METRICS',
    'DOGFOOD_EXIT_CRITERIA',
    'PLAYER_TEST_ADVENTURE_DURATION_MIN',
    'assertPlayerTestInstrumentationIntegrity',
    'VOICE_VIDEO_EXTERNAL_NOTE',
    'player-test-instrumentation-runbook',
  ],
  'instrumentation domain contract',
);

mustNotInclude(
  'src/domains/session/contracts/player-test-instrumentation.ts',
  ['supabase', "from 'react'", 'from "react"', 'as any', '@ts-ignore', '@ts-expect-error', 'eslint-disable'],
  'pure instrumentation domain',
);

mustInclude(
  'src/domains/session/contracts/index.ts',
  ['player-test-instrumentation'],
  'contracts barrel exports instrumentation',
);

const PRIOR_GATES = [
  'scripts/player-test-session-security-check.mjs',
  'scripts/player-test-realtime-runtime-check.mjs',
  'scripts/player-test-player-panel-check.mjs',
  'scripts/player-test-shared-rolls-check.mjs',
  'scripts/player-test-shared-scene-presentation-check.mjs',
  'scripts/player-test-prepared-adventure-fixture-check.mjs',
  'scripts/player-test-combat-encounter-check.mjs',
  'scripts/player-test-multiuser-e2e-security-check.mjs',
];
for (const gate of PRIOR_GATES) {
  mustExist(gate, 'prior player-test gate');
}

const esbuild = require('esbuild');
const cacheDir = join(root, 'node_modules/.cache/player-test-instrumentation-runbook-check');
mkdirSync(cacheDir, { recursive: true });

const domainOut = join(cacheDir, 'player-test-instrumentation.mjs');
esbuild.buildSync({
  entryPoints: [join(root, 'src/domains/session/contracts/player-test-instrumentation.ts')],
  outfile: domainOut,
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  packages: 'bundle',
});

const mod = await import(pathToFileURL(domainOut).href);
mod.assertPlayerTestInstrumentationIntegrity();

const pack = mod.getPlayerTestInstrumentationPack();
if (pack.adventureDurationMin.min !== 60 || pack.adventureDurationMin.max !== 90) {
  throw new Error('pack adventure duration must be 60–90');
}
if (pack.phase10Metrics.length < 10) {
  throw new Error('expected at least 10 Phase 10 metrics');
}
if (!pack.voiceVideoNote.includes('Discord') || !pack.voiceVideoNote.includes('Meet')) {
  throw new Error('pack voice note must mention Discord and Meet');
}

const gate = read('scripts/test-gate.mjs');
if (!gate.includes('player-test-instrumentation-runbook-check.mjs')) {
  throw new Error('test-gate must invoke player-test-instrumentation-runbook-check.mjs');
}

console.log('player-test-instrumentation-runbook-check: PASS');
