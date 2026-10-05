#!/usr/bin/env node
/**
 * player-live-screen-v2-check — #368 Program + private Player Live composition.
 * Location: scripts/player-live-screen-v2-check.mjs
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
  'src/app/session/PlayerLiveScreen.tsx',
  [
    'AdaptiveLiveStage',
    'ProgramDisplayShell',
    'PlayerPanel',
    'embedMode="rail"',
    'useSessionKnowledge',
    'KnowledgeFeed',
    'data-player-live-screen="v2"',
    'min-h-11',
  ],
  'PlayerLiveScreen composition',
);

// Inventory slot is on PlayerPanel; ensure rail path still includes it.
mustInclude(
  'src/app/session/PlayerPanel.tsx',
  ['data-live-inventory-slot="v1"', "embedMode === 'rail'"],
  'PlayerPanel rail + inventory slot',
);

mustNotInclude(
  'src/app/session/PlayerPanel.tsx',
  ["from '../character/edit", 'from "../../character/edit'],
  'no CharacterEditor import in PlayerPanel',
);

mustInclude(
  'src/app/session/SessionResourceScreen.tsx',
  ['PlayerLiveScreen', "liveView === 'player'"],
  'session live player uses V2 screen',
);

mustNotInclude(
  'src/app/session/program/ProgramDisplayShell.tsx',
  ['PlayerPanel', 'onNavigateHome', 'Check würfeln'],
  'Program shell stays control-free',
);

const gate = read('scripts/test-gate.mjs');
if (!gate.includes('player-live-screen-v2-check.mjs')) {
  throw new Error('test-gate must invoke player-live-screen-v2-check.mjs');
}

const esbuild = require('esbuild');
const cacheDir = join(root, 'node_modules/.cache/player-live-screen-v2-check');
mkdirSync(cacheDir, { recursive: true });
const out = join(cacheDir, 'panel.mjs');
esbuild.buildSync({
  entryPoints: [join(root, 'src/domains/session/contracts/player-panel.ts')],
  outfile: out,
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  packages: 'bundle',
});
const mod = await import(pathToFileURL(out).href);
const model = mod.buildPlayerPanelModel({
  character: null,
  runtime: null,
  selfUserId: null,
  isLoading: false,
  errorMessage: null,
  characterPublicId: 'CH-K7M4Q',
});
if (model.characterId !== null) {
  throw new Error('empty model must expose characterId null');
}
if (!('characterId' in model)) {
  throw new Error('PlayerPanelModel must include characterId');
}

console.log('player-live-screen-v2-check: PASS');
