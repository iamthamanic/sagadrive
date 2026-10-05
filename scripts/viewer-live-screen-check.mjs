#!/usr/bin/env node
/**
 * viewer-live-screen-check — #370 Viewer read-only live surface.
 * Location: scripts/viewer-live-screen-check.mjs
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
  'src/app/session/ViewerLiveScreen.tsx',
  [
    'ProgramDisplayShell',
    "role: 'viewer'",
    'data-viewer-live-screen="v1"',
    'KnowledgeFeed',
  ],
  'ViewerLiveScreen',
);

mustNotInclude(
  'src/app/session/ViewerLiveScreen.tsx',
  ['PlayerPanel', 'Check würfeln', 'CombatEncounterGmPanel', 'KnowledgeGmControls'],
  'viewer has no gameplay controls',
);

mustInclude(
  'src/app/session/SessionResourceScreen.tsx',
  ['ViewerLiveScreen', "liveView === 'viewer'"],
  'session wires viewer',
);

mustInclude(
  'src/app/shell/routing/routes.ts',
  ["'viewer'", 'gamemaster|player|display|viewer'],
  'viewer route registered',
);

const gate = read('scripts/test-gate.mjs');
if (!gate.includes('viewer-live-screen-check.mjs')) {
  throw new Error('test-gate must invoke viewer-live-screen-check.mjs');
}

const esbuild = require('esbuild');
const cacheDir = join(root, 'node_modules/.cache/viewer-live-screen-check');
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
const decision = mod.resolveCanonicalLiveEntry({
  role: 'viewer',
  sagaPublicId: 'SA-ABC12',
  sessionPublicId: 'SE-XYZ99',
});
if (decision.kind !== 'live' || decision.liveView !== 'viewer') {
  throw new Error('viewer entry must be live/viewer');
}

console.log('viewer-live-screen-check: PASS');
