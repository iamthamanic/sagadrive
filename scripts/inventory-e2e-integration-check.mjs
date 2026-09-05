#!/usr/bin/env node
/**
 * Inventory v2 E2E integration / regression gate (#114).
 * Fails if child gates are unwired, architecture boundaries regress,
 * Core docs miss the 13 Inventory-v2 rules, CORE_CATALOG_SIZE drifts,
 * or CharacterEditor stops persisting inventory_v2.
 * Location: scripts/inventory-e2e-integration-check.mjs
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const root = fileURLToPath(new URL('..', import.meta.url));
let failures = 0;
let group = '';

function section(name) {
  group = name;
  console.log(`\n[${name}]`);
}

function check(condition, message) {
  if (!condition) {
    failures += 1;
    console.error(`FAIL [${group}]: ${message}`);
  }
}

function requireMatch(content, pattern, label) {
  if (!pattern.test(content)) {
    failures += 1;
    console.error(`FAIL [${group}]: fehlt ${label}`);
  }
}

function rejectMatch(content, pattern, label) {
  if (pattern.test(content)) {
    failures += 1;
    console.error(`FAIL [${group}]: ${label}`);
  }
}

function read(relPath) {
  return readFileSync(join(root, relPath), 'utf8');
}

function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, acc);
      continue;
    }
    if (/\.(ts|tsx|mjs|js)$/.test(entry)) acc.push(full);
  }
  return acc;
}

const CHILD_GATES = [
  'inventory-v2-domain-check',
  'inventory-catalog-check',
  'inventory-core-catalog-check',
  'inventory-legacy-migration-check',
  'inventory-desktop-ui-check',
  'inventory-world-catalog-ui-check',
  'inventory-equipment-ui-check',
  'inventory-mobile-ui-check',
];

// ── A · Child gates wired in test-gate.mjs ──────────────────────────────────
section('A · Child gates wired in test-gate.mjs');
const testGate = read('scripts/test-gate.mjs');
for (const name of CHILD_GATES) {
  const scriptPath = `scripts/${name}.mjs`;
  check(existsSync(join(root, scriptPath)), `script exists: ${scriptPath}`);
  requireMatch(
    testGate,
    new RegExp(`scripts/${name}\\.mjs`),
    `test-gate invokes scripts/${name}.mjs`,
  );
}
requireMatch(
  testGate,
  /scripts\/inventory-e2e-integration-check\.mjs/,
  'test-gate invokes inventory-e2e-integration-check (self)',
);

// ── B · Architecture boundaries ─────────────────────────────────────────────
section('B · Architecture boundaries');
const domainDir = join(root, 'src/domains/character/inventory-v2');
const uiDir = join(root, 'src/app/character/inventory');
check(existsSync(domainDir), 'domain inventory-v2 dir');
check(existsSync(uiDir), 'app inventory UI dir');

for (const file of walk(domainDir)) {
  const text = readFileSync(file, 'utf8');
  const rel = relative(root, file);
  rejectMatch(text, /\bfrom ['"]react['"]|\bfrom ['"]react\//, `React import in domain ${rel}`);
  rejectMatch(text, /\bimport React\b/, `React default import in domain ${rel}`);
  rejectMatch(text, /@supabase\/|createClient|from ['"].*supabase/i, `supabase in domain ${rel}`);
}

const uiFiles = walk(uiDir);
let uiBundle = '';
for (const file of uiFiles) {
  const text = readFileSync(file, 'utf8');
  const rel = relative(root, file);
  uiBundle += `\n${text}`;
  rejectMatch(
    text,
    /createClient\s*\(|from ['"]@supabase\/supabase-js['"]/,
    `supabase client import in UI ${rel}`,
  );
  rejectMatch(
    text,
    /from\(\s*['"]inventory_item_definitions['"]\s*\)|supabase\.from\(\s*['"]inventory_item_definitions['"]\s*\)/,
    `direct inventory_item_definitions query in ${rel}`,
  );
}
requireMatch(
  uiBundle,
  /item-catalog-service/,
  'UI uses item-catalog-service (not raw table access)',
);
requireMatch(
  uiBundle,
  /domains\/character\/inventory-v2/,
  'UI imports inventory-v2 domain',
);

const actions = read('src/app/character/inventory/InventoryItemActions.tsx');
const equipment = read('src/app/character/inventory/InventoryEquipmentPanel.tsx');
requireMatch(actions, /\bequipItem\b/, 'InventoryItemActions imports/uses equipItem');
requireMatch(equipment, /\bequipItem\b/, 'InventoryEquipmentPanel imports/uses equipItem');
requireMatch(equipment, /\bunequipItem\b/, 'InventoryEquipmentPanel uses unequipItem');
rejectMatch(
  uiBundle,
  /function\s+equipItem\s*\(|const\s+equipItem\s*=\s*(?:async\s*)?\(/,
  'UI must not redefine equipItem',
);
rejectMatch(
  uiBundle,
  /function\s+validateEquip|function\s+checkStackLimit\s*\(/,
  'UI must not reimplement equip/stack validation helpers',
);

const modulesHits = walk(join(root, 'src/modules')).filter((f) => {
  const text = readFileSync(f, 'utf8');
  // Type/catalog imports from the domain barrel are OK (#112 World UI).
  // Fail only if modules redefine Inventory-v2 operations or host a parallel state engine.
  if (/function\s+(equipItem|addItems|validateInventory|normalizeInventory|moveBaseSlot)\s*\(/.test(text)) {
    return true;
  }
  const reinventsEmpty =
    /createEmptyInventory\s*\(/.test(text) &&
    /legacyOverflow|baseSlots/.test(text) &&
    !/from ['"].*domains\/character\/inventory-v2/.test(text);
  return reinventsEmpty;
});
check(
  modulesHits.length === 0,
  modulesHits.length === 0
    ? 'no Inventory-v2 operation reimplementation under src/modules'
    : `Inventory-v2 logic leaked into modules: ${modulesHits.map((f) => relative(root, f)).join(', ')}`,
);

// ── C · Docs contain key phrases (13 points) ────────────────────────────────
section('C · Docs: 13 Inventory-v2 points');
const coreRules = read('docs/sagadrive core rules.md');
const readme = read('README.md');
const inventoryDoc = existsSync(join(root, 'docs/inventory-v2.md'))
  ? read('docs/inventory-v2.md')
  : '';

const corePhrases = [
  [/20 Basis-Inventarplätze/, '1 · 20 Basis-Inventarplätze'],
  [/1 Stapel = 1 Platz/, '2 · 1 Stapel = 1 Platz'],
  [/stackLimit/, '2 · stackLimit'],
  [/5 \+ 2 × Stärke/, '3 · Traglastformel'],
  [/keine zusätzlichen Inventarplätze/, '3 · Stärke adds no slots'],
  [/Ausrüstungsslots|Ausrüstungsplätze/, '4 · equipment slots wording'],
  [/Kopf.*Körper.*Accessoire|Kopf, Körper, 2× Accessoire/, '5 · equipment slot list'],
  [/Haupt-\/?Nebenhand|Haupthand.*Nebenhand/, '5 · hand slots'],
  [/Zweihändig/, '6 · two-handed'],
  [/Vier Schnellzugriffe|Vier Quickslots/, '7 · four quickslots'],
  [/Referenzen/, '7 · quickslots are references'],
  [/einen Basisplatz/, '8 · container uses one base slot'],
  [/Keine verschachtelten Container|Keine verschachtelten Behälter/, '8 · no nested containers'],
  [/Core.*World.*Personal|Core · World|Core · Welt/, '9 · Core/World/Personal scopes'],
  [/effektive[n]? Welt|effektives Weltprofil/, '9 · effective-world catalog'],
  [/kein Shop/, '10 · not a shop'],
  [/0–5|0-5/, '10 · does not spend 0–5 resource'],
  [/Boden-Loot|World-Drop/, '11 · removal ≠ world drop'],
  [/35 Definitionen/, '12 · 35 Core definitions'],
  [/Legacy-Migration|Overflow/, '13 · legacy migration/overflow'],
  [/Kompatibilit/, '13 · compatibility not creation rule'],
];

for (const [pattern, label] of corePhrases) {
  requireMatch(coreRules, pattern, `core rules: ${label}`);
}

requireMatch(readme, /20 (feste )?Basisplätze/, 'README: 20 base slots');
requireMatch(readme, /Traglast|5 \+ 2 × Stärke/, 'README: load capacity');
rejectMatch(readme, /Lastpunkte statt fester Slots|statt fester Slots/, 'README must not say load instead of fixed slots');
rejectMatch(
  read('src/app/character/progression/CharacterInventoryPanel.tsx'),
  /Keine festen Slots/,
  'legacy panel must not say Keine festen Slots',
);
requireMatch(
  read('src/app/character/inventory/InventorySummaryBar.tsx'),
  /20 Basisplätze/,
  'InventorySummaryBar RuleHelp mentions 20 base slots',
);

if (inventoryDoc) {
  requireMatch(inventoryDoc, /20 Basis-Inventarplätze/, 'inventory-v2.md: 20 slots');
  requireMatch(inventoryDoc, /35 Definitionen/, 'inventory-v2.md: 35 defs');
}

// ── D · CORE_CATALOG_SIZE / 35 ───────────────────────────────────────────────
section('D · CORE_CATALOG_SIZE / 35');
const coreCatalog = read('src/domains/character/inventory-v2/core-catalog.ts');
const coreCatalogCheck = read('scripts/inventory-core-catalog-check.mjs');
requireMatch(coreCatalog, /CORE_CATALOG_SIZE\s*=\s*35/, 'core-catalog.ts CORE_CATALOG_SIZE = 35');
requireMatch(coreCatalogCheck, /CORE_CATALOG_SIZE/, 'core-catalog-check references CORE_CATALOG_SIZE');
requireMatch(coreCatalogCheck, /\b35\b/, 'core-catalog-check references 35');

// ── E · CharacterEditor saves inventory_v2 ───────────────────────────────────
section('E · CharacterEditor inventory_v2');
const editor = read('src/app/character/edit/CharacterEditor.tsx');
requireMatch(editor, /inventory_v2:\s*inventoryV2/, 'CharacterEditor save payload includes inventory_v2');
requireMatch(editor, /CharacterInventoryV2Panel/, 'CharacterEditor renders CharacterInventoryV2Panel');

if (failures > 0) {
  console.error(`\ninventory-e2e-integration-check: ${failures} Fehler`);
  process.exit(1);
}

console.log('\ninventory-e2e-integration-check: OK (#114)');
