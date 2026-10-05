#!/usr/bin/env node
/**
 * director-control-room-check — #376 Director Control Room UI.
 * Location: scripts/director-control-room-check.mjs
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
  'src/app/session/DirectorControlRoomScreen.tsx',
  [
    'data-director-control-room="v1"',
    'data-director-preview-pane="v1"',
    'data-director-program-pane="v1"',
    'data-director-sources="v1"',
    'data-director-take',
    'data-director-automatic',
    'useDirectorRuntime',
    'min-h-11',
    'URL gewährt keine Rechte',
  ],
  'DirectorControlRoomScreen',
);

mustNotInclude(
  'src/app/session/DirectorControlRoomScreen.tsx',
  ['CombatEncounterGmPanel', 'applyDamage', 'LiveInventoryControls', 'KnowledgeGmControls'],
  'no gameplay controls',
);

mustInclude(
  'src/app/session/SessionResourceScreen.tsx',
  ['DirectorControlRoomScreen', "liveView === 'director'"],
  'session wires director',
);

mustInclude(
  'src/app/shell/routing/routes.ts',
  ["| 'director'", 'director'],
  'route live/director',
);

const gate = read('scripts/test-gate.mjs');
if (!gate.includes('director-control-room-check.mjs')) {
  throw new Error('test-gate must invoke director-control-room-check.mjs');
}

// Route parse smoke
mustInclude(
  'src/app/shell/routing/routes.ts',
  ['gamemaster|player|display|viewer|director'],
  'live path regex',
);

console.log('director-control-room-check: PASS');
