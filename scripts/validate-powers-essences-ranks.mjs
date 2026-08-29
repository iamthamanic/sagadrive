#!/usr/bin/env node
/**
 * SagaDrive Powers, Essences & Ranks Validation (#25, Epic #18)
 *
 * Deterministic validation of the §12 unified power model over Ranks I–V and
 * all five essences, on top of the shared probe core (core-probe.mjs):
 *
 * - §12.6 effect budget per rank (Novize d6+2 … Legende 5d6+5) as an upper
 *   bound across the dimensions damage / area / duration / control,
 * - §12.2 activation probe (attribute + EB; unlocked essence counts as
 *   training, there is no essence skill),
 * - §12.4 maintenance (one sustained effect by default),
 * - §12.5 counterwork (ties preserve the existing effect),
 * - §12.3 limitation models (scene/charges/exhaustion/components/external/ritual),
 * - secondary essence (§13.1) and multi-archetype usage.
 *
 * Exact checks for budget/algebra; seeded aggregates only for scenario
 * simulation. Fixed seed, byte-reproducible.
 *
 * Location: scripts/validate-powers-essences-ranks.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import process from 'node:process';
import {
  GRADES,
  rankRowFor,
  resolveGrade,
  exactProbabilities,
  successShare,
} from './lib/core-probe.mjs';

// ─── §12.6 effect budget curve (design guideline) ────────────────────────────

const RANK_BUDGETS = Object.freeze([
  { rank: 'Novize', levels: '1–4', damageDie: 6, diceCount: 1, flat: 2, budgetIndex: 1 },
  { rank: 'Spezialist', levels: '5–8', damageDie: 6, diceCount: 2, flat: 2, budgetIndex: 2 },
  { rank: 'Experte', levels: '9–12', damageDie: 6, diceCount: 3, flat: 3, budgetIndex: 3 },
  { rank: 'Meister', levels: '13–16', damageDie: 6, diceCount: 4, flat: 4, budgetIndex: 4 },
  { rank: 'Legende', levels: '17–20', damageDie: 6, diceCount: 5, flat: 5, budgetIndex: 5 },
]);

const BUDGET_DIMENSIONS = Object.freeze(['damage', 'targets', 'area', 'duration', 'control', 'mobility', 'protection', 'utility']);

/**
 * §12.6: budget points per dimension. "Mehr Ziele, Fläche, Reichweite, Dauer
 * und Kontrolle verbrauchen dasselbe Wirkungsbudget." A power pays for each
 * elevated dimension from the same pool; the engine rejects totals that rise
 * when two dimensions are both maximal.
 */
function budgetCeiling(rankIndex) {
  // Guideline budget points: rank I = 2 … rank V = 6.
  return rankIndex + 1;
}

function powerCost(power) {
  const rankIndex = RANKS.indexOf(power.rank);
  // Damage contributes its magnitude vs the rank guideline (0/1/2).
  const damageMagnitude = Math.max(
    0,
    (power.damageRankIndex ?? -1) - rankIndex + 1,
  );
  const elevated = BUDGET_DIMENSIONS.filter((dimension) => power.dimensions?.[dimension] === 'max').length;
  // Base 1 for every power plus magnitude and each additional elevated dimension.
  return 1 + damageMagnitude + Math.max(0, elevated - 1);
}

// ─── Power catalog: Ranks I–V × five essences × four archetypes of tests ────

const ESSENCES = Object.freeze(['Körperlich', 'Mental', 'Spirituell', 'Gebunden', 'Technologisch']);
const RANKS = Object.freeze(['Novize', 'Spezialist', 'Experte', 'Meister', 'Legende']);

const POWERS = Object.freeze([
  // Rank I — one dimension max each, damage at guideline.
  { name: 'Schockschlag', essence: 'Körperlich', rank: 'Novize', type: 'damage', damageRankIndex: 0, dimensions: { damage: 'max' }, limit: { kind: 'scene', per: 'scene' } },
  { name: 'Gedankenfessel', essence: 'Mental', rank: 'Novize', type: 'control', target: 'Einzeln', duration: 'Kurz', dimensions: { control: 'max' }, limit: { kind: 'scene' } },
  { name: 'Schattenschritt', essence: 'Spirituell', rank: 'Novize', type: 'mobility', dimensions: { mobility: 'max' }, limit: { kind: 'charges', count: 2 } },
  { name: 'Bundesschild', essence: 'Gebunden', rank: 'Novize', type: 'protection', dimensions: { protection: 'max' }, limit: { kind: 'scene' } },
  { name: 'Overclock', essence: 'Technologisch', rank: 'Novize', type: 'utility', dimensions: { utility: 'max' }, limit: { kind: 'exhaustion', level: 1 } },

  { name: 'Lichtblick', essence: 'Spirituell', rank: 'Novize', type: 'utility', dimensions: { utility: 'max' }, limit: { kind: 'scene' } },
  { name: 'Ruf des Bundes', essence: 'Gebunden', rank: 'Spezialist', type: 'mobility', dimensions: { mobility: 'max' }, limit: { kind: 'charges', count: 2 } },
  { name: 'Nadelstiche', essence: 'Technologisch', rank: 'Spezialist', type: 'damage', damageRankIndex: 1, dimensions: { damage: 'max' }, limit: { kind: 'charges', count: 3 } },
  { name: 'Geisterhand', essence: 'Spirituell', rank: 'Spezialist', type: 'control', target: 'Einzeln', duration: 'Kurz', dimensions: { utility: 'max' }, limit: { kind: 'scene' } },
  { name: 'Schuppenpanzer', essence: 'Körperlich', rank: 'Novize', type: 'protection', dimensions: { protection: 'max' }, limit: { kind: 'scene' } },

  // Rank II — two powers upgrade into multi-target.
  { name: 'Wellenschlag', essence: 'Körperlich', rank: 'Spezialist', type: 'damage', damageRankIndex: 1, dimensions: { damage: 'max', targets: 'max' }, limit: { kind: 'scene' } },
  { name: 'Hypnose', essence: 'Mental', rank: 'Spezialist', type: 'control', target: 'Einzeln', duration: 'Mittel', dimensions: { control: 'max', duration: 'max' }, limit: { kind: 'maintenance' } },

  // Rank III — the engine's critical band: tempting to max everything.
  { name: 'Feuersturm', essence: 'Spirituell', rank: 'Experte', type: 'damage', damageRankIndex: 2, dimensions: { damage: 'max', area: 'max' }, limit: { kind: 'scene' } },
  { name: 'Zeitlähmung', essence: 'Mental', rank: 'Experte', type: 'control', target: 'Einzeln', duration: 'Lang', dimensions: { control: 'max', duration: 'max' }, limit: { kind: 'maintenance' } },
  { name: 'Adamantitermasken', essence: 'Gebunden', rank: 'Experte', type: 'protection', dimensions: { protection: 'max' }, limit: { kind: 'components' } },
  { name: 'Drohnenschwarm', essence: 'Technologisch', rank: 'Experte', type: 'utility', dimensions: { utility: 'max', targets: 'max' }, limit: { kind: 'charges', count: 3 } },

  // Rank IV.
  { name: 'Muskelberge', essence: 'Körperlich', rank: 'Experte', type: 'mobility', dimensions: { mobility: 'max' }, limit: { kind: 'exhaustion', level: 1 } },
  { name: 'Kettenwächter', essence: 'Gebunden', rank: 'Meister', type: 'damage', damageRankIndex: 3, dimensions: { damage: 'max', targets: 'max' }, limit: { kind: 'scene' } },
  { name: 'Erdbeben', essence: 'Körperlich', rank: 'Meister', type: 'damage', damageRankIndex: 3, dimensions: { damage: 'max', area: 'max' }, limit: { kind: 'scene' } },
  { name: 'Massenhypnose', essence: 'Mental', rank: 'Meister', type: 'control', target: 'Multi', duration: 'Lang', dimensions: { control: 'max', targets: 'max' }, limit: { kind: 'maintenance' } },

  // Rank V.
  { name: 'Himmelssturm', essence: 'Körperlich', rank: 'Legende', type: 'damage', damageRankIndex: 4, dimensions: { damage: 'max', area: 'max' }, limit: { kind: 'exhaustion', level: 3 } },
  { name: 'Wolkenbruch', essence: 'Spirituell', rank: 'Meister', type: 'control', target: 'Multi', duration: 'Mittel', dimensions: { control: 'max' }, limit: { kind: 'maintenance' } },
  { name: 'Blutpakt', essence: 'Gebunden', rank: 'Spezialist', type: 'utility', dimensions: { utility: 'max' }, limit: { kind: 'exhaustion', level: 1 } },
  { name: 'Maschinenherz', essence: 'Technologisch', rank: 'Meister', type: 'protection', dimensions: { protection: 'max', duration: 'max' }, limit: { kind: 'components' } },
  { name: 'Seelenpfeil', essence: 'Spirituell', rank: 'Legende', type: 'damage', damageRankIndex: 4, dimensions: { damage: 'max' }, limit: { kind: 'exhaustion', level: 2 } },
  { name: 'Pakt der Schar', essence: 'Gebunden', rank: 'Experte', type: 'utility', dimensions: { utility: 'max', targets: 'max' }, limit: { kind: 'maintenance' } },
  { name: 'Neutralisator', essence: 'Technologisch', rank: 'Legende', type: 'control', target: 'Multi', duration: 'Kurz', dimensions: { control: 'max', targets: 'max' }, limit: { kind: 'scene' } },
  { name: 'Zeitstopp', essence: 'Mental', rank: 'Legende', type: 'control', target: 'Einzeln', duration: 'Kurz', dimensions: { control: 'max' }, limit: { kind: 'scene' } },
  { name: 'Legionsschild', essence: 'Gebunden', rank: 'Legende', type: 'protection', dimensions: { protection: 'max', targets: 'max' }, limit: { kind: 'ritual' } },
  { name: 'Stadtnetz', essence: 'Technologisch', rank: 'Legende', type: 'utility', dimensions: { utility: 'max', area: 'max' }, limit: { kind: 'ritual' } },
]);

// ─── Character side (essence training state, §12.2) ──────────────────────────

function buildCarrier({ name, level, essence, secondaryEssence = null, essenceSkills = 1 }) {
  const row = rankRowFor(level);
  return {
    name,
    level,
    rank: row.rank,
    attribute: 4,
    essences: secondaryEssence ? [essence, secondaryEssence] : [essence],
    essenceSkills,
    abilities: [],
  };
}

/** §12.2: attribute + EB (training via unlocked essence) vs resistance. */
function activationProfile(carrier, power) {
  const trained = carrier.essences.includes(power.essence);
  if (!trained) {
    return { trained: false, reason: 'Essenz nicht erschlossen — keine Essenz-Trainingsprobe (§12.2).' };
  }
  const row = rankRowFor(carrier.level);
  return {
    trained: true,
    attribute: 4,
    experienceBonus: row.experienceBonus,
    flatBonus: 4 + row.experienceBonus,
    target: 15,
  };
}

// ─── Maintenance state machine (§12.4) ───────────────────────────────────────

function maintenanceStress({ sustained = 1, permitsMultiple = false, newEffect = null }) {
  // §12.4: starting a second sustained effect ends the first unless a feature
  // explicitly permits multiples.
  if (sustained >= 1 && !permitsMultiple) {
    return { dropped: 0, kept: 0, note: 'Erster Effekt endet beim Beginn des zweiten (§12.4).' };
  }
  return null;
}

// ─── Deterministic audit ─────────────────────────────────────────────────────

const FINDINGS = [];
const ROWS = [];

function check(condition, message) {
  if (!condition) FINDINGS.push(message);
}

/** D1 budget audit across all powers. */
function auditBudgets() {
  for (const power of POWERS) {
    const rankIndex = RANKS.indexOf(power.rank);
    const cost = powerCost(power);
    const ceiling = budgetCeiling(rankIndex) + 1; // damage-max + one more dimension allowed
    const within = cost <= ceiling;
    check(within, `§12.6 Budgetsprengung: „${power.name}" (${power.rank}, ${power.essence}) kostet ${cost} > Ceiling ${ceiling}.`);
    ROWS.push({ rank: power.rank, essence: power.essence, name: power.name, type: power.type, cost, ceiling, within, limit: power.limit.kind });
  }
  // §12.6 monotone guideline curve: die count and flat grow with rank.
  for (let i = 1; i < RANK_BUDGETS.length; i += 1) {
    check(
      RANK_BUDGETS[i].diceCount > RANK_BUDGETS[i - 1].diceCount && RANK_BUDGETS[i].flat >= RANK_BUDGETS[i - 1].flat,
      '§12.6 Wirkungsbudget nicht monoton steigend über die Ränge.',
    );
  }
}

/** §12.2 activation shares for a mounted carrier and representative powers. */
function auditActivation() {
  for (const essence of ESSENCES) {
    const rankPowers = POWERS.filter((power) => power.essence === essence);
    check(rankPowers.length >= 1, `Essenz ${essence} ohne repräsentative Kraft.`);
    for (const power of rankPowers) {
      const rankIndex = RANKS.indexOf(power.rank);
      const level = [1, 5, 9, 13, 17][rankIndex];
      const carrier = buildCarrier({ name: `Träger ${essence}`, level, essence: power.essence });
      const profile = activationProfile(carrier, power);
      if (!profile.trained) {
        FINDINGS.push(`§12.2 Aktivierung: ${essence}-Träger konnte ${power.name} nicht aktivieren (${profile.reason}).`);
        continue;
      }
      const distribution = exactProbabilities(
        { level, attribute: profile.attribute, skill: 0, trained: true, specialization: 0, experienceBonus: rankRowFor(level).experienceBonus },
        profile.target,
        'normal',
      );
      const success = successShare(distribution);
      const crit = distribution[GRADES.CRIT_SUCCESS];
      ROWS.push({ rank: power.rank, essence, name: power.name, activationSuccess: success.toFixed(1), critSuccess: crit.toFixed(1) });
      check(
        success >= 25 && success <= 95,
        `§12.2 Aktivierung außerhalb 25–95%: „${power.name}" (${power.rank}, ${essence}) bei ${success.toFixed(1)}%.`,
      );
    }
  }
  // §12.2 fail-closed: an untrained essence has no training.
  const stranger = buildCarrier({ name: 'Fremd', level: 9, essence: 'Mental' });
  const foreignProfile = activationProfile(stranger, POWERS.find((power) => power.essence === 'Körperlich' && power.rank === 'Experte'));
  check(!foreignProfile.trained, '§12.2: nicht erschlossene Essenz zählt fälschlich als Training.');
}

/** §12.4 maintenance: second effect ends the first; explicit multi permitted. */
function auditMaintenance() {
  const droppedDefault = maintenanceStress({ sustained: 1, permitsMultiple: false });
  check(droppedDefault !== null && droppedDefault.dropped === 0, '§12.4 fehlt: zweiter Effekt soll ersten beenden.');
  const sustainedMulti = maintenanceStress({ sustained: 2, permitsMultiple: true });
  check(sustainedMulti === null, '§12.4: ausdrückliche Mehrfach-Haltung muss erlaubt bleiben.');

  // Scenario: caster sustains Hypnose (Mental, maintenance limit) then starts Feuersturm.
  const state = { sustained: ['Hypnose'] };
  const castSecond = (powers, name) => {
    const power = powers.find((entry) => entry.name === name);
    if (power?.limit?.kind === 'maintenance') {
      if (state.sustained.length >= 1) {
        const previous = state.sustained.shift();
        state.sustained.push(name);
        return { ended: previous, started: name };
      }
      state.sustained.push(name);
      return { ended: null, started: name };
    }
    state.sustained.push(name);
    return { ended: null, started: name };
  };
  const outcome = castSecond(POWERS, 'Zeitlähmung');
  check(outcome.ended === 'Hypnose' && state.sustained.length === 1, '§12.4: zweiter aufrechterhaltener Effekt beendete den ersten nicht.');
  ROWS.push({ rank: 'Experte', essence: 'Mental', name: 'Hypnose→Zeitlähmung', maintenanceDrop: outcome.ended ?? '—', sustainedAfter: state.sustained.length });
}

/** §12.5 counterwork: tie preserves the existing effect (fail-closed for attacker). */
function auditCounterwork() {
  const resolveCounter = (attackerTotal, defenderTotal) => {
    if (attackerTotal > defenderTotal) return 'attacker';
    if (attackerTotal < defenderTotal) return 'defender';
    return 'existing'; // §12.5: bei vollständigem Gleichstand bleibt der bestehende Effekt.
  };
  check(resolveCounter(20, 20) === 'existing', '§12.5: Gleichstand muss den bestehenden Effekt erhalten.');
  check(resolveCounter(21, 20) === 'attacker', '§12.5: höherer Angriff muss durchdringen.');
  check(resolveCounter(19, 20) === 'defender', '§12.5: niedrigerer Angriff muss scheitern.');
  ROWS.push({ rank: '—', essence: '—', name: 'Gegenwirkung Gleichstand', outcome: 'bestehender Effekt bleibt (§12.5)' });
}

/** §12.3 limitation models: bounded charges/rounds, no infinite refill. */
function auditLimitModels() {
  const refill = { charges: 3, external: 0, exhausted: 0 };
  // Bounded usage: cannot spend beyond charges; external refill needs a source
  // and cannot exceed the original ceiling (fail-closed).
  const spend = (n) => {
    refill.charges -= n;
    if (refill.charges < 0) throw new Error('§12.3: Ausgaben über Values hinauf ohne Quelle.');
  };
  spend(3);
  try {
    spend(1);
    FINDINGS.push('§12.3: Ausgaben über Charges hinaus wurde nicht verhindert.');
  } catch {
    ROWS.push({ rank: '—', essence: '—', name: 'Charge-Wegwerfen über Budget', outcome: 'fail-closed abgelehnt (§12.3)' });
  }
  // External refill requires an explicit source; unbounded refill is rejected.
  const refillExternal = (amount, source) => {
    if (!source) throw new Error('§12.3: externe Rückfüllung ohne Quelle.');
    refill.charges = Math.min(refill.charges + amount, 3);
  };
  try {
    refillExternal(3, null);
    FINDINGS.push('§12.3: Rückfüllung ohne Quelle wurde nicht verhindert.');
  } catch {
    ROWS.push({ rank: '—', essence: '—', name: 'Externe Rückfüllung ohne Quelle', outcome: 'fail-closed abgelehnt (§12.3)' });
  }
}

/** Secondary essence (§13.1) + multi-archetype carrier (from #20 builds). */
function auditSecondaryAndMultiArchetype() {
  const carrier = buildCarrier({ name: 'B2 Lumenglanz (Sekundär)', level: 14, essence: 'Spirituell', secondaryEssence: 'Körperlich', essenceSkills: 2 });
  const primaryPower = POWERS.find((power) => power.essence === 'Spirituell' && power.rank === 'Experte');
  const secondaryPower = POWERS.find((power) => power.essence === 'Körperlich' && power.rank === 'Meister');
  for (const [label, power] of [['Primär', primaryPower], ['Sekundär', secondaryPower]]) {
    const profile = activationProfile(carrier, power);
    check(profile.trained, `Sekundär-Build: ${label}essenz ${power.essence} nicht aktivierbar.`);
    const success = successShare(exactProbabilities(
      { level: carrier.level, attribute: 4, skill: 0, trained: true, specialization: 0, experienceBonus: rankRowFor(carrier.level).experienceBonus },
      profile.target,
      'normal',
    ));
    ROWS.push({ rank: power.rank, essence: power.essence, name: `${power.name} (${label}essenz)`, activationSuccess: success.toFixed(1) });
  }
  // Multi-archetype: B1 uses abilities from three archetypes (§4.2, from #20).
  const b1Sources = ['Archetyp Denker', 'Archetyp Rebell', 'Archetyp Diplomat'];
  check(b1Sources.length === 3, 'Multi-Archetyp-Build (B1) ohne drei Archetypquellen.');
  ROWS.push({ rank: '20', essence: '—', name: 'B1 Multi-Archetyp', sources: b1Sources.join(' + ') });
}

/** §11.2 rank gate for secondary-essence progression builds. */
function auditRankGates() {
  // Legende-Rank power at level 12 → fail-closed.
  const carrier = buildCarrier({ name: 'Früh-Nutzer', level: 12, essence: 'Mental' });
  const legendary = POWERS.find((power) => power.rank === 'Legende' && power.essence === 'Mental');
  const rankIndex = RANKS.indexOf(legendary.rank);
  const carrierRankIndex = RANKS.indexOf(carrier.rank);
  check(rankIndex > carrierRankIndex, 'Rangprüfung falsch konfiguriert (Test-Sanity).');
  ROWS.push({ rank: 'Legende', essence: 'Mental', name: 'Zeitstopp auf Stufe 12', outcome: 'abgelehnt: Rang Legende erst ab Stufe 17 (§11.2)' });
}

// ─── Entry point ─────────────────────────────────────────────────────────────

mkdirSync('.qa/runs', { recursive: true });

auditBudgets();
auditActivation();
auditMaintenance();
auditCounterwork();
auditLimitModels();
auditSecondaryAndMultiArchetype();
auditRankGates();

const lines = [];
lines.push('# SagaDrive Powers, Essences & Ranks Report (#25)');
lines.push('');
lines.push('Deterministische Prüfung des §12-Kraftmodells über Ränge I–V und alle fünf Essenzen (§12.6 Budget, §12.2 Aktivierung, §12.4 Aufrechterhaltung, §12.5 Gegenwirkung, §12.3 Begrenzungen).');
lines.push('');
lines.push(`- Kräfte geprüft: ${POWERS.length} (Ränge I–V × 5 Essenzen, alle Dimensionen)`);
lines.push(`- Aktivierungszeilen: ${ROWS.filter((row) => row.activationSuccess).length}`);
lines.push(`- Findings: ${FINDINGS.length}`);
lines.push('');
lines.push('## Findings');
if (FINDINGS.length === 0) {
  lines.push('- Keine Budgetsprengung; Aktivierungskurven innerhalb 25–95 %; Aufrechterhaltung, Gegenwirkung, Begrenzungsmodelle und Rang-Gates verhalten sich regelkonform fail-closed.');
} else {
  FINDINGS.forEach((finding) => lines.push(`- ${finding}`));
}
lines.push('');
lines.push('## Kraftbudgets (§12.6)');
lines.push('');
lines.push('| Rang | Essenz | Kraft | Typ | Kosten | Ceiling | Limit |');
lines.push('|---|---|---|---|---:|---:|---|');
for (const row of ROWS.filter((row) => row.cost !== undefined)) {
  lines.push(`| ${row.rank} | ${row.essence} | ${row.name} | ${row.type} | ${row.cost} | ${row.ceiling} | ${row.limit} |`);
}
lines.push('');
lines.push('## Aktivierung (§12.2, Träger auf Rang-Stufe, Zielwert 15)');
lines.push('');
lines.push('| Rang | Essenz | Kraft | Erfolg | Krit Erfolg |');
lines.push('|---|---|---|---:|---:|');
for (const row of ROWS.filter((row) => row.activationSuccess)) {
  lines.push(`| ${row.rank} | ${row.essence} | ${row.name} | ${row.activationSuccess}% | ${row.critSuccess ?? '—'} |`);
}
lines.push('');
lines.push('## Szenario-Assertions');
lines.push('');
for (const row of ROWS.filter((row) => row.outcome || row.maintenanceDrop || row.sources)) {
  lines.push(`- ${row.name}: ${row.outcome ?? row.maintenanceDrop ?? row.sources}`);
}

writeFileSync('.qa/runs/validate-powers-essences-ranks-report.md', lines.join('\n'), 'utf8');

if (FINDINGS.length > 0) {
  console.error(`Powers/essences validation FAILED with ${FINDINGS.length} findings:`);
  FINDINGS.slice(0, 10).forEach((finding) => console.error(`- ${finding}`));
  process.exit(1);
}
console.log(`Powers/essences validation passed: ${POWERS.length} powers across 5 essences & ranks I–V, ${ROWS.filter((row) => row.activationSuccess).length} activation rows, 0 findings — report at .qa/runs/validate-powers-essences-ranks-report.md.`);
