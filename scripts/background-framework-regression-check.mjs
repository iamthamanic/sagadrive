import { readFileSync } from 'node:fs';
import process from 'node:process';

const source = readFileSync(new URL('../src/modules/rulesets/backgroundTemplates.ts', import.meta.url), 'utf8');
const carousel = readFileSync(new URL('../src/modules/characters/components/BackgroundCarousel.tsx', import.meta.url), 'utf8');

function requireMatch(content, pattern, label) {
  if (pattern.test(content)) return;
  console.error(`Background framework regression check failed: missing ${label}.`);
  process.exit(1);
}

function rejectMatch(content, pattern, label) {
  if (!pattern.test(content)) return;
  console.error(`Background framework regression check failed: ${label}.`);
  process.exit(1);
}

const expectedFrameworks = [
  ['stage-public', 'Bühne & Öffentlichkeit'],
  ['sport-competition', 'Sport & Wettkampf'],
  ['border-scout', 'Natur & Wildnis'],
  ['academy-research', 'Akademie & Forschung'],
  ['corporate-technician', 'Handwerk & Technik'],
  ['street-doctor', 'Heilung & Fürsorge'],
  ['soldier', 'Militär & Wachdienst'],
  ['smuggler', 'Unterwelt & Grauzone'],
  ['investigator', 'Ermittlung & Information'],
  ['trade-networks', 'Handel & Netzwerke'],
  ['privilege-elite', 'Privileg & Elite'],
  ['faith-order', 'Glaube & Orden'],
  ['travel-transport', 'Reise & Transport'],
  ['organization-administration', 'Organisation & Verwaltung'],
  ['service-supply', 'Service & Versorgung'],
  ['family-community', 'Familie & Gemeinschaft'],
  ['law-institutions', 'Recht & Institutionen'],
];

for (const [id, name] of expectedFrameworks) {
  const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  requireMatch(source, new RegExp(`id:\\s*'${escapedId}'[\\s\\S]{0,180}?name:\\s*'${escapedName}'`), `${name} framework (${id})`);
}

requireMatch(source, /examples:\s*readonly string\[\]/, 'framework example contract');
requireMatch(source, /worldProfileIds\?:\s*readonly string\[\]/, 'world-profile framework filtering contract');
requireMatch(source, /skillPool:\s*readonly \[SagaDriveSkillKey, SagaDriveSkillKey, SagaDriveSkillKey, SagaDriveSkillKey\]/, 'fixed four-skill framework pool');
requireMatch(source, /recommendedTraining:\s*readonly \[SagaDriveSkillKey, SagaDriveSkillKey\]/, 'two framework training recommendations');
requireMatch(source, /validateSagaDriveBackgroundTemplateCatalog/, 'framework catalog runtime validation');
requireMatch(carousel, />Hintergrund Framework</, 'framework terminology in carousel');
requireMatch(carousel, />Freier Hintergrund</, 'free background terminology in carousel');
requireMatch(carousel, /option\.template\.examples\.join/, 'cross-setting examples shown in carousel');

rejectMatch(source, /name:\s*'Grenzscout'/, 'legacy Grenzscout remains a visible Core framework name');
rejectMatch(source, /name:\s*'Konzerntechniker'/, 'legacy Konzerntechniker remains a visible Core framework name');
rejectMatch(source, /name:\s*'Straßenarzt'/, 'legacy Straßenarzt remains a visible Core framework name');
rejectMatch(source, /name:\s*'Soldat'/, 'legacy Soldat remains a visible Core framework name');
rejectMatch(source, /name:\s*'Schmuggler'/, 'legacy Schmuggler remains a visible Core framework name');
rejectMatch(source, /name:\s*'Ermittler'/, 'legacy Ermittler remains a visible Core framework name');
rejectMatch(source, /Natur & Grenzland/, 'deprecated Natur & Grenzland terminology remains');

console.log(`Background framework regression check passed (${expectedFrameworks.length} Core frameworks).`);
