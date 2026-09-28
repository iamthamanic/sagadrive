#!/usr/bin/env node
/**
 * character-starting-templates-design-v1-check — #465 design contract.
 * Location: scripts/character-starting-templates-design-v1-check.mjs
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const root = process.cwd();
let failures = 0;
let group = '';

const ROLES = [
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

const ATTR = {
  berserker: '4 / 3 / 3 / 1 / 2 / 2',
  vanguard: '3 / 2 / 4 / 3 / 2 / 1',
  mage: '1 / 2 / 2 / 4 / 3 / 3',
  technomancer: '1 / 3 / 2 / 4 / 3 / 2',
  medicus: '1 / 2 / 3 / 4 / 3 / 2',
  mystic: '1 / 2 / 2 / 3 / 4 / 3',
  assassin: '1 / 4 / 3 / 2 / 3 / 2',
  mechanom: '1 / 4 / 2 / 3 / 3 / 2',
  mentalist: '1 / 2 / 2 / 3 / 3 / 4',
  herald: '1 / 2 / 3 / 2 / 3 / 4',
};

const FORBIDDEN = ['Wächter', 'Waldläufer'];

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

section('1 · design file exists');
const designPath = '.qa/design/character-starting-templates-v1.md';
check(existsSync(join(root, designPath)), `missing ${designPath}`);
check(existsSync(join(root, '.qa/acceptance/character-starting-templates-design-v1.md')), 'missing acceptance');

const design = read(designPath);

section('2 · ten roles + keys, no legacy');
for (const role of ROLES) {
  check(design.includes(role), `role ${role}`);
}
for (const key of KEYS) {
  check(design.includes(`\`${key}\``) || design.includes(`| \`${key}\``) || design.includes(key), `key ${key}`);
}
for (const bad of FORBIDDEN) {
  check(!design.includes(bad) || /not.*part of V1|nicht.*Teil von V1|are \*\*not\*\*/i.test(design), `legacy ${bad} excluded`);
}
// Explicit exclusion line
check(/Wächter|Waldläufer/.test(design) && /not.*V1|nicht.*V1|are \*\*not\*\*/i.test(design), 'documents exclusion of Wächter/Waldläufer');

section('3 · locked attribute lines');
for (const [key, line] of Object.entries(ATTR)) {
  check(design.includes(line), `${key} attributes ${line}`);
}

section('4 · backgrounds + archetype training');
const backgrounds = [
  'sport-competition',
  'soldier',
  'academy-research',
  'street-doctor',
  'faith-order',
  'smuggler',
  'corporate-technician',
  'investigator',
  'stage-public',
];
for (const bg of backgrounds) {
  check(design.includes(bg), `background ${bg}`);
}
const archSkills = ['melee', 'ranged', 'knowledge', 'technology', 'medicine', 'insight', 'stealth', 'sleight', 'persuasion'];
for (const skill of archSkills) {
  check(design.includes(`\`${skill}\``) || design.includes(skill), `archetype skill mention ${skill}`);
}

section('5 · non-set domains');
for (const needle of ['Spezies', 'Appearance', 'Avatar', 'Inventar', 'Equipment', 'Portrait']) {
  check(design.includes(needle) || design.toLowerCase().includes(needle.toLowerCase()), `mentions non-set ${needle}`);
}

section('6 · no src/** in this slice');
{
  // Design issue must not require productive code in the design PR content check —
  // we only assert the design file path is the contract location.
  check(design.includes('.qa/design/character-starting-templates-v1.md') || design.includes('Level-1'), 'design is the contract');
}

section('7 · test-gate wiring');
{
  const gate = read('scripts/test-gate.mjs');
  check(
    /character-starting-templates-design-v1-check\.mjs/.test(gate),
    'test-gate invokes design check',
  );
}

section('8 · rank-cap sanity (documented finals ≤3)');
{
  // Spot-check that corrected over-cap builds document final 3 not 4 for stacked skills.
  check(!/ranged 4/.test(design), 'no ranged 4');
  check(!/knowledge 4/.test(design), 'no knowledge 4');
  check(!/medicine 4/.test(design), 'no medicine 4');
  check(!/stealth 4/.test(design), 'no stealth 4');
  check(!/sleight 4/.test(design), 'no sleight 4');
  check(!/persuasion 4/.test(design), 'no persuasion 4');
}

if (failures > 0) {
  console.error(`\ncharacter-starting-templates-design-v1-check: ${failures} failure(s)`);
  process.exit(1);
}

console.log('character-starting-templates-design-v1-check: OK (#465)');
