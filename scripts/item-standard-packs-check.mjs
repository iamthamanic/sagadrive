#!/usr/bin/env node
/**
 * item-standard-packs-check — contract for #137 builtin Fantasy/Sci-Fi/Contemporary
 * base packs (40/40/40), context packs as ID lists, unique ids, origin, no marketplace.
 * Location: scripts/item-standard-packs-check.mjs
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

const FORBIDDEN_BRANDS = [
  'star trek',
  'star wars',
  'friends',
  'the office',
  'ted lasso',
  'modern family',
  'shameless',
  'phaser',
  'lightsaber',
  'tricorder',
  'enterprise',
];

const EXPECTED_CONTEXT_PACK_IDS = [
  'builtin:context-adventure',
  'builtin:context-combat',
  'builtin:context-survival',
  'builtin:context-medical',
  'builtin:context-office',
  'builtin:context-domestic',
  'builtin:context-social',
  'builtin:context-sports',
  'builtin:context-science',
  'builtin:context-engineering',
  'builtin:context-travel',
  'builtin:context-entertainment',
  'builtin:context-urban',
  'builtin:context-space',
];

const EXPECTED_FANTASY_NAMES = [
  'Langschwert',
  'Kurzschwert',
  'Dolch',
  'Streitaxt',
  'Kriegshammer',
  'Speer',
  'Kampfstab',
  'Kurzbogen',
  'Langbogen',
  'Armbrust',
  'Pfeile',
  'Bolzen',
  'leichter Schild',
  'Lederharnisch',
  'Kettenhemd',
  'Plattenrüstung',
  'Heiltrank',
  'Gegengift',
  'Reiseproviant',
  'Wasserschlauch',
  'Fackel',
  'Laterne',
  'Seil',
  'Enterhaken',
  'Rucksack',
  'Gürteltasche',
  'Dietrichset',
  'Heilerset',
  'Handwerkszeug',
  'Karte',
  'Kompass',
  'Schreibzeug',
  'versiegelter Brief',
  'Buch',
  'Schlüsselbund',
  'Münzbeutel',
  'Edelstein',
  'Decke',
  'Zunderzeug',
  'Musikinstrument',
];

const EXPECTED_SCIFI_NAMES = [
  'kompakte Energiewaffe',
  'Standard-Energiewaffe',
  'schweres Energiegewehr',
  'Betäubungsgerät',
  'Energieklinge',
  'leichter Schutzanzug',
  'taktischer Schutzanzug',
  'schwerer Schutzanzug',
  'persönlicher Schildemitter',
  'Energiezelle',
  'Munitionspack',
  'Medkit',
  'Hypospray',
  'Antitoxin',
  'Notration',
  'Wasseraufbereiter',
  'Kommunikator',
  'Datapad',
  'Handscanner',
  'Multiscanner',
  'Navigationsmodul',
  'Engineering-Kit',
  'Präzisionswerkzeug',
  'Reparaturmaterial',
  'Forschungskit',
  'Probenbehälter',
  'Taschenlampe',
  'Multitool',
  'Zugangskarte',
  'Identitätsmodul',
  'Datenchip',
  'verschlüsselte Datei',
  'Credits',
  'Universalrucksack',
  'Ausrüstungstasche',
  'Raumanzug',
  'Atemgerät',
  'Signalgeber',
  'Kabel/Leine',
  'tragbarer Energiepack',
];

const EXPECTED_CONTEMPORARY_NAMES = [
  'Smartphone',
  'Laptop',
  'Tablet',
  'Kopfhörer',
  'Ladegerät',
  'Powerbank',
  'Geldbörse',
  'Bargeld',
  'Bankkarte',
  'Personalausweis',
  'Führerschein',
  'Schlüsselbund',
  'Schlüsselkarte',
  'Rucksack',
  'Handtasche',
  'Einkaufstasche',
  'Notizbuch',
  'Kugelschreiber',
  'Dokumentenmappe',
  'Vertrag',
  'Taschenlampe',
  'Feuerzeug',
  'Regenschirm',
  'Wasserflasche',
  'Kaffeebecher',
  'Lebensmittel',
  'Küchenmesser',
  'Erste-Hilfe-Set',
  'Medikamente',
  'Werkzeugkoffer',
  'Klebeband',
  'Arbeitshandschuhe',
  'Arbeitskleidung',
  'Fahrradhelm',
  'Fahrkarte',
  'Autoschlüssel',
  'Fußball',
  'Trillerpfeife',
  'Sporttasche',
  'Gitarre',
];

// --- Static structure ---
section('1 · structure & purity');

{
  const packsIndex = read('src/domains/items/packs/index.ts');
  check(packsIndex.includes('BASE_PACK_SIZE'), 'BASE_PACK_SIZE exported');
  check(packsIndex.includes('builtin:fantasy-basic'), 'fantasy pack id');
  check(packsIndex.includes('builtin:scifi-basic'), 'scifi pack id');
  check(packsIndex.includes('builtin:contemporary-basic'), 'contemporary pack id');

  const barrel = read('src/domains/items/index.ts');
  check(barrel.includes('ItemPack'), 'barrel exports ItemPack');
  check(barrel.includes('listBuiltinStandardDefinitions'), 'barrel lists definitions');
  check(barrel.includes('STRESS_TEST_PACK_COMBINATIONS'), 'barrel stress fixtures');

  const coreCatalog = read('src/domains/character/inventory-v2/core-catalog.ts');
  check(coreCatalog.includes('CORE_CATALOG_SIZE = 36'), 'Core catalog size still 36');
  check(!coreCatalog.includes('builtin-standard'), 'Core catalog not mutated with builtin-standard');

  for (const file of walkFiles(join(root, 'src/domains/items'))) {
    const text = readFileSync(file, 'utf8');
    const rel = file.slice(root.length + 1);
    check(!/\bfrom\s+['"]react(?:\/|$)/.test(text), `${rel}: no React`);
    check(!/from\s+['"][^'"]*supabase[^'"]*['"]/i.test(text), `${rel}: no Supabase`);
    const codeOnly = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    check(!/\bany\b/.test(codeOnly), `${rel}: no any`);
    check(!/\bas\s+unknown\b/.test(codeOnly), `${rel}: no as unknown`);
    check(!/\bmarketplace\b/i.test(codeOnly), `${rel}: no marketplace source`);
  }

  const packsText = walkFiles(join(root, 'src/domains/items/packs'))
    .map((f) => readFileSync(f, 'utf8'))
    .join('\n')
    .toLowerCase();
  for (const brand of FORBIDDEN_BRANDS) {
    check(!packsText.includes(brand), `no forbidden brand term: ${brand}`);
  }
}

// --- Runtime via esbuild ---
section('2 · pack sizes 40/40/40');

const outdir = join(root, 'node_modules', '.cache', 'item-standard-packs-check');
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

equal(items.BASE_PACK_SIZE, 40, 'BASE_PACK_SIZE is 40');
equal(items.FANTASY_BASIC_DEFINITIONS.length, 40, 'Fantasy definitions = 40');
equal(items.SCIFI_BASIC_DEFINITIONS.length, 40, 'Sci-Fi definitions = 40');
equal(items.CONTEMPORARY_BASIC_DEFINITIONS.length, 40, 'Contemporary definitions = 40');
equal(items.FANTASY_BASIC_PACK.definitionIds.length, 40, 'Fantasy pack ids = 40');
equal(items.SCIFI_BASIC_PACK.definitionIds.length, 40, 'Sci-Fi pack ids = 40');
equal(items.CONTEMPORARY_BASIC_PACK.definitionIds.length, 40, 'Contemporary pack ids = 40');
equal(items.listBuiltinStandardDefinitions().length, 120, '120 builtin-standard defs total');

equal(items.FANTASY_BASIC_PACK.id, 'builtin:fantasy-basic', 'fantasy pack id stable');
equal(items.SCIFI_BASIC_PACK.id, 'builtin:scifi-basic', 'scifi pack id stable');
equal(items.CONTEMPORARY_BASIC_PACK.id, 'builtin:contemporary-basic', 'contemporary pack id stable');

section('3 · unique ids, origin, scope, metadata');

{
  const all = items.listBuiltinStandardDefinitions();
  const ids = all.map((d) => d.id);
  equal(new Set(ids).size, ids.length, 'all definition ids unique');

  for (const def of all) {
    check(def.scope === 'core', `${def.id}: scope=core`);
    check(def.origin === 'builtin-standard', `${def.id}: origin=builtin-standard`);
    check(def.id.startsWith('builtin.'), `${def.id}: builtin. prefix`);
    const expectedIcon = def.id.replace(/\./g, '-');
    check(def.iconKey === expectedIcon, `${def.id}: iconKey=${expectedIcon}`);
    check(!def.assetKey, `${def.id}: no Meshy assetKey on builtin-standard`);
    const meta = items.validateItemDefinitionMetadata(def);
    check(meta.ok, `${def.id}: metadata valid${meta.ok ? '' : `: ${meta.errors?.join('; ')}`}`);
    if (def.basedOnDefinitionId) {
      check(
        Boolean(inv.getCoreItemDefinition(def.basedOnDefinitionId)),
        `${def.id}: basedOn ${def.basedOnDefinitionId} resolves in Core`,
      );
      const core = inv.getCoreItemDefinition(def.basedOnDefinitionId);
      if (core) {
        equal(def.type, core.type, `${def.id}: type matches Core snapshot`);
        equal(def.load, core.load, `${def.id}: load matches Core snapshot`);
        equal(def.cost, core.cost, `${def.id}: cost matches Core snapshot`);
        equal(def.stackLimit, core.stackLimit, `${def.id}: stackLimit matches Core`);
      }
    }
  }

  // Core archetypes untouched
  equal(inv.listCoreItemDefinitions().length, 36, 'Core still 36');
  for (const core of inv.listCoreItemDefinitions()) {
    check(core.origin === 'core-archetype', `${core.id}: still core-archetype`);
    check(!ids.includes(core.id), `builtin ids do not collide with ${core.id}`);
    check(typeof core.iconKey === 'string' && core.iconKey.length > 0, `${core.id}: has iconKey`);
  }
}

section('4 · display names match issue list');

{
  equal(
    items.FANTASY_BASIC_DEFINITIONS.map((d) => d.name),
    EXPECTED_FANTASY_NAMES,
    'Fantasy display names',
  );
  equal(
    items.SCIFI_BASIC_DEFINITIONS.map((d) => d.name),
    EXPECTED_SCIFI_NAMES,
    'Sci-Fi display names',
  );
  equal(
    items.CONTEMPORARY_BASIC_DEFINITIONS.map((d) => d.name),
    EXPECTED_CONTEMPORARY_NAMES,
    'Contemporary display names',
  );
}

section('5 · context packs resolve; no definition duplication');

{
  const contextPacks = items.listContextItemPacks();
  equal(
    contextPacks.map((p) => p.id),
    EXPECTED_CONTEXT_PACK_IDS,
    'context pack ids stable',
  );

  const known = new Set(items.listBuiltinStandardDefinitions().map((d) => d.id));
  for (const pack of contextPacks) {
    const seen = new Set();
    for (const id of pack.definitionIds) {
      check(known.has(id), `${pack.id}: resolves ${id}`);
      check(!seen.has(id), `${pack.id}: no duplicate membership ${id}`);
      seen.add(id);
    }
  }

  // Same smartphone in multiple packs, one definition
  const smartphonePacks = contextPacks.filter((p) =>
    p.definitionIds.includes('builtin.contemporary.smartphone'),
  );
  check(smartphonePacks.length >= 2, 'smartphone appears in multiple context packs');
  equal(
    items.getBuiltinStandardDefinition('builtin.contemporary.smartphone')?.id,
    'builtin.contemporary.smartphone',
    'single smartphone definition',
  );
}

section('6 · stress-test fixtures');

{
  const fixtures = items.STRESS_TEST_PACK_COMBINATIONS;
  check(fixtures.length >= 6, 'at least 6 stress combinations documented');
  const expectedIds = [
    'fantasy-adventure',
    'space-scifi',
    'contemporary-office',
    'contemporary-social-domestic',
    'contemporary-sports',
    'contemporary-urban-survival',
  ];
  for (const id of expectedIds) {
    const row = fixtures.find((f) => f.id === id);
    check(Boolean(row), `fixture ${id} present`);
    if (!row) continue;
    for (const packId of row.packIds) {
      check(Boolean(items.getItemPack(packId)), `fixture ${id}: pack ${packId} exists`);
    }
  }
}

section('7 · narrative-only items remain mechanic-free');

{
  const narrativeIds = [
    'builtin.fantasy.sealed-letter',
    'builtin.contemporary.contract',
    'builtin.contemporary.coffee-cup',
    'builtin.contemporary.guitar',
  ];
  for (const id of narrativeIds) {
    const def = items.getBuiltinStandardDefinition(id);
    check(Boolean(def), `${id} exists`);
    check(def?.basedOnDefinitionId === undefined, `${id}: no Core basedOn`);
    check(def?.damage === undefined, `${id}: no damage`);
    check(def?.protection === undefined, `${id}: no protection`);
  }
}

section('8 · test-gate wiring');

{
  const gate = read('scripts/test-gate.mjs');
  check(
    /item-standard-packs-check\.mjs/.test(gate),
    'test-gate invokes item-standard-packs-check',
  );
}

if (failures > 0) {
  console.error(`\nitem-standard-packs-check: ${failures} failure(s)`);
  process.exit(1);
}

console.log('item-standard-packs-check: OK (#137) — 40/40/40 packs, unique ids, origin=builtin-standard');
