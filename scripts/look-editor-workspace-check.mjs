#!/usr/bin/env node
/**
 * look-editor-workspace-check — Canonical Look Editor workspace contract (#344).
 * Location: scripts/look-editor-workspace-check.mjs
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

section('1 · slice files exist');
[
  'src/app/look/editor/LookEditorWorkspace.tsx',
  'src/app/look/editor/LookEditorNav.tsx',
  'src/app/look/editor/LookEditorInspector.tsx',
  'src/app/look/editor/LookPreviewStage.tsx',
  'src/app/look/editor/useLookEditor.ts',
  'src/app/look/editor/look-editor-draft.ts',
  'src/app/look/editor/look-editor-sections.ts',
  'src/app/look/editor/inspectors/CharacterLookInspector.tsx',
  'src/app/look/editor/inspectors/LightingLookInspector.tsx',
  'src/app/look/editor/inspectors/PostFxLookInspector.tsx',
  'src/app/look/editor/inspectors/WorldLookReservedPanel.tsx',
  'src/app/look/LookCreateScreen.tsx',
  'src/app/look/LookEditScreen.tsx',
  '.qa/acceptance/look-editor-workspace.md',
].forEach(mustExist);

section('2 · canonical routes mount workspace only');
{
  const create = read('src/app/look/LookCreateScreen.tsx');
  const edit = read('src/app/look/LookEditScreen.tsx');
  const app = read('src/App.tsx');
  check(/LookCreateChooser|LookEditorWorkspace/.test(create), 'create mounts chooser/workspace');
  check(/LookEditorWorkspace/.test(edit), 'edit mounts workspace');
  check(/data-look-create-screen/.test(create), 'create data hook');
  check(/data-look-edit-screen/.test(edit), 'edit data hook');
  check(/onCreated=/.test(create) || /onCreated/.test(create), 'create can navigate after save');
  check(/navigateToLookEdit/.test(app), 'App wires look edit nav from create/edit');
  check(!/type=["']range["']/.test(create), 'create screen has no parallel knobs');
  check(!/type=["']range["']/.test(edit), 'edit screen has no parallel knobs');
}

section('3 · 3-column AdaptiveLiveStage layout');
{
  const workspace = read('src/app/look/editor/LookEditorWorkspace.tsx');
  check(/AdaptiveLiveStage/.test(workspace), 'uses AdaptiveLiveStage');
  check(/leftRail=/.test(workspace), 'left rail (nav)');
  check(/rightRail=/.test(workspace), 'right rail (inspector)');
  check(/bottomRail=/.test(workspace), 'phone bottom rail');
  check(/LookEditorNav/.test(workspace), 'nav in layout');
  check(/LookPreviewStage/.test(workspace), 'preview stage (#345)');
  check(/LookEditorInspector/.test(workspace), 'inspector in layout');
  check(/data-look-editor-workspace/.test(workspace), 'workspace data hook');
  check(/Speichern/.test(workspace), 'save CTA');
  check(/Duplizieren/.test(workspace), 'duplicate CTA');
  check(/Zurücksetzen/.test(workspace), 'reset CTA');
  check(/beforeunload|dirty/.test(read('src/app/look/editor/useLookEditor.ts')), 'unsaved guard');
}

section('4 · nav + inspectors SagaDrive terms');
{
  const sections = read('src/app/look/editor/look-editor-sections.ts');
  const nav = read('src/app/look/editor/LookEditorNav.tsx');
  const inspector = read('src/app/look/editor/LookEditorInspector.tsx');
  const character = read('src/app/look/editor/inspectors/CharacterLookInspector.tsx');
  const lighting = read('src/app/look/editor/inspectors/LightingLookInspector.tsx');
  const postFx = read('src/app/look/editor/inspectors/PostFxLookInspector.tsx');
  const world = read('src/app/look/editor/inspectors/WorldLookReservedPanel.tsx');
  check(/Gesamt/.test(sections) && /Charakter/.test(sections), 'nav labels DE');
  check(/Licht/.test(sections) && /Effekte/.test(sections) && /Welt/.test(sections), 'nav domains');
  check(/listLookCapabilityMetadata|worldCapabilityRows/.test(sections), 'world from capability metadata');
  check(/aria-label="Look-Bereiche"/.test(nav), 'nav accessible');
  check(/min-h-11/.test(nav), 'nav targets ≥44px');
  check(/Erweitert/.test(inspector), 'advanced collapsed');
  check(/data-look-editor-versions/.test(inspector), 'version list');
  check(/Stylisierung|Kontur/.test(character), 'character SagaDrive terms');
  check(/Wärme|Hauptlicht/.test(lighting), 'lighting SagaDrive terms');
  check(/Kontrast|Sättigung/.test(postFx), 'postFx SagaDrive terms');
  check(/Noch nicht verfügbar|lookCapabilityUnavailableLabel/.test(world), 'world reserved copy');
  check(!/toonlab|ToonLab|lora|LoRA|comfy/i.test(character + lighting + postFx), 'no ToonLab/LoRA knobs');
  check(!/type=["']range["']/.test(world), 'world has no fake sliders');
}

section('5 · draft round-trip (no provider blobs)');
{
  const draftSrc = read('src/app/look/editor/look-editor-draft.ts');
  check(/sagadrive:look-knobs-v1:/.test(draftSrc), 'knobs URI scheme');
  check(
    !/from ['"][^'"]*toonlab/i.test(draftSrc) && !/require\(['"][^'"]*toonlab/i.test(draftSrc),
    'draft mapper has no ToonLab imports',
  );
  const esbuild = require('esbuild');
  const outfile = join(root, 'node_modules/.cache/look-editor-workspace-check/draft.mjs');
  esbuild.buildSync({
    entryPoints: [join(root, 'src/app/look/editor/look-editor-draft.ts')],
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'node',
    logLevel: 'silent',
  });
  const d = await import(pathToFileURL(outfile).href);
  const ui = {
    ...d.defaultLookEditorUiDraft('Test Look'),
    characterStylization: 77,
    characterOutline: 33,
    lightingWarmth: 20,
    lightingKey: 90,
    postFxContrast: 10,
    postFxSaturation: 99,
    advancedNote: 'notiz',
  };
  const write = d.toLookProfileWriteDraft(ui);
  check(write.displayName === 'Test Look', 'write displayName');
  check(write.capabilities.includes('character'), 'capabilities include character');
  check(write.capabilities.includes('lighting'), 'capabilities include lighting');
  check(write.capabilities.includes('postFx'), 'capabilities include postFx');
  check(
    write.references.every((r) => typeof r.uri === 'string' && !/toonlab/i.test(r.uri)),
    'references have no ToonLab uris',
  );
  const round = d.uiDraftFromVersion({
    profileId: 'p1',
    version: 1,
    source: 'manual',
    displayName: write.displayName,
    references: write.references,
    capabilities: write.capabilities,
    executionModes: write.executionModes,
    createdAtIso: '2026-01-01T00:00:00.000Z',
  });
  check(round.characterStylization === 77, 'round-trip stylization');
  check(round.lightingKey === 90, 'round-trip lighting');
  check(round.postFxSaturation === 99, 'round-trip postFx');
  check(round.advancedNote === 'notiz', 'round-trip note');
  check(d.isLookEditorDirty(ui, d.defaultLookEditorUiDraft()), 'dirty detect');
}

section('6 · hook uses look service facade');
{
  const hook = read('src/app/look/editor/useLookEditor.ts');
  check(/createLookProfile/.test(hook), 'create via service');
  check(/appendLookProfileVersion/.test(hook), 'append version via service');
  check(/duplicateLookProfile/.test(hook), 'duplicate via service');
  check(/listLookProfileVersions/.test(hook), 'list versions');
  check(/restoreVersion/.test(hook), 'restore prior version into draft');
  check(!/supabase\.from/.test(hook), 'hook must not query supabase');
  check(!/from\(['"]look_/.test(hook), 'hook must not touch look_* tables');
}

section('7 · no parallel authoring surfaces');
{
  const libraryLooks = read('src/app/library/looks/LookLibraryBrowser.tsx');
  check(!/CharacterLookInspector/.test(libraryLooks), 'library does not host character inspector');
  check(!/LightingLookInspector/.test(libraryLooks), 'library does not host lighting inspector');
  check(!/data-look-editor-workspace/.test(libraryLooks), 'library is not the editor');
  const libraryCard = read('src/app/library/looks/LookLibraryCard.tsx');
  check(!/LookEditorInspector/.test(libraryCard), 'library card does not host editor inspector');
}

section('8 · acceptance + test-gate wiring');
{
  const acceptance = read('.qa/acceptance/look-editor-workspace.md');
  check(/Look Editor|look-editor-workspace|#344/.test(acceptance), 'acceptance present');
  const gate = read('scripts/test-gate.mjs');
  check(/look-editor-workspace-check\.mjs/.test(gate), 'test-gate invokes look-editor-workspace-check');
}

if (failures > 0) {
  console.error(`\nlook-editor-workspace-check: ${failures} failure(s)`);
  process.exit(1);
}

console.log('look-editor-workspace-check: OK (#344)');
