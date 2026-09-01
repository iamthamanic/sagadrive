import { readFileSync } from 'node:fs';
import process from 'node:process';

function read(path) { return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'); }
function requireMatch(content, pattern, label) { if (!pattern.test(content)) { console.error(`Attribute bonus regression check failed: missing ${label}.`); process.exit(1); } }
function rejectMatch(content, pattern, label) { if (pattern.test(content)) { console.error(`Attribute bonus regression check failed: ${label}.`); process.exit(1); } }

const rules = read('src/modules/rulesets/attributeProgression.ts');
const editor = read('src/components/CharacterEditor.tsx');

requireMatch(rules, /SAGA_DRIVE_START_ATTRIBUTE_BONUS_BUDGET = 15/, '15-point level-one attribute bonus budget');
requireMatch(rules, /SAGA_DRIVE_START_ATTRIBUTE_BONUS_MIN = 0/, 'zero as legal starting attribute bonus');
requireMatch(rules, /SAGA_DRIVE_START_ATTRIBUTE_BONUS_CAP = 4/, 'level-one +4 cap');
requireMatch(rules, /SAGA_DRIVE_ATTRIBUTE_BONUS_CAP = 5/, 'regular +5 final cap');
requireMatch(rules, /SAGA_DRIVE_ATTRIBUTE_ADVANCE_LEVELS = \[8, 16\]/, 'attribute advances at levels 8 and 16');
requireMatch(rules, /getSagaDriveBaseAttributePointsUsed\(attributes\) === SAGA_DRIVE_START_ATTRIBUTE_BONUS_BUDGET/, 'exact base attribute budget validation');
requireMatch(rules, /requiredLevels\.some\(\(advanceLevel\) => !advances\[advanceLevel\]\)/, 'required permanent advances');
requireMatch(rules, /value <= SAGA_DRIVE_ATTRIBUTE_BONUS_CAP/, 'final attribute cap validation');

requireMatch(editor, /Grundattribute · d20 \+ Attributbonus/, 'direct d20 plus attribute bonus explanation');
requireMatch(editor, /\[0, 1, 2, 3, 4\]\.map/, 'level-one +0 through +4 selector');
requireMatch(editor, /Basis-Bonuspunkte/, 'base bonus budget label');
requireMatch(editor, /Permanente Attributentwicklung/, 'permanent advancement UI');
requireMatch(editor, /Stufe \{advanceLevel\} · \+1/, 'level-specific +1 advancement source');
requireMatch(editor, /Reguläres Maximum: \+5/, 'visible +5 regular cap');
requireMatch(editor, /Basisverteilung wird beim Levelaufstieg nicht neu verteilt/, 'no free level-up respec guidance');
requireMatch(editor, /Reiner Check: d20 \+\{attributes\[attribute\.key\]\}/, 'per-attribute pure check preview');
requireMatch(editor, /setBaseAttributes\(INITIAL_ATTRIBUTES\)/, 'recommended balanced default reset');
requireMatch(editor, /SAGA_DRIVE_START_ATTRIBUTE_ARRAY\.map/, 'recommended balanced distribution remains visible');
rejectMatch(editor, /getSagaDriveAttributePointBudget/, 'legacy level-total attribute budget helper still drives editor');
rejectMatch(editor, /isValidStartAttributeDistribution/, 'legacy exact standard-array validation remains');

console.log('Attribute bonus regression check passed.');
