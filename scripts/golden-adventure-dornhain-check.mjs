#!/usr/bin/env node
/**
 * golden-adventure-dornhain-check — #377 Golden Adventure Package Dornhain.
 * Location: scripts/golden-adventure-dornhain-check.mjs
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

mustInclude(
  'src/domains/session/contracts/golden-adventure-dornhain.ts',
  [
    'GOLDEN_ADVENTURE_DORNHAIN_PACKAGE_ID',
    'buildDornhainInitialAdventureRuntime',
    'dornhainInstantiateCommands',
    'assertGoldenAdventureDornhainIntegrity',
    'Brenna Sturmfaust',
    'stress.death-start',
    'foundationFixtureId',
  ],
  'dornhain package',
);

mustInclude(
  'src/app/session/GoldenAdventureDornhainPanel.tsx',
  [
    'data-golden-adventure-dornhain="v1"',
    'data-dornhain-instantiate',
    'min-h-11',
    'dornhainInstantiateCommands',
  ],
  'instantiate UI',
);

mustInclude(
  'src/app/session/GamemasterLiveScreen.tsx',
  ['GoldenAdventureDornhainPanel'],
  'GM world tab wire',
);

mustInclude(
  'src/domains/session/contracts/prepared-adventure-fixture.ts',
  ['package:dornhain.whisper.v1', 'Foundation'],
  'fixture migration note',
);

const gate = read('scripts/test-gate.mjs');
if (!gate.includes('golden-adventure-dornhain-check.mjs')) {
  throw new Error('test-gate must invoke golden-adventure-dornhain-check.mjs');
}

const esbuild = require('esbuild');
const cacheDir = join(root, 'node_modules/.cache/golden-adventure-dornhain-check');
mkdirSync(cacheDir, { recursive: true });
const out = join(cacheDir, 'dornhain.mjs');
esbuild.buildSync({
  entryPoints: [join(root, 'src/domains/session/contracts/golden-adventure-dornhain.ts')],
  outfile: out,
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  packages: 'bundle',
});
const mod = await import(pathToFileURL(out).href);
mod.assertGoldenAdventureDornhainIntegrity();
const cmds = mod.dornhainInstantiateCommands({ stressDeathStart: true });
if (!cmds.some((c) => c.op === 'set_definition_ref')) {
  throw new Error('instantiate must set definitionRef');
}
if (!cmds.some((c) => c.key === 'stress_death_start')) {
  throw new Error('stress flag command missing');
}
console.log('golden-adventure-dornhain-check: PASS');
