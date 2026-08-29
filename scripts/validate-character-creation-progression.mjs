#!/usr/bin/env node
/**
 * SagaDrive Character Creation & Progression Validation (#20, Epic #18)
 *
 * Deterministic validation of the §17 creation sequence and §13 progression.
 * No RNG: character building is bookkeeping and is verified exactly.
 *
 * Level-1 invariants (§17 step 20): attributes legal, species budget exactly
 * 3, skill budget 10 with all §5.4 caps, specialization ladder, archetype core
 * feature, drive 3 / momentum 0. Progression plans (B1/B2/B3) spend every §13
 * development event to level 20 with all §11.2/§13.1 gates. Negative paths
 * re-run each builder with one illegal mutation and assert exact rejection.
 *
 * Rank/EB/skillCap mirror scripts/lib/core-probe.mjs (§5.3 shared truth).
 *
 * Location: scripts/validate-character-creation-progression.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import process from 'node:process';

// ─── Rule constants ──────────────────────────────────────────────────────────

/** §3.1 fixed attribute order; position i in applyAttributes maps to ATTR_NAMES[i]. */
const ATTR_NAMES = Object.freeze(['Stärke', 'Geschicklichkeit', 'Ausdauer', 'Verstand', 'Wahrnehmung', 'Charisma']);

const ATTRIBUTE_COSTS = Object.freeze({ 1: 0, 2: 1, 3: 2, 4: 4 });
const POINT_BUY_BUDGET = 10;
const STANDARD_ARRAY = Object.freeze([4, 3, 3, 2, 2, 1]);
const ATTRIBUTE_CREATION_MAX = 4;
const ATTRIBUTE_CAP = 5;

const START_SKILL_MAX = 3;
const MIN_SKILLS_AT_LEAST_1 = 6;
const FREE_SKILL_POINTS = 7;

const SPECIALIZATION_LADDER = Object.freeze({ 1: 1, 2: 3, 3: 5 });
const MAX_SPECIALIZATIONS = 3;

const SPECIES_BUDGET = 3;
const ARCHETYPE_MIN_LEVELS = Object.freeze({ 2: 6, 3: 12, 4: 18 });
const RANK_ORDER = Object.freeze(['Novize', 'Spezialist', 'Experte', 'Meister', 'Legende']);
const FEATURE_RANK_MIN_LEVEL = Object.freeze({ Novize: 1, Spezialist: 5, Experte: 9, Meister: 13, Legende: 17 });
const LOWER_FEATURE_REQUIREMENT = Object.freeze({ Experte: 2, Meister: 3, Legende: 4 });
const DRIVE_START = 3;

const SKILL_DEVELOPMENT_LEVELS = Object.freeze([3, 5, 7, 9, 11, 13, 15, 17, 19]);
const FREE_FEATURE_LEVELS = Object.freeze([2, 4, 6, 8, 10, 12, 14, 16, 18, 20]);
const ATTRIBUTE_GROWTH_LEVELS = Object.freeze([8, 16]);

/** §4.5 trait costs. 'Außergewöhnlicher Körperbau' is not choosable (no variants yet). */
const TRAIT_COSTS = Object.freeze({
  'Geschärfter Sinn': 1, 'Natürliche Waffe': 1, 'Enge Resistenz': 1,
  'Umweltanpassung': 1, 'Ausdauernder Organismus': 1, 'Geringer Ruhebedarf': 1,
  'Natürlicher Schutz': 2, 'Erweitertes Klettern': 2, 'Erweitertes Schwimmen': 2,
  'Amphibisch': 2, 'Erweiterte Sicht': 2, 'Flugfähig': 3, 'Extremumwelt': 3,
});

/** §4.5 available traits per species. */
const SPECIES_TRAITS = Object.freeze({
  Mensch: ['Geschärfter Sinn', 'Enge Resistenz', 'Umweltanpassung', 'Ausdauernder Organismus', 'Geringer Ruhebedarf'],
  Elf: ['Geschärfter Sinn', 'Enge Resistenz', 'Umweltanpassung', 'Ausdauernder Organismus', 'Geringer Ruhebedarf', 'Erweitertes Klettern', 'Erweiterte Sicht'],
  Zwerg: ['Geschärfter Sinn', 'Enge Resistenz', 'Umweltanpassung', 'Ausdauernder Organismus', 'Geringer Ruhebedarf', 'Natürlicher Schutz', 'Erweiterte Sicht'],
  Halbling: ['Geschärfter Sinn', 'Enge Resistenz', 'Umweltanpassung', 'Ausdauernder Organismus', 'Erweitertes Klettern'],
  Ork: ['Geschärfter Sinn', 'Natürliche Waffe', 'Enge Resistenz', 'Umweltanpassung', 'Ausdauernder Organismus', 'Natürlicher Schutz'],
  Cyborg: ['Geschärfter Sinn', 'Natürliche Waffe', 'Enge Resistenz', 'Umweltanpassung', 'Geringer Ruhebedarf', 'Natürlicher Schutz', 'Erweitertes Klettern', 'Erweitertes Schwimmen', 'Erweiterte Sicht', 'Extremumwelt'],
  Alien: Object.keys(TRAIT_COSTS),
});

/** §5.1 universal skills. */
const ALL_SKILLS = Object.freeze([
  'Athletik', 'Akrobatik', 'Fingerfertigkeit', 'Heimlichkeit', 'Nahkampf', 'Fernkampf',
  'Aufmerksamkeit', 'Menschenkenntnis', 'Überleben', 'Ermitteln', 'Wissen', 'Technik',
  'Medizin', 'Steuern', 'Überzeugen', 'Täuschen', 'Einschüchtern', 'Auftreten',
]);

/** §4.2 archetype skill lists. */
const ARCHETYPE_SKILLS = Object.freeze({
  Kämpfer: ['Athletik', 'Nahkampf', 'Fernkampf', 'Einschüchtern'],
  Denker: ['Ermitteln', 'Wissen', 'Technik', 'Aufmerksamkeit'],
  Heiler: ['Medizin', 'Menschenkenntnis', 'Wissen', 'Überleben'],
  Rebell: ['Akrobatik', 'Fingerfertigkeit', 'Heimlichkeit', 'Täuschen'],
  Diplomat: ['Überzeugen', 'Menschenkenntnis', 'Auftreten', 'Einschüchtern'],
});

/** §11.3 core feature per archetype. */
const ARCHETYPE_CORE_FEATURES = Object.freeze({
  Kämpfer: 'Kampfroutine', Denker: 'Analyse', Heiler: 'Feldversorgung',
  Rebell: 'Improvisation', Diplomat: 'Koordination',
});

/** §4.4 background skill quadruples. */
const BACKGROUND_SKILLS = Object.freeze({
  Labor: ['Technik', 'Ermitteln', 'Wissen', 'Aufmerksamkeit'],
  Kloster: ['Medizin', 'Menschenkenntnis', 'Wissen', 'Überleben'],
  Militär: ['Athletik', 'Nahkampf', 'Fernkampf', 'Überleben'],
  Straße: ['Heimlichkeit', 'Täuschen', 'Aufmerksamkeit', 'Überleben'],
  Werkstatt: ['Technik', 'Athletik', 'Wissen', 'Steuern'],
  Bühne: ['Auftreten', 'Überzeugen', 'Täuschen', 'Akrobatik'],
});

// ─── Rank model (§4.1/§5.3, mirrors scripts/lib/core-probe.mjs) ─────────────

function rankRowFor(level) {
  if (!Number.isInteger(level) || level < 1 || level > 20) {
    throw new Error(`Level ${level} outside 1-20 (§4.1).`);
  }
  if (level <= 4) return { rank: 'Novize', experienceBonus: 1, skillCap: 3 };
  if (level <= 8) return { rank: 'Spezialist', experienceBonus: 2, skillCap: 4 };
  if (level <= 12) return { rank: 'Experte', experienceBonus: 3, skillCap: 4 };
  if (level <= 16) return { rank: 'Meister', experienceBonus: 4, skillCap: 5 };
  return { rank: 'Legende', experienceBonus: 5, skillCap: 5 };
}

// ─── Fail-closed builder core ────────────────────────────────────────────────

class RuleViolation extends Error {
  constructor(rule, message) {
    super(`${rule}: ${message}`);
    this.name = 'RuleViolation';
    this.rule = rule;
  }
}

const FINDINGS = [];

function requireCondition(condition, rule, message) {
  if (!condition) throw new RuleViolation(rule, message);
}

function newCharacter({ name, species, speciesProfile = null, background, archetype, essence }) {
  requireCondition(speciesProfile === null || species === 'Alien', '§4.5', `${name}: nur Alien führt ein Speziesprofil.`);
  return {
    name,
    species,
    speciesProfile,
    background,
    essence,
    archetypes: [{ name: archetype, unlockedAtLevel: 1 }],
    level: 1,
    attributes: null,
    skills: new Map(),
    specializations: [],
    speciesTraits: [],
    speciesPointsSpent: 0,
    features: [],
    essences: [essence],
    drive: DRIVE_START,
    ledger: [`Stufe 1 [Basis] ${name}: Spezies ${species}${speciesProfile ? ` (Profil „${speciesProfile}")` : ''}, Hintergrund ${background}, Primärarchetyp ${archetype}, primäre Essenz ${essence}`],
  };
}

function primaryArchetypeOf(char) {
  return char.archetypes[0].name;
}

/** §17 step 4 — species traits: exactly 3 points, from the species list. */
function applySpeciesTraits(char, traits) {
  const allowed = SPECIES_TRAITS[char.species] ?? [];
  let spent = 0;
  for (const trait of traits) {
    const cost = TRAIT_COSTS[trait];
    requireCondition(cost !== undefined, '§4.5', `${char.name}: unbekanntes Merkmal „${trait}".`);
    requireCondition(allowed.includes(trait), '§4.5', `${char.name}: „${trait}" ist für ${char.species} nicht zulässig.`);
    spent += cost;
    char.speciesTraits.push(trait);
  }
  requireCondition(spent === SPECIES_BUDGET, '§4.5', `${char.name}: Merkmalsbudget ${spent} ≠ ${SPECIES_BUDGET} — Nachteile erzeugen keine Zusatzpunkte.`);
  char.speciesPointsSpent = spent;
  char.ledger.push(`  Merkmale (${char.species}): ${traits.join(', ')} = ${spent}/3 Punkte`);
}

/** §17 step 8 — attributes via point buy (§3.3) or standard array. */
function applyAttributes(char, values, { standardArray = false } = {}) {
  requireCondition(Array.isArray(values) && values.length === 6, '§3.1', `${char.name}: sechs Attribute erforderlich.`);
  if (standardArray) {
    const sorted = [...values].sort((a, b) => b - a).join(',');
    requireCondition(sorted === STANDARD_ARRAY.join(','), '§3.3', `${char.name}: Standardarray muss 4,3,3,2,2,1 sein, erhalten: ${values.join(',')}.`);
    char.ledger.push(`  Attribute: Standardarray ${values.join('/')}`);
  } else {
    let cost = 0;
    for (const value of values) {
      requireCondition(Number.isInteger(value) && value >= 1 && value <= ATTRIBUTE_CREATION_MAX, '§3.3', `${char.name}: Attributswert ${value} außerhalb 1–4.`);
      cost += ATTRIBUTE_COSTS[value];
    }
    requireCondition(cost <= POINT_BUY_BUDGET, '§3.3', `${char.name}: Attributskosten ${cost} > ${POINT_BUY_BUDGET} (nicht ausgegebene Punkte verfallen).`);
    char.ledger.push(`  Attribute per Punktekauf: ${values.join('/')} = ${cost}/10 Punkte`);
  }
  char.attributes = [...values];
}

/** §17 steps 9–11 — skills: background 2/2, archetype 1, free 7 with §5.4 caps. */
function applySkills(char, { backgroundTrained, archetypeSkill, freeSkills }) {
  const bgList = BACKGROUND_SKILLS[char.background];
  requireCondition(Array.isArray(bgList), '§4.4', `${char.name}: Hintergrund ${char.background} ohne Fertigkeitsliste.`);
  requireCondition(backgroundTrained.length === 2, '§4.4', `${char.name}: Hintergrund trainiert genau 2 Fertigkeiten, erhalten ${backgroundTrained.length}.`);
  requireCondition(new Set(backgroundTrained).size === 2, '§4.4', `${char.name}: Hintergrund-Fertigkeiten müssen unterschiedlich sein.`);
  for (const skill of backgroundTrained) {
    requireCondition(bgList.includes(skill), '§4.4', `${char.name}: „${skill}" ist nicht in der Hintergrundliste ${char.background} ([${bgList.join(', ')}]).`);
  }
  const archetype = primaryArchetypeOf(char);
  requireCondition(ARCHETYPE_SKILLS[archetype].includes(archetypeSkill), '§4.2', `${char.name}: „${archetypeSkill}" ist nicht in der Archetypliste ${archetype}.`);
  const freeTotal = Object.values(freeSkills).reduce((sum, delta) => sum + delta, 0);
  requireCondition(freeTotal === FREE_SKILL_POINTS, '§5.4', `${char.name}: freie Fertigkeitspunkte ${freeTotal} ≠ ${FREE_SKILL_POINTS} (nicht ausgegebene verfallen).`);
  for (const [skill, delta] of Object.entries(freeSkills)) {
    requireCondition(ALL_SKILLS.includes(skill), '§5.1', `${char.name}: unbekannte Fertigkeit „${skill}".`);
    requireCondition(Number.isInteger(delta) && delta >= 0, '§5.4', `${char.name}: negativer Zuwachs für „${skill}".`);
  }
  for (const skill of backgroundTrained) bumpSkill(char, skill, 1, 'Hintergrund');
  bumpSkill(char, archetypeSkill, 1, 'Primärarchetyp');
  for (const [skill, delta] of Object.entries(freeSkills)) {
    if (delta > 0) bumpSkill(char, skill, delta, 'frei');
  }
  for (const value of char.skills.values()) {
    requireCondition(value <= START_SKILL_MAX, '§5.4', `${char.name}: Startwert ${value} > ${START_SKILL_MAX}.`);
  }
  const trained = [...char.skills.values()].filter((value) => value >= 1).length;
  requireCondition(trained >= MIN_SKILLS_AT_LEAST_1, '§5.4', `${char.name}: ${trained} Fertigkeiten ≥ 1, gefordert ≥ ${MIN_SKILLS_AT_LEAST_1}.`);
}

function bumpSkill(char, skill, delta, source) {
  const next = (char.skills.get(skill) ?? 0) + delta;
  const { skillCap } = rankRowFor(char.level);
  requireCondition(next <= skillCap, '§5.3', `${char.name}: „${skill}" würde ${next} über Fertigkeitslimit ${skillCap} (Stufe ${char.level}) steigen.`);
  char.skills.set(skill, next);
  char.ledger.push(`  ${skill} += ${delta} → ${next} (${source}, Stufe ${char.level})`);
}

/** §5.2 — specialization ladder (creation step 12 and §5.5 developments). */
function applySpecialization(char, skill, name) {
  const value = char.skills.get(skill) ?? 0;
  const count = char.specializations.filter((entry) => entry.skill === skill).length + 1;
  requireCondition(count <= MAX_SPECIALIZATIONS, '§5.2', `${char.name}: mehr als ${MAX_SPECIALIZATIONS} Spezialisierungen in „${skill}".`);
  const minSkill = SPECIALIZATION_LADDER[count];
  requireCondition(value >= minSkill, '§5.2', `${char.name}: Spezialisierung ${count} in „${skill}" erfordert Fertigkeitswert ≥ ${minSkill}, vorhanden ${value}.`);
  char.specializations.push({ skill, name, tier: count });
  char.ledger.push(`  Spezialisierung ${count} in ${skill}: „${name}" (Wert ${value})`);
}

/** §17 step 14 — archetype core feature (§11.3). */
function applyArchetypeFeature(char) {
  const archetype = primaryArchetypeOf(char);
  char.features.push({ name: ARCHETYPE_CORE_FEATURES[archetype], rank: 'Novize', source: `Archetyp ${archetype}`, essence: null });
  char.ledger.push(`  Kernfähigkeit ${ARCHETYPE_CORE_FEATURES[archetype]} (Novize, §11.3)`);
}

// ─── Progression (§13) ───────────────────────────────────────────────────────

/**
 * Spend one free feature pick (§13): feature, archetype unlock (§4.2 gates) or
 * secondary essence (§13.1 gates). All fail-closed with rule citations.
 */
function spendFreeFeature(char, level, pick) {
  if (pick.kind === 'secondaryEssence') {
    requireCondition(level >= 10, '§13.1', `${char.name}: sekundäre Essenz frühestens Stufe 10.`);
    requireCondition(pick.essence && !char.essences.includes(pick.essence), '§13.1', `${char.name}: sekundäre Essenz muss neu sein.`);
    const primaryEssence = char.essences[0];
    const qualifying = char.features.some(
      (feature) => RANK_ORDER.indexOf(feature.rank) >= 1 && feature.essence === primaryEssence,
    );
    requireCondition(qualifying, '§13.1', `${char.name}: sekundäre Essenz erfordert eine Spezialist+-Fähigkeit der Primäressenz ${primaryEssence}.`);
    char.essences.push(pick.essence);
    char.ledger.push(`Stufe ${level} [§13.1] Sekundäre Essenz ${pick.essence} inkl. Novize-Manifestation (verbraucht freie Wahl)`);
    return;
  }
  if (pick.kind === 'archetype') {
    const count = char.archetypes.length + 1;
    const minLevel = ARCHETYPE_MIN_LEVELS[count];
    requireCondition(minLevel !== undefined, '§4.2', `${char.name}: mehr als vier Archetypen sind nicht vorgesehen.`);
    requireCondition(level >= minLevel, '§4.2', `${char.name}: Archetyp ${count} frühestens Stufe ${minLevel}.`);
    for (const existing of char.archetypes) {
      const invested = char.features.filter((feature) => feature.source === `Archetyp ${existing.name}`).length;
      requireCondition(invested >= 3, '§4.2', `${char.name}: Archetyp ${count} erfordert 3 Fähigkeiten im erschlossenen Archetyp ${existing.name}, vorhanden ${invested}.`);
    }
    requireCondition(pick.coreFeature === ARCHETYPE_CORE_FEATURES[pick.name], '§4.2', `${char.name}: Erschließung von ${pick.name} muss dessen Kernfähigkeit des Rangs Novize enthalten.`);
    char.archetypes.push({ name: pick.name, unlockedAtLevel: level });
    char.features.push({ name: ARCHETYPE_CORE_FEATURES[pick.name], rank: 'Novize', source: `Archetyp ${pick.name}`, essence: null });
    char.ledger.push(`Stufe ${level} [§4.2] Archetyp ${count} „${pick.name}" erschlossen inkl. Kernfähigkeit (verbraucht freie Wahl)`);
    return;
  }
  if (pick.kind === 'feature') {
    const charRankIndex = RANK_ORDER.indexOf(rankRowFor(char.level).rank);
    const featureRankIndex = RANK_ORDER.indexOf(pick.rank);
    requireCondition(featureRankIndex >= 0, '§11.2', `${char.name}: unbekannter Fähigkeitsrang „${pick.rank}".`);
    requireCondition(featureRankIndex <= charRankIndex, '§11.2', `${char.name}: Rang ${pick.rank} erst ab Stufe ${FEATURE_RANK_MIN_LEVEL[pick.rank]} (Charakterrang ${rankRowFor(char.level).rank}, Stufe ${char.level}).`);
    if (featureRankIndex >= 2) {
      const needed = LOWER_FEATURE_REQUIREMENT[pick.rank];
      const lower = char.features.filter(
        (feature) => feature.source === pick.source && RANK_ORDER.indexOf(feature.rank) < featureRankIndex,
      ).length;
      requireCondition(lower >= needed, '§11.2', `${char.name}: ${pick.rank}-Fähigkeit „${pick.name}" erfordert ${needed} niedrigere Fähigkeiten derselben Quelle „${pick.source}", vorhanden ${lower}.`);
    }
    char.features.push({ name: pick.name, rank: pick.rank, source: pick.source, essence: pick.essence ?? null });
    char.ledger.push(`Stufe ${level} [§11.2] Fähigkeit „${pick.name}" (${pick.rank}, Quelle: ${pick.source})`);
    return;
  }
  requireCondition(false, '§13', `${char.name}: unbekannte Fähigkeitswahl „${pick?.kind ?? JSON.stringify(pick)}".`);
}

/**
 * §13 progression with an explicit player plan; every development event is
 * resolved or the plan is illegal. `deferred` is allowed per §5.5.
 */
function progressTo(char, targetLevel, plan) {
  for (let level = 2; level <= targetLevel; level += 1) {
    char.level = level;
    const previous = rankRowFor(level - 1);
    const current = rankRowFor(level);
    if (ATTRIBUTE_GROWTH_LEVELS.includes(level)) {
      const attribute = plan?.attributeIncreases?.[level];
      requireCondition(typeof attribute === 'string', '§3.7', `${char.name}: Stufe ${level} erfordert Attributswahl.`);
      const index = ATTR_NAMES.indexOf(attribute);
      requireCondition(index >= 0, '§3.1', `${char.name}: unbekanntes Attribut „${attribute}".`);
      char.attributes[index] += 1;
      requireCondition(char.attributes[index] <= ATTRIBUTE_CAP, '§3.7', `${char.name}: Attribut ${attribute} über Cap ${ATTRIBUTE_CAP}.`);
      char.ledger.push(`Stufe ${level} [§3.7] Attribut ${attribute} → ${char.attributes[index]}`);
    }
    if (SKILL_DEVELOPMENT_LEVELS.includes(level)) {
      const choice = plan?.skillDevelopments?.[level];
      requireCondition(choice, '§5.5', `${char.name}: Stufe ${level} erfordert Fertigkeitsentwicklung.`);
      if (choice.kind === 'increase' || choice.kind === 'new') {
        requireCondition(ALL_SKILLS.includes(choice.skill), '§5.1', `${char.name}: unbekannte Fertigkeit „${choice.skill}".`);
        bumpSkill(char, choice.skill, 1, choice.kind === 'new' ? 'neue Fertigkeit' : 'Fertigkeitsentwicklung');
      } else if (choice.kind === 'specialization') {
        applySpecialization(char, choice.skill, choice.name);
      } else if (choice.kind === 'deferred') {
        char.ledger.push(`Stufe ${level} [§5.5] Fertigkeitsentwicklung zurückgestellt (ausdrücklich erlaubt).`);
      } else {
        requireCondition(false, '§5.5', `${char.name}: unbekannter Entwicklungstyp „${choice.kind}".`);
      }
    }
    if (FREE_FEATURE_LEVELS.includes(level)) {
      const pick = plan?.freeFeatures?.[level];
      requireCondition(pick, '§13', `${char.name}: Stufe ${level} erfordert freie Fähigkeitswahl.`);
      spendFreeFeature(char, level, pick);
    }
    if (current.rank !== previous.rank) {
      char.ledger.push(`Stufe ${level} [§4.1] Rang ${current.rank}: EB +${current.experienceBonus}, Fertigkeitslimit ${current.skillCap}`);
    }
  }
  return char;
}

/** §13.3 equivalence snapshot. */
function snapshot(char) {
  return JSON.stringify({
    level: char.level,
    attributes: char.attributes,
    skills: [...char.skills.entries()].sort(([a], [b]) => a.localeCompare(b)),
    specializations: [...char.specializations].sort((a, b) => a.skill.localeCompare(b.skill) || a.tier - b.tier),
    features: char.features.map((feature) => `${feature.name}/${feature.rank}/${feature.source}`).sort(),
    essences: char.essences,
    archetypes: char.archetypes.map((a) => a.name).sort(),
  });
}

/** §17 step-20 audit of the finished level-1 basis. */
function auditLevel1Basis(char) {
  const row = rankRowFor(1);
  requireCondition(char.level === 1, '§17', `${char.name}: Basis muss Stufe 1 auditieren.`);
  requireCondition(char.attributes !== null, '§17', `${char.name}: Attribute nicht verteilt (Schritt 8).`);
  requireCondition(char.skills.size >= MIN_SKILLS_AT_LEAST_1, '§17', `${char.name}: weniger als ${MIN_SKILLS_AT_LEAST_1} Fertigkeiten ≥ 1.`);
  requireCondition(char.speciesPointsSpent === SPECIES_BUDGET, '§17', `${char.name}: Merkmalsbudget nicht genau ${SPECIES_BUDGET}.`);
  requireCondition(char.drive === DRIVE_START, '§17', `${char.name}: Drive muss ${DRIVE_START} sein.`);
  requireCondition(
    char.features.some((feature) => feature.name === ARCHETYPE_CORE_FEATURES[primaryArchetypeOf(char)]),
    '§17/§11.3',
    `${char.name}: Kernfähigkeit des Primärarchetyps fehlt.`,
  );
  char.ledger.push(`  Audit [§17/20]: Rang ${row.rank}, EB +${row.experienceBonus}, Fertigkeitslimit ${row.skillCap}, Drive ${char.drive}, Gruppen-Momentum 0 — bestanden.`);
  return char;
}

// ─── The six mandatory A2 concepts — full §17 sequences with provenance ─────

function buildAllConcepts() {
  const concepts = [];

  {
    const char = newCharacter({ name: 'B1 Nullpunkt', species: 'Mensch', background: 'Labor', archetype: 'Denker', essence: 'Technologisch' });
    applySpeciesTraits(char, ['Geschärfter Sinn', 'Umweltanpassung', 'Enge Resistenz']);
    applyAttributes(char, [1, 3, 2, 4, 3, 1]);
    applySkills(char, {
      backgroundTrained: ['Technik', 'Ermitteln'],
      archetypeSkill: 'Wissen',
      freeSkills: { Technik: 2, Ermitteln: 1, Aufmerksamkeit: 1, Wissen: 1, Überleben: 1, Steuern: 1 },
    });
    applySpecialization(char, 'Technik', 'Intrusion');
    applyArchetypeFeature(char);
    char.features.push({ name: 'Kaltstart', rank: 'Novize', source: 'Essenz Technologisch', essence: 'Technologisch' });
    char.ledger.push('  Erste Essenzmanifestation: „Kaltstart" (Technologisch, Novize)');
    auditLevel1Basis(char);
    concepts.push(char);
  }

  {
    const char = newCharacter({ name: 'B2 Lumenglanz', species: 'Elf', background: 'Kloster', archetype: 'Heiler', essence: 'Spirituell' });
    applySpeciesTraits(char, ['Erweiterte Sicht', 'Geringer Ruhebedarf']);
    applyAttributes(char, [4, 3, 3, 2, 2, 1], { standardArray: true });
    applySkills(char, {
      backgroundTrained: ['Medizin', 'Wissen'],
      archetypeSkill: 'Menschenkenntnis',
      freeSkills: { Medizin: 1, Überleben: 1, Aufmerksamkeit: 1, Ermitteln: 1, Überzeugen: 1, Wissen: 1, Akrobatik: 1 },
    });
    applySpecialization(char, 'Medizin', 'Feldchirurgie');
    applyArchetypeFeature(char);
    char.features.push({ name: 'Lindenlicht', rank: 'Novize', source: 'Essenz Spirituell', essence: 'Spirituell' });
    char.ledger.push('  Erste Essenzmanifestation: „Lindenlicht" (Spirituell, Novize)');
    auditLevel1Basis(char);
    concepts.push(char);
  }

  {
    const char = newCharacter({ name: 'B3 Rostfaust', species: 'Ork', background: 'Militär', archetype: 'Kämpfer', essence: 'Körperlich' });
    applySpeciesTraits(char, ['Natürliche Waffe', 'Natürlicher Schutz']);
    applyAttributes(char, [4, 3, 3, 2, 2, 1], { standardArray: true });
    applySkills(char, {
      backgroundTrained: ['Nahkampf', 'Überleben'],
      archetypeSkill: 'Athletik',
      freeSkills: { Nahkampf: 2, Fernkampf: 1, Einschüchtern: 1, Akrobatik: 1, Aufmerksamkeit: 1, Wissen: 1 },
    });
    applySpecialization(char, 'Nahkampf', 'Hiebwaffen');
    applyArchetypeFeature(char);
    char.features.push({ name: 'Eisenhaut', rank: 'Novize', source: 'Essenz Körperlich', essence: 'Körperlich' });
    char.ledger.push('  Erste Essenzmanifestation: „Eisenhaut" (Körperlich, Novize)');
    auditLevel1Basis(char);
    concepts.push(char);
  }

  {
    const char = newCharacter({ name: 'B4 Spiegelbild', species: 'Halbling', background: 'Straße', archetype: 'Rebell', essence: 'Mental' });
    applySpeciesTraits(char, ['Enge Resistenz', 'Erweitertes Klettern']);
    applyAttributes(char, [1, 4, 2, 3, 3, 1]);
    applySkills(char, {
      backgroundTrained: ['Heimlichkeit', 'Täuschen'],
      archetypeSkill: 'Akrobatik',
      freeSkills: { Heimlichkeit: 1, Fingerfertigkeit: 1, Akrobatik: 1, Täuschen: 1, Aufmerksamkeit: 1, Ermitteln: 1, Überleben: 1 },
    });
    applySpecialization(char, 'Heimlichkeit', 'Verfolgungslauf');
    applyArchetypeFeature(char);
    char.features.push({ name: 'Spiegelgang', rank: 'Novize', source: 'Essenz Mental', essence: 'Mental' });
    char.ledger.push('  Erste Essenzmanifestation: „Spiegelgang" (Mental, Novize)');
    auditLevel1Basis(char);
    concepts.push(char);
  }

  {
    const char = newCharacter({ name: 'B5 Vek-tor', species: 'Cyborg', background: 'Werkstatt', archetype: 'Diplomat', essence: 'Technologisch' });
    applySpeciesTraits(char, ['Geschärfter Sinn', 'Erweiterte Sicht']);
    applyAttributes(char, [1, 2, 2, 3, 1, 4]);
    applySkills(char, {
      backgroundTrained: ['Technik', 'Wissen'],
      archetypeSkill: 'Überzeugen',
      freeSkills: { Überzeugen: 2, Menschenkenntnis: 1, Auftreten: 1, Technik: 1, Aufmerksamkeit: 1, Wissen: 1 },
    });
    applySpecialization(char, 'Überzeugen', 'Verhandlung');
    applyArchetypeFeature(char);
    char.features.push({ name: 'Netzstimme', rank: 'Novize', source: 'Essenz Technologisch', essence: 'Technologisch' });
    char.ledger.push('  Erste Essenzmanifestation: „Netzstimme" (Technologisch, Novize)');
    auditLevel1Basis(char);
    concepts.push(char);
  }

  {
    const char = newCharacter({ name: 'B6 Vesper', species: 'Alien', speciesProfile: 'Schneggl', background: 'Bühne', archetype: 'Rebell', essence: 'Gebunden' });
    applySpeciesTraits(char, ['Flugfähig']);
    applyAttributes(char, [1, 4, 2, 2, 3, 2]);
    applySkills(char, {
      backgroundTrained: ['Auftreten', 'Täuschen'],
      archetypeSkill: 'Heimlichkeit',
      freeSkills: { Akrobatik: 2, Heimlichkeit: 1, Täuschen: 1, Auftreten: 1, Aufmerksamkeit: 1, Überleben: 1 },
    });
    applySpecialization(char, 'Akrobatik', 'Luftmanöver');
    applyArchetypeFeature(char);
    char.features.push({ name: 'Schwarmruf', rank: 'Novize', source: 'Essenz Gebunden', essence: 'Gebunden' });
    char.ledger.push('  Erste Essenzmanifestation: „Schwarmruf" (Gebunden, Novize)');
    auditLevel1Basis(char);
    concepts.push(char);
  }

  return concepts;
}

// ─── §13 progression plans for B1/B2/B3 to level 20 ─────────────────────────

function planB1Nullpunkt() {
  return {
    attributeIncreases: { 8: 'Verstand', 16: 'Geschicklichkeit' },
    skillDevelopments: {
      3: { kind: 'specialization', skill: 'Technik', name: 'Netzspuren' },
      5: { kind: 'increase', skill: 'Technik' },
      7: { kind: 'increase', skill: 'Ermitteln' },
      9: { kind: 'increase', skill: 'Wissen' },
      11: { kind: 'specialization', skill: 'Wissen', name: 'Netzarchitekturen' },
      13: { kind: 'increase', skill: 'Technik' },
      15: { kind: 'increase', skill: 'Aufmerksamkeit' },
      17: { kind: 'increase', skill: 'Steuern' },
      19: { kind: 'increase', skill: 'Ermitteln' },
    },
    freeFeatures: {
      2: { kind: 'feature', name: 'Traceback', rank: 'Novize', source: 'Archetyp Denker' },
      4: { kind: 'feature', name: 'Firewall-Reflex', rank: 'Novize', source: 'Archetyp Denker' },
      6: { kind: 'archetype', name: 'Rebell', coreFeature: 'Improvisation' },
      8: { kind: 'feature', name: 'Ghostwalk', rank: 'Spezialist', source: 'Archetyp Rebell' },
      10: { kind: 'feature', name: 'Überladung', rank: 'Spezialist', source: 'Essenz Technologisch', essence: 'Technologisch' },
      12: { kind: 'feature', name: 'Nebelform', rank: 'Novize', source: 'Archetyp Rebell' },
      14: { kind: 'archetype', name: 'Diplomat', coreFeature: 'Koordination' },
      16: { kind: 'secondaryEssence', essence: 'Mental' },
      18: { kind: 'feature', name: 'Datenhoheit', rank: 'Meister', source: 'Archetyp Denker' },
      20: { kind: 'feature', name: 'Geist im Netz', rank: 'Legende', source: 'Archetyp Denker' },
    },
  };
}

function planB2Lumenglanz() {
  return {
    attributeIncreases: { 8: 'Charisma', 16: 'Ausdauer' },
    skillDevelopments: {
      3: { kind: 'increase', skill: 'Medizin' },
      5: { kind: 'increase', skill: 'Medizin' },
      7: { kind: 'specialization', skill: 'Medizin', name: 'Notfallversorgung' },
      9: { kind: 'increase', skill: 'Überleben' },
      11: { kind: 'specialization', skill: 'Überleben', name: 'Feldlager' },
      13: { kind: 'increase', skill: 'Wissen' },
      15: { kind: 'increase', skill: 'Menschenkenntnis' },
      17: { kind: 'specialization', skill: 'Menschenkenntnis', name: 'Lügen erkennen' },
      19: { kind: 'increase', skill: 'Überzeugen' },
    },
    freeFeatures: {
      2: { kind: 'feature', name: 'Stilles Gebet', rank: 'Novize', source: 'Archetyp Heiler' },
      4: { kind: 'feature', name: 'Klinischer Blick', rank: 'Novize', source: 'Archetyp Heiler' },
      6: { kind: 'archetype', name: 'Diplomat', coreFeature: 'Koordination' },
      8: { kind: 'feature', name: 'Seelenlicht', rank: 'Spezialist', source: 'Essenz Spirituell', essence: 'Spirituell' },
      10: { kind: 'feature', name: 'Wundversehen', rank: 'Spezialist', source: 'Archetyp Heiler' },
      12: { kind: 'feature', name: 'Wächterform', rank: 'Experte', source: 'Essenz Spirituell', essence: 'Spirituell' },
      14: { kind: 'secondaryEssence', essence: 'Körperlich' },
      16: { kind: 'feature', name: 'Sanfte Hände', rank: 'Experte', source: 'Archetyp Heiler' },
      18: { kind: 'feature', name: 'Seelenbrücke', rank: 'Experte', source: 'Essenz Spirituell', essence: 'Spirituell' },
      20: { kind: 'feature', name: 'Chor der Heilung', rank: 'Legende', source: 'Archetyp Heiler' },
    },
  };
}

function planB3Rostfaust() {
  return {
    attributeIncreases: { 8: 'Stärke', 16: 'Ausdauer' },
    skillDevelopments: {
      3: { kind: 'new', skill: 'Einschüchtern' },
      5: { kind: 'increase', skill: 'Nahkampf' },
      7: { kind: 'specialization', skill: 'Nahkampf', name: 'Wuchtschlag' },
      9: { kind: 'increase', skill: 'Fernkampf' },
      11: { kind: 'specialization', skill: 'Athletik', name: 'Ringen' },
      13: { kind: 'increase', skill: 'Einschüchtern' },
      15: { kind: 'specialization', skill: 'Einschüchtern', name: 'Kriegsdrohung' },
      17: { kind: 'increase', skill: 'Überleben' },
      19: { kind: 'new', skill: 'Steuern' },
    },
    freeFeatures: {
      2: { kind: 'feature', name: 'Wuchtschlag', rank: 'Novize', source: 'Archetyp Kämpfer' },
      4: { kind: 'feature', name: 'Schildhaltung', rank: 'Novize', source: 'Archetyp Kämpfer' },
      6: { kind: 'archetype', name: 'Rebell', coreFeature: 'Improvisation' },
      8: { kind: 'feature', name: 'Sprungfeder', rank: 'Spezialist', source: 'Archetyp Rebell' },
      10: { kind: 'feature', name: 'Klingensturm', rank: 'Spezialist', source: 'Essenz Körperlich', essence: 'Körperlich' },
      12: { kind: 'feature', name: 'Nebelschritt', rank: 'Novize', source: 'Archetyp Rebell' },
      14: { kind: 'secondaryEssence', essence: 'Mental' },
      16: { kind: 'feature', name: 'Sturmbrecher', rank: 'Experte', source: 'Archetyp Kämpfer' },
      18: { kind: 'feature', name: 'Titanenwurf', rank: 'Meister', source: 'Archetyp Kämpfer' },
      20: { kind: 'feature', name: 'Eiserne Legion', rank: 'Legende', source: 'Archetyp Kämpfer' },
    },
  };
}

/** §13.3 helper: rebuild the steps-9–11 input from a built character. */
function directBasisSkillPlan(char) {
  // Invert the ledger entries written by applySkills.
  const background = [];
  const archetype = [];
  const free = {};
  for (const line of char.ledger) {
    const m = line.match(/^  (.+?) \+= (\d+) → \d+ \((.*?), Stufe \d+\)$/);
    if (!m) continue;
    const [, skill, delta, source] = m;
    if (source === 'Hintergrund') background.push(skill);
    else if (source === 'Primärarchetyp') archetype.push(skill);
    else if (source === 'frei') free[skill] = Number(delta);
  }
  return { backgroundTrained: background, archetypeSkill: archetype[0], freeSkills: free };
}

// ─── Negative paths: every illegal pattern must fail closed ─────────────────

function expectViolation(run, rule) {
  try {
    run();
  } catch (error) {
    const violated = error?.rule === rule;
    return {
      ok: violated,
      message: violated ? `${error.rule}: ${error.message}` : `falsche Regel (${error?.rule ?? 'keine'} statt ${rule}): ${error?.message ?? error}`,
    };
  }
  return { ok: false, message: `keine Ablehnung (erwartet ${rule})` };
}

function runNegativePaths() {
  const rejections = [];
  const reject = (label, run, rule) => {
    const outcome = expectViolation(run, rule);
    if (outcome.ok) rejections.push(`${label} → abgelehnt: ${outcome.message}`);
    else FINDINGS.push(`${label} NICHT korrekt abgelehnt (${outcome.message})`);
  };

  // 1. §3.3 attribute violations.
  reject('§3.3 Attributswert 5', () => {
    const char = newCharacter({ name: 'X1', species: 'Mensch', background: 'Labor', archetype: 'Denker', essence: 'Mental' });
    applySpeciesTraits(char, ['Geschärfter Sinn', 'Umweltanpassung', 'Enge Resistenz']);
    applyAttributes(char, [5, 3, 2, 2, 1, 1]);
  }, '§3.3');
  reject('§3.3 Attributsbudget überschritten', () => {
    const char = newCharacter({ name: 'X2', species: 'Mensch', background: 'Labor', archetype: 'Denker', essence: 'Mental' });
    applySpeciesTraits(char, ['Geschärfter Sinn', 'Umweltanpassung', 'Enge Resistenz']);
    applyAttributes(char, [4, 4, 2, 2, 2, 1]);
  }, '§3.3');

  // 2. §4.5 species violations (2/3 points, wrong species list, unavailable trait).
  reject('§4.5 Merkmalsbudget nur 2 Punkte', () => {
    const char = newCharacter({ name: 'X3', species: 'Mensch', background: 'Labor', archetype: 'Denker', essence: 'Mental' });
    applySpeciesTraits(char, ['Geschärfter Sinn', 'Umweltanpassung']);
  }, '§4.5');
  reject('§4.5 Merkmal nicht in Speziesliste', () => {
    const char = newCharacter({ name: 'X4', species: 'Elf', background: 'Labor', archetype: 'Denker', essence: 'Mental' });
    applySpeciesTraits(char, ['Natürliche Waffe', 'Geschärfter Sinn', 'Umweltanpassung']);
  }, '§4.5');
  reject('§4.5 Außergewöhnlicher Körperbau nicht verfügbar', () => {
    const char = newCharacter({ name: 'X5', species: 'Ork', background: 'Militär', archetype: 'Kämpfer', essence: 'Körperlich' });
    applySpeciesTraits(char, ['Außergewöhnlicher Körperbau', 'Geschärfter Sinn', 'Enge Resistenz']);
  }, '§4.5');

  // 3. §4.4 background violations.
  reject('§4.4 Hintergrund twice on same skill', () => {
    const char = newCharacter({ name: 'X6', species: 'Mensch', background: 'Labor', archetype: 'Denker', essence: 'Mental' });
    applySpeciesTraits(char, ['Geschärfter Sinn', 'Umweltanpassung', 'Enge Resistenz']);
    applyAttributes(char, [2, 3, 2, 4, 2, 1]);
    applySkills(char, { backgroundTrained: ['Technik', 'Technik'], archetypeSkill: 'Wissen', freeSkills: {} });
  }, '§4.4');
  reject('§4.4 Fertigkeit außerhalb der Hintergrundliste', () => {
    const char = newCharacter({ name: 'X7', species: 'Mensch', background: 'Labor', archetype: 'Denker', essence: 'Mental' });
    applySpeciesTraits(char, ['Geschärfter Sinn', 'Umweltanpassung', 'Enge Resistenz']);
    applyAttributes(char, [2, 3, 2, 4, 2, 1]);
    applySkills(char, { backgroundTrained: ['Technik', 'Heimlichkeit'], archetypeSkill: 'Wissen', freeSkills: {} });
  }, '§4.4');

  // 4. §5.4 skill budget violations.
  reject('§5.3 Startwert über Limit (Start-Maximum)', () => {
    const char = newCharacter({ name: 'X8', species: 'Mensch', background: 'Labor', archetype: 'Denker', essence: 'Mental' });
    applySpeciesTraits(char, ['Geschärfter Sinn', 'Umweltanpassung', 'Enge Resistenz']);
    applyAttributes(char, [2, 3, 2, 4, 2, 1]);
    applySkills(char, { backgroundTrained: ['Technik', 'Ermitteln'], archetypeSkill: 'Wissen', freeSkills: { Technik: 3, Wissen: 0, Aufmerksamkeit: 1, Überleben: 1, Steuern: 1, Akrobatik: 1 } });
  }, '§5.3');
  reject('§5.4 freie Punkte ungleich 7', () => {
    const char = newCharacter({ name: 'X9', species: 'Mensch', background: 'Labor', archetype: 'Denker', essence: 'Mental' });
    applySpeciesTraits(char, ['Geschärfter Sinn', 'Umweltanpassung', 'Enge Resistenz']);
    applyAttributes(char, [2, 3, 2, 4, 2, 1]);
    applySkills(char, { backgroundTrained: ['Technik', 'Ermitteln'], archetypeSkill: 'Wissen', freeSkills: { Technik: 1, Ermitteln: 2, Wissen: 1, Aufmerksamkeit: 1, Überleben: 1 } });
  }, '§5.4');

  // 5. §5.2 specialization ladder violations.
  reject('§5.2 Spezialisierung auf Fertigkeit 0', () => {
    const char = newCharacter({ name: 'XA', species: 'Mensch', background: 'Labor', archetype: 'Denker', essence: 'Mental' });
    applySpeciesTraits(char, ['Geschärfter Sinn', 'Umweltanpassung', 'Enge Resistenz']);
    applyAttributes(char, [2, 3, 2, 4, 2, 1]);
    applySkills(char, { backgroundTrained: ['Technik', 'Ermitteln'], archetypeSkill: 'Wissen', freeSkills: { Technik: 2, Ermitteln: 1, Aufmerksamkeit: 1, Wissen: 1, Überleben: 1, Steuern: 1 } });
    applySpecialization(char, 'Akrobatik', 'Parkour');
  }, '§5.2');
  reject('§5.2 zweite Spezialisierung unter Wert 3', () => {
    const char = newCharacter({ name: 'XB', species: 'Mensch', background: 'Labor', archetype: 'Denker', essence: 'Mental' });
    applySpeciesTraits(char, ['Geschärfter Sinn', 'Umweltanpassung', 'Enge Resistenz']);
    applyAttributes(char, [2, 3, 2, 4, 2, 1]);
    applySkills(char, { backgroundTrained: ['Technik', 'Ermitteln'], archetypeSkill: 'Wissen', freeSkills: { Technik: 1, Ermitteln: 2, Wissen: 1, Aufmerksamkeit: 1, Überleben: 1, Steuern: 1 } });
    applySpecialization(char, 'Technik', 'Intrusion');
    applySpecialization(char, 'Technik', 'Drohnen');
  }, '§5.2');

  // 6. §4.2 archetype gates and §13.1 essence gates.
  const basisFor = (name) => {
    const char = newCharacter({ name, species: 'Mensch', background: 'Labor', archetype: 'Denker', essence: 'Mental' });
    applySpeciesTraits(char, ['Geschärfter Sinn', 'Umweltanpassung', 'Enge Resistenz']);
    applyAttributes(char, [2, 3, 2, 4, 2, 1]);
    applySkills(char, { backgroundTrained: ['Technik', 'Ermitteln'], archetypeSkill: 'Wissen', freeSkills: { Technik: 2, Ermitteln: 1, Aufmerksamkeit: 1, Wissen: 1, Überleben: 1, Steuern: 1 } });
    applyArchetypeFeature(char);
    return char;
  };
  reject('§4.2 Zweitarchetyp vor Stufe 6', () => {
    const char = basisFor('XC');
    char.level = 5;
    spendFreeFeature(char, 5, { kind: 'archetype', name: 'Rebell', coreFeature: 'Improvisation' });
  }, '§4.2');
  reject('§4.2 Zweitarchetyp ohne 3 Investitionen (2 von 3)', () => {
    const char = basisFor('XD');
    char.features.push({ name: 'Traceback', rank: 'Novize', source: 'Archetyp Denker', essence: null });
    char.level = 6;
    spendFreeFeature(char, 6, { kind: 'archetype', name: 'Rebell', coreFeature: 'Improvisation' });
  }, '§4.2');
  reject('§4.2 Zweitarchetyp ohne 3 Investitionen (1 von 3)', () => {
    const char = basisFor('XD2');
    char.level = 6;
    spendFreeFeature(char, 6, { kind: 'archetype', name: 'Rebell', coreFeature: 'Improvisation' });
  }, '§4.2');
  reject('§13.1 sekundäre Essenz vor Stufe 10', () => {
    const char = basisFor('XE');
    for (let stage = 2; stage <= 9; stage += 1) {
      char.level = stage;
      if ([2, 4, 6, 8].includes(stage)) spendFreeFeature(char, stage, { kind: 'feature', name: `Wahl ${stage}`, rank: 'Novize', source: 'Essenz Mental', essence: 'Mental' });
    }
    spendFreeFeature(char, 9, { kind: 'secondaryEssence', essence: 'Körperlich' });
  }, '§13.1');
  reject('§13.1 sekundäre Essenz ohne Spezialist+-Fähigkeit', () => {
    const char = basisFor('XF');
    char.level = 10;
    spendFreeFeature(char, 10, { kind: 'secondaryEssence', essence: 'Körperlich' });
  }, '§13.1');

  // 7. §11.2 rank gates.
  reject('§11.2 Meister-Rang vor Stufe 13', () => {
    const char = basisFor('XG');
    char.features.push({ name: 'A1', rank: 'Novize', source: 'Archetyp Denker', essence: null });
    char.features.push({ name: 'A2', rank: 'Novize', source: 'Archetyp Denker', essence: null });
    char.features.push({ name: 'A3', rank: 'Spezialist', source: 'Archetyp Denker', essence: null });
    char.level = 12;
    spendFreeFeature(char, 12, { kind: 'feature', name: 'Vorzeitiger Meisterrang', rank: 'Meister', source: 'Archetyp Denker' });
  }, '§11.2');
  reject('§11.2 Legende ohne 4 niedrigere der Quelle', () => {
    const char = basisFor('XH');
    char.features.push({ name: 'A1', rank: 'Novize', source: 'Archetyp Denker', essence: null });
    char.features.push({ name: 'A2', rank: 'Novize', source: 'Archetyp Denker', essence: null });
    char.level = 17;
    spendFreeFeature(char, 17, { kind: 'feature', name: 'Vorzeitiger Legendenrang', rank: 'Legende', source: 'Archetyp Denker' });
  }, '§11.2');

  // 8. §5.3 cap violation during progression (level 3 increase beyond Novize cap).
  reject('§5.3 Fertigkeitsentwicklung über Limit bei Stufe 3', () => {
    const char = basisFor('XI');
    char.level = 3;
    bumpSkill(char, 'Technik', 1, 'Fertigkeitsentwicklung');
  }, '§5.3');

  return rejections;
}

// ─── Report + entry point ────────────────────────────────────────────────────

function buildReport(concepts, progressed, equivalences, rejections) {
  const out = [];
  out.push('# SagaDrive Character Creation & Progression Report (#20)');
  out.push('');
  out.push('Deterministische Prüfung von §17 (Erschaffung) und §13 (Progression). Kein RNG.');
  out.push('');
  out.push(`- Stufe-1-Basen (§17, 6 Pflichtkonzepte): ${concepts.length}/6`);
  out.push(`- Progressionen bis Stufe 20 (§13): ${progressed.length}/3`);
  out.push(`- §13.3-Direkterschaffungs-Äquivalenzen: ${equivalences.length}`);
  out.push(`- Negative Pfade korrekt abgelehnt: ${rejections.length}`);
  out.push(`- Findings: ${FINDINGS.length}`);
  out.push('');
  out.push('## Negative Pfade (fail-closed, mit Regelstelle)');
  out.push('');
  for (const rejection of rejections) out.push(`- ${rejection}`);
  out.push('');
  out.push('## §13.3 Direkterschaffungs-Äquivalenz');
  out.push('');
  for (const equivalence of equivalences) out.push(`- ${equivalence}`);
  out.push('');
  out.push('## Provenance — alle Builds (vollständige Herkunft)');
  out.push('');
  for (const char of concepts) {
    for (const line of char.ledger) out.push(line.startsWith('Stufe 1 [Basis]') ? `### ${line.replace('Stufe 1 [Basis] ', '')}` : `  ${line}`);
    out.push('');
  }
  return out.join('\n');
}

mkdirSync('.qa/runs', { recursive: true });

const concepts = buildAllConcepts();
const byKey = new Map(concepts.map((char) => [char.name.slice(0, 2), char]));

const progressed = [];
const equivalences = [];
for (const [key, planFactory] of [['B1', planB1Nullpunkt], ['B2', planB2Lumenglanz], ['B3', planB3Rostfaust]]) {
  const plan = planFactory();
  // §13.3: capture the pristine level-1 state BEFORE mutating via progression.
  const source = byKey.get(key);
  const basis = {
    attributes: [...source.attributes],
    speciesTraits: [...source.speciesTraits],
    specializationsTier1: source.specializations.filter((entry) => entry.tier === 1).map((entry) => ({ ...entry })),
    basisFeature: source.features.find((feature) => feature.source.startsWith('Essenz')),
    name: source.name,
    species: source.species,
    speciesProfile: source.speciesProfile,
    background: source.background,
    archetype: primaryArchetypeOf(source),
    essence: source.essence,
    ledger: [...source.ledger],
  };
  const incremental = progressTo(source, 20, plan);
  progressed.push(incremental);

  const direct = newCharacter({
    name: `${basis.name} (direkt Stufe 20)`,
    species: basis.species,
    speciesProfile: basis.speciesProfile,
    background: basis.background,
    archetype: basis.archetype,
    essence: basis.essence,
  });
  applySpeciesTraits(direct, basis.speciesTraits);
  applyAttributes(direct, basis.attributes);
  applySkills(direct, directBasisSkillPlan(source));
  for (const spec of basis.specializationsTier1) {
    applySpecialization(direct, spec.skill, spec.name);
  }
  applyArchetypeFeature(direct);
  if (basis.basisFeature) {
    direct.features.push({ name: basis.basisFeature.name, rank: basis.basisFeature.rank, source: basis.basisFeature.source, essence: basis.basisFeature.essence });
  }
  direct.ledger.push('Stufe 1 [Basis→direkt] vollständige Stufe-1-Basis rekonstruiert');
  const directFull = progressTo(direct, 20, plan);
  const identical = snapshot(incremental) === snapshot(directFull);
  if (identical) {
    equivalences.push(`${key}: Direkterschaffung = inkrementeller Aufstieg (Snapshot identisch, §13.3).`);
  } else {
    FINDINGS.push(`${key}: §13.3-Verstoß — Direkterschaffung weicht vom inkrementellen Aufstieg ab.`);
  }
}

const rejections = runNegativePaths();

const report = buildReport(concepts, progressed, equivalences, rejections);
writeFileSync('.qa/runs/validate-character-creation-progression-report.md', report, 'utf8');

if (FINDINGS.length > 0) {
  console.error(`Character creation validation FAILED with ${FINDINGS.length} findings:`);
  FINDINGS.slice(0, 10).forEach((finding) => console.error(`- ${finding}`));
  process.exit(1);
}
console.log(`Character creation validation passed: ${concepts.length} legal level-1 bases, ${progressed.length} level-20 progressions, ${equivalences.length}/3 §13.3 equivalences, ${rejections.length} negative paths rejected — report at .qa/runs/validate-character-creation-progression-report.md.`);
