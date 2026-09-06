#!/usr/bin/env node
/**
 * sagadrive-item-rules-kernel-check — contract for #135 item rules kernel:
 * load/cost/protection/minStr/traits validators, Traglast, tool rules, Core
 * catalog value freeze, and inventory compatibility re-exports.
 * Location: scripts/sagadrive-item-rules-kernel-check.mjs
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

// --- Static structure ---
section('1 · structure & ownership');

mustInclude(
  'src/domains/rules/sagadrive/index.ts',
  ["export * from './items'"],
  'rules barrel exports items',
);

mustInclude(
  'src/domains/rules/sagadrive/items/index.ts',
  ['./types', './validators', './carry-capacity', './tool-rules'],
  'items slice barrel',
);

mustInclude(
  'src/domains/character/inventory-v2/primitives.ts',
  ["from '../../rules/sagadrive/items'", 'ItemLoad', 'ItemCost', 'MinimumStrength', 'ItemProtection'],
  'inventory re-exports rule types',
);

mustNotInclude(
  'src/domains/character/inventory-v2/primitives.ts',
  ['export type ItemLoad =', 'export type ItemCost =', 'export type MinimumStrength ='],
  'inventory must not redefine rule unions',
);

mustInclude(
  'src/domains/character/inventory-v2/index.ts',
  ['carryCapacity', 'calculateTotalLoad'],
  'inventory re-exports carryCapacity + keeps calculateTotalLoad',
);

mustInclude(
  'src/domains/rules/sagadrive/derived-stats/compute-derived-stats.ts',
  ["from '../items'", 'computeCarryCapacity'],
  'derived-stats uses rules carryCapacity',
);

mustNotInclude(
  'src/domains/rules/sagadrive/derived-stats/compute-derived-stats.ts',
  ['5 + 2 * attributes.strength'],
  'derived-stats must not duplicate Traglast formula',
);

const itemsRulesDir = join(root, 'src/domains/rules/sagadrive/items');
for (const file of walkFiles(itemsRulesDir)) {
  const text = readFileSync(file, 'utf8');
  const rel = file.slice(root.length + 1);
  check(!/\bfrom\s+['"]react(?:\/|$)/.test(text), `${rel}: no React import`);
  check(!/from\s+['"][^'"]*supabase[^'"]*['"]/i.test(text), `${rel}: no Supabase import`);
  check(!/\/components\//.test(text), `${rel}: no UI components`);
  check(!/inventory-v2/.test(text), `${rel}: rules must not import inventory-v2`);
  const codeOnly = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  check(!/\bany\b/.test(codeOnly), `${rel}: no any`);
  check(!/\bas unknown as\b/.test(codeOnly), `${rel}: no as unknown as`);
}

// --- Runtime ---
section('2 · validators & carry capacity');

const outdir = join(root, 'node_modules', '.cache', 'sagadrive-item-rules-kernel-check');
mkdirSync(outdir, { recursive: true });
const esbuild = join(root, 'node_modules', '.bin', 'esbuild');

execFileSync(
  esbuild,
  [
    join(root, 'src/domains/rules/sagadrive/items/index.ts'),
    '--bundle',
    '--format=esm',
    `--outfile=${join(outdir, 'rules-items.mjs')}`,
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

const rules = await import(pathToFileURL(join(outdir, 'rules-items.mjs')).href);
const inv = await import(pathToFileURL(join(outdir, 'inventory.mjs')).href);

equal(rules.carryCapacity(0), 5, 'carryCapacity(0) = 5');
equal(rules.carryCapacity(2), 9, 'carryCapacity(2) = 9');
equal(rules.carryCapacity(4), 13, 'carryCapacity(4) = 13');
equal(inv.carryCapacity(3), 11, 'inventory re-exports same carryCapacity(3)');
check(typeof inv.calculateTotalLoad === 'function', 'inventory still exports calculateTotalLoad');
check(rules.isOverloaded(10, 2) === true, 'overload when load > capacity');
check(rules.isOverloaded(9, 2) === false, 'not overloaded at capacity');
check(rules.exceedsDoubleCarryCapacity(19, 2) === true, 'double capacity exceeded');
check(rules.exceedsDoubleCarryCapacity(18, 2) === false, 'at double capacity still allowed movement-wise');

for (const load of [0, 1, 2, 3]) {
  check(rules.isItemLoad(load), `valid ItemLoad ${load}`);
}
check(!rules.isItemLoad(4), 'ItemLoad 4 invalid');
check(!rules.isItemLoad(-1), 'ItemLoad -1 invalid');
check(!rules.parseItemLoad(1.5).ok, 'ItemLoad 1.5 rejected');

for (const cost of [0, 1, 2, 3, 4, 5]) {
  check(rules.isItemCost(cost), `valid ItemCost ${cost}`);
}
check(!rules.isItemCost(6), 'ItemCost 6 invalid');

for (const min of [1, 2, 4]) {
  check(rules.isMinimumStrength(min), `valid MinimumStrength ${min}`);
}
check(!rules.isMinimumStrength(3), 'MinimumStrength 3 invalid');

for (const protection of [1, 2, 3]) {
  check(rules.isItemProtection(protection), `valid protection ${protection}`);
}
check(!rules.isItemProtection(0), 'protection 0 invalid for personal gear field');
check(!rules.isItemProtection(4), 'protection 4 invalid for personal gear field');

equal(rules.expectedMinimumStrengthForProtection(1), 1, 'Schutz 1 → MS 1');
equal(rules.expectedMinimumStrengthForProtection(2), 2, 'Schutz 2 → MS 2');
equal(rules.expectedMinimumStrengthForProtection(3), 4, 'Schutz 3 → MS 4');
check(!rules.validateProtectionMinimumStrengthPair(3, 2).ok, 'Schutz 3 + MS 2 rejected');
check(rules.validateProtectionMinimumStrengthPair(3, 4).ok, 'Schutz 3 + MS 4 accepted');

check(rules.isSagaDriveWeaponTrait('Finesse'), 'Finesse trait');
check(rules.isSagaDriveWeaponTrait('Reichweite'), 'Reichweite trait');
check(rules.isSagaDriveWeaponTrait('Durchdringung 1'), 'Durchdringung 1');
check(rules.isSagaDriveWeaponTrait('Durchdringung 12'), 'Durchdringung 12');
check(!rules.isSagaDriveWeaponTrait('Durchdringung 0'), 'Durchdringung 0 rejected');
check(!rules.isSagaDriveWeaponTrait('+1 Schaden'), 'invented numeric trait rejected as weapon trait');
equal(rules.parseDurchdringungPoints('Durchdringung 1'), 1, 'parse Durchdringung points');
check(rules.isSagaDriveCoreCatalogTrait('+1 Verteidigung'), 'shield trait allowed for Core');
check(rules.isSagaDriveCoreCatalogTrait('1 Hand'), '1 Hand trait allowed for Core');

section('3 · mechanical validation & narrative');

const narrative = rules.validateItemMechanicalRules({ load: 0, cost: 0 });
check(narrative.ok === true, 'narrative load/cost only is valid');

const armorOk = rules.validateItemMechanicalRules({
  load: 3,
  cost: 4,
  protection: 3,
  minimumStrength: 4,
});
check(armorOk.ok === true, 'heavy armor combo valid');

const armorBad = rules.validateItemMechanicalRules({
  load: 3,
  cost: 4,
  protection: 3,
  minimumStrength: 2,
});
check(armorBad.ok === false, 'mismatched Schutz/MS rejected');

const freeTrait = rules.validateItemMechanicalRules({
  load: 0,
  cost: 1,
  traits: ['Familienerbstück'],
});
check(freeTrait.ok === true, 'personal free-form trait allowed by mechanical validator');

const coreTraitBad = rules.validateCoreCatalogTraits(['Familienerbstück']);
check(coreTraitBad.ok === false, 'Core catalog rejects unknown traits');

section('4 · tool rules §5.7');

equal(rules.resolveToolCheckOutcome('suitable').outcome, 'normal', 'suitable → normal');
equal(rules.resolveToolCheckOutcome('incomplete').outcome, 'disadvantage', 'incomplete → disadvantage');
equal(rules.resolveToolCheckOutcome('improvised').outcome, 'disadvantage', 'improvised → disadvantage');
equal(
  rules.resolveToolCheckOutcome('indispensable-missing').outcome,
  'impossible',
  'indispensable-missing → impossible',
);
equal(
  rules.resolveToolCheckOutcome('high-quality').outcome,
  'explicit-advantage-only',
  'high-quality → explicit-advantage-only',
);
check(
  rules.resolveToolCheckOutcome('high-quality').inventsNumericBonus === false,
  'high-quality does not invent numeric bonus',
);
equal(rules.toolQualityInventedBonus('quality'), 0, 'quality trait invents +0');

section('5 · Core catalog mechanical freeze');

const coreDefs = inv.listCoreItemDefinitions();
equal(coreDefs.length, inv.CORE_CATALOG_SIZE, '36 Core definitions');

const snapshot = Object.fromEntries(
  coreDefs.map((def) => [
    def.id,
    {
      load: def.load,
      cost: def.cost,
      protection: def.protection ?? null,
      minimumStrength: def.requirements?.minimumStrength ?? null,
      traits: [...(def.traits ?? [])],
      damage: def.damage ?? null,
      damageType: def.damageType ?? null,
      twoHanded: def.twoHanded ?? false,
    },
  ]),
);

for (const def of coreDefs) {
  const result = rules.validateItemMechanicalRules({
    load: def.load,
    cost: def.cost,
    protection: def.protection,
    minimumStrength: def.requirements?.minimumStrength,
    traits: def.traits,
  });
  check(result.ok === true, `${def.id} validates mechanical rules`);
  if (def.traits) {
    const traitsResult = rules.validateCoreCatalogTraits(def.traits);
    check(traitsResult.ok === true, `${def.id} Core traits known`);
  }
}

// Freeze a few well-known archetype values (must not be rebalanced by this slice).
equal(snapshot['core.weapon.light-melee'].traits, ['Finesse'], 'light melee Finesse unchanged');
equal(snapshot['core.weapon.armor-piercing'].traits, ['Durchdringung 1'], 'AP trait unchanged');
equal(snapshot['core.armor.heavy'].protection, 3, 'heavy armor Schutz 3');
equal(snapshot['core.armor.heavy'].minimumStrength, 4, 'heavy armor MS 4');
equal(snapshot['core.armor.heavy'].load, 3, 'heavy armor load 3');
equal(snapshot['core.shield.standard'].traits, ['+1 Verteidigung', '1 Hand'], 'shield traits unchanged');

if (failures > 0) {
  console.error(`\nsagadrive-item-rules-kernel-check: ${failures} failure(s)`);
  process.exit(1);
}

console.log('sagadrive-item-rules-kernel-check: PASS');
