#!/usr/bin/env node
/**
 * item-domain-taxonomy-check — contract for #134 ItemDefinition ownership,
 * taxonomy/provenance metadata, normalize/validate, and inventory-v2 re-exports.
 * Location: scripts/item-domain-taxonomy-check.mjs
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
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

function equal(actual, expected, message) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) {
    failures += 1;
    console.error(`FAIL [${group}]: ${message} — expected ${b}, got ${a}`);
  }
}

function mustInclude(file, needles, label) {
  const text = readFileSync(join(root, file), 'utf8');
  for (const needle of needles) {
    if (!text.includes(needle)) {
      failures += 1;
      console.error(`FAIL [${label}]: missing ${JSON.stringify(needle)} in ${file}`);
    }
  }
}

function mustNotInclude(file, needles, label) {
  const text = readFileSync(join(root, file), 'utf8');
  for (const needle of needles) {
    if (text.includes(needle)) {
      failures += 1;
      console.error(`FAIL [${label}]: forbidden ${JSON.stringify(needle)} in ${file}`);
    }
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

// --- Static ownership / structure ---
section('1 · ownership & structure');

mustInclude(
  'src/domains/items/index.ts',
  [
    'ItemDefinition',
    'normalizeItemDefinition',
    'validateItemDefinitionMetadata',
    'ITEM_KIND_KEYS',
    'ITEM_SETTING_TAGS',
    'ITEM_ORIGINS',
  ],
  'items barrel',
);

mustInclude(
  'src/domains/character/inventory-v2/primitives.ts',
  [
    'ItemDefinitionScope',
    'InventoryItemType',
    'EquipmentSlot',
    'ItemMechanics',
    'ItemRequirements',
    'BASE_SLOT_COUNT',
  ],
  'primitives split',
);

mustNotInclude(
  'src/domains/character/inventory-v2/primitives.ts',
  ['interface ItemDefinition', 'export interface ItemDefinition'],
  'primitives must not own ItemDefinition',
);

mustInclude(
  'src/domains/character/inventory-v2/types.ts',
  ["from '../../items/definition'", "from './primitives'"],
  'types re-export path',
);

mustInclude(
  'src/domains/character/inventory-v2/index.ts',
  ['ItemDefinition'],
  'inventory-v2 public ItemDefinition',
);

mustInclude(
  'src/domains/character/inventory-v2/core-catalog.ts',
  ['normalizeItemDefinition'],
  'core catalog normalizes',
);

const itemsDir = join(root, 'src/domains/items');
for (const file of walkFiles(itemsDir)) {
  const text = readFileSync(file, 'utf8');
  const rel = file.slice(root.length + 1);
  check(!/\bfrom\s+['"]react(?:\/|$)/.test(text), `${rel}: no React import`);
  check(!/from\s+['"][^'"]*supabase[^'"]*['"]/i.test(text), `${rel}: no Supabase import`);
  check(!/import\s*\(\s*['"][^'"]*supabase/i.test(text), `${rel}: no dynamic Supabase import`);
  const codeOnly = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  check(!/\bany\b/.test(codeOnly), `${rel}: no any`);
}

// --- Runtime via esbuild ---
section('2 · normalize / validate runtime');

const outdir = join(root, 'node_modules', '.cache', 'item-domain-taxonomy-check');
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

const legacyDoc = {
  id: 'test.document.contract',
  scope: 'personal',
  name: 'Arbeitsvertrag',
  description: 'Nachweis',
  type: 'misc',
  load: 0,
  cost: 0,
  stackLimit: 1,
};

const normalizedDoc = items.normalizeItemDefinition(legacyDoc);
equal(normalizedDoc.kindKey, 'misc', 'legacy misc → kindKey misc');
equal(normalizedDoc.origin, 'personal', 'personal scope → origin personal');

const narrative = {
  ...normalizedDoc,
  kindKey: 'document',
  roles: ['evidence'],
};
const narrativeOk = items.validateItemDefinitionMetadata(narrative);
check(narrativeOk.ok === true, 'document + evidence validates without combat fields');

const deviceTool = {
  id: 'test.device.phone',
  scope: 'world',
  name: 'Smartphone',
  description: 'Gerät',
  type: 'tool',
  load: 0,
  cost: 2,
  stackLimit: 1,
  kindKey: 'device',
  settingTags: ['contemporary'],
  techLevel: 'modern',
  capabilities: ['communicate', 'record'],
  origin: 'world',
};
check(
  items.validateItemDefinitionMetadata(deviceTool).ok === true,
  'kindKey=device allowed with type=tool',
);

const deviceMisc = { ...deviceTool, type: 'misc', id: 'test.device.misc' };
check(
  items.validateItemDefinitionMetadata(deviceMisc).ok === true,
  'kindKey=device allowed with type=misc',
);

const unknownTag = {
  ...normalizedDoc,
  settingTags: ['cyberpunk'],
};
const unknownResult = items.validateItemDefinitionMetadata(unknownTag);
check(unknownResult.ok === false, 'unknown settingTags fail closed');

const sword = {
  id: 'test.weapon.longsword',
  scope: 'world',
  name: 'Langschwert',
  description: 'Klinge',
  type: 'weapon',
  load: 1,
  cost: 2,
  stackLimit: 1,
  kindKey: 'weapon',
  settingTags: ['fantasy'],
  basedOnDefinitionId: 'core.weapon.standard-melee',
  origin: 'world',
  damage: 'd8+2',
};
check(items.validateItemDefinitionMetadata(sword).ok === true, 'weapon with basedOnDefinitionId ok');

equal(
  items.normalizeItemDefinition({ ...legacyDoc, scope: 'core' }).origin,
  'core-archetype',
  'core scope → core-archetype',
);
equal(
  items.normalizeItemDefinition({ ...legacyDoc, scope: 'world' }).origin,
  'world',
  'world scope → world',
);

section('3 · Core catalog provenance');

const coreList = inv.listCoreItemDefinitions();
check(coreList.length === inv.CORE_CATALOG_SIZE, 'core size stable');
for (const def of coreList) {
  check(def.origin === 'core-archetype', `${def.id} origin=core-archetype`);
  check(typeof def.kindKey === 'string' && def.kindKey.length > 0, `${def.id} has kindKey`);
  const meta = items.validateItemDefinitionMetadata(def);
  check(meta.ok === true, `${def.id} metadata valid`);
}

const resolved = inv.getCoreItemDefinition('core.weapon.standard-melee');
check(resolved !== undefined, 'getCoreItemDefinition resolves');
equal(resolved?.origin, 'core-archetype', 'getCoreItemDefinition provenance');
equal(resolved?.kindKey, 'weapon', 'weapon kindKey from type');

const records = inv.coreCatalogRecords();
check(records.length === inv.CORE_CATALOG_SIZE, 'coreCatalogRecords size');
check(
  records.every((r) => r.definition.origin === 'core-archetype'),
  'coreCatalogRecords all have origin',
);

section('4 · compatibility re-export');

check(typeof inv.listCoreItemDefinitions === 'function', 'inventory exports listCore');
// ItemDefinition is a type-only export — presence verified via runtime normalize on core defs.
check(Array.isArray(items.ITEM_KIND_KEYS), 'items exports ITEM_KIND_KEYS');
check(items.ITEM_KIND_KEYS.includes('device'), 'device in kind keys');
check(items.ITEM_SETTING_TAGS.includes('sci-fi'), 'sci-fi setting tag');

if (failures > 0) {
  console.error(`item-domain-taxonomy-check: ${failures} failure(s)`);
  process.exit(1);
}

console.log('item-domain-taxonomy-check: OK');
