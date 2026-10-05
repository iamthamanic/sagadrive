#!/usr/bin/env node
/**
 * look-preview-stage-check — Look Preview Stage contract (#345).
 * Location: scripts/look-preview-stage-check.mjs
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

section('1 · slice files');
[
  'src/app/look/editor/LookPreviewStage.tsx',
  'src/app/look/editor/look-preview-fixtures.ts',
  'src/app/look/editor/look-preview-modes.ts',
  'src/app/look/editor/look-preview-version.ts',
  'src/app/look/editor/look-preview-avatar.ts',
  '.qa/acceptance/look-preview-stage.md',
].forEach(mustExist);

section('2 · workspace mounts stage');
{
  const workspace = read('src/app/look/editor/LookEditorWorkspace.tsx');
  check(/LookPreviewStage/.test(workspace), 'workspace uses LookPreviewStage');
  check(!/LookPreviewStageStub/.test(workspace), 'stub no longer mounted');
  check(/data-look-preview-stage/.test(read('src/app/look/editor/LookPreviewStage.tsx')), 'stage data hook');
}

section('3 · modes + cameras');
{
  const modes = read('src/app/look/editor/look-preview-modes.ts');
  const stage = read('src/app/look/editor/LookPreviewStage.tsx');
  check(/normal/.test(modes) && /pbrNeutral/.test(modes), 'normal + pbrNeutral');
  check(/beforeAfter/.test(modes) && /variantGrid/.test(modes), 'beforeAfter + variantGrid');
  check(/fullBody/.test(modes) && /portrait/.test(modes), 'fullBody + portrait');
  check(/threeQuarter/.test(modes) && /environment/.test(modes) && /itemProp/.test(modes), 'remaining cameras');
  check(/data-look-preview-modes/.test(stage), 'mode toolbar');
  check(/data-look-preview-cameras/.test(stage), 'camera toolbar');
  check(/data-look-preview-variant-grid/.test(stage), 'variant grid');
  check(/data-look-preview-pane="before"/.test(stage), 'before pane');
  check(/data-look-preview-pane="after"/.test(stage), 'after pane');
  check(/capturePortraitDataUrl/.test(stage), 'capture hook');
  check(/applyLookProfile/.test(stage) && /restorePbrNeutralLook/.test(stage), 'LookRuntime via studio');
}

section('4 · fixtures catalog');
{
  const fixturesSrc = read('src/app/look/editor/look-preview-fixtures.ts');
  check(/playerHumanoid/.test(fixturesSrc), 'player humanoid slot');
  check(/secondaryHumanoid/.test(fixturesSrc), 'secondary humanoid');
  check(/item/.test(fixturesSrc) && /prop/.test(fixturesSrc), 'item + prop');
  check(/ground/.test(fixturesSrc) && /vegetation/.test(fixturesSrc), 'ground + vegetation');
  check(/sky/.test(fixturesSrc) && /water/.test(fixturesSrc) && /vfx/.test(fixturesSrc), 'sky/water/vfx');
  const esbuild = require('esbuild');
  const outfile = join(root, 'node_modules/.cache/look-preview-stage-check/fixtures.mjs');
  esbuild.buildSync({
    entryPoints: [join(root, 'src/app/look/editor/look-preview-fixtures.ts')],
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'node',
    logLevel: 'silent',
  });
  const f = await import(pathToFileURL(outfile).href);
  const slots = f.listLookPreviewFixtures();
  check(slots.length >= 9, 'at least 9 fixture slots');
  check(
    slots.every((s) => typeof s.supported === 'boolean' && typeof s.labelDe === 'string'),
    'slot shape',
  );
  check(
    slots.some((s) => !s.supported && s.noticeDe),
    'unsupported slots carry notice',
  );
}

section('5 · ephemeral version from draft');
{
  const esbuild = require('esbuild');
  const outfile = join(root, 'node_modules/.cache/look-preview-stage-check/version.mjs');
  esbuild.buildSync({
    entryPoints: [join(root, 'src/app/look/editor/look-preview-version.ts')],
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'node',
    logLevel: 'silent',
  });
  const v = await import(pathToFileURL(outfile).href);
  const draftMod = await import(
    pathToFileURL(
      join(root, 'node_modules/.cache/look-editor-workspace-check/draft.mjs'),
    ).href,
  ).catch(async () => {
    const draftOut = join(root, 'node_modules/.cache/look-preview-stage-check/draft.mjs');
    esbuild.buildSync({
      entryPoints: [join(root, 'src/app/look/editor/look-editor-draft.ts')],
      outfile: draftOut,
      bundle: true,
      format: 'esm',
      platform: 'node',
      logLevel: 'silent',
    });
    return import(pathToFileURL(draftOut).href);
  });
  const ui = draftMod.defaultLookEditorUiDraft('Preview');
  const ver = v.ephemeralLookVersionFromDraft(ui);
  check(ver.displayName === 'Preview', 'ephemeral displayName');
  check(ver.capabilities.includes('character'), 'ephemeral capabilities');
}

section('6 · test-gate wiring');
{
  const gate = read('scripts/test-gate.mjs');
  check(/look-preview-stage-check\.mjs/.test(gate), 'test-gate invokes look-preview-stage-check');
  const acceptance = read('.qa/acceptance/look-preview-stage.md');
  check(/#345|look-preview-stage|Preview/.test(acceptance), 'acceptance present');
}

if (failures > 0) {
  console.error(`\nlook-preview-stage-check: ${failures} failure(s)`);
  process.exit(1);
}

console.log('look-preview-stage-check: OK (#345)');
