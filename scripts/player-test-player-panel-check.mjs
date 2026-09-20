#!/usr/bin/env node
/**
 * player-test-player-panel-check — contract for #298 / Epic #210 Phase 3.
 * Location: scripts/player-test-player-panel-check.mjs
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
  'src/domains/session/contracts/player-panel.ts',
  [
    'buildPlayerPanelModel',
    'PlayerPanelConnectionKind',
    'waiting',
    'paused',
    'disconnected',
    'error',
    'drive',
    'momentum',
    'resistances',
  ],
  'player panel domain',
);

mustNotInclude(
  'src/domains/session/contracts/player-panel.ts',
  ['supabase', "from 'react'", 'from "react"', 'CharacterEditor'],
  'pure domain player panel',
);

mustInclude(
  'src/app/session/PlayerPanel.tsx',
  [
    'data-player-panel="v1"',
    'usePlayerPanel',
    'Check würfeln',
    'Inventar (nur Lesen)',
    'PlayerPanelStatusBanner',
  ],
  'player panel UI',
);

mustNotInclude(
  'src/app/session/PlayerPanel.tsx',
  ['CharacterEditor', 'from \'../character/edit', 'from "../../character/edit'],
  'no CharacterEditor in player panel',
);

mustInclude(
  'src/app/session/SessionResourceScreen.tsx',
  ['PlayerPanel', "liveView === 'player'"],
  'session screen wires player panel',
);

mustInclude(
  'src/app/session/hooks/usePlayerPanel.ts',
  ['useSessionRuntime', 'getCharacterByPublicId', 'getSessionByPublicIds', 'buildPlayerPanelModel', "kind: 'roll'"],
  'player panel hook',
);

const esbuild = require('esbuild');
const cacheDir = join(root, 'node_modules/.cache/player-test-player-panel-check');
mkdirSync(cacheDir, { recursive: true });

const domainOut = join(cacheDir, 'player-panel.mjs');
esbuild.buildSync({
  entryPoints: [join(root, 'src/domains/session/contracts/player-panel.ts')],
  outfile: domainOut,
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  packages: 'bundle',
});

const panel = await import(pathToFileURL(domainOut).href);

const emptyModel = panel.buildPlayerPanelModel({
  character: null,
  runtime: null,
  selfUserId: null,
  isLoading: false,
  errorMessage: null,
  characterPublicId: null,
});
if (emptyModel.connection !== 'error') {
  throw new Error(`expected error without character, got ${emptyModel.connection}`);
}

const waiting = panel.buildPlayerPanelModel({
  character: null,
  runtime: {
    sessionId: 's1',
    revision: 1,
    status: 'waiting',
    roster: [],
    gameplay: { sceneId: null, combatActive: false, shared: {} },
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  selfUserId: 'u1',
  isLoading: false,
  errorMessage: 'Character konnte nicht geladen werden.',
  characterPublicId: 'CH-AAAAA',
});
if (waiting.connection !== 'error') {
  throw new Error('character error must win over waiting when character missing');
}

const paused = panel.buildPlayerPanelModel({
  character: minimalCharacter(),
  runtime: {
    sessionId: 's1',
    revision: 2,
    status: 'paused',
    roster: [{ userId: 'u1', characterId: 'c1', isOnline: true, joinedAt: '2026-01-01T00:00:00.000Z' }],
    gameplay: { sceneId: 'sc-1', combatActive: false, shared: { momentum: 2, conditions: ['Vergiftet'] } },
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  selfUserId: 'u1',
  isLoading: false,
  errorMessage: null,
  characterPublicId: 'CH-BBBBB',
});
if (paused.connection !== 'paused') {
  throw new Error(`expected paused, got ${paused.connection}`);
}
if (paused.momentum !== 2 || !paused.momentumShared) {
  throw new Error('shared momentum overlay failed');
}
if (!paused.conditions.includes('Vergiftet')) {
  throw new Error('conditions overlay failed');
}
if (paused.hpMax < 1 || paused.defense < 1) {
  throw new Error('derived hp/defense missing');
}
if (!paused.canAttemptCheck) {
  throw new Error('paused session should still allow check intent');
}

const disconnected = panel.buildPlayerPanelModel({
  character: minimalCharacter(),
  runtime: {
    sessionId: 's1',
    revision: 3,
    status: 'active',
    roster: [{ userId: 'u1', characterId: 'c1', isOnline: false, joinedAt: '2026-01-01T00:00:00.000Z' }],
    gameplay: { sceneId: null, combatActive: false, shared: {} },
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  selfUserId: 'u1',
  isLoading: false,
  errorMessage: null,
});
if (disconnected.connection !== 'disconnected') {
  throw new Error(`expected disconnected, got ${disconnected.connection}`);
}

const gate = read('scripts/test-gate.mjs');
if (!gate.includes('player-test-player-panel-check.mjs')) {
  throw new Error('test-gate must invoke player-test-player-panel-check.mjs');
}

console.log('player-test-player-panel-check: OK');

function minimalCharacter() {
  return {
    id: 'c1',
    publicId: 'CH-BBBBB',
    name: 'Aria',
    description: '',
    class: 'Kämpfer',
    race: 'Mensch',
    rulesetKey: 'sagadrive-core',
    level: 3,
    sheetStatus: 'complete',
    notes: '',
    personalityTraits: [],
    ideals: [],
    bonds: [],
    flaws: [],
    appearance: {},
    attributes: {
      strength: 2,
      dexterity: 1,
      endurance: 2,
      mind: 0,
      perception: 1,
      charisma: 0,
    },
    skills: {},
    sagaDriveProfile: {
      speciesTraitInstances: [],
      background: {
        name: 'Soldat',
        skillPool: ['melee', 'athletics', 'awareness', 'survival'],
        trainedSkills: ['melee'],
        backgroundSkillPoints: { melee: 2 },
        milieuAccess: '',
        contact: '',
        complication: '',
        communication: '',
      },
      freeSkillRanks: {},
      drive: 3,
      momentum: 1,
    },
    abilities: [],
    inventory: [],
    inventoryV2: {
      schemaVersion: 1,
      instances: {},
      baseSlots: Array.from({ length: 20 }, () => null),
      containers: {},
      equipment: {},
      quickSlots: [null, null, null, null],
      legacyOverflow: [],
    },
    inventorySchemaVersion: 2,
    abstractResources: { current: 3 },
    emotionProfiles: [],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };
}
