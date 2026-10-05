#!/usr/bin/env node
/**
 * gamemaster-live-screen-v2-check — #369 GM Control Room composition.
 * Location: scripts/gamemaster-live-screen-v2-check.mjs
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const root = process.cwd();

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
  'src/app/session/GamemasterLiveScreen.tsx',
  [
    'AdaptiveLiveStage',
    'ProgramDisplayShell',
    'SharedSceneGmControls',
    'ProgramGmControls',
    'KnowledgeGmControls',
    'CombatEncounterGmPanel',
    'data-gm-live-screen="v2"',
    'data-gm-view-as-player',
    'data-gm-generic-action-slot',
    'data-gm-live-action-rail',
  ],
  'GM live screen',
);

mustNotInclude(
  'src/app/session/GamemasterLiveScreen.tsx',
  ['DirectorControl', 'automatic director', 'from \'../director'],
  'not Director control room',
);

mustInclude(
  'src/app/session/SessionResourceScreen.tsx',
  ['GamemasterLiveScreen', "liveView === 'gamemaster'"],
  'session wires GM live v2',
);

mustNotInclude(
  'src/app/session/program/ProgramDisplayShell.tsx',
  ['KnowledgeGmControls', 'CombatEncounterGmPanel', 'View-as-Player'],
  'Program stays control-free',
);

const gate = read('scripts/test-gate.mjs');
if (!gate.includes('gamemaster-live-screen-v2-check.mjs')) {
  throw new Error('test-gate must invoke gamemaster-live-screen-v2-check.mjs');
}

console.log('gamemaster-live-screen-v2-check: PASS');
