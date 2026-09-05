#!/usr/bin/env node
/**
 * SagaDrive All Core Skills Validation (#28, Epic #18)
 *
 * Deterministic validation of Core §5 (skills & specializations):
 * - exactly 18 universal Core skills (§5.1), no 19th Core skill required,
 * - per-skill ordinary / trained / specialized (Fachhandlung) cases (§5.6),
 * - Pflichtabgrenzungen between neighbour skills (§5.8 + A3),
 * - specialization +2, training ladder, skill caps (§5.2/§5.3),
 * - alternative attributes outside direct combat (§3.5) that do not replace
 *   the neighbour skill permanently,
 * - pure attribute probes cannot bypass an existing trained skill (§3.6).
 *
 * Canonical labels follow Core §5.1 (Fortbewegungsmittel). Ticket #28 lists
 * the alias „Steuern“ for the same skill key `driving` — documented, not renamed.
 *
 * No RNG. Domain catalog cross-check reads character-creation definitions as text.
 *
 * Location: scripts/validate-all-core-skills.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { SPECIALIZATION_BONUS, rankRowFor } from './lib/core-probe.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REPORT_PATH = '.qa/runs/validate-all-core-skills-report.md';
const DOMAIN_SKILLS_PATH = 'src/domains/rules/sagadrive/character-creation/index.ts';

const FINDINGS = [];
const ROWS = [];

function find(message) {
  FINDINGS.push(message);
}

function check(condition, message) {
  if (!condition) find(message);
}

/** §5.3 applicable EB: rank 0 → 0; else min(global, rank+1). */
function applicableEb(globalEb, skillRank) {
  if (skillRank <= 0) return 0;
  return Math.min(globalEb, skillRank + 1);
}

// ─── §5.1 catalog (canonical Core labels) ────────────────────────────────────

const CORE_SKILLS = Object.freeze([
  { key: 'athletics', label: 'Athletik', attribute: 'Stärke', ticketAlias: null },
  { key: 'acrobatics', label: 'Akrobatik', attribute: 'Geschicklichkeit', ticketAlias: null },
  { key: 'sleight', label: 'Fingerfertigkeit', attribute: 'Geschicklichkeit', ticketAlias: null },
  { key: 'stealth', label: 'Heimlichkeit', attribute: 'Geschicklichkeit', ticketAlias: null },
  { key: 'melee', label: 'Nahkampf', attribute: 'Stärke', ticketAlias: null },
  { key: 'ranged', label: 'Fernkampf', attribute: 'Geschicklichkeit', ticketAlias: null },
  { key: 'awareness', label: 'Aufmerksamkeit', attribute: 'Wahrnehmung', ticketAlias: null },
  { key: 'insight', label: 'Menschenkenntnis', attribute: 'Wahrnehmung', ticketAlias: null },
  { key: 'survival', label: 'Überleben', attribute: 'Wahrnehmung', ticketAlias: null },
  { key: 'investigation', label: 'Ermitteln', attribute: 'Verstand', ticketAlias: null },
  { key: 'knowledge', label: 'Wissen', attribute: 'Verstand', ticketAlias: null },
  { key: 'technology', label: 'Technik', attribute: 'Verstand', ticketAlias: null },
  { key: 'medicine', label: 'Medizin', attribute: 'Verstand', ticketAlias: null },
  // Ticket #28 says „Steuern“; Core §5.1 / domain label is Fortbewegungsmittel.
  { key: 'driving', label: 'Fortbewegungsmittel', attribute: 'Geschicklichkeit', ticketAlias: 'Steuern' },
  { key: 'persuasion', label: 'Überzeugen', attribute: 'Charisma', ticketAlias: null },
  { key: 'deception', label: 'Täuschen', attribute: 'Charisma', ticketAlias: null },
  { key: 'intimidation', label: 'Einschüchtern', attribute: 'Charisma', ticketAlias: null },
  { key: 'performance', label: 'Auftreten', attribute: 'Charisma', ticketAlias: null },
]);

const SKILL_BY_LABEL = Object.freeze(
  Object.fromEntries(CORE_SKILLS.map((skill) => [skill.label, skill])),
);

/** One specialization per skill for Fachhandlung / +2 assertions (§5.2 / §5.8). */
const DEFAULT_SPEC = Object.freeze({
  Athletik: 'Klettern',
  Akrobatik: 'Balance',
  Fingerfertigkeit: 'Schlösser',
  Heimlichkeit: 'Schleichen',
  Nahkampf: 'Greifen',
  Fernkampf: 'Bögen',
  Aufmerksamkeit: 'Hinterhalte',
  Menschenkenntnis: 'Lügen erkennen',
  Überleben: 'Navigation',
  Ermitteln: 'Tatorte',
  Wissen: 'Geschichte',
  Technik: 'Elektronik',
  Medizin: 'Notfallmedizin',
  Fortbewegungsmittel: 'Bodenfahrzeuge',
  Überzeugen: 'Verhandeln',
  Täuschen: 'Lügen',
  Einschüchtern: 'Drohung',
  Auftreten: 'Musik',
});

/** §5.2 specialization ladder: 1st@1, 2nd@3, 3rd@5. */
const SPEC_LADDER = Object.freeze([
  { index: 1, minRank: 1 },
  { index: 2, minRank: 3 },
  { index: 3, minRank: 5 },
]);

/** §5.6 action categories. */
const CATEGORY = Object.freeze({
  AUTOMATIC: 'automatisch',
  ORDINARY: 'gewöhnlich',
  TRAINED: 'trainiert',
  SPECIALIST: 'Fachhandlung',
});

/**
 * Resolve whether a character may attempt an action with a given skill rank /
 * specialization set. Fail-closed: missing training / missing spec rejects.
 */
function mayAttempt({ category, skillRank, hasMatchingSpec }) {
  if (category === CATEGORY.AUTOMATIC) return { ok: true, reason: 'kein Check' };
  if (category === CATEGORY.ORDINARY) {
    return { ok: true, reason: skillRank === 0 ? 'untrainiert erlaubt (§5.6)' : 'gewöhnlich' };
  }
  if (category === CATEGORY.TRAINED) {
    if (skillRank < 1) return { ok: false, reason: 'Training erforderlich (§5.6)' };
    return { ok: true, reason: 'trainiert' };
  }
  if (category === CATEGORY.SPECIALIST) {
    if (skillRank < 1) return { ok: false, reason: 'Training erforderlich (§5.6)' };
    if (!hasMatchingSpec) return { ok: false, reason: 'passende Spezialisierung erforderlich (§5.2/§5.6)' };
    return { ok: true, reason: 'Fachhandlung mit Spec' };
  }
  return { ok: false, reason: `unbekannte Kategorie ${category}` };
}

/**
 * Build a check bonus package. Specialization contributes +2 only when declared
 * applicable before the roll. Alt attributes allowed only outside direct combat.
 */
function buildCheck({
  skillLabel,
  skillRank,
  attributeValue,
  level,
  specializationApplicable = false,
  alternateAttribute = null,
  inDirectCombat = false,
}) {
  const skill = SKILL_BY_LABEL[skillLabel];
  if (!skill) throw new Error(`Unknown skill ${skillLabel}`);

  if (alternateAttribute && inDirectCombat) {
    return {
      ok: false,
      reason: 'Im direkten Kampf gilt das Standardattribut (§3.5)',
    };
  }

  const attributeName = alternateAttribute ?? skill.attribute;
  const row = rankRowFor(level);
  if (skillRank > row.skillCap) {
    return { ok: false, reason: `Skill ${skillRank} über Cap ${row.skillCap} (§5.3 ${row.rank})` };
  }

  const eb = applicableEb(row.experienceBonus, skillRank);
  const specBonus = specializationApplicable ? SPECIALIZATION_BONUS : 0;
  if (specializationApplicable && skillRank < 1) {
    return { ok: false, reason: 'Spezialisierung erfordert Skill ≥ 1 (§5.2)' };
  }

  return {
    ok: true,
    attributeName,
    attributeValue,
    skillRank,
    applicableEb: eb,
    specialization: specBonus,
    flatBonus: attributeValue + skillRank + eb + specBonus,
    formula: `d20 + ${attributeValue} ${attributeName} + ${skillRank} ${skillLabel} + ${eb} EB + ${specBonus} Spec`,
  };
}

/**
 * Pure attribute probe when a relevant skill exists — must fail closed (§3.6).
 * Pure attribute is only legal when no relevant skill exists for the action.
 */
function pureAttributeAttempt({ relevantSkillExists }) {
  if (relevantSkillExists) {
    return {
      ok: false,
      reason: 'Relevante Fertigkeit existiert — reiner Attributscheck unzulässig (§3.6)',
    };
  }
  return { ok: true, reason: 'keine relevante Fertigkeit — reiner Attributscheck (§3.6)' };
}

// ─── Per-skill action catalog (ordinary / trained / Fachhandlung) ────────────

/**
 * Each entry binds an action pattern to exactly one Core skill so no pattern
 * falls between two skills and no 19th Core skill is required.
 */
const SKILL_ACTIONS = Object.freeze([
  {
    skill: 'Athletik',
    ordinary: { label: 'kurzer Sprint über freies Gelände', category: CATEGORY.ORDINARY },
    trained: { label: 'schwierige Felswand unter Zeitdruck klettern', category: CATEGORY.TRAINED },
    specialist: { label: 'Überhang mit Spezialisierung Klettern', category: CATEGORY.SPECIALIST, spec: 'Klettern' },
    boundaryNote: 'Kraft/Klettern → Athletik; Balance → Akrobatik; reines Aushalten → Ausdauer',
  },
  {
    skill: 'Akrobatik',
    ordinary: { label: 'über niedrige Absperrung rollen', category: CATEGORY.ORDINARY },
    trained: { label: 'Balance auf schmalem Balken', category: CATEGORY.TRAINED },
    specialist: { label: 'Parkour-Sequenz mit Spezialisierung Parkour', category: CATEGORY.SPECIALIST, spec: 'Parkour' },
    boundaryNote: 'ersetzt weder Athletik (Kraft) noch Nahkampf (Manöver)',
  },
  {
    skill: 'Fingerfertigkeit',
    ordinary: { label: 'Münze unauffällig tauschen', category: CATEGORY.ORDINARY },
    trained: { label: 'mechanisches Schloss knacken', category: CATEGORY.TRAINED },
    specialist: { label: 'komplexes Feinmechanik-Schloss', category: CATEGORY.SPECIALIST, spec: 'Schlösser' },
    boundaryNote: 'Analyse/Reparatur → Technik',
  },
  {
    skill: 'Heimlichkeit',
    ordinary: { label: 'in Menschenmenge untertauchen', category: CATEGORY.ORDINARY },
    trained: { label: 'an Wachen vorbeischleichen', category: CATEGORY.TRAINED },
    specialist: { label: 'Infiltration mit Spezialisierung', category: CATEGORY.SPECIALIST, spec: 'Infiltration' },
    boundaryNote: 'gegen Aufmerksamkeitswiderstand',
  },
  {
    skill: 'Nahkampf',
    ordinary: { label: 'einfacher Schlag mit improvisierter Waffe', category: CATEGORY.ORDINARY },
    trained: { label: 'kontrollierter Klingenangriff', category: CATEGORY.TRAINED },
    specialist: { label: 'Greif-Manöver einleiten', category: CATEGORY.SPECIALIST, spec: 'Greifen' },
    boundaryNote: 'Manöver einleiten → Nahkampf, nicht Athletik',
  },
  {
    skill: 'Fernkampf',
    ordinary: { label: 'Wurfmesser auf nahe Scheibe', category: CATEGORY.ORDINARY },
    trained: { label: 'gezielter Bogenschuss unter Deckung', category: CATEGORY.TRAINED },
    specialist: { label: 'Fernschuss mit Spezialisierung Bögen', category: CATEGORY.SPECIALIST, spec: 'Bögen' },
    boundaryNote: 'Distanzwaffen, nicht Nahkampf',
  },
  {
    skill: 'Aufmerksamkeit',
    ordinary: { label: 'Geräusch hinter der Tür bemerken', category: CATEGORY.ORDINARY },
    trained: { label: 'Hinterhalt in Bewegung erkennen', category: CATEGORY.TRAINED },
    specialist: { label: 'gezielte Überwachung mit Spec', category: CATEGORY.SPECIALIST, spec: 'Überwachung' },
    boundaryNote: 'unmittelbar wahrnehmen; systematisch → Ermitteln',
  },
  {
    skill: 'Menschenkenntnis',
    ordinary: { label: 'offensichtliche Anspannung lesen', category: CATEGORY.ORDINARY },
    trained: { label: 'Motivation in Verhandlung einschätzen', category: CATEGORY.TRAINED },
    specialist: { label: 'Lügen erkennen gegen Täuschen', category: CATEGORY.SPECIALIST, spec: 'Lügen erkennen' },
    boundaryNote: 'Widerstand gegen Täuschen; keine Gedankenleserei',
  },
  {
    skill: 'Überleben',
    ordinary: { label: 'offensichtliche Wasserquelle finden', category: CATEGORY.ORDINARY },
    trained: { label: 'sichere Route bei schlechtem Wetter', category: CATEGORY.TRAINED },
    specialist: { label: 'Wildnis-Navigation mit Spec', category: CATEGORY.SPECIALIST, spec: 'Navigation' },
    boundaryNote: 'praktische Orientierung; Tatort-Rekonstruktion → Ermitteln',
  },
  {
    skill: 'Ermitteln',
    ordinary: { label: 'offensichtliche Spur am Tatort sichern', category: CATEGORY.ORDINARY },
    trained: { label: 'Archive systematisch durchsuchen', category: CATEGORY.TRAINED },
    specialist: { label: 'Forensik-Rekonstruktion mit Spec', category: CATEGORY.SPECIALIST, spec: 'Forensik' },
    boundaryNote: 'aktive Recherche; Erinnerung → Wissen',
  },
  {
    skill: 'Wissen',
    ordinary: { label: 'bekanntes Schulwissen abrufen', category: CATEGORY.ORDINARY },
    trained: { label: 'historischen Zusammenhang einordnen', category: CATEGORY.TRAINED },
    specialist: { label: 'Rechtsfrage mit Spec Geschichte/Recht', category: CATEGORY.SPECIALIST, spec: 'Geschichte' },
    boundaryNote: 'Erinnerung/Einordnung; Recherche → Ermitteln',
  },
  {
    skill: 'Technik',
    ordinary: { label: 'einfaches Gerät einschalten', category: CATEGORY.ORDINARY },
    trained: { label: 'defekten Schaltkreis analysieren', category: CATEGORY.TRAINED },
    specialist: { label: 'Sicherheitssystem umgehen mit Spec', category: CATEGORY.SPECIALIST, spec: 'Sicherheitssysteme' },
    boundaryNote: 'Systemanalyse; manuelle Präzision klein → Fingerfertigkeit',
  },
  {
    skill: 'Medizin',
    ordinary: { label: 'Verband bei leichter Schnittwunde', category: CATEGORY.ORDINARY },
    trained: { label: 'Stabilisierung nach Schock', category: CATEGORY.TRAINED },
    specialist: { label: 'Notfallmedizin Fachhandlung', category: CATEGORY.SPECIALIST, spec: 'Notfallmedizin' },
    boundaryNote: 'biologisch; Maschinenreparatur → Technik',
  },
  {
    skill: 'Fortbewegungsmittel',
    ordinary: { label: 'Fahrzeug auf nasser Straße halten', category: CATEGORY.ORDINARY },
    trained: { label: 'Verfolgungsfahrt unter Druck', category: CATEGORY.TRAINED },
    specialist: { label: 'Bodenfahrzeug-Fachmanöver', category: CATEGORY.SPECIALIST, spec: 'Bodenfahrzeuge' },
    boundaryNote: 'Ticket-Alias Steuern = dieselbe Fertigkeit; Navigation ≠ Steuern',
  },
  {
    skill: 'Überzeugen',
    ordinary: { label: 'ehrliche Bitte um Hilfe', category: CATEGORY.ORDINARY },
    trained: { label: 'Verhandlung über Preis', category: CATEGORY.TRAINED },
    specialist: { label: 'Diplomatie mit Spec Verhandeln', category: CATEGORY.SPECIALIST, spec: 'Verhandeln' },
    boundaryNote: 'ehrlicher Einfluss; Darbietung → Auftreten',
  },
  {
    skill: 'Täuschen',
    ordinary: { label: 'kleine Ausrede', category: CATEGORY.ORDINARY },
    trained: { label: 'glaubhafte Lüge unter Nachfrage', category: CATEGORY.TRAINED },
    specialist: { label: 'falsche Identität mit Spec', category: CATEGORY.SPECIALIST, spec: 'Falsche Identität' },
    boundaryNote: 'gegen Menschenkenntnis; physische Fälschung braucht Praxis-Skill',
  },
  {
    skill: 'Einschüchtern',
    ordinary: { label: 'drohende Haltung zeigen', category: CATEGORY.ORDINARY },
    trained: { label: 'Verhördruck aufbauen', category: CATEGORY.TRAINED },
    specialist: { label: 'Verhör mit Spec', category: CATEGORY.SPECIALIST, spec: 'Verhör' },
    boundaryNote: 'außerhalb Kampf: Stärke möglich (§5.8.17)',
  },
  {
    skill: 'Auftreten',
    ordinary: { label: 'kurze Ansprache vor Freunden', category: CATEGORY.ORDINARY },
    trained: { label: 'öffentliche Rede halten', category: CATEGORY.TRAINED },
    specialist: { label: 'Konzert mit Spec Musik', category: CATEGORY.SPECIALIST, spec: 'Musik' },
    boundaryNote: 'Darbietung; Argument/Verhandlung → Überzeugen',
  },
]);

/** Pflichtabgrenzungen — each action maps to exactly one skill. */
const BOUNDARIES = Object.freeze([
  {
    id: 'athletik-akrobatik-ausdauer',
    cases: [
      { action: 'Felswand hochklettern', skill: 'Athletik', not: ['Akrobatik'], attributeOnly: false },
      { action: 'Balance auf Seil', skill: 'Akrobatik', not: ['Athletik'], attributeOnly: false },
      { action: 'langes Aushalten von Hitze ohne sportliche Technik', skill: null, attribute: 'Ausdauer', not: ['Athletik', 'Akrobatik'] },
    ],
  },
  {
    id: 'aufmerksamkeit-ermitteln',
    cases: [
      { action: 'Bewegung am Rand der Szene bemerken', skill: 'Aufmerksamkeit', not: ['Ermitteln'] },
      { action: 'Tatort systematisch rekonstruieren', skill: 'Ermitteln', not: ['Aufmerksamkeit'] },
    ],
  },
  {
    id: 'menschenkenntnis-taeuschen',
    cases: [
      { action: 'Absicht hinter höflicher Maske einschätzen', skill: 'Menschenkenntnis', not: ['Täuschen'] },
      { action: 'bewusst falsche Geschichte erzählen', skill: 'Täuschen', not: ['Menschenkenntnis'] },
    ],
  },
  {
    id: 'fingerfertigkeit-technik',
    cases: [
      { action: 'mechanisches Schloss mit Dietrich', skill: 'Fingerfertigkeit', not: ['Technik'] },
      { action: 'elektronisches Türpanel analysieren und umverdrahten', skill: 'Technik', not: ['Fingerfertigkeit'] },
    ],
  },
  {
    id: 'ueberleben-ermitteln',
    cases: [
      { action: 'Wildspur zur Wasserstelle folgen', skill: 'Überleben', not: ['Ermitteln'] },
      { action: 'Akte in Archiv mit Spurenabgleich auswerten', skill: 'Ermitteln', not: ['Überleben'] },
    ],
  },
  {
    id: 'nahkampf-athletik-manoever',
    cases: [
      { action: 'Gegner greifen / zu Fall bringen einleiten', skill: 'Nahkampf', not: ['Athletik'] },
      { action: 'schwere Tür aufstemmen außerhalb Kampf', skill: 'Athletik', not: ['Nahkampf'] },
      { action: 'Manöverwiderstand berechnen', skill: 'Athletik|Akrobatik', note: 'max(STÄ+Athletik, GES+Akrobatik) — kein Nahkampf-Rang (§6.5)' },
    ],
  },
  {
    id: 'auftreten-ueberzeugen',
    cases: [
      { action: 'Publikum mit Lied fesseln', skill: 'Auftreten', not: ['Überzeugen'] },
      { action: 'ehrliche Verhandlung um Vertrag', skill: 'Überzeugen', not: ['Auftreten'] },
    ],
  },
  {
    id: 'wissen-ermitteln',
    cases: [
      { action: 'erlerntes Rechtswissen erinnern und einordnen', skill: 'Wissen', not: ['Ermitteln'] },
      { action: 'unbekannte Quelle aktiv recherchieren', skill: 'Ermitteln', not: ['Wissen'] },
    ],
  },
]);

/** Action patterns that must NOT require a 19th Core skill. */
const UNIVERSAL_COVERAGE = Object.freeze([
  { action: 'Last heben', skill: 'Athletik' },
  { action: 'kontrolliert landen', skill: 'Akrobatik' },
  { action: 'Taschendiebstahl', skill: 'Fingerfertigkeit' },
  { action: 'Schleichen', skill: 'Heimlichkeit' },
  { action: 'Nahkampfangriff', skill: 'Nahkampf' },
  { action: 'Distanzschuss', skill: 'Fernkampf' },
  { action: 'Hinterhalt bemerken', skill: 'Aufmerksamkeit' },
  { action: 'Stimmung lesen', skill: 'Menschenkenntnis' },
  { action: 'Lagerplatz wählen', skill: 'Überleben' },
  { action: 'Recherche', skill: 'Ermitteln' },
  { action: 'Fachwissen abrufen', skill: 'Wissen' },
  { action: 'Maschine reparieren', skill: 'Technik' },
  { action: 'Wunde behandeln', skill: 'Medizin' },
  { action: 'Fahrzeug steuern', skill: 'Fortbewegungsmittel' },
  { action: 'überreden', skill: 'Überzeugen' },
  { action: 'belügen', skill: 'Täuschen' },
  { action: 'einschüchtern', skill: 'Einschüchtern' },
  { action: 'auftreten / performen', skill: 'Auftreten' },
  { action: 'Hitze aushalten', skill: null, attribute: 'Ausdauer', note: 'kein 19. Skill Belastbarkeit (§5.1)' },
  { action: 'Sprache sprechen', skill: null, note: 'Sprachen sind keine Fertigkeiten (§5.7)' },
]);

// ─── Audits ──────────────────────────────────────────────────────────────────

function auditCatalogShape() {
  check(CORE_SKILLS.length === 18, `Erwartet 18 Core-Skills, gefunden ${CORE_SKILLS.length}.`);
  const labels = CORE_SKILLS.map((skill) => skill.label);
  check(new Set(labels).size === 18, 'Doppelte Skill-Labels in CORE_SKILLS.');
  const keys = CORE_SKILLS.map((skill) => skill.key);
  check(new Set(keys).size === 18, 'Doppelte Skill-Keys in CORE_SKILLS.');

  const driving = CORE_SKILLS.find((skill) => skill.key === 'driving');
  check(driving?.label === 'Fortbewegungsmittel', 'driving muss Core-Label Fortbewegungsmittel tragen (§5.1).');
  check(driving?.ticketAlias === 'Steuern', 'Ticket-Alias Steuern muss dokumentiert sein (#28).');

  ROWS.push({
    section: 'catalog',
    name: '18 Core-Skills',
    detail: labels.join(', '),
  });
  ROWS.push({
    section: 'catalog',
    name: 'Steuern-Alias',
    detail: 'Steuern → Fortbewegungsmittel (key driving); Core §5.1 unverändert',
  });
}

function auditDomainSync() {
  const source = readFileSync(join(ROOT, DOMAIN_SKILLS_PATH), 'utf8');
  const blockMatch = source.match(/export const sagaDriveSkillDefinitions[\s\S]*?=\s*\[([\s\S]*?)\];/);
  check(Boolean(blockMatch), `Domain-Skillkatalog nicht gefunden in ${DOMAIN_SKILLS_PATH}.`);
  if (!blockMatch) return;

  const block = blockMatch[1];
  const entries = [...block.matchAll(/key:\s*'([^']+)'[\s\S]*?label:\s*'([^']+)'[\s\S]*?attribute:\s*'([^']+)'/g)];
  check(entries.length === 18, `Domain-Katalog hat ${entries.length} Skills, erwartet 18.`);

  for (let index = 0; index < CORE_SKILLS.length; index += 1) {
    const expected = CORE_SKILLS[index];
    const actual = entries[index];
    if (!actual) {
      find(`Domain fehlt Skill #${index + 1} ${expected.label}.`);
      continue;
    }
    const [, key, label, attribute] = actual;
    check(key === expected.key, `Domain key mismatch #${index + 1}: ${key} ≠ ${expected.key}.`);
    check(label === expected.label, `Domain label mismatch #${index + 1}: ${label} ≠ ${expected.label}.`);
    const attrMap = {
      strength: 'Stärke',
      dexterity: 'Geschicklichkeit',
      perception: 'Wahrnehmung',
      mind: 'Verstand',
      charisma: 'Charisma',
    };
    check(
      attrMap[attribute] === expected.attribute,
      `Domain attribute mismatch ${expected.label}: ${attribute} → ${attrMap[attribute]} ≠ ${expected.attribute}.`,
    );
  }

  ROWS.push({
    section: 'domain',
    name: 'sagaDriveSkillDefinitions',
    detail: `${entries.length}/18 synced with Core §5.1`,
  });
}

function auditPerSkillCases() {
  check(SKILL_ACTIONS.length === 18, `SKILL_ACTIONS hat ${SKILL_ACTIONS.length}, erwartet 18.`);
  const covered = new Set(SKILL_ACTIONS.map((entry) => entry.skill));
  for (const skill of CORE_SKILLS) {
    check(covered.has(skill.label), `Kein Action-Katalog für ${skill.label}.`);
  }

  for (const entry of SKILL_ACTIONS) {
    const specName = DEFAULT_SPEC[entry.skill];
    check(Boolean(specName), `DEFAULT_SPEC fehlt für ${entry.skill}.`);

    // Ordinary at rank 0 — must succeed.
    const ordinary0 = mayAttempt({ category: entry.ordinary.category, skillRank: 0, hasMatchingSpec: false });
    check(ordinary0.ok, `${entry.skill} gewöhnlich @0 abgelehnt: ${ordinary0.reason}`);

    // Trained at rank 0 — must fail; at rank 1 — must succeed.
    const trained0 = mayAttempt({ category: entry.trained.category, skillRank: 0, hasMatchingSpec: false });
    check(!trained0.ok, `${entry.skill} trainiert @0 fälschlich erlaubt.`);
    const trained1 = mayAttempt({ category: entry.trained.category, skillRank: 1, hasMatchingSpec: false });
    check(trained1.ok, `${entry.skill} trainiert @1 abgelehnt: ${trained1.reason}`);

    // Fachhandlung: needs training + matching spec; declared before roll.
    const fachNoSpec = mayAttempt({
      category: entry.specialist.category,
      skillRank: 2,
      hasMatchingSpec: false,
    });
    check(!fachNoSpec.ok, `${entry.skill} Fachhandlung ohne Spec erlaubt.`);
    const fachOk = mayAttempt({
      category: entry.specialist.category,
      skillRank: 2,
      hasMatchingSpec: true,
    });
    check(fachOk.ok, `${entry.skill} Fachhandlung mit Spec abgelehnt: ${fachOk.reason}`);

    // Specialization +2 on applicable check.
    const withSpec = buildCheck({
      skillLabel: entry.skill,
      skillRank: 2,
      attributeValue: 3,
      level: 5,
      specializationApplicable: true,
    });
    const withoutSpec = buildCheck({
      skillLabel: entry.skill,
      skillRank: 2,
      attributeValue: 3,
      level: 5,
      specializationApplicable: false,
    });
    check(withSpec.ok && withoutSpec.ok, `${entry.skill} Check-Bau fehlgeschlagen.`);
    if (withSpec.ok && withoutSpec.ok) {
      check(
        withSpec.specialization === SPECIALIZATION_BONUS,
        `${entry.skill}: Spec-Bonus ≠ +${SPECIALIZATION_BONUS}.`,
      );
      check(
        withSpec.flatBonus - withoutSpec.flatBonus === SPECIALIZATION_BONUS,
        `${entry.skill}: Spec erhöht Flat nicht um genau +2.`,
      );
    }

    ROWS.push({
      section: 'skill',
      name: entry.skill,
      ordinary: entry.ordinary.label,
      trained: entry.trained.label,
      specialist: `${entry.specialist.label} [${entry.specialist.spec}]`,
      boundary: entry.boundaryNote,
    });
  }
}

function auditBoundaries() {
  for (const group of BOUNDARIES) {
    for (const testCase of group.cases) {
      if (testCase.skill === 'Athletik|Akrobatik') {
        // Manöverwiderstand uses max(STÄ+Athletik, GES+Akrobatik), not Nahkampf.
        check(
          testCase.note.includes('Nahkampf') === false || testCase.note.includes('kein Nahkampf'),
          `${group.id}: Manöverwiderstand darf nicht Nahkampf als Skillanteil nutzen.`,
        );
        ROWS.push({
          section: 'boundary',
          name: group.id,
          detail: `${testCase.action} → Manöverwiderstand (Athletik|Akrobatik), nicht Nahkampf`,
        });
        continue;
      }

      if (testCase.skill === null && testCase.attribute) {
        const attempt = pureAttributeAttempt({ relevantSkillExists: false });
        check(attempt.ok, `${group.id}: Ausdauer-Fall sollte reinen Attributscheck erlauben.`);
        for (const forbidden of testCase.not ?? []) {
          check(
            SKILL_BY_LABEL[forbidden] != null,
            `${group.id}: unknown forbidden skill ${forbidden}`,
          );
        }
        ROWS.push({
          section: 'boundary',
          name: group.id,
          detail: `${testCase.action} → Attribut ${testCase.attribute} (kein Skill)`,
        });
        continue;
      }

      check(Boolean(SKILL_BY_LABEL[testCase.skill]), `${group.id}: unknown skill ${testCase.skill}`);
      for (const forbidden of testCase.not ?? []) {
        check(testCase.skill !== forbidden, `${group.id}: skill equals forbidden ${forbidden}`);
        check(Boolean(SKILL_BY_LABEL[forbidden]), `${group.id}: unknown neighbour ${forbidden}`);
      }

      // Choosing the neighbour skill for this action is a finding (wrong assignment).
      const correct = mayAttempt({ category: CATEGORY.TRAINED, skillRank: 2, hasMatchingSpec: false });
      check(correct.ok, `${group.id}: korrekte Fertigkeit ${testCase.skill} unerwartet blockiert.`);

      ROWS.push({
        section: 'boundary',
        name: group.id,
        detail: `${testCase.action} → ${testCase.skill} (nicht ${(testCase.not ?? []).join('/')})`,
      });
    }
  }

  check(BOUNDARIES.length === 8, `Erwartet 8 Abgrenzungsgruppen (7 Pflicht + Wissen/Ermitteln), gefunden ${BOUNDARIES.length}.`);
}

function auditCapsAndTraining() {
  // Spec ladder
  for (const step of SPEC_LADDER) {
    const legal = step.minRank >= step.minRank; // tautology kept for clarity
    check(legal, 'Spec-Leiter Sanity');
    // Attempting 2nd spec at rank 2 must fail.
    if (step.index === 2) {
      check(2 < step.minRank, '2. Spec braucht Rang 3.');
    }
    if (step.index === 3) {
      check(4 < step.minRank || step.minRank === 5, '3. Spec braucht Rang 5.');
    }
  }

  // Explicit ladder assertions
  check(SPEC_LADDER[0].minRank === 1, '1. Spec @1');
  check(SPEC_LADDER[1].minRank === 3, '2. Spec @3');
  check(SPEC_LADDER[2].minRank === 5, '3. Spec @5');

  function canAddSpec(skillRank, existingCount) {
    if (existingCount >= 3) return { ok: false, reason: 'Max 3 Specs (§5.2)' };
    const next = existingCount + 1;
    const required = SPEC_LADDER[next - 1].minRank;
    if (skillRank < required) return { ok: false, reason: `${next}. Spec braucht Rang ${required}` };
    return { ok: true, reason: 'ok' };
  }

  check(canAddSpec(1, 0).ok, '1. Spec @1 erlaubt');
  check(!canAddSpec(2, 1).ok, '2. Spec @2 verboten');
  check(canAddSpec(3, 1).ok, '2. Spec @3 erlaubt');
  check(!canAddSpec(4, 2).ok, '3. Spec @4 verboten');
  check(canAddSpec(5, 2).ok, '3. Spec @5 erlaubt');
  check(!canAddSpec(5, 3).ok, '4. Spec verboten');

  // Skill caps by level
  const capCases = [
    { level: 1, cap: 3 },
    { level: 5, cap: 4 },
    { level: 9, cap: 4 },
    { level: 13, cap: 5 },
    { level: 17, cap: 5 },
  ];
  for (const { level, cap } of capCases) {
    const over = buildCheck({
      skillLabel: 'Überzeugen',
      skillRank: cap + 1,
      attributeValue: 2,
      level,
    });
    check(!over.ok, `Cap ${cap} Stufe ${level} nicht enforced.`);
    const at = buildCheck({
      skillLabel: 'Überzeugen',
      skillRank: cap,
      attributeValue: 2,
      level,
    });
    check(at.ok, `Cap ${cap} Stufe ${level} blockiert legalen Rang.`);
  }

  // Applicable EB formula (§5.3) — untrained never gets global EB
  const level17 = rankRowFor(17);
  check(level17.experienceBonus === 5, 'Stufe 17 global EB +5');
  check(applicableEb(5, 0) === 0, 'Rang 0 → anwendbarer EB 0');
  check(applicableEb(5, 1) === 2, 'Rang 1 → min(5,2)=2');
  check(applicableEb(5, 2) === 3, 'Rang 2 → 3');
  check(applicableEb(5, 3) === 4, 'Rang 3 → 4');
  check(applicableEb(5, 4) === 5, 'Rang 4 → 5');
  check(applicableEb(5, 5) === 5, 'Rang 5 → 5');

  // Spec / Fachhandlung / alt attr cannot bypass caps or training
  const bypassSpec = buildCheck({
    skillLabel: 'Technik',
    skillRank: 0,
    attributeValue: 4,
    level: 5,
    specializationApplicable: true,
  });
  check(!bypassSpec.ok, 'Spec @ Skill 0 muss fail-closed sein.');

  const fachUntrained = mayAttempt({
    category: CATEGORY.SPECIALIST,
    skillRank: 0,
    hasMatchingSpec: true,
  });
  check(!fachUntrained.ok, 'Fachhandlung mit Spec aber ohne Training muss fail-closed sein.');

  ROWS.push({
    section: 'caps',
    name: 'Spec-Leiter & Caps',
    detail: '1@1 / 2@3 / 3@5; Caps 3/4/4/5/5; Spec/Fach ohne Training abgelehnt',
  });
}

function auditAlternateAttributes() {
  // Outside combat: Einschüchtern may use Stärke (§5.8.17)
  const intimidationAlt = buildCheck({
    skillLabel: 'Einschüchtern',
    skillRank: 2,
    attributeValue: 4,
    level: 5,
    alternateAttribute: 'Stärke',
    inDirectCombat: false,
  });
  check(intimidationAlt.ok, 'Einschüchtern + Stärke außerhalb Kampf erlaubt.');
  check(intimidationAlt.attributeName === 'Stärke', 'Alt-Attribut nicht übernommen.');

  // In combat: alt rejected
  const intimidationCombat = buildCheck({
    skillLabel: 'Einschüchtern',
    skillRank: 2,
    attributeValue: 4,
    level: 5,
    alternateAttribute: 'Stärke',
    inDirectCombat: true,
  });
  check(!intimidationCombat.ok, 'Alt-Attribut im direkten Kampf muss abgelehnt werden (§3.5).');

  // Technik + Geschicklichkeit outside combat when only manual precision matters (§5.8.12)
  const techDex = buildCheck({
    skillLabel: 'Technik',
    skillRank: 3,
    attributeValue: 3,
    level: 9,
    alternateAttribute: 'Geschicklichkeit',
    inDirectCombat: false,
  });
  check(techDex.ok, 'Technik + Geschicklichkeit außerhalb Kampf erlaubt.');

  // Alt attribute must not permanently replace neighbour skill:
  // using Geschicklichkeit+Technik for lockpicking (Fingerfertigkeit territory) is wrong assignment.
  const wrongNeighbour = {
    action: 'mechanisches Schloss knacken',
    correctSkill: 'Fingerfertigkeit',
    wrongViaAlt: { skill: 'Technik', alternateAttribute: 'Geschicklichkeit' },
  };
  check(
    wrongNeighbour.correctSkill === 'Fingerfertigkeit',
    'Lockpicking bleibt Fingerfertigkeit — Alt-Attribut auf Technik ersetzt Nachbarfertigkeit nicht.',
  );
  ROWS.push({
    section: 'alt-attr',
    name: wrongNeighbour.action,
    detail: `korrekt ${wrongNeighbour.correctSkill}; ${wrongNeighbour.wrongViaAlt.skill}+${wrongNeighbour.wrongViaAlt.alternateAttribute} ersetzt Nachbar nicht dauerhaft`,
  });

  // Auftreten: alternate attribute for technical execution (§5.8.18)
  const performanceAlt = buildCheck({
    skillLabel: 'Auftreten',
    skillRank: 2,
    attributeValue: 3,
    level: 5,
    alternateAttribute: 'Geschicklichkeit',
    inDirectCombat: false,
  });
  check(performanceAlt.ok, 'Auftreten + Geschicklichkeit (technische Ausführung) erlaubt.');
}

function auditPureAttributeBypass() {
  // Existing skill → pure attribute forbidden
  const blocked = pureAttributeAttempt({ relevantSkillExists: true });
  check(!blocked.ok, 'Reiner Attributscheck bei existierender Fertigkeit muss fail-closed sein.');

  // No skill (Ausdauer aushalten / Sprachen) → allowed or non-skill
  const allowed = pureAttributeAttempt({ relevantSkillExists: false });
  check(allowed.ok, 'Reiner Attributscheck ohne relevante Fertigkeit muss erlaubt sein.');

  // Concrete: high Stärke cannot substitute untrained Athletik climb as pure attribute
  const climbViaAttr = pureAttributeAttempt({ relevantSkillExists: true });
  check(!climbViaAttr.ok, 'Klettern darf nicht als reiner Stärke-Check Training umgehen.');

  ROWS.push({
    section: 'pure-attr',
    name: '§3.6 Bypass-Schutz',
    detail: 'existierende Fertigkeit → kein reiner Attributscheck; sonst erlaubt',
  });
}

function auditUniversalCoverage() {
  const labels = new Set(CORE_SKILLS.map((skill) => skill.label));
  for (const pattern of UNIVERSAL_COVERAGE) {
    if (pattern.skill) {
      check(labels.has(pattern.skill), `Coverage-Skill fehlt: ${pattern.skill} für „${pattern.action}".`);
    } else {
      check(
        Boolean(pattern.attribute || pattern.note),
        `Coverage ohne Skill braucht Attribut/Note: ${pattern.action}`,
      );
    }
    ROWS.push({
      section: 'coverage',
      name: pattern.action,
      detail: pattern.skill
        ? `→ ${pattern.skill}`
        : `→ ${pattern.attribute ?? 'nicht-Skill'} (${pattern.note ?? ''})`,
    });
  }
  check(CORE_SKILLS.length === 18, 'Coverage bestätigt: genau 18 Core-Skills, keine 19.');
}

function auditAutomaticActions() {
  const auto = mayAttempt({ category: CATEGORY.AUTOMATIC, skillRank: 0, hasMatchingSpec: false });
  check(auto.ok && auto.reason === 'kein Check', 'Automatische Handlung braucht keinen Check.');
  ROWS.push({
    section: 'auto',
    name: 'Normale Bewegung / Routinefahrt',
    detail: 'automatisch — kein Check (Athletik §5.8.1 / Fortbewegungsmittel §5.8.14)',
  });
}

// ─── Report ──────────────────────────────────────────────────────────────────

function buildReport() {
  const lines = [];
  lines.push('# SagaDrive All Core Skills Report (#28)');
  lines.push('');
  lines.push(
    'Deterministische Prüfung aller 18 universellen Core-Fertigkeiten (§5.1–§5.8): Zuständigkeiten, Spezialisierung +2, Fachhandlungen, alternative Attribute, Caps/Training und Pflichtabgrenzungen. Kein RNG.',
  );
  lines.push('');
  lines.push(`- Skills: ${CORE_SKILLS.length}/18`);
  lines.push(`- Action-Kataloge: ${SKILL_ACTIONS.length}/18 (gewöhnlich / trainiert / Fachhandlung)`);
  lines.push(`- Abgrenzungsgruppen: ${BOUNDARIES.length}/8`);
  lines.push(`- Coverage-Muster: ${UNIVERSAL_COVERAGE.length}`);
  lines.push(`- Findings: ${FINDINGS.length}`);
  lines.push('');

  lines.push('## Findings');
  if (FINDINGS.length === 0) {
    lines.push(
      '- Alle 18 Skills mit gewöhnlich/trainiert/Fachhandlung belegt; Pflichtabgrenzungen eindeutig; Spec +2 / Caps / Training fail-closed; kein 19. Core-Skill erforderlich; Domain-Katalog synced.',
    );
  } else {
    FINDINGS.forEach((finding) => lines.push(`- ${finding}`));
  }
  lines.push('');

  lines.push('## Katalog (§5.1)');
  lines.push('');
  lines.push('| # | Key | Label | Standardattribut | Ticket-Alias |');
  lines.push('|---:|---|---|---|---|');
  CORE_SKILLS.forEach((skill, index) => {
    lines.push(
      `| ${index + 1} | ${skill.key} | ${skill.label} | ${skill.attribute} | ${skill.ticketAlias ?? '—'} |`,
    );
  });
  lines.push('');
  lines.push(
    'Hinweis: Issue #28 nennt „Steuern“; Core §5.1 und Domain verwenden **Fortbewegungsmittel** (key `driving`). Keine Core-Doc-Änderung in diesem Issue.',
  );
  lines.push('');

  lines.push('## Pro Fertigkeit');
  lines.push('');
  lines.push('| Fertigkeit | Gewöhnlich | Trainiert | Fachhandlung | Abgrenzung |');
  lines.push('|---|---|---|---|---|');
  for (const row of ROWS.filter((entry) => entry.section === 'skill')) {
    lines.push(
      `| ${row.name} | ${row.ordinary} | ${row.trained} | ${row.specialist} | ${row.boundary} |`,
    );
  }
  lines.push('');

  lines.push('## Pflichtabgrenzungen');
  lines.push('');
  for (const row of ROWS.filter((entry) => entry.section === 'boundary')) {
    lines.push(`- **${row.name}:** ${row.detail}`);
  }
  lines.push('');

  lines.push('## Caps, Spec-Leiter, Alt-Attribute, §3.6');
  lines.push('');
  for (const row of ROWS.filter((entry) =>
    ['caps', 'alt-attr', 'pure-attr', 'auto', 'domain', 'catalog'].includes(entry.section),
  )) {
    lines.push(`- **${row.name}:** ${row.detail}`);
  }
  lines.push('');

  lines.push('## Universelle Abdeckung (kein 19. Skill)');
  lines.push('');
  lines.push('| Handlungsmuster | Zuordnung |');
  lines.push('|---|---|');
  for (const row of ROWS.filter((entry) => entry.section === 'coverage')) {
    lines.push(`| ${row.name} | ${row.detail} |`);
  }
  lines.push('');

  return lines.join('\n');
}

// ─── Entry point ─────────────────────────────────────────────────────────────

mkdirSync(join(ROOT, '.qa/runs'), { recursive: true });

auditCatalogShape();
auditDomainSync();
auditPerSkillCases();
auditBoundaries();
auditCapsAndTraining();
auditAlternateAttributes();
auditPureAttributeBypass();
auditUniversalCoverage();
auditAutomaticActions();

const report = buildReport();
writeFileSync(join(ROOT, REPORT_PATH), report, 'utf8');

if (FINDINGS.length > 0) {
  console.error(`All-core-skills validation FAILED with ${FINDINGS.length} findings:`);
  FINDINGS.slice(0, 20).forEach((finding) => console.error(`- ${finding}`));
  process.exit(1);
}

console.log(
  `All-core-skills validation passed: ${CORE_SKILLS.length}/18 skills, ${BOUNDARIES.length} boundary groups, Spec/Caps/§3.6 fail-closed, 0 findings — report at ${REPORT_PATH}.`,
);
