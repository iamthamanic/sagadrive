#!/usr/bin/env node
/**
 * world-look-preview-check — World/Saga Look preview + apply (#350).
 * Location: scripts/world-look-preview-check.mjs
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
  'src/app/project/WorldLookPreviewPanel.tsx',
  'src/app/project/SagaResourceScreen.tsx',
  'src/app/look/look-editor-return.ts',
  'src/App.tsx',
  '.qa/acceptance/world-look-preview.md',
].forEach(mustExist);

section('2 · World panel contract');
{
  const ui = read('src/app/project/WorldLookPreviewPanel.tsx');
  const screen = read('src/app/project/SagaResourceScreen.tsx');
  check(/data-world-look-preview/.test(ui), 'preview data hook');
  check(/data-world-look-apply/.test(ui), 'apply control');
  check(/data-world-look-reset/.test(ui), 'reset control');
  check(/data-world-look-preview-dirty/.test(ui), 'dirty preview hint');
  check(/data-world-look-domain-reserved/.test(ui), 'reserved domains');
  check(/listReservedLookCapabilityMetadata/.test(ui), 'uses reserved metadata');
  check(/Noch nicht verfügbar|lookCapabilityUnavailableLabel/.test(ui), 'unavailable DE');
  check(/updateProjectLookSettings/.test(ui), 'apply via project service');
  check(/setLookEditorReturnPath/.test(ui), 'return context before edit');
  check(!/CharacterLookInspector|LightingLookInspector|type=["']range["']/.test(ui), 'no Look Inspector');
  check(/WorldLookPreviewPanel/.test(screen), 'mounted on SagaResourceScreen');
  check(/section === 'world'/.test(screen), 'world section branch');
}

section('3 · return path helper smoke');
{
  const esbuild = require('esbuild');
  const outfile = join(root, 'node_modules/.cache/world-look-preview-check/return.mjs');
  esbuild.buildSync({
    entryPoints: [join(root, 'src/app/look/look-editor-return.ts')],
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'node',
    logLevel: 'silent',
  });
  const m = await import(pathToFileURL(outfile).href);
  // jsdom-less: sessionStorage may be missing — helper must no-op safely
  check(typeof m.setLookEditorReturnPath === 'function', 'setLookEditorReturnPath export');
  check(typeof m.takeLookEditorReturnPath === 'function', 'takeLookEditorReturnPath export');
  m.setLookEditorReturnPath('/sagas/SA-TEST/world');
  const taken = m.takeLookEditorReturnPath();
  // In Node without sessionStorage, helpers return null / no-op — still OK.
  check(taken === null || taken === '/sagas/SA-TEST/world', 'take is null or path');
}

section('4 · App consumes return path');
{
  const app = read('src/App.tsx');
  check(/takeLookEditorReturnPath/.test(app), 'App imports takeLookEditorReturnPath');
  check(/look-edit[\s\S]*takeLookEditorReturnPath|takeLookEditorReturnPath[\s\S]*look-edit/.test(app), 'look-edit onBack uses return');
}

section('5 · reserved capabilities domain');
{
  const esbuild = require('esbuild');
  const outfile = join(root, 'node_modules/.cache/world-look-preview-check/caps.mjs');
  esbuild.buildSync({
    entryPoints: [join(root, 'src/domains/look/capability-metadata.ts')],
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'node',
    logLevel: 'silent',
  });
  const caps = await import(pathToFileURL(outfile).href);
  const reserved = caps.listReservedLookCapabilityMetadata();
  check(Array.isArray(reserved) && reserved.length >= 5, 'reserved world domains listed');
  check(caps.LOOK_CAPABILITY_UNAVAILABLE_LABEL_DE === 'Noch nicht verfügbar', 'DE unavailable label');
}

section('6 · acceptance + test-gate');
{
  const acceptance = read('.qa/acceptance/world-look-preview.md');
  check(/#350|WorldLookPreview|Anwenden|Zurücksetzen/.test(acceptance), 'acceptance present');
  const gate = read('scripts/test-gate.mjs');
  check(/world-look-preview-check\.mjs/.test(gate), 'test-gate wiring');
}

if (failures > 0) {
  console.error(`\nworld-look-preview-check: ${failures} failure(s)`);
  process.exit(1);
}

console.log('world-look-preview-check: OK (#350)');
