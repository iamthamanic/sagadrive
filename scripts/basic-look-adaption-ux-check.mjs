#!/usr/bin/env node
/**
 * basic-look-adaption-ux-check — Basic Look Adaption create/reanalyze UX (#353).
 * Location: scripts/basic-look-adaption-ux-check.mjs
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
  'src/app/look/LookCreateScreen.tsx',
  'src/app/look/create/LookCreateChooser.tsx',
  'src/app/look/create/LookDuplicatePicker.tsx',
  'src/app/look/create/LookReferenceAdaptionFlow.tsx',
  'src/app/look/create/LookReferenceItemRow.tsx',
  'src/app/look/create/look-reference-adaption.ts',
  'src/app/look/editor/LookEditorWorkspace.tsx',
  'src/app/look/editor/look-editor-draft.ts',
  'src/app/look/editor/useLookEditor.ts',
  '.qa/acceptance/basic-look-adaption-ux.md',
].forEach(mustExist);

section('2 · create chooser paths');
{
  const create = read('src/app/look/LookCreateScreen.tsx');
  const chooser = read('src/app/look/create/LookCreateChooser.tsx');
  check(/LookCreateChooser/.test(create), 'create uses chooser');
  check(/LookReferenceAdaptionFlow/.test(create), 'create wires references');
  check(/LookDuplicatePicker/.test(create), 'create wires duplicate');
  check(/data-look-create-path="preset"/.test(chooser), 'preset path');
  check(/data-look-create-path="references"/.test(chooser), 'references path');
  check(/data-look-create-path="duplicate"/.test(chooser), 'duplicate path');
  check(/Von Referenzbildern/.test(chooser), 'DE copy references');
}

section('3 · reference adaption UX');
{
  const flow = read('src/app/look/create/LookReferenceAdaptionFlow.tsx');
  const row = read('src/app/look/create/LookReferenceItemRow.tsx');
  const workspace = read('src/app/look/editor/LookEditorWorkspace.tsx');
  check(/analyzeLookReferencesForDraft/.test(flow), 'calls analysis service');
  check(/data-look-ref-analyze/.test(flow), 'analyze CTA');
  check(/data-look-ref-retry/.test(flow), 'retry CTA');
  check(/data-look-ref-progress/.test(flow), 'progress hook');
  check(/data-look-ref-error/.test(flow), 'error hook');
  check(/STYLE/.test(row) && /CONTENT/.test(row), 'kind labels');
  check(/data-look-ref-kind/.test(row), 'kind controls');
  check(/data-look-ref-weight/.test(row), 'weight control');
  check(/data-look-ref-remove/.test(row), 'remove control');
  check(/data-look-reanalyze/.test(workspace), 'edit reanalyze');
  check(/applyAnalysisDraft/.test(workspace), 'applies draft without auto-save');
}

section('4 · draft mapping smoke');
{
  const esbuild = require('esbuild');
  const outfile = join(root, 'node_modules/.cache/basic-look-adaption-ux-check/draft.mjs');
  esbuild.buildSync({
    entryPoints: [join(root, 'src/app/look/editor/look-editor-draft.ts')],
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'node',
    logLevel: 'silent',
  });
  const m = await import(pathToFileURL(outfile).href);
  const analysis = {
    displayName: 'Ink Look',
    palette: {
      primary: '#111111',
      secondary: '#222222',
      accent: '#ffaa00',
      background: '#000000',
    },
    knobs: {
      characterStylization: 80,
      characterOutline: 70,
      lightingWarmth: 40,
      lightingKey: 65,
      postFxContrast: 55,
      postFxSaturation: 45,
    },
    contentNotes: 'cape hero',
    provenance: {
      analysisVersion: 'look-ref-analysis-v1',
      analyzedAtIso: '2026-01-01T00:00:00.000Z',
      referenceIds: ['a'],
      styleReferenceCount: 1,
      contentReferenceCount: 0,
    },
    references: [],
  };
  const ui = m.uiDraftFromAnalysisDraft(analysis);
  check(ui.source === 'reference-analysis', 'analysis source on ui draft');
  check(ui.characterOutline === 70, 'outline mapped');
  const write = m.toLookProfileWriteDraft(ui);
  check(write.source === 'reference-analysis', 'write draft keeps analysis source');
  check(!/openai|apiKey/i.test(JSON.stringify(write)), 'no provider leak in write');
}

section('5 · acceptance + test-gate');
{
  const acceptance = read('.qa/acceptance/basic-look-adaption-ux.md');
  check(/#353|Referenzbilder|LookCreateChooser/.test(acceptance), 'acceptance present');
  const gate = read('scripts/test-gate.mjs');
  check(/basic-look-adaption-ux-check\.mjs/.test(gate), 'test-gate wiring');
}

if (failures > 0) {
  console.error(`\nbasic-look-adaption-ux-check: ${failures} failure(s)`);
  process.exit(1);
}

console.log('basic-look-adaption-ux-check: OK (#353)');
