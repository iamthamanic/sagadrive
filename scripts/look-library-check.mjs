#!/usr/bin/env node
/**
 * look-library-check — UI/architecture contract for Bibliothek › Looks (#343).
 * Location: scripts/look-library-check.mjs
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
  'src/app/library/looks/index.ts',
  'src/app/library/looks/LookLibraryBrowser.tsx',
  'src/app/library/looks/LookLibraryCard.tsx',
  'src/app/library/looks/useLookLibrary.ts',
  'src/app/look/index.ts',
  'src/app/look/LookCreateScreen.tsx',
  'src/app/look/LookEditScreen.tsx',
  'src/domains/look/library-query.ts',
  '.qa/acceptance/look-library.md',
].forEach(mustExist);

section('2 · Library composes Looks slice');
{
  const library = read('src/app/library/Library.tsx');
  check(/LookLibraryBrowser/.test(library), 'Library imports/renders LookLibraryBrowser');
  check(/value=["']looks["']/.test(library), 'Looks tab trigger present');
  check(/>Looks</.test(library) || /truncate">Looks</.test(library), 'Looks tab label');
  check(/canMutateLooks/.test(library), 'Library exposes canMutateLooks gate');
  check(/onNavigateToLookCreate/.test(library), 'Library receives look create nav');
  check(/onNavigateToLookEdit/.test(library), 'Library receives look edit nav');
  check(!/filterLookLibraryCatalog/.test(library), 'Library must not own filter rules');
  check(!/listLookProfiles/.test(library), 'Library must not call look service');
  check(/visitedTabs\.has\(['"]looks['"]\)/.test(library), 'lazy visit for looks tab');
}

section('3 · App wires look routes');
{
  const app = read('src/App.tsx');
  const routes = read('src/app/shell/routing/routes.ts');
  const loc = read('src/app/shell/routing/useAppLocation.ts');
  check(/LookCreateScreen/.test(app), 'App renders LookCreateScreen');
  check(/LookEditScreen/.test(app), 'App renders LookEditScreen');
  check(/navigateToLookCreate/.test(app), 'App uses navigateToLookCreate');
  check(/navigateToLookEdit/.test(app), 'App uses navigateToLookEdit');
  check(/kind: 'look-create'/.test(routes) || /kind: "look-create"/.test(routes), 'look-create route kind');
  check(/kind: 'look-edit'/.test(routes) || /kind: "look-edit"/.test(routes), 'look-edit route kind');
  check(/pathForLookCreate/.test(routes), 'pathForLookCreate');
  check(/pathForLookEdit/.test(routes), 'pathForLookEdit');
  check(/\/looks\/create/.test(routes), 'create path /looks/create');
  check(/navigateToLookCreate/.test(loc) && /navigateToLookEdit/.test(loc), 'location hook exposes look nav');
}

section('4 · hook uses infra + domain filter');
{
  const hook = read('src/app/library/looks/useLookLibrary.ts');
  check(/filterLookLibraryCatalog/.test(hook), 'hook uses domain filter helper');
  check(/listLookProfiles/.test(hook), 'hook loads via look service');
  check(/archiveLookProfile/.test(hook), 'hook can archive');
  check(/duplicateLookProfile/.test(hook), 'hook can duplicate');
  check(!/supabase\.from/.test(hook), 'hook must not query supabase directly');
  check(/canMutate/.test(hook), 'hook respects canMutate');
}

section('5 · UI contract / read-only gating');
{
  const browser = read('src/app/library/looks/LookLibraryBrowser.tsx');
  const card = read('src/app/library/looks/LookLibraryCard.tsx');
  check(/Look erstellen/.test(browser), 'primary CTA copy');
  check(/Looks suchen/.test(browser), 'search placeholder/label');
  check(/Noch keine Looks/.test(browser), 'empty copy');
  check(/data-look-library-browser/.test(browser), 'browser data hook');
  check(/data-look-library-search/.test(browser), 'search data hook');
  check(/data-look-library-loading/.test(browser), 'loading data hook');
  check(/data-look-library-empty/.test(browser), 'empty data hook');
  check(/data-look-library-success/.test(browser), 'success data hook');
  check(/canMutate/.test(browser) && /canMutate/.test(card), 'mutate gate on browser+card');
  check(/data-look-action="edit"/.test(card), 'edit action hook');
  check(/data-look-action="duplicate"/.test(card), 'duplicate action hook');
  check(/data-look-action="archive"/.test(card), 'archive action hook');
  check(/lookStyleFamilyLabel/.test(card), 'card shows style family');
  check(/lookStatusLabel/.test(card), 'card shows status');
  check(/lookPreviewUri/.test(card), 'card uses preview helper');
  check(/min-h-11/.test(browser), 'search targets ≥44px');
  const create = read('src/app/look/LookCreateScreen.tsx');
  const edit = read('src/app/look/LookEditScreen.tsx');
  check(/data-look-create-screen/.test(create), 'create screen hook');
  check(/data-look-edit-screen/.test(edit), 'edit screen hook');
  check(/Zurück zur Bibliothek/.test(create) && /Zurück zur Bibliothek/.test(edit), 'back copy');
}

section('6 · pure filter domain behaviour');
{
  const esbuild = require('esbuild');
  const outfile = join(root, 'node_modules/.cache/look-library-check/library-query.mjs');
  esbuild.buildSync({
    entryPoints: [join(root, 'src/domains/look/library-query.ts')],
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'node',
    logLevel: 'silent',
  });
  const q = await import(pathToFileURL(outfile).href);

  const sample = {
    profile: { id: 'look-1', currentVersion: 2, ownerScope: 'system' },
    status: 'active',
    current: {
      profileId: 'look-1',
      version: 2,
      source: 'manual',
      displayName: 'Neon Noir',
      references: [{ id: 'r1', kind: 'style', uri: 'https://example.com/preview.png' }],
      capabilities: ['character'],
      executionModes: ['realtime'],
      createdAtIso: '2026-01-01T00:00:00.000Z',
    },
  };
  const archived = {
    ...sample,
    profile: { ...sample.profile, id: 'look-2' },
    status: 'archived',
    current: { ...sample.current, profileId: 'look-2', displayName: 'Soft Pastel', source: 'preset' },
  };

  check(q.lookStyleFamilyLabel('manual') === 'Manuell', 'style family label');
  check(q.lookStatusLabel('archived') === 'Archiviert', 'status label');
  check(q.lookPreviewUri(sample) === 'https://example.com/preview.png', 'preview uri');
  check(
    q.filterLookLibraryCatalog([sample, archived], 'neon', q.EMPTY_LOOK_LIBRARY_FILTERS).length === 1,
    'search by name',
  );
  check(
    q.filterLookLibraryCatalog([sample, archived], '', {
      ...q.EMPTY_LOOK_LIBRARY_FILTERS,
      status: 'archived',
    }).length === 1,
    'status filter',
  );
  check(
    q.filterLookLibraryCatalog([sample, archived], '', {
      ...q.EMPTY_LOOK_LIBRARY_FILTERS,
      source: 'preset',
    }).length === 1,
    'source filter',
  );
  check(!q.hasActiveLookLibraryFilters(q.EMPTY_LOOK_LIBRARY_FILTERS), 'empty filters inactive');
}

section('7 · acceptance + test-gate wiring');
{
  const acceptance = read('.qa/acceptance/look-library.md');
  check(/look-library/.test(acceptance) || /Looks/.test(acceptance), 'acceptance covers Looks');
  const gate = read('scripts/test-gate.mjs');
  check(/look-library-check\.mjs/.test(gate), 'test-gate invokes look-library-check');
}

if (failures > 0) {
  console.error(`\nlook-library-check: ${failures} failure(s)`);
  process.exit(1);
}

console.log('look-library-check: OK (#343)');
