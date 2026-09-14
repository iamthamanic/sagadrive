/**
 * Contract + behavioral checks for NPC/creature power framework (#195).
 * Location: scripts/npc-creature-power-framework-check.mjs
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
let failures = 0;

function check(condition, message) {
  if (!condition) {
    failures += 1;
    console.error(`FAIL: ${message}`);
  } else {
    console.log(`ok: ${message}`);
  }
}

function equal(actual, expected, message) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  check(a === b, `${message} — expected ${b}, got ${a}`);
}

function mustInclude(file, needles, label) {
  const text = readFileSync(join(root, file), 'utf8');
  for (const needle of needles) {
    check(text.includes(needle), `${label}: contains ${JSON.stringify(needle)}`);
  }
}

function mustNotInclude(file, needles, label) {
  const text = readFileSync(join(root, file), 'utf8');
  for (const needle of needles) {
    check(!text.includes(needle), `${label}: forbids ${JSON.stringify(needle)}`);
  }
}

mustInclude(
  'src/domains/rules/sagadrive/index.ts',
  ["export * from './npc-creature-power'"],
  'rules barrel',
);

mustInclude(
  'docs/sagadrive core rules.md',
  [
    '### 15.1 Stufe und Machtgrad',
    '### 15.3 Kampfprofile',
    '### 15.4 Kampfrollen',
    'Elite-Impuls',
    'Boss-Impuls',
    'Wendepunkt',
    'Kampfunfähig',
  ],
  'core §15',
);

mustNotInclude(
  'docs/sagadrive core rules.md',
  ['#### Scherge', 'zwei Initiativeslots pro Runde', 'jeder erfolgreiche Schadenseffekt von mindestens 1 besiegt den Schergen'],
  'core §15 removed legacy',
);

const cacheDir = join(root, 'node_modules', '.cache', 'npc-creature-power-framework-check');
mkdirSync(cacheDir, { recursive: true });
const outfile = join(cacheDir, 'npc-creature-power.mjs');
const esbuild = join(root, 'node_modules', '.bin', 'esbuild');
execFileSync(
  esbuild,
  [
    join(root, 'src/domains/rules/sagadrive/npc-creature-power/index.ts'),
    '--bundle',
    '--format=esm',
    `--outfile=${outfile}`,
  ],
  { cwd: root, stdio: 'inherit' },
);

const api = await import(pathToFileURL(outfile).href);

check(api.SAGADRIVE_NPC_LEVEL_BENCHMARKS.length === 20, '20 level benchmarks');

for (let level = 1; level <= 20; level += 1) {
  const row = api.levelBenchmark(level);
  equal(row.primaryModifier, 6 + Math.floor((level - 1) / 2), `L${level} primary mod`);
  equal(row.defense, 14 + Math.floor((level - 1) / 2), `L${level} defense`);
  equal(row.health, 18 + 2 * Math.floor((level - 1) / 4), `L${level} HP`);
  equal(row.machtgrad, api.machtgradForLevel(level), `L${level} machtgrad`);
}

equal(api.machtgradLabelForLevel(7), 'Mittel', 'machtgrad label 7');
equal(api.machtgradLabelForLevel(20), 'Legendär', 'machtgrad label 20');

const lv7MobileElite = api.computeCompactStatblockBenchmarks({
  level: 7,
  combatProfile: 'mobile',
  combatRole: 'elite',
});
equal(lv7MobileElite.health, 24, 'Lv7 Mobile Elite HP 20×0.8×1.5');
equal(lv7MobileElite.defense, 18, 'Lv7 Mobile Elite DEF 17+1');
equal(lv7MobileElite.movementMeters, 12, 'Lv7 Mobile Elite move 9+3');
equal(lv7MobileElite.primaryModifier, 9, 'Lv7 Mobile Elite primary unchanged by role');
equal(lv7MobileElite.impulsesPerRound, 1, 'Elite impulse/round');
equal(lv7MobileElite.impulsesAllowed, true, 'Elite impulses allowed');

const lv10Offensive = api.computeCompactStatblockBenchmarks({
  level: 10,
  combatProfile: 'offensive',
  combatRole: 'standard',
});
equal(lv10Offensive.primaryModifier, 11, 'Lv10 Offensive primary +1');
equal(lv10Offensive.defense, 17, 'Lv10 Offensive DEF -1');
equal(lv10Offensive.health, 22, 'Lv10 Offensive HP');
equal(lv10Offensive.primaryDamage.label, 'd10+2', 'Lv10 Offensive damage step +1');

const lv18ToughBoss = api.computeCompactStatblockBenchmarks({
  level: 18,
  combatProfile: 'tough',
  combatRole: 'boss',
});
equal(lv18ToughBoss.health, 78, 'Lv18 Tough Boss HP 26×1.2×2.5');
equal(lv18ToughBoss.movementMeters, 6, 'Lv18 Tough Boss move 9-3');
equal(lv18ToughBoss.primaryDamage.label, 'd10+2', 'Lv18 Tough damage -1 step');
equal(lv18ToughBoss.wendepunktPerCombat, 1, 'Boss wendepunkt');
equal(lv18ToughBoss.impulsesPerRound, 2, 'Boss impulses');
equal(lv18ToughBoss.minImpulseOptions, 2, 'Boss min impulse options');

const noncombat = api.computeCompactStatblockBenchmarks({
  level: 12,
  combatProfile: 'noncombat',
  combatRole: 'boss',
});
equal(noncombat.combatRole, 'standard', 'noncombat forces standard role');
equal(noncombat.primaryDamage.label, 'd4+1', 'noncombat damage defaults to d4+1');
equal(noncombat.defense, 18, 'noncombat DEF -1 from 19');
equal(noncombat.combatSignatureRequired, false, 'noncombat needs no combat signature');
check(noncombat.primaryModifier === 11, 'noncombat keeps specialty primary at level (no auto combat inflation beyond profile)');

const incapacitated = api.computeCompactStatblockBenchmarks({
  level: 8,
  combatProfile: 'balanced',
  combatRole: 'elite',
  incapacitated: true,
});
equal(incapacitated.impulsesAllowed, false, 'Kampfunfähig blocks impulses');

equal(api.combineHealth(20, 0.8, 1.5), 24, 'combineHealth rounds up once');
equal(api.impulseDamageStepBelowPrimary(api.SAGADRIVE_NPC_DAMAGE_STEPS[3]).label, 'd8+1', 'impulse below primary');

let threw = false;
try {
  api.computeCompactStatblockBenchmarks({ level: 0, combatProfile: 'balanced', combatRole: 'standard' });
} catch {
  threw = true;
}
check(threw, 'rejects invalid level');

const reportPath = join(root, '.qa', 'runs', 'npc-creature-power-framework-report.md');
mkdirSync(join(root, '.qa', 'runs'), { recursive: true });
writeFileSync(
  reportPath,
  [
    '# NPC Creature Power Framework Check (#195)',
    '',
    `- Failures: ${failures}`,
    '- Coverage: 20 level benchmarks, profile examples, role HP/impulses, noncombat, Kampfunfähig',
    '',
  ].join('\n'),
  'utf8',
);

if (failures > 0) {
  console.error(`npc-creature-power-framework-check: ${failures} failure(s)`);
  process.exit(1);
}
console.log('npc-creature-power-framework-check: all checks passed');
