#!/usr/bin/env node
/**
 * character-starting-templates-v1-check — domain catalog for #463.
 * Location: scripts/character-starting-templates-v1-check.mjs
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

const KEYS = [
  'berserker',
  'vanguard',
  'mage',
  'technomancer',
  'medicus',
  'mystic',
  'assassin',
  'mechanom',
  'mentalist',
  'herald',
];

const LABELS = [
  'Berserker',
  'Vanguard',
  'Zauberer',
  'Technomant',
  'Medicus',
  'Mystiker',
  'Assassine',
  'Mechanom',
  'Mentalist',
  'Herold',
];

function section(name) {
  group = name;
}

function check(condition, message) {
  if (!condition) {
    failures += 1;
    console.error(`FAIL [${group}]: ${message}`);
  }
}

function read(rel) {
  return readFileSync(join(root, rel), 'utf8');
}

section('1 · files');
[
  'src/domains/rules/sagadrive/starting-templates/index.ts',
  'src/domains/rules/sagadrive/starting-templates/catalog.ts',
  'src/domains/rules/sagadrive/starting-templates/types.ts',
  'src/domains/rules/sagadrive/starting-templates/validate.ts',
  '.qa/design/character-starting-templates-v1.md',
  '.qa/acceptance/character-starting-templates-v1.md',
].forEach((rel) => check(existsSync(join(root, rel)), `missing ${rel}`));

section('2 · barrel export');
{
  const barrel = read('src/domains/rules/sagadrive/index.ts');
  check(/starting-templates/.test(barrel), 'sagadrive index exports starting-templates');
}

section('3 · no forbidden fields in catalog');
{
  const catalog = read('src/domains/rules/sagadrive/starting-templates/catalog.ts');
  const types = read('src/domains/rules/sagadrive/starting-templates/types.ts');
  // Structural fields only — comments may mention excluded domains.
  for (const needle of ['race:', 'appearance:', 'inventory:', 'equipment:', 'avatar:', 'portrait:', 'lookId:']) {
    check(!types.includes(needle) && !catalog.includes(needle), `must not declare field ${needle}`);
  }
  check(!/speciesTraits:|genderReading:/.test(catalog + types), 'no species/gender fields');
}

section('4 · catalog validates against rules kernel');
{
  const esbuild = require('esbuild');
  const outfile = join(root, 'node_modules/.cache/character-starting-templates-v1-check/catalog.mjs');
  esbuild.buildSync({
    entryPoints: [join(root, 'src/domains/rules/sagadrive/starting-templates/index.ts')],
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'node',
    logLevel: 'silent',
  });
  const mod = await import(pathToFileURL(outfile).href);
  const result = mod.validateSagaDriveStartingTemplateCatalog();
  check(result.ok === true, result.ok ? 'catalog valid' : `${result.code}: ${result.message}`);
  const list = mod.listSagaDriveStartingTemplates();
  check(list.length === 10, 'exactly 10 templates');
  for (const key of KEYS) {
    check(list.some((t) => t.key === key), `has ${key}`);
  }
  for (const label of LABELS) {
    check(list.some((t) => t.labelDe === label), `label ${label}`);
  }
  check(mod.getSagaDriveStartingTemplate('mage')?.archetype === 'thinker', 'mage is thinker');
  check(mod.getSagaDriveStartingTemplate('unknown') === null, 'unknown key → null');
}

section('5 · test-gate wiring');
{
  const gate = read('scripts/test-gate.mjs');
  check(
    /character-starting-templates-v1-check\.mjs/.test(gate),
    'test-gate invokes character-starting-templates-v1-check',
  );
}

if (failures > 0) {
  console.error(`\ncharacter-starting-templates-v1-check: ${failures} failure(s)`);
  process.exit(1);
}

console.log('character-starting-templates-v1-check: OK (#463)');
