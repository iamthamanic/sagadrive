#!/usr/bin/env node
/**
 * npc-creature-creator-editor-check — UI/architecture contract for #198.
 * Location: scripts/npc-creature-creator-editor-check.mjs
 */
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
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

section('1 · slice + acceptance files exist');
[
  'src/app/npc-creature/index.ts',
  'src/app/npc-creature/NpcCreatureCreateScreen.tsx',
  'src/app/npc-creature/NpcCreatureEditorScreen.tsx',
  'src/app/npc-creature/useNpcCreatureEditor.ts',
  'src/app/library/npc-creatures/NpcCreatureStatblockPanel.tsx',
  '.qa/acceptance/npc-creature-creator-editor.md',
  'e2e/npc-creature-creator-editor.spec.ts',
].forEach(mustExist);

section('2 · routes + App wiring');
{
  const routes = read('src/app/shell/routing/routes.ts');
  check(/npc-creature-create/.test(routes), 'ShellViewId includes npc-creature-create');
  check(/npc-creature-edit/.test(routes), 'ShellViewId includes npc-creature-edit');
  check(/\/npc-creatures\/create/.test(routes), 'create path mapped');
  check(/pathForNpcCreatureCreate/.test(routes), 'pathForNpcCreatureCreate helper');
  check(/pathForNpcCreatureEdit/.test(routes), 'pathForNpcCreatureEdit helper');

  const app = read('src/App.tsx');
  check(/NpcCreatureCreateScreen/.test(app), 'App mounts create screen');
  check(/NpcCreatureEditorScreen/.test(app), 'App mounts editor screen');
  check(/onNavigateToNpcCreate/.test(app), 'Library receives create navigate');
  check(/onNavigateToNpcEdit/.test(app), 'Library receives edit navigate');

  const library = read('src/app/library/Library.tsx');
  check(/handleNpcCreate/.test(library), 'Library wires create handler');
  check(!/NPC-\/Kreaturen-Erstellung folgt/.test(library), 'create stub toast removed');
  check(/onEditNpc/.test(library), 'Library passes onEditNpc');
}

section('3 · UX contract strings / a11y hooks');
{
  const create = read('src/app/npc-creature/NpcCreatureCreateScreen.tsx');
  const editor = read('src/app/npc-creature/NpcCreatureEditorScreen.tsx');
  const browser = read('src/app/library/npc-creatures/NpcCreatureLibraryBrowser.tsx');

  check(/Was möchtest du erstellen/.test(create), 'step 1 copy');
  check(/Schnell erstellen/.test(create) && /Vollständiger Charakter/.test(create), 'step 2 modes');
  check(/data-npc-create-kind/.test(create), 'kind data hooks');
  check(/data-npc-quick-create/.test(create), 'quick create hook');
  check(/Machtgrad/.test(create), 'derived Machtgrad shown');
  check(/Nichtkämpferisch/.test(create) || /noncombat/.test(create), 'noncombat profile available');
  check(/clearCharacterEditorBootstrap/.test(create), 'full path uses CharacterEditor bootstrap clear');

  check(/Grundlagen/.test(editor) && /Werte/.test(editor) && /Kampf/.test(editor) && /Details/.test(editor), 'editor tabs');
  check(/Werte manuell anpassen/.test(editor), 'advanced values CTA');
  check(/Vorschau/.test(editor), 'mobile preview tab');
  check(/data-npc-editor-preview/.test(editor), 'live preview hook');
  check(/min-h-11/.test(editor) && /min-h-11/.test(create), 'touch targets ≥44px');
  check(/setNavigationBlocker/.test(read('src/app/npc-creature/useNpcCreatureEditor.ts')), 'unsaved navigation blocker');

  check(/data-npc-library-create/.test(browser), 'library create CTA remains');
  check(/onEditNpc/.test(browser), 'browser edit CTA');
  check(/NpcCreatureStatblockPanel|NpcCreatureStatblockView/.test(browser), 'statblock reuse');
}

section('4 · infrastructure + power only (no direct supabase in app)');
{
  const create = read('src/app/npc-creature/NpcCreatureCreateScreen.tsx');
  const editorHook = read('src/app/npc-creature/useNpcCreatureEditor.ts');
  check(/createNpcCreatureDefinition/.test(create), 'create uses facade');
  check(/updateNpcCreatureDefinition/.test(editorHook), 'editor uses update facade');
  check(!/supabase\.from/.test(create), 'create must not query supabase');
  check(!/supabase\.from/.test(editorHook), 'editor must not query supabase');
  check(
    /deriveNpcCreaturePower|resolveNpcCreatureEffectiveStats/.test(
      read('src/app/library/npc-creatures/NpcCreatureStatblockPanel.tsx'),
    ),
    'statblock panel uses derived power',
  );
}

section('5 · domain overrides + effective stats');
{
  const esbuild = require('esbuild');
  const outdir = join(root, 'node_modules/.cache/npc-creature-creator-editor-check');
  mkdirSync(outdir, { recursive: true });
  const outfile = join(outdir, 'npc.mjs');
  esbuild.buildSync({
    entryPoints: [join(root, 'src/domains/npc-creature/index.ts')],
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'node',
    logLevel: 'silent',
  });
  const npc = await import(pathToFileURL(outfile).href);

  const draft = {
    name: 'Waldwächter',
    description: '',
    kind: 'npc',
    category: 'npc',
    sheetMode: 'compact',
    level: 5,
    combatProfile: 'balanced',
    combatRole: 'standard',
    tags: [],
    statOverrides: { health: 99 },
  };
  const def = npc.assembleNpcCreatureDefinition(
    'personal:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'personal',
    draft,
  );
  const validation = npc.validateNpcCreatureDefinition(def);
  check(validation.ok === true, 'definition with override validates');
  const effective = npc.resolveNpcCreatureEffectiveStats(def);
  check(effective.health === 99, 'override health applied');
  check(effective.healthOverridden === true, 'health marked overridden');
  check(effective.recommended.health !== 99, 'recommended remains derived');

  const noncombat = npc.assembleNpcCreatureDefinition(
    'personal:bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'personal',
    {
      ...draft,
      combatProfile: 'noncombat',
      combatRole: 'boss',
      statOverrides: undefined,
    },
  );
  check(npc.validateNpcCreatureDefinition(noncombat).ok === false, 'noncombat+boss rejected');
}

section('6 · routes resolve create/edit paths');
{
  const esbuild = require('esbuild');
  const outdir = join(root, 'node_modules/.cache/npc-creature-creator-editor-check');
  mkdirSync(outdir, { recursive: true });
  const outfile = join(outdir, 'routes.mjs');
  esbuild.buildSync({
    entryPoints: [join(root, 'src/app/shell/routing/routes.ts')],
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'node',
    logLevel: 'silent',
  });
  const routes = await import(pathToFileURL(outfile).href);
  const create = routes.resolvePathname('/npc-creatures/create');
  check(create.kind === 'npc-creature-create', 'resolve create path');
  const edit = routes.resolvePathname('/npc-creatures/personal%3Aabc');
  check(edit.kind === 'npc-creature-edit', 'resolve edit path');
  check(edit.definitionId === 'personal:abc', 'edit id decoded');
  check(routes.pathForNpcCreatureCreate() === '/npc-creatures/create', 'path helper create');
  check(
    routes.pathForNpcCreatureEdit('personal:x') === '/npc-creatures/personal%3Ax',
    'path helper edit encodes',
  );
}

section('7 · acceptance + composition CLEAR + test-gate wiring');
{
  const acceptance = read('.qa/acceptance/npc-creature-creator-editor.md');
  check(/npc-creature-creator-editor/.test(acceptance), 'acceptance slug');
  mustExist('.qa/runs/composition-gate-npc-creature-creator-editor.md');
  const gateProof = read('.qa/runs/composition-gate-npc-creature-creator-editor.md');
  check(/HEAD_SHA:/.test(gateProof), 'composition has HEAD_SHA');
  check(/BASE_SHA:/.test(gateProof), 'composition has BASE_SHA');
  check(/Verdict:\s*CLEAR/.test(gateProof), 'composition Verdict CLEAR');
  check(/## Event/.test(gateProof), 'composition ## Event');
  check(/## Hop chain/.test(gateProof), 'composition ## Hop chain');
  check(/## Simulations/.test(gateProof), 'composition ## Simulations');
  check(/## Flags/.test(gateProof), 'composition ## Flags');
  check(/N-actors/.test(gateProof), 'composition N-actors');
  check(/Invalid\/missing/.test(gateProof), 'composition Invalid/missing');
  check(/Two consumers \/ crash/.test(gateProof), 'composition Two consumers / crash');
  const gate = read('scripts/test-gate.mjs');
  check(
    /npc-creature-creator-editor-check\.mjs/.test(gate),
    'test-gate invokes npc-creature-creator-editor-check',
  );
}

if (failures > 0) {
  console.error(`\nnpc-creature-creator-editor-check: ${failures} failure(s)`);
  process.exit(1);
}

console.log('npc-creature-creator-editor-check: OK (#198)');
