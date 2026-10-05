#!/usr/bin/env node
/**
 * character-look-preview-check — Character Editor Look preview + selection (#347).
 * Location: scripts/character-look-preview-check.mjs
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const require = createRequire(import.meta.url);
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

function read(relPath) {
  return readFileSync(join(root, relPath), 'utf8');
}

function mustExist(relPath) {
  check(existsSync(join(root, relPath)), `missing ${relPath}`);
}

section('1 · files');
[
  'src/app/look/CharacterLookSelector.tsx',
  'src/app/look/look-origin-labels.ts',
  'src/app/look/index.ts',
  'src/app/character/edit/CharacterEditor.tsx',
  'src/app/character/avatar/AvatarSurfaceViewer.tsx',
  '.qa/acceptance/character-look-preview.md',
].forEach(mustExist);

section('2 · appearance persistence field');
{
  const entity = read('src/domains/character/domain/character.entity.ts');
  const normalize = read('src/domains/character/use-cases/avatar-presets.ts');
  check(/personal_look_profile_id/.test(entity), 'CharacterAppearanceDto field');
  check(/personal_look_profile_id/.test(normalize), 'normalizeCharacterAppearance preserves field');
}

section('3 · selector + origin labels');
{
  const selector = read('src/app/look/CharacterLookSelector.tsx');
  const labels = read('src/app/look/look-origin-labels.ts');
  const barrel = read('src/app/look/index.ts');
  check(/data-character-look-selector/.test(selector), 'selector data hook');
  check(/data-character-look-origin/.test(selector), 'origin data hook');
  check(/data-character-look-neutral-compare/.test(selector), 'neutral compare control');
  check(/data-character-look-library-link/.test(selector), 'library deep-link');
  check(/Welt-Look verwenden/.test(selector), 'world look option');
  check(/resolveLookProfileId/.test(selector), 'uses domain resolution');
  check(/buildLookResolutionContextFromSaga/.test(selector), 'saga context helper');
  check(/applyLookProfile/.test(selector), 'applies look via runtime');
  check(/restorePbrNeutralLook/.test(selector), 'PBR neutral compare');
  check(/pathForLookEdit/.test(selector), 'library editor path');
  check(!/CharacterLookInspector|LightingLookInspector|type=["']range["']/.test(selector), 'no Look Inspector knobs');
  check(/Persönlich/.test(labels) && /Saga/.test(labels) && /Session/.test(labels) && /System/.test(labels), 'DE origin labels');
  check(/CharacterLookSelector/.test(barrel), 'barrel exports selector');
  check(/lookOriginLabelDe/.test(barrel), 'barrel exports labels');
}

section('4 · CharacterEditor wiring');
{
  const editor = read('src/app/character/edit/CharacterEditor.tsx');
  const viewer = read('src/app/character/avatar/AvatarSurfaceViewer.tsx');
  check(/CharacterLookSelector/.test(editor), 'mounts CharacterLookSelector');
  check(/personalLookProfileId/.test(editor), 'local personal look state');
  check(/personal_look_profile_id: personalLookProfileId/.test(editor), 'save preserves personal look');
  check(/studioRuntimeRef=\{studioRuntimeRef\}/.test(editor), 'passes studioRuntimeRef to viewer');
  check(/studioRuntimeRef\?:/.test(viewer), 'AvatarSurfaceViewer accepts studioRuntimeRef');
  check(/data-character-look-selector|CharacterLookSelector/.test(editor), 'appearance tab hosts selector');
}

section('5 · resolution + labels smoke');
{
  const esbuild = require('esbuild');
  const labelsOut = join(root, 'node_modules/.cache/character-look-preview-check/labels.mjs');
  esbuild.buildSync({
    entryPoints: [join(root, 'src/app/look/look-origin-labels.ts')],
    outfile: labelsOut,
    bundle: true,
    format: 'esm',
    platform: 'node',
    logLevel: 'silent',
  });
  const labelsMod = await import(pathToFileURL(labelsOut).href);
  check(labelsMod.lookOriginLabelDe('saga-default') === 'Saga', 'saga label');
  check(labelsMod.lookOriginLabelDe('personal-override') === 'Persönlich', 'personal label');
  check(labelsMod.lookOriginLabelDe('session-override') === 'Session', 'session label');
  check(labelsMod.lookOriginLabelDe('system-default') === 'System', 'system label');

  const resolveOut = join(root, 'node_modules/.cache/character-look-preview-check/resolve.mjs');
  esbuild.buildSync({
    entryPoints: [join(root, 'src/domains/look/resolve.ts')],
    outfile: resolveOut,
    bundle: true,
    format: 'esm',
    platform: 'node',
    logLevel: 'silent',
  });
  const r = await import(pathToFileURL(resolveOut).href);
  const systemOut = join(root, 'node_modules/.cache/character-look-preview-check/system.mjs');
  esbuild.buildSync({
    entryPoints: [join(root, 'src/domains/look/system-default.ts')],
    outfile: systemOut,
    bundle: true,
    format: 'esm',
    platform: 'node',
    logLevel: 'silent',
  });
  const sys = await import(pathToFileURL(systemOut).href);
  const allowed = sys.buildLookResolutionContextFromSaga({
    sagaDefaultProfileId: 'look-saga',
    allowPlayerCharacterLookOverride: true,
    personalOverrideProfileId: 'look-personal',
  });
  const personal = r.resolveLookProfileId('player-character', allowed);
  check(
    personal.profileId === 'look-personal' && personal.reason === 'personal-override',
    'player override when allowed',
  );
  const denied = sys.buildLookResolutionContextFromSaga({
    sagaDefaultProfileId: 'look-saga',
    allowPlayerCharacterLookOverride: false,
    personalOverrideProfileId: 'look-personal',
  });
  const world = r.resolveLookProfileId('player-character', denied);
  check(
    world.profileId === 'look-saga' && world.reason === 'saga-default',
    'denied override falls back to saga',
  );
}

section('6 · acceptance + test-gate');
{
  const acceptance = read('.qa/acceptance/character-look-preview.md');
  check(/#347|CharacterLookSelector|Neutral vergleichen|Herkunft/.test(acceptance), 'acceptance present');
  const gate = read('scripts/test-gate.mjs');
  check(/character-look-preview-check\.mjs/.test(gate), 'test-gate wiring');
}

if (failures > 0) {
  console.error(`\ncharacter-look-preview-check: ${failures} failure(s)`);
  process.exit(1);
}

console.log('character-look-preview-check: OK (#347)');
