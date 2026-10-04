#!/usr/bin/env node
/**
 * live-scene-runtime-v2-check — Scene Runtime V2 reference container (#366).
 * Location: scripts/live-scene-runtime-v2-check.mjs
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
  'src/domains/session/presentation/scene-live-runtime-v2.ts',
  [
    'ScenePresentationConfigV2',
    'SceneLiveRef',
    'normalizeScenePresentationV1',
    'readScenePresentationConfigV2',
    'buildScenePresentationPublicProjection',
    'buildScenePresentationGmProjection',
    'assertPublicProjectionHasNoGmSecrets',
    'lookRef',
    'gmNoteRefs',
    'projectSceneV2ToSharedSceneV1',
  ],
  'scene v2 domain',
);

mustNotInclude(
  'src/domains/session/presentation/scene-live-runtime-v2.ts',
  ['supabase', "from 'react'", 'from "react"', 'LookProfileVersion', 'THREE'],
  'pure scene v2 domain',
);

mustInclude(
  'src/domains/session/presentation/index.ts',
  ['scene-live-runtime-v2'],
  'presentation barrel',
);

mustInclude(
  'src/domains/session/presentation/program-presentation.ts',
  ['readScenePresentationConfigV2', 'projectSceneV2ToSharedSceneV1'],
  'program uses scene v2 normalize',
);

mustInclude(
  '.qa/design/live-scene-runtime-v2.md',
  ['ScenePresentationConfigV2', 'normalize'],
  'design doc',
);

const gate = read('scripts/test-gate.mjs');
if (!gate.includes('live-scene-runtime-v2-check.mjs')) {
  throw new Error('test-gate must invoke live-scene-runtime-v2-check.mjs');
}

// V1 contract must remain intact
mustInclude(
  'src/domains/session/contracts/shared-scene-presentation.ts',
  ['SCENE_PRESENTATION_SCHEMA_VERSION', 'readSharedScenePresentation'],
  'v1 scene contract preserved',
);

const esbuild = require('esbuild');
const cacheDir = join(root, 'node_modules/.cache/live-scene-runtime-v2-check');
mkdirSync(cacheDir, { recursive: true });

const domainOut = join(cacheDir, 'scene-v2.mjs');
esbuild.buildSync({
  entryPoints: [join(root, 'src/domains/session/presentation/scene-live-runtime-v2.ts')],
  outfile: domainOut,
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  packages: 'bundle',
});

const mod = await import(pathToFileURL(domainOut).href);

const v1 = {
  schemaVersion: 1,
  title: 'Taverne',
  locationLabel: 'Dornhain',
  description: 'Öffentlich',
  backdropUrl: 'https://example.com/tavern.jpg',
  sceneRef: { kind: 'session-local', id: 'tavern' },
  visibleActors: [
    {
      kind: 'character',
      id: 'c1',
      publicId: 'PC-1',
      displayName: 'Aria',
      portraitUrl: null,
      role: 'pc',
    },
  ],
  updatedAt: '2026-10-04T00:00:00.000Z',
  authoritative: true,
};

const config = mod.normalizeScenePresentationV1(v1);
if (!config || config.schemaVersion !== 2 || !config.normalizedFromV1) {
  throw new Error('normalizeScenePresentationV1 failed');
}
if (config.lookRef.lookId !== null) {
  throw new Error('lookRef must start null (no local Look copy)');
}
if (config.gmNoteRefs.length !== 0) {
  throw new Error('V1 normalize must not invent gm notes');
}

const pub = mod.buildScenePresentationPublicProjection(config);
mod.assertPublicProjectionHasNoGmSecrets(pub);
if (pub.environmentMode !== 'backdrop') {
  throw new Error('backdrop environmentMode expected');
}
if ('gmNoteRefs' in pub) {
  throw new Error('public projection leaked gmNoteRefs');
}

const shared = { scenePresentation: v1 };
const fromShared = mod.readScenePresentationConfigV2(shared);
if (!fromShared || fromShared.title !== 'Taverne') {
  throw new Error('readScenePresentationConfigV2 normalize path failed');
}

const back = mod.projectSceneV2ToSharedSceneV1(fromShared);
if (back.schemaVersion !== 1 || back.title !== 'Taverne' || back.visibleActors.length !== 1) {
  throw new Error('V2→V1 compatibility projection failed');
}

const withGm = {
  ...config,
  gmNoteRefs: [{ id: 'note-1' }],
  normalizedFromV1: false,
};
const gmDenied = mod.buildScenePresentationGmProjection(withGm, {
  role: 'viewer',
  capabilities: [],
  characterId: null,
});
if (gmDenied !== null) throw new Error('viewer must not receive GM projection');

const gmOk = mod.buildScenePresentationGmProjection(withGm, {
  role: 'gamemaster',
  capabilities: [],
  characterId: null,
});
if (!gmOk || gmOk.gmNoteRefs.length !== 1) {
  throw new Error('GM projection must include gmNoteRefs');
}

console.log('live-scene-runtime-v2-check PASS');
