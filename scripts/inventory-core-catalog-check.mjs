#!/usr/bin/env node
/**
 * Inventory v2 Core catalog contract (#108) — exactly 35 setting-neutral
 * definitions with stable IDs, schema validation against #106 bounds, type
 * coverage, and resolve-by-id through the catalog boundary.
 * Location: scripts/inventory-core-catalog-check.mjs
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
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
    console.error(`FAIL [${group}]: ${message} — erwartet ${b}, war ${a}`);
  }
}

const EXPECTED = Object.freeze([
  // weapons
  { id: 'core.weapon.light-melee', name: 'Leichte Nahkampfwaffe', type: 'weapon', load: 1, cost: 1, stackLimit: 1, damage: 'd6+1', damageType: 'Kinetisch', equipSlots: ['mainHand', 'offHand'], traits: ['Finesse'] },
  { id: 'core.weapon.standard-melee', name: 'Standard-Nahkampfwaffe', type: 'weapon', load: 1, cost: 2, stackLimit: 1, damage: 'd8+2', damageType: 'Kinetisch', equipSlots: ['mainHand', 'offHand'] },
  { id: 'core.weapon.heavy-melee', name: 'Schwere Nahkampfwaffe', type: 'weapon', load: 2, cost: 3, stackLimit: 1, damage: 'd10+3', damageType: 'Kinetisch', equipSlots: ['mainHand', 'offHand'], twoHanded: true },
  { id: 'core.weapon.reach-melee', name: 'Reichweiten-Nahkampfwaffe', type: 'weapon', load: 2, cost: 2, stackLimit: 1, damage: 'd8+2', damageType: 'Kinetisch', equipSlots: ['mainHand', 'offHand'], twoHanded: true, traits: ['Reichweite'] },
  { id: 'core.weapon.light-ranged', name: 'Leichte Fernkampfwaffe', type: 'weapon', load: 1, cost: 2, stackLimit: 1, damage: 'd6+1', damageType: 'Kinetisch', equipSlots: ['mainHand', 'offHand'] },
  { id: 'core.weapon.standard-ranged', name: 'Standard-Fernkampfwaffe', type: 'weapon', load: 1, cost: 3, stackLimit: 1, damage: 'd8+2', damageType: 'Kinetisch', equipSlots: ['mainHand', 'offHand'] },
  { id: 'core.weapon.heavy-ranged', name: 'Schwere Fernkampfwaffe', type: 'weapon', load: 2, cost: 4, stackLimit: 1, damage: 'd10+3', damageType: 'Kinetisch', equipSlots: ['mainHand', 'offHand'], twoHanded: true },
  { id: 'core.weapon.armor-piercing', name: 'Durchdringungswaffe', type: 'weapon', load: 2, cost: 4, stackLimit: 1, damage: 'd8+2', damageType: 'Kinetisch', equipSlots: ['mainHand', 'offHand'], twoHanded: true, traits: ['Durchdringung 1'] },
  // armor & shield
  { id: 'core.armor.light', name: 'Leichte Rüstung', type: 'armor', load: 1, cost: 2, stackLimit: 1, protection: 1, equipSlots: ['body'], requirements: { minimumStrength: 1 } },
  { id: 'core.armor.medium', name: 'Mittlere Rüstung', type: 'armor', load: 2, cost: 3, stackLimit: 1, protection: 2, equipSlots: ['body'], requirements: { minimumStrength: 2 } },
  { id: 'core.armor.heavy', name: 'Schwere Rüstung', type: 'armor', load: 3, cost: 4, stackLimit: 1, protection: 3, equipSlots: ['body'], requirements: { minimumStrength: 4 } },
  { id: 'core.shield.standard', name: 'Schild', type: 'shield', load: 1, cost: 2, stackLimit: 1, equipSlots: ['mainHand', 'offHand'], traits: ['+1 Verteidigung', '1 Hand'] },
  // tools
  { id: 'core.tool.medical', name: 'Medizinisches Set', type: 'tool', load: 1, cost: 2, stackLimit: 1 },
  { id: 'core.tool.repair', name: 'Reparaturset', type: 'tool', load: 1, cost: 2, stackLimit: 1 },
  { id: 'core.tool.precision', name: 'Präzisionswerkzeug', type: 'tool', load: 1, cost: 2, stackLimit: 1 },
  { id: 'core.tool.survival', name: 'Überlebensset', type: 'tool', load: 1, cost: 2, stackLimit: 1 },
  { id: 'core.tool.climbing', name: 'Kletterset', type: 'tool', load: 2, cost: 2, stackLimit: 1 },
  { id: 'core.tool.navigation', name: 'Navigationsset', type: 'tool', load: 1, cost: 2, stackLimit: 1 },
  { id: 'core.tool.research', name: 'Analyse- & Forschungsset', type: 'tool', load: 1, cost: 2, stackLimit: 1 },
  { id: 'core.tool.craft', name: 'Handwerksset', type: 'tool', load: 2, cost: 2, stackLimit: 1 },
  // consumables
  { id: 'core.consumable.medical', name: 'Medizinischer Verbrauch', type: 'consumable', load: 0, cost: 1, stackLimit: 5 },
  { id: 'core.consumable.repair', name: 'Reparaturmaterial', type: 'consumable', load: 0, cost: 1, stackLimit: 5 },
  { id: 'core.consumable.ration', name: 'Nahrung & Wasser', type: 'consumable', load: 0, cost: 1, stackLimit: 5 },
  { id: 'core.consumable.energy', name: 'Energie- / Betriebsmittel', type: 'consumable', load: 0, cost: 1, stackLimit: 5 },
  { id: 'core.consumable.general', name: 'Allgemeiner Verbrauch', type: 'consumable', load: 0, cost: 1, stackLimit: 5 },
  // containers
  { id: 'core.container.pouch', name: 'Gürteltasche', type: 'container', load: 0, cost: 1, stackLimit: 1, containerCapacity: 2 },
  { id: 'core.container.bag', name: 'Tasche', type: 'container', load: 1, cost: 1, stackLimit: 1, containerCapacity: 4 },
  { id: 'core.container.backpack', name: 'Rucksack', type: 'container', load: 1, cost: 2, stackLimit: 1, containerCapacity: 6 },
  { id: 'core.container.transport', name: 'Transportbehälter', type: 'container', load: 2, cost: 2, stackLimit: 1, containerCapacity: 10 },
  // misc
  { id: 'core.misc.light-source', name: 'Lichtquelle', type: 'misc', load: 0, cost: 1, stackLimit: 3 },
  { id: 'core.misc.rope', name: 'Seil / Leine', type: 'misc', load: 1, cost: 1, stackLimit: 2 },
  { id: 'core.misc.documentation', name: 'Dokumentationsmaterial', type: 'misc', load: 0, cost: 1, stackLimit: 3 },
  { id: 'core.misc.communicator', name: 'Kommunikationsmittel', type: 'misc', load: 0, cost: 2, stackLimit: 1, equipSlots: ['accessory1', 'accessory2'] },
  { id: 'core.misc.headgear', name: 'Kopfbedeckung / Schutzhelm', type: 'misc', load: 1, cost: 1, stackLimit: 1, equipSlots: ['head'] },
  { id: 'core.misc.special-device', name: 'Spezialgerät', type: 'misc', load: 1, cost: 3, stackLimit: 1, equipSlots: ['special'] },
]);

const outdir = join(root, 'node_modules', '.cache', 'inventory-core-catalog-check');
mkdirSync(outdir, { recursive: true });
execFileSync(
  join(root, 'node_modules', '.bin', 'esbuild'),
  [
    join(root, 'src/domains/character/inventory-v2/index.ts'),
    '--bundle',
    '--format=esm',
    `--outfile=${join(outdir, 'catalog.mjs')}`,
  ],
  { stdio: 'inherit' },
);
const inv = await import(pathToFileURL(join(outdir, 'catalog.mjs')).href);

const EQUIPMENT_SLOTS = new Set(inv.EQUIPMENT_SLOTS);
const ITEM_TYPES = new Set(['weapon', 'armor', 'shield', 'tool', 'consumable', 'container', 'misc']);

function pickComparable(definition) {
  const row = {
    id: definition.id,
    name: definition.name,
    type: definition.type,
    load: definition.load,
    cost: definition.cost,
    stackLimit: definition.stackLimit,
  };
  if (definition.damage !== undefined) row.damage = definition.damage;
  if (definition.damageType !== undefined) row.damageType = definition.damageType;
  if (definition.protection !== undefined) row.protection = definition.protection;
  if (definition.equipSlots !== undefined) row.equipSlots = definition.equipSlots;
  if (definition.twoHanded !== undefined) row.twoHanded = definition.twoHanded;
  if (definition.traits !== undefined) row.traits = definition.traits;
  if (definition.requirements !== undefined) row.requirements = definition.requirements;
  if (definition.containerCapacity !== undefined) row.containerCapacity = definition.containerCapacity;
  return row;
}

// 1. Snapshot / table
section('1 · Snapshot der 35 stabilen Core-Ids');
{
  const core = inv.listCoreItemDefinitions();
  equal(core.length, inv.CORE_CATALOG_SIZE, 'genau CORE_CATALOG_SIZE Einträge');
  equal(core.length, 35, 'genau 35 Definitionen');
  equal(EXPECTED.length, 35, 'Erwartungstabelle hat 35 Zeilen');
  equal(
    core.map((definition) => pickComparable(definition)),
    EXPECTED,
    'alle Ids und Kernwerte entsprechen der V1-Tabelle',
  );
}

// 2. Schema validator
section('2 · Schema gegen #106-Grenzen');
{
  for (const definition of inv.listCoreItemDefinitions()) {
    check(definition.scope === 'core', `${definition.id}: Scope core`);
    check(
      definition.id.startsWith('core.'),
      `${definition.id}: stabiles core.-Präfix`,
    );
    check(ITEM_TYPES.has(definition.type), `${definition.id}: bekannter Typ`);
    check(
      Number.isInteger(definition.load) && definition.load >= 0 && definition.load <= 3,
      `${definition.id}: Last 0–3`,
    );
    check(
      Number.isInteger(definition.cost) && definition.cost >= 0 && definition.cost <= 5,
      `${definition.id}: Kosten 0–5`,
    );
    check(
      Number.isInteger(definition.stackLimit) && definition.stackLimit >= 1,
      `${definition.id}: stackLimit ≥ 1`,
    );
    check(
      typeof definition.name === 'string' && definition.name.trim().length > 0,
      `${definition.id}: Name gesetzt`,
    );
    check(
      typeof definition.description === 'string' && definition.description.trim().length > 0,
      `${definition.id}: deutsche Beschreibung gesetzt`,
    );

    if (definition.type === 'weapon') {
      check(typeof definition.damage === 'string' && definition.damage.length > 0, `${definition.id}: Schaden`);
      check(definition.damageType === 'Kinetisch', `${definition.id}: Schadensart Kinetisch`);
      check(Array.isArray(definition.equipSlots) && definition.equipSlots.length > 0, `${definition.id}: Equip-Slots`);
    }
    if (definition.type === 'armor') {
      check([1, 2, 3].includes(definition.protection), `${definition.id}: Schutz 1–3`);
      check(definition.equipSlots?.includes('body'), `${definition.id}: Körper-Slot`);
      check([1, 2, 4].includes(definition.requirements?.minimumStrength), `${definition.id}: Mindeststärke`);
    }
    if (definition.type === 'container') {
      check(
        Number.isInteger(definition.containerCapacity) && definition.containerCapacity >= 1,
        `${definition.id}: Kapazität ≥ 1`,
      );
    }
    if (definition.twoHanded) {
      check(
        definition.equipSlots?.includes('mainHand') && definition.equipSlots?.includes('offHand'),
        `${definition.id}: Zweihändig belegt beide Hand-Slots`,
      );
    }
    if (definition.equipSlots) {
      check(
        definition.equipSlots.every((slot) => EQUIPMENT_SLOTS.has(slot)),
        `${definition.id}: nur bekannte Equipment-Slots`,
      );
    }
    if (definition.protection !== undefined) {
      check([1, 2, 3].includes(definition.protection), `${definition.id}: Schutz im Contract`);
    }
  }
}

// 3. Type coverage
section('3 · Typ-/Kategorie-Abdeckung');
{
  const byType = Object.fromEntries([...ITEM_TYPES].map((type) => [type, 0]));
  for (const definition of inv.listCoreItemDefinitions()) {
    byType[definition.type] += 1;
  }
  equal(byType, {
    weapon: 8,
    armor: 3,
    shield: 1,
    tool: 8,
    consumable: 5,
    container: 4,
    misc: 6,
  }, 'jede Kategorie hat die V1-Anzahl');
}

// 4. No duplicate IDs
section('4 · Keine doppelten Ids');
{
  const ids = inv.listCoreItemDefinitions().map((definition) => definition.id);
  equal(new Set(ids).size, ids.length, 'alle Ids eindeutig');
}

// 5. Resolve by ID through catalog boundary
section('5 · Auflösung über Kataloggrenze');
{
  for (const expected of EXPECTED) {
    const found = inv.getCoreItemDefinition(expected.id);
    check(found !== undefined, `${expected.id} über getCoreItemDefinition`);
    equal(found?.name, expected.name, `${expected.id} Name`);
  }
  equal(inv.getCoreItemDefinition('core.weapon.unknown'), undefined, 'unbekannte Id ergibt undefined');

  const records = inv.coreCatalogRecords();
  equal(records.length, 35, 'coreCatalogRecords liefert 35 aktive Records');
  const lookup = inv.createDefinitionLookup(records, {
    userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    effectiveWorldProfileId: null,
  });
  for (const expected of EXPECTED) {
    check(lookup(expected.id)?.id === expected.id, `${expected.id} über createDefinitionLookup`);
  }
}

// Setting-neutral / no undeclared numeric bonuses in tools & consumables
section('6 · Keine versteckten Mechanik-Felder bei Tools/Consumables');
{
  for (const definition of inv.listCoreItemDefinitions()) {
    if (definition.type === 'tool' || definition.type === 'consumable') {
      check(definition.damage === undefined, `${definition.id}: kein Schaden`);
      check(definition.protection === undefined, `${definition.id}: kein Schutz`);
      check(definition.traits === undefined || definition.traits.length === 0, `${definition.id}: keine Traits`);
    }
    if (definition.id === 'core.misc.headgear') {
      check(definition.protection === undefined, 'Kopfbedeckung vergibt keinen Schutz');
    }
  }
}

// Source stays domain-pure
section('7 · Domain bleibt rein');
{
  const source = readFileSync(join(root, 'src/domains/character/inventory-v2/core-catalog.ts'), 'utf8');
  check(!/^import\s.*(?:supabase|infrastructure|\/components\/|\/app\/)/m.test(source), 'keine Infra-/UI-Imports');
  check(inv.CORE_CATALOG_VERSION >= 2, 'CORE_CATALOG_VERSION ≥ 2 nach #108');
}

if (failures > 0) {
  console.error(`\nInventory core catalog check failed with ${failures} failure(s).`);
  process.exit(1);
}

console.log('Inventory core catalog check passed (35 definitions, #108).');
