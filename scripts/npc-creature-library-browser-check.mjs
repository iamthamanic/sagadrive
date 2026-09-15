#!/usr/bin/env node
/**
 * npc-creature-library-browser-check — UI/architecture contract for Library NPCs (#197).
 * Location: scripts/npc-creature-library-browser-check.mjs
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

section('1 · slice files exist');
[
  'src/app/library/npc-creatures/index.ts',
  'src/app/library/npc-creatures/NpcCreatureLibraryBrowser.tsx',
  'src/app/library/npc-creatures/useNpcCreatureLibrary.ts',
  'src/app/library/npc-creatures/NpcCreatureLibraryFilters.tsx',
  'src/app/library/npc-creatures/NpcCreatureStatblockView.tsx',
  'src/app/library/npc-creatures/NpcCreatureStatblockPanel.tsx',
  'src/app/library/npc-creatures/npcCreatureLibraryLabels.ts',
  'src/domains/npc-creature/library-query.ts',
  '.qa/acceptance/npc-creature-library-browser.md',
  'e2e/npc-creature-library-browser.spec.ts',
].forEach(mustExist);

section('2 · Library composes slice only (tab order)');
{
  const library = read('src/app/library/Library.tsx');
  check(/NpcCreatureLibraryBrowser/.test(library), 'Library imports/renders NpcCreatureLibraryBrowser');
  check(/value=["']npcs["']/.test(library), 'NPCs tab trigger present');
  check(/NPCs & Kreaturen/.test(library), 'NPCs & Kreaturen tab label');

  const charactersIdx = library.indexOf('value="characters"');
  const npcsIdx = library.indexOf('value="npcs"');
  const adventuresIdx = library.indexOf('value="adventures"');
  const worldsIdx = library.indexOf('value="worlds"');
  const itemsIdx = library.indexOf('value="items"');
  check(
    charactersIdx >= 0 &&
      npcsIdx > charactersIdx &&
      adventuresIdx > npcsIdx &&
      worldsIdx > adventuresIdx &&
      itemsIdx > worldsIdx,
    'tab order Charaktere | NPCs & Kreaturen | Abenteuer | Welten | Items',
  );

  check(!/filterNpcCreatureLibraryCatalog/.test(library), 'Library must not own filter rules');
  check(!/listNpcCreatureDefinitions/.test(library), 'Library must not call npc service');
  check(/visitedTabs\.has\(['"]npcs['"]\)/.test(library), 'lazy visit for npcs tab');
}

section('3 · uses EntityBrowser (no parallel browser)');
{
  const browser = read('src/app/library/npc-creatures/NpcCreatureLibraryBrowser.tsx');
  check(/EntityBrowser/.test(browser), 'browser uses EntityBrowser');
  check(/EntityBrowserCard/.test(browser), 'browser uses EntityBrowserCard');
  check(!/ItemLibraryCard/.test(browser), 'must not reuse ItemLibraryCard as browser');
}

section('4 · hook has no domain filter rules inline');
{
  const hook = read('src/app/library/npc-creatures/useNpcCreatureLibrary.ts');
  check(/filterNpcCreatureLibraryCatalog/.test(hook), 'hook uses domain filter helper');
  check(/listNpcCreatureDefinitions/.test(hook), 'hook loads via npc-creature service');
  check(!/supabase\.from/.test(hook), 'hook must not query supabase directly');
}

section('5 · UI contract strings / a11y hooks');
{
  const browser = read('src/app/library/npc-creatures/NpcCreatureLibraryBrowser.tsx');
  const filters = read('src/app/library/npc-creatures/NpcCreatureLibraryFilters.tsx');
  const statblock = read('src/app/library/npc-creatures/NpcCreatureStatblockView.tsx');
  const panel = read('src/app/library/npc-creatures/NpcCreatureStatblockPanel.tsx');

  check(/Noch keine NPCs oder Kreaturen angelegt/.test(browser), 'empty state copy');
  check(/Erste Figur erstellen/.test(browser), 'empty CTA copy');
  check(/NPCs & Kreaturen suchen/.test(browser), 'search placeholder');
  check(/data-npc-library-browser/.test(browser), 'browser data hook');
  check(/data-npc-library-search/.test(browser), 'search data hook');
  check(/data-npc-library-create/.test(browser), 'create CTA data hook');
  check(/Alle/.test(filters) && /NPCs/.test(filters) && /Kreaturen/.test(filters), 'primary filters');
  check(/Kategorie/.test(filters) && /Machtgrad/.test(filters) && /Kampfrolle/.test(filters), 'secondary filters');
  check(/Darstellung/.test(filters) && /Quelle/.test(filters), 'sheet/source filters');
  check(/min-h-11/.test(filters) && /min-h-11/.test(browser), 'touch targets ≥44px');
  check(
    /deriveNpcCreaturePower|computeCompactStatblockBenchmarks|resolveNpcCreatureEffectiveStats/.test(panel)
      || /deriveNpcCreaturePower/.test(statblock),
    'statblock uses power derivation',
  );
  check(/Gesundheit/.test(panel) && /Verteidigung/.test(panel), 'statblock core labels');
  check(/grid-cols-1/.test(panel), 'statblock single-column mobile layout');
  check(/data-npc-statblock-view/.test(statblock), 'statblock data hook');
  check(/NpcCreatureStatblockPanel/.test(statblock), 'dialog reuses panel body');
  check(/NpcCreaturePortraitFrame/.test(statblock), 'statblock mounts portrait frame');
  const portrait = read('src/app/library/npc-creatures/NpcCreaturePortraitFrame.tsx');
  check(/ItemVisualModeToggle/.test(portrait), 'portrait has 2D/3D toggle');
  check(/object-contain/.test(portrait), 'portrait centers with object-contain');
  check(/useImageLightbox/.test(portrait), 'portrait uses reusable image lightbox hook');
  check(/imageObjectFit=\"contain\"/.test(browser), 'library cards use contain for icons');
  const card = read('src/app/library/EntityBrowserCard.tsx');
  check(/useImageLightbox/.test(card), 'entity cards use image lightbox hook');
  check(/data-entity-thumbnail-enlarge/.test(card), 'thumbnail enlarge hook attr');
  check(/useImageLightbox/.test(read('src/shared/ui/useImageLightbox.ts')), 'shared lightbox hook exists');
  check(/data-image-lightbox-dialog/.test(read('src/shared/ui/ImageLightboxDialog.tsx')), 'shared lightbox dialog exists');
}

section('6 · pure filter domain behaviour');
{
  const esbuild = require('esbuild');
  const outdir = join(root, 'node_modules/.cache/npc-creature-library-browser-check');
  mkdirSync(outdir, { recursive: true });
  const outfile = join(outdir, 'library-query.mjs');
  esbuild.buildSync({
    entryPoints: [join(root, 'src/domains/npc-creature/library-query.ts')],
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'node',
    logLevel: 'silent',
  });
  const q = await import(pathToFileURL(outfile).href);

  const sampleDef = {
    id: 'personal:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    scope: 'personal',
    name: 'Waldwächter',
    description: 'Ein stiller Hüter des Waldes',
    kind: 'npc',
    category: 'npc',
    sheetMode: 'compact',
    level: 5,
    combatProfile: 'balanced',
    combatRole: 'standard',
    tags: ['wald', 'wächter'],
  };
  const sample = {
    definition: sampleDef,
    status: 'active',
    ownerUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    worldProfileId: null,
  };

  check(q.npcCreatureMatchesFulltext(sampleDef, '  WALD  '), 'fulltext trim/case');
  check(!q.npcCreatureMatchesFulltext(sampleDef, 'drachenlord'), 'fulltext miss');
  check(
    q.npcCreatureMatchesLibraryFilters(sampleDef, {
      ...q.EMPTY_NPC_CREATURE_LIBRARY_FILTERS,
      kind: 'npc',
      machtgrade: ['mittel'],
    }),
    'kind + machtgrad match',
  );
  check(
    !q.npcCreatureMatchesLibraryFilters(sampleDef, {
      ...q.EMPTY_NPC_CREATURE_LIBRARY_FILTERS,
      kind: 'creature',
    }),
    'kind miss rejects',
  );
  check(
    !q.npcCreatureMatchesLibraryFilters(sampleDef, {
      ...q.EMPTY_NPC_CREATURE_LIBRARY_FILTERS,
      combatRoles: ['boss'],
    }),
    'role miss rejects',
  );

  const filtered = q.filterNpcCreatureLibraryCatalog(
    [sample],
    'wächter',
    { ...q.EMPTY_NPC_CREATURE_LIBRARY_FILTERS, kind: 'npc' },
  );
  check(filtered.length === 1, 'combined search+filter');
  check(q.hasActiveNpcCreatureLibraryFilters({ ...q.EMPTY_NPC_CREATURE_LIBRARY_FILTERS, kind: 'npc' }), 'active when kind set');
  check(!q.hasActiveNpcCreatureLibraryFilters(q.EMPTY_NPC_CREATURE_LIBRARY_FILTERS), 'empty filters inactive');
}

section('7 · acceptance + composition CLEAR + test-gate wiring');
{
  const acceptance = read('.qa/acceptance/npc-creature-library-browser.md');
  check(/npc-creature-library-browser/.test(acceptance), 'acceptance slug');
  check(/CLEAR/.test(acceptance), 'acceptance references CLEAR');
  mustExist('.qa/runs/composition-gate-npc-creature-library-browser.md');
  const gateProof = read('.qa/runs/composition-gate-npc-creature-library-browser.md');
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
    /npc-creature-library-browser-check\.mjs/.test(gate),
    'test-gate invokes npc-creature-library-browser-check',
  );
}

if (failures > 0) {
  console.error(`\nnpc-creature-library-browser-check: ${failures} failure(s)`);
  process.exit(1);
}

console.log('npc-creature-library-browser-check: OK (#197)');
