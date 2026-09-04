import { readFileSync } from 'node:fs';
import process from 'node:process';

function read(path) { return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'); }
function requireMatch(content, pattern, label) { if (!pattern.test(content)) { console.error(`Attribute bonus regression check failed: missing ${label}.`); process.exit(1); } }
function rejectMatch(content, pattern, label) { if (pattern.test(content)) { console.error(`Attribute bonus regression check failed: ${label}.`); process.exit(1); } }

const rules = read('src/domains/rules/sagadrive/attribute-progression/index.ts');
const editor = read('src/app/character/edit/CharacterEditor.tsx');

requireMatch(rules, /SAGA_DRIVE_START_ATTRIBUTE_BONUS_BUDGET = 15/, '15-point level-one attribute bonus budget');
requireMatch(rules, /SAGA_DRIVE_START_ATTRIBUTE_BONUS_MIN = 0/, 'zero as legal starting attribute bonus');
requireMatch(rules, /SAGA_DRIVE_START_ATTRIBUTE_BONUS_CAP = 4/, 'level-one +4 cap');
requireMatch(rules, /SAGA_DRIVE_ATTRIBUTE_BONUS_CAP = 5/, 'regular +5 final cap');
requireMatch(rules, /SAGA_DRIVE_ATTRIBUTE_ADVANCE_LEVELS = \[8, 16\]/, 'attribute advances at levels 8 and 16');
requireMatch(rules, /getSagaDriveBaseAttributePointsUsed\(attributes\) === SAGA_DRIVE_START_ATTRIBUTE_BONUS_BUDGET/, 'exact base attribute budget validation');
requireMatch(rules, /requiredLevels\.some\(\(advanceLevel\) => !advances\[advanceLevel\]\)/, 'required permanent advances');
requireMatch(rules, /value <= SAGA_DRIVE_ATTRIBUTE_BONUS_CAP/, 'final attribute cap validation');

requireMatch(rules, /getSagaDriveAttributeBonusLevelGuide/, 'grouped attribute bonus cap guide');
requireMatch(rules, /Basisverteilung/, 'base distribution note in grouped level guide');
requireMatch(rules, /1 zusätzlicher Bonuspunkt darf auf ein Grundattribut verteilt werden/, 'advancement note in grouped level guide');

requireMatch(editor, /Attributsbonus \(=D20 \+ Bonus\)/, 'direct d20 plus bonus formula explanation');
requireMatch(editor, /RuleHelp label="Attributbonus"/, 'attribute bonus info tooltip trigger');
requireMatch(editor, /getSagaDriveAttributeBonusLevelGuide\(\)/, 'grouped bonus cap list in tooltip');
requireMatch(editor, /\[0, 1, 2, 3, 4\]\.map/, 'level-one +0 through +4 selector');
requireMatch(editor, /\{attributePointsUsed\} \/ \{SAGA_DRIVE_START_ATTRIBUTE_BONUS_BUDGET\} Bonuspunkte/, 'base bonus budget label');
requireMatch(editor, /Permanente Attributentwicklung/, 'permanent advancement UI');
requireMatch(editor, /Bonus-Obergrenzen nach Level/, 'grouped bonus cap heading in tooltip');
requireMatch(editor, /Level \{levelLabel\}: Bonus max\. \+\{maxBonus\} \(\{description\}\)/, 'grouped bonus cap list entries');
requireMatch(editor, /Permanente Entwicklung \(Level \{advanceLevel\}\)/, 'level-specific permanent advancement source label');
rejectMatch(editor, /permanente Entwicklung freigeschaltet/, 'removed per-level advancement unlock repetition in tooltip');
rejectMatch(editor, /\+1 permanente Entwicklung/, 'confusing +1 in level guide tooltip');
rejectMatch(editor, /Level \{advanceLevel\} · \+1/, 'confusing +1 on advancement select label');
requireMatch(editor, /Reguläres Maximum: \+5/, 'visible +5 regular cap');
requireMatch(editor, /Verteile \{SAGA_DRIVE_START_ATTRIBUTE_BONUS_BUDGET\} Bonuspunkte auf Level 1\. Diese werden immer als Bonus dem D20 Wurf dazugerechnet\. Für weitere Infos klick auf das Fragezeichen\./, 'visible attribute bonus intro copy');
requireMatch(editor, /Für jedes Grundattribut werden Bonuspunkte verteilt\./, 'attribute bonus distribution intro in tooltip');
rejectMatch(editor, /Für jedes Attribut werden Bonuspunkte verteilt \+0 bis \+4 pro Attribut/, 'removed +0 bis +4 from tooltip opening');
requireMatch(editor, /Auf Level \{SAGA_DRIVE_ATTRIBUTE_ADVANCE_LEVELS\[1\]\} erhältst du einen weiteren Bonuspunkt/, 'level 16 advancement note in tooltip');
requireMatch(editor, /\+0 bedeutet keinen positiven Bonus, nicht Handlungsunfähigkeit\. Das bedeutet bei einem Check für dieses Attribut wird nur ein D20 gewürfelt/, 'zero bonus clarification in tooltip');
requireMatch(editor, /Boni welche durch andere Mechaniken ausgelöst werden, sind davon nicht betroffen/, 'other bonus mechanics note in tooltip');
requireMatch(editor, /Wird ein Charakter auf einem höheren Level mit Bonuspunktveränderung erstellt gelten die entsprechenden Bonuspunkte-Regeln/, 'higher-level character creation note in tooltip');
requireMatch(editor, /Beispiel Charakter wird auf Level \{SAGA_DRIVE_ATTRIBUTE_ADVANCE_LEVELS\[0\]\} erstellt/, 'level 8 creation example in tooltip');
requireMatch(editor, /Grundattribute können jeweils einen Bonus \+\{SAGA_DRIVE_ATTRIBUTE_BONUS_CAP\} bekommen/, 'level 8 creation cap in tooltip');
requireMatch(editor, /Es bleiben \{SAGA_DRIVE_START_ATTRIBUTE_BONUS_BUDGET\} Basis-Bonuspunkte/, 'level 8 creation keeps 15 base bonus points');
requireMatch(editor, /plus \{getSagaDriveAttributeAdvanceBudget\(SAGA_DRIVE_ATTRIBUTE_ADVANCE_LEVELS\[0\]\)\} separater Entwicklungsslot/, 'level 8 creation uses separate advance slot');
rejectMatch(editor, /Es stehen \{SAGA_DRIVE_START_ATTRIBUTE_BONUS_BUDGET \+ getSagaDriveAttributeAdvanceBudget\(SAGA_DRIVE_ATTRIBUTE_ADVANCE_LEVELS\[0\]\)\} Bonuspunkte statt/, 'removed free-pool 16-point redistribution copy');
rejectMatch(editor, /Du erstellst einen Charakter direkt/, 'removed old level 8 creation example phrasing');
requireMatch(editor, /baseAttributes,/, 'baseAttributes persisted in SagaDrive profile save payload');
requireMatch(editor, /attributeAdvances,/, 'attributeAdvances persisted in SagaDrive profile save payload');
requireMatch(editor, /resolveSagaDriveAttributeBuildState/, 'editor rehydrates base vs advances after save');
requireMatch(rules, /resolveSagaDriveAttributeBuildState/, 'attribute build resolve helper for load path');
requireMatch(rules, /normalizeSagaDriveAttributeAdvances/, 'attribute advances normalization helper');
rejectMatch(editor, /Bonus \+\{SAGA_DRIVE_ATTRIBUTE_BONUS_CAP\} statt \+\{SAGA_DRIVE_START_ATTRIBUTE_BONUS_CAP\}/, 'removed +5 statt +4 comparison in higher-level example');
rejectMatch(editor, /mt-1 text-sm text-muted-foreground">Verteile auf Level 1 genau/, 'detailed intro must not duplicate in visible paragraph');
rejectMatch(editor, /Details zum Info-Symbol/, 'removed old visible intro teaser');
requireMatch(editor, /AttributeD20Icon/, 'd20 dice visual on attribute cards');
requireMatch(editor, /\+\{baseAttributes\[attribute\.key\]\} Bonus/, 'base bonus selector label');
rejectMatch(editor, /Level 1–7 · max \+\{SAGA_DRIVE_START_ATTRIBUTE_BONUS_CAP\}/, 'attribute card cap footer removed');
rejectMatch(editor, /· Entwicklung \(Level \{advanceLevel\}\)/, 'attribute card advancement footer removed');
rejectMatch(editor, /Reiner Check: d20/, 'removed per-attribute pure check preview');
requireMatch(editor, /setBaseAttributes\(INITIAL_ATTRIBUTES\)/, 'recommended balanced default reset');
rejectMatch(editor, /Empfohlene ausgewogene Verteilung/, 'recommended balanced distribution removed from tooltip');
rejectMatch(editor, /SAGA_DRIVE_START_ATTRIBUTE_ARRAY\.map/, 'recommended balanced distribution values removed from tooltip');
rejectMatch(editor, /Reiner Attributscheck: d20 \+ Attributbonus/, 'removed standalone pure check formula in tooltip');
rejectMatch(rules, /eine permanente Entwicklung möglich/, 'removed old first advancement level guide copy');
rejectMatch(rules, /zweite permanente Entwicklung möglich/, 'removed old second advancement level guide copy');
rejectMatch(editor, /mt-1 text-xs text-muted-foreground">Empfohlene ausgewogene Verteilung/, 'inline recommended distribution paragraph removed');
rejectMatch(editor, /getSagaDriveAttributePointBudget/, 'legacy level-total attribute budget helper still drives editor');
rejectMatch(editor, /isValidStartAttributeDistribution/, 'legacy exact standard-array validation remains');

console.log('Attribute bonus regression check passed.');
