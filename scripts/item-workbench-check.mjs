#!/usr/bin/env node
/**
 * item-workbench-check — UI/architecture contract for Item Workbench (#139).
 * Location: scripts/item-workbench-check.mjs
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const root = process.cwd();
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
  'src/app/items/workbench/index.ts',
  'src/app/items/workbench/ItemWorkbenchScreen.tsx',
  'src/app/items/workbench/useItemEditor.ts',
  'src/app/items/workbench/ItemWorkbenchLanding.tsx',
  'src/app/items/workbench/ItemWorkbenchEditor.tsx',
  'src/app/items/workbench/ItemWorkbenchTopbar.tsx',
  'src/app/items/workbench/ItemTypePickerDialog.tsx',
  'src/app/items/workbench/ItemVisualsPanel.tsx',
  'src/app/items/workbench/ItemBasicsSection.tsx',
  'src/app/items/workbench/ItemTaxonomySection.tsx',
  'src/app/items/workbench/ItemRulesSection.tsx',
  'src/app/items/workbench/ItemAvailabilitySection.tsx',
  'src/app/items/workbench/ItemForkDialog.tsx',
  'src/app/items/workbench/ItemArchiveDialog.tsx',
  'src/app/items/workbench/workbenchForm.ts',
  'src/app/items/workbench/workbenchLabels.ts',
  'src/assets/items/workbench-line-art.svg',
  '.qa/acceptance/item-workbench.md',
  'e2e/item-workbench.spec.ts',
].forEach(mustExist);

section('2 · App wires workbench routes');
{
  const app = read('src/App.tsx');
  check(/ItemWorkbenchScreen/.test(app), 'App imports ItemWorkbenchScreen');
  check(/route=["']create["']/.test(app), 'create route wired');
  check(/route=["']detail["']/.test(app), 'detail route wired');
  check(!/ItemCreatePlaceholder/.test(app), 'create placeholder removed from App');
  check(!/ItemDetailPlaceholder/.test(app), 'detail placeholder removed from App');
}

section('3 · no Supabase in workbench slice');
{
  const files = [
    'src/app/items/workbench/useItemEditor.ts',
    'src/app/items/workbench/ItemWorkbenchScreen.tsx',
    'src/app/items/workbench/workbenchForm.ts',
  ];
  for (const file of files) {
    const content = read(file);
    check(!/from ['"].*supabase/.test(content), `${file} must not import supabase`);
    check(!/supabase\.from/.test(content), `${file} must not query supabase`);
  }
}

section('4 · persistence via catalog service');
{
  const hook = read('src/app/items/workbench/useItemEditor.ts');
  check(/getItemDefinitionById/.test(hook), 'loads via getItemDefinitionById');
  check(/createPersonalDefinition/.test(hook), 'creates personal via service');
  check(/createWorldDefinition/.test(hook), 'creates world via service');
  check(/updateDefinition/.test(hook), 'updates via service');
  check(/forkDefinition/.test(hook), 'forks via service');
  check(/archiveDefinition/.test(hook), 'archives via service');
  check(/setNavigationBlocker/.test(hook), 'registers dirty navigation blocker');
  check(/Ungespeicherte Änderungen verwerfen\?/.test(hook) || /DIRTY_LEAVE_MESSAGE/.test(hook), 'dirty message');
}

section('5 · catalog service exposes getItemDefinitionById + builtin fork');
{
  const service = read('src/infrastructure/inventory/item-catalog-service.ts');
  const repo = read('src/infrastructure/inventory/supabase-item-catalog.repository.ts');
  check(/getItemDefinitionById/.test(service), 'service exports getItemDefinitionById');
  check(/getDefinitionById/.test(repo), 'repository getDefinitionById');
  check(/getBuiltinStandardDefinition/.test(repo), 'builtin fork/load resolution');
}

section('6 · UX contract strings / a11y hooks');
{
  const landing = read('src/app/items/workbench/ItemWorkbenchLanding.tsx');
  const topbar = read('src/app/items/workbench/ItemWorkbenchTopbar.tsx');
  const labels = read('src/app/items/workbench/workbenchLabels.ts');
  const screen = read('src/app/items/workbench/ItemWorkbenchScreen.tsx');
  const editor = read('src/app/items/workbench/ItemWorkbenchEditor.tsx');

  check(/Klicke hier, um ein Item zu erstellen/.test(landing), 'landing CTA copy');
  check(/data-item-workbench-landing/.test(landing), 'landing data hook');
  check(/data-item-workbench-art/.test(landing), 'line-art data hook');
  check(/Zurück zu Items/.test(topbar), 'back copy');
  check(/Speichern/.test(screen) || /Speichern/.test(topbar), 'save CTA');
  check(/Als eigenes Item verwenden/.test(screen), 'fork CTA copy');
  check(/Waffe/.test(labels) && /Gerät/.test(labels) && /Verbrauchsgut/.test(labels), 'type picker labels');
  check(/md:grid-cols-\[/.test(editor), 'desktop two-column grid');
  check(/min-h-11/.test(topbar), 'topbar ≥44px targets');
  check(/Item erstellt/.test(read('src/app/items/workbench/useItemEditor.ts')), 'create toast');
  check(/Item gespeichert/.test(read('src/app/items/workbench/useItemEditor.ts')), 'save toast');
}

section('7 · original asset (no watermarked reference path)');
{
  const art = read('src/assets/items/workbench-line-art.svg');
  check(/Original SagaDrive workbench/.test(art), 'asset marked original');
  check(!/watermark/i.test(art), 'no watermark content');
  check(!/shutterstock|getty|adobe stock/i.test(art), 'no stock attribution');
}

if (failures > 0) {
  console.error(`item-workbench-check: ${failures} failure(s)`);
  process.exit(1);
}

console.log('item-workbench-check: OK');
