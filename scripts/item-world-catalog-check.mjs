#!/usr/bin/env node
/**
 * item-world-catalog-check — contract for #142 world `item-catalog` module:
 * config normalize, pure resolveWorldItemCatalog order, registry + editor UI,
 * Core never excluded, unknown ids preserved.
 * Location: scripts/item-world-catalog-check.mjs
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
let failures = 0;
let group = '';

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

function section(name) {
  group = name;
}

function check(condition, message) {
  if (!condition) {
    failures += 1;
    console.error(`FAIL [${group}]: ${message}`);
  }
}

function equal(actual, expected, message) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) {
    failures += 1;
    console.error(`FAIL [${group}]: ${message} — expected ${b}, got ${a}`);
  }
}

function walkFiles(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walkFiles(full, acc);
      continue;
    }
    if (/\.(ts|tsx|js|jsx|mjs)$/.test(entry)) acc.push(full);
  }
  return acc;
}

// --- Static structure ---
section('1 · structure & purity');

{
  const worldCatalog = read('src/domains/items/world-catalog.ts');
  check(worldCatalog.includes("ITEM_CATALOG_MODULE_ID = 'item-catalog'"), 'module id item-catalog');
  check(worldCatalog.includes('enabledPackIds'), 'enabledPackIds');
  check(worldCatalog.includes('includedDefinitionIds'), 'includedDefinitionIds');
  check(worldCatalog.includes('excludedDefinitionIds'), 'excludedDefinitionIds');
  check(worldCatalog.includes('allowPersonalItems'), 'allowPersonalItems');
  check(worldCatalog.includes('export function resolveWorldItemCatalog'), 'resolveWorldItemCatalog export');
  check(worldCatalog.includes('export function normalizeItemCatalogModuleConfig'), 'normalize export');
  check(!/\bfrom\s+['"]react(?:\/|$)/.test(worldCatalog), 'world-catalog: no React');
  check(!/from\s+['"][^'"]*supabase[^'"]*['"]/i.test(worldCatalog), 'world-catalog: no Supabase');

  const barrel = read('src/domains/items/index.ts');
  check(barrel.includes('resolveWorldItemCatalog'), 'barrel exports resolver');
  check(barrel.includes('ITEM_CATALOG_MODULE_ID'), 'barrel exports module id');

  const registry = read('src/domains/world/worldModuleRegistry.ts');
  check(registry.includes("'item-catalog'"), 'registry includes item-catalog');
  check(registry.includes('customEditor'), 'customEditor flag');
  check(registry.includes('normalizeItemCatalogModuleConfig'), 'registry normalizes item-catalog');

  const editor = read('src/app/world/profile-editor/WorldProfileEditorDialog.tsx');
  check(editor.includes('WorldItemCatalogModuleSection'), 'editor wires module section');
  check(editor.includes('!module.customEditor'), 'generic settings skip customEditor');

  const sectionUi = read('src/app/world/item-catalog/WorldItemCatalogModuleSection.tsx');
  check(sectionUi.includes('Gegenstände & Ausrüstung'), 'German section title');
  check(sectionUi.includes('Eigene Items der Spieler erlauben'), 'personal toggle copy');
  check(sectionUi.includes('Einzelnen Gegenstand hinzufügen'), 'search-add copy');
  check(sectionUi.includes('data-world-item-catalog-module'), 'data hook');
  check(sectionUi.includes('useItemWorldAvailability'), 'uses hook');
  check(!/supabase\.from\(/.test(sectionUi), 'section no direct supabase');

  const hook = read('src/app/world/item-catalog/useItemWorldAvailability.ts');
  check(hook.includes('resolveWorldItemCatalog'), 'hook uses domain resolver');
  check(hook.includes('listBaseItemPacks'), 'hook lists base packs');
  check(hook.includes('listContextItemPacks'), 'hook lists context packs');

  for (const file of [
    'src/domains/items/world-catalog.ts',
    'src/app/world/item-catalog/useItemWorldAvailability.ts',
    'src/app/world/item-catalog/WorldItemCatalogModuleSection.tsx',
    'src/domains/world/worldModuleRegistry.ts',
  ]) {
    const text = read(file);
    const codeOnly = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    check(!/\bany\b/.test(codeOnly), `${file}: no any`);
    check(!/\bas\s+unknown\b/.test(codeOnly), `${file}: no as unknown`);
  }

  // Domain items purity still holds for world-catalog
  for (const file of walkFiles(join(root, 'src/domains/items'))) {
    const text = readFileSync(file, 'utf8');
    const rel = file.slice(root.length + 1);
    check(!/\bfrom\s+['"]react(?:\/|$)/.test(text), `${rel}: no React`);
    check(!/from\s+['"][^'"]*supabase[^'"]*['"]/i.test(text), `${rel}: no Supabase`);
  }
}

// --- Runtime via esbuild ---
section('2 · normalize defaults & unknown preserve');

const outdir = join(root, 'node_modules', '.cache', 'item-world-catalog-check');
mkdirSync(outdir, { recursive: true });
const esbuild = join(root, 'node_modules', '.bin', 'esbuild');

execFileSync(
  esbuild,
  [
    join(root, 'src/domains/items/index.ts'),
    '--bundle',
    '--format=esm',
    `--outfile=${join(outdir, 'items.mjs')}`,
  ],
  { stdio: 'inherit' },
);

execFileSync(
  esbuild,
  [
    join(root, 'src/domains/character/inventory-v2/index.ts'),
    '--bundle',
    '--format=esm',
    `--outfile=${join(outdir, 'inventory.mjs')}`,
  ],
  { stdio: 'inherit' },
);

const items = await import(pathToFileURL(join(outdir, 'items.mjs')).href);
const inv = await import(pathToFileURL(join(outdir, 'inventory.mjs')).href);

equal(items.ITEM_CATALOG_MODULE_ID, 'item-catalog', 'module id constant');

{
  const defaults = items.defaultItemCatalogModuleConfig();
  equal(defaults.allowPersonalItems, true, 'allowPersonalItems default true');
  equal(defaults.enabledPackIds, [], 'enabledPackIds default empty');
  equal(defaults.includedDefinitionIds, [], 'includes default empty');
  equal(defaults.excludedDefinitionIds, [], 'excludes default empty');

  const fromNull = items.normalizeItemCatalogModuleConfig(null);
  equal(fromNull.config.allowPersonalItems, true, 'null → default allowPersonal');
  check(fromNull.diagnosis.coercedFields.includes('config') || fromNull.diagnosis.coercedFields.length === 0, 'null diagnosis ok');

  const fromInvalid = items.normalizeItemCatalogModuleConfig({
    enabledPackIds: 'nope',
    includedDefinitionIds: [123, 'builtin.contemporary.smartphone', ''],
    excludedDefinitionIds: ['x'],
    allowPersonalItems: 'yes',
  });
  check(fromInvalid.config.enabledPackIds.length === 0, 'invalid packs coerced to []');
  equal(fromInvalid.config.includedDefinitionIds, ['builtin.contemporary.smartphone'], 'string includes kept');
  equal(fromInvalid.config.allowPersonalItems, true, 'bad boolean → default true');
  check(fromInvalid.diagnosis.coercedFields.includes('enabledPackIds'), 'diagnose enabledPackIds');
  check(fromInvalid.diagnosis.coercedFields.includes('allowPersonalItems'), 'diagnose allowPersonalItems');

  const unknown = items.normalizeItemCatalogModuleConfig({
    enabledPackIds: ['builtin:fantasy-basic', 'builtin:pack-from-future'],
    includedDefinitionIds: ['builtin.fantasy.longsword', 'future.def.1'],
    excludedDefinitionIds: ['future.def.2'],
    allowPersonalItems: false,
  });
  equal(unknown.config.enabledPackIds, ['builtin:fantasy-basic', 'builtin:pack-from-future'], 'unknown pack preserved');
  equal(unknown.config.includedDefinitionIds, ['builtin.fantasy.longsword', 'future.def.1'], 'unknown include preserved');
  equal(unknown.config.excludedDefinitionIds, ['future.def.2'], 'unknown exclude preserved');
  equal(unknown.config.allowPersonalItems, false, 'false allowPersonal kept');
  check(unknown.diagnosis.unknownPackIds.includes('builtin:pack-from-future'), 'diagnose unknown pack');
  check(unknown.diagnosis.unknownIncludedDefinitionIds.includes('future.def.1'), 'diagnose unknown include');
}

section('3 · resolve order, Core, dedupe');

{
  const core = inv.listCoreItemDefinitions();
  equal(core.length, 36, 'Core still 36');

  const resolveDefinition = (id) =>
    items.getBuiltinStandardDefinition(id) ?? core.find((d) => d.id === id);

  // Empty packs → Core only
  const empty = items.resolveWorldItemCatalog({
    config: items.defaultItemCatalogModuleConfig(),
    coreDefinitions: core,
    resolveDefinition,
  });
  equal(empty.definitions.length, 36, 'empty config → Core only');
  check(
    empty.definitions.every((d) => d.origin === 'core-archetype'),
    'empty result is all Core',
  );

  // Fantasy + Adventure + Survival stress combo + include smartphone + exclude torch
  const fantasyId = items.FANTASY_BASIC_PACK_ID;
  const config = {
    enabledPackIds: [fantasyId, 'builtin:context-adventure', 'builtin:context-survival'],
    includedDefinitionIds: ['builtin.contemporary.smartphone', 'builtin.fantasy.longsword'],
    excludedDefinitionIds: ['builtin.fantasy.torch', core[0].id],
    allowPersonalItems: true,
  };

  const worldDef = {
    id: 'world.test.custom-sword',
    scope: 'world',
    name: 'Weltschwert',
    description: 'test',
    type: 'weapon',
    load: 1,
    cost: 0,
    stackLimit: 1,
    origin: 'world-custom',
  };
  const personalDef = {
    id: 'personal.test.trinket',
    scope: 'personal',
    name: 'Glücksbringer',
    description: 'test',
    type: 'misc',
    load: 0,
    cost: 0,
    stackLimit: 1,
    origin: 'personal',
  };

  const resolved = items.resolveWorldItemCatalog({
    config,
    coreDefinitions: core,
    resolveDefinition,
    worldDefinitions: [worldDef],
    personalDefinitions: [personalDef],
  });

  const ids = resolved.definitions.map((d) => d.id);
  check(ids.includes('builtin.fantasy.longsword'), 'pack member present');
  check(ids.includes('builtin.contemporary.smartphone'), 'explicit include present');
  check(!ids.includes('builtin.fantasy.torch'), 'exclude removes torch');
  check(ids.includes(worldDef.id), 'world def present');
  check(ids.includes(personalDef.id), 'personal present when allowed');
  check(ids.includes(core[0].id), 'Core id still present despite exclude');
  check(resolved.diagnosis.ignoredCoreExcludeIds.includes(core[0].id), 'Core exclude diagnosed');
  equal(new Set(ids).size, ids.length, 'no duplicate definition ids');

  // include already in pack → no duplicate
  const longswordCount = ids.filter((id) => id === 'builtin.fantasy.longsword').length;
  equal(longswordCount, 1, 'include already in pack deduped');

  // allowPersonalItems false hides personal
  const noPersonal = items.resolveWorldItemCatalog({
    config: { ...config, allowPersonalItems: false },
    coreDefinitions: core,
    resolveDefinition,
    worldDefinitions: [worldDef],
    personalDefinitions: [personalDef],
  });
  check(!noPersonal.definitions.some((d) => d.id === personalDef.id), 'personal hidden when disallowed');
  check(noPersonal.definitions.some((d) => d.id === worldDef.id), 'world still present');

  // Same def via three packs → once
  const multi = items.resolveWorldItemCatalog({
    config: {
      enabledPackIds: [
        fantasyId,
        'builtin:context-adventure',
        'builtin:context-combat',
      ],
      includedDefinitionIds: [],
      excludedDefinitionIds: [],
      allowPersonalItems: true,
    },
    coreDefinitions: core,
    resolveDefinition,
  });
  equal(
    multi.definitions.filter((d) => d.id === 'builtin.fantasy.longsword').length,
    1,
    'multi-pack membership deduped',
  );

  // include + exclude same id → exclude wins
  const both = items.resolveWorldItemCatalog({
    config: {
      enabledPackIds: [],
      includedDefinitionIds: ['builtin.contemporary.smartphone'],
      excludedDefinitionIds: ['builtin.contemporary.smartphone'],
      allowPersonalItems: true,
    },
    coreDefinitions: core,
    resolveDefinition,
  });
  check(
    !both.definitions.some((d) => d.id === 'builtin.contemporary.smartphone'),
    'exclude wins over include',
  );
}

section('4 · composition gate artifact');

{
  const gate = read('.qa/runs/composition-gate-item-world-catalog-module.md');
  check(gate.includes('N-actors'), 'composition gate has N-actors label');
  check(gate.includes('Invalid/missing'), 'composition gate has Invalid/missing label');
  check(gate.includes('Two consumers / crash'), 'composition gate has Two consumers label');
  check(/CLEAR|SKIPPED/.test(gate), 'composition gate verdict');
}

if (failures > 0) {
  console.error(`\nitem-world-catalog-check: ${failures} Fehler`);
  process.exit(1);
}

console.log('item-world-catalog-check: OK');
