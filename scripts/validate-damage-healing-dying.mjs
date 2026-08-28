#!/usr/bin/env node
/**
 * SagaDrive Damage, Healing & Dying Validation (#23, Epic #18)
 *
 * Deterministic validation of §8 (damage, healing, dying) plus §16.4 difficulty
 * modules, over the shared core probe (scripts/lib/core-probe.mjs).
 *
 * Exact (non-Monte-Carlo) damage distributions for the five damage classes
 * (§8.1) including critical doubling of dice only (§8.2), armor/penetration
 * interaction (§8.3), dying-track state machine (§8.5), massive damage (§8.6),
 * first aid (§8.7), recovery paths (§8.8), and the three difficulty modules
 * (§16.4).
 *
 * Location: scripts/validate-damage-healing-dying.mjs
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

// ─── Damage classes (§8.1) ───────────────────────────────────────────────────

/** die size → exact uniform distribution over 1..n. */
function dieDistribution(sides) {
  const dist = new Map();
  for (let face = 1; face <= sides; face += 1) {
    dist.set(face, 1 / sides);
  }
  return dist;
}

/** Convolve two independent value distributions. */
function convolve(a, b) {
  const result = new Map();
  for (const [va, pa] of a) {
    for (const [vb, pb] of b) {
      result.set(va + vb, (result.get(va + vb) ?? 0) + pa * pb);
    }
  }
  return result;
}

/**
 * Exact damage distribution for one damage class (§8.1).
 * crit=true doubles the dice only, not the flat bonus (§8.2).
 */
function damageDistribution(dice, sides, flatBonus, crit = false) {
  let dist = new Map([[0, 1]]);
  const count = crit ? dice * 2 : dice;
  const die = dieDistribution(sides);
  for (let i = 0; i < count; i += 1) {
    dist = convolve(dist, die);
  }
  const result = new Map();
  for (const [value, probability] of dist) {
    result.set(value + flatBonus, probability);
  }
  return result;
}

/** Probability that total damage from `dist` is at least `amount`. */
function damageAtLeast(dist, amount) {
  let total = 0;
  for (const [value, probability] of dist) {
    if (value >= amount) total += probability;
  }
  return total;
}

const DAMAGE_CLASSES = Object.freeze([
  { name: 'Unbewaffnet', dice: 1, sides: 4, flatBonus: 1 },
  { name: 'Leicht', dice: 1, sides: 6, flatBonus: 1 },
  { name: 'Standard', dice: 1, sides: 8, flatBonus: 2 },
  { name: 'Schwer', dice: 1, sides: 10, flatBonus: 3 },
  { name: 'Extrem', dice: 1, sides: 12, flatBonus: 4 },
]);

// ─── Derived values (§6.1, §6.6, §8.3) ──────────────────────────────────────

/** §6.1: health = 12 + 2×endurance + 2×EB. */
function healthOf({ endurance, experienceBonus }) {
  return 12 + 2 * endurance + 2 * experienceBonus;
}

/** §6.6: recovery = endurance + EB. */
function recoveryOf({ endurance, experienceBonus }) {
  return endurance + experienceBonus;
}

// ─── Armor model (§8.3) ──────────────────────────────────────────────────────

/**
 * Effective damage after armor: flat reduction, floored at 0.
 * Penetration (§8.3 context: ignored armor) reduces protection first.
 */
function damageAfterProtection(distribution, protection, penetration = 0) {
  const effectiveProtection = Math.max(0, protection - penetration);
  if (effectiveProtection === 0) return distribution;
  const result = new Map();
  for (const [value, probability] of distribution) {
    result.set(Math.max(0, value - effectiveProtection), (result.get(Math.max(0, value - effectiveProtection)) ?? 0) + probability);
  }
  return result;
}

// ─── Dying state machine (§8.5, §16.4) ───────────────────────────────────────

/**
 * Exact probabilities for one death-save roll (d20 + endurance + EB vs 15).
 * Grades via the shared probe model with attribute/skill = endurance-profile.
 */
function deathSaveDistribution({ endurance, experienceBonus }) {
  return exactProbabilities(
    { attribute: endurance, skill: endurance, trained: true, experienceBonus, specialization: 0, level: 1, rank: 'probe', skillCap: 99 },
    15,
    'normal',
  );
}

/**
 * Simulate the dying track exactly over N death-save rounds. State = (dying
 * level), start level per §8.5 (1) / §16.4 Hart (2). Absorb transitions per
 * §8.5 table. Returns probability of death (level 3 reached) and stabilization.
 */
function dyingOutcome({ endurance, experienceBonus, startLevel, maxRounds = 10 }) {
  const save = deathSaveDistribution({ endurance, experienceBonus });
  // State probabilities keyed by dying level.
  let states = new Map([[startLevel, 1]]);
  for (let round = 1; round <= maxRounds; round += 1) {
    const next = new Map();
    for (const [level, probability] of states) {
      if (level <= 0) {
        // Already stable — stays stable.
        next.set(level, (next.get(level) ?? 0) + probability);
        continue;
      }
      const critSuccess = save[GRADES.CRIT_SUCCESS] / 100;
      const success = save[GRADES.SUCCESS] / 100;
      const failure = save[GRADES.FAILURE] / 100;
      const critFailure = save[GRADES.CRIT_FAILURE] / 100;
      // §8.5: crit success → stable (0); success → dying -1; failure → +1; crit fail → +2.
      next.set(Math.max(0, level - 1), (next.get(Math.max(0, level - 1)) ?? 0) + probability * (critSuccess + success));
      next.set(level + 1, (next.get(level + 1) ?? 0) + probability * failure);
      next.set(level + 2, (next.get(level + 2) ?? 0) + probability * critFailure);
    }
    // Absorb death at level >= 3 (§8.5: Sterbend 3 = Tod).
    next.delete(3);
    next.delete(4);
    next.delete(3);
    next.delete(4);
    states = next;
  }
  const survived = [...states.values()].reduce((acc, v) => acc + v, 0);
  const died = 1 - survived;
  return { died, survived };
}

function deathProbabilityCorrect(next) {
  return (next.get(3) ?? 0) + (next.get(4) ?? 0);
}

// ─── Difficulty modules (§16.4) ──────────────────────────────────────────────

const DIFFICULTIES = Object.freeze(['Heroisch', 'Standard', 'Hart']);

function difficultyStartLevel(difficulty) {
  if (difficulty === 'Heroisch') return 0; // stable at 0 unless crit or lethal
  if (difficulty === 'Hart') return 2;
  return 1; // Standard
}

/** §16.4 Heroisch: dying only from crit hits or explicit deadly danger. */
function heroischIsDying(damageClass, isCritical, explicitDeadly) {
  if (explicitDeadly) return true;
  if (isCritical) return true;
  return false;
}

/** §16.4 Hart: each drop to 0 adds a wound; wound reduces max health by 2. */
function hartWoundMaxHealth(baseMaxHealth, wounds) {
  return Math.max(1, baseMaxHealth - 2 * wounds);
}

/** §16.4 Hart: max three wounds; further drops cost dying +1 instead. */
function hartApplyDrop({ wounds, dyingLevel }) {
  if (wounds < 3) return { wounds: wounds + 1, dyingLevel };
  return { wounds, dyingLevel: dyingLevel + 1 };
}

/** §16.4 Hart: full rest heals only 2 × recovery. */
function hartFullRestHeal(recovery) {
  return 2 * recovery;
}

// ─── Recovery paths (§8.8) ───────────────────────────────────────────────────

function recoveryPaths({ endurance, experienceBonus }) {
  const rec = recoveryOf({ endurance, experienceBonus });
  return {
    breathBreak: rec, // Verschnaufpause: once between major conflicts
    medicalCare: 2 * rec, // replaces (not adds) breath-break healing on success
    stableAtZero: 1, // stable figure regains 1 HP after 10 safe minutes
    fullRest: 'full', // Standard: full health
    fullRestHart: hartFullRestHeal(rec),
  };
}

// ─── Mandatory scenarios (validation plan C2) ────────────────────────────────

function runScenarios() {
  const findings = [];
  const rows = [];
  const bands = [1, 9, 17].map((level) => rankRowFor(level));

  for (const band of bands) {
    const eb = band.experienceBonus;
    const enduranceProfiles = [
      { name: 'niedrige Ausdauer', endurance: 1 },
      { name: 'mittlere Ausdauer', endurance: 3 },
      { name: 'hohe Ausdauer', endurance: 5 },
    ];

    const standardOutcomes = new Map();
    const hartOutcomes = new Map();
    for (const profile of enduranceProfiles) {
      const health = healthOf({ endurance: profile.endurance, experienceBonus: eb });
      const recovery = recoveryOf({ endurance: profile.endurance, experienceBonus: eb });

      // ── Protection matrix: Schutz 0/1/2/3/5 × damage classes × penetration ──
      for (const damageClass of DAMAGE_CLASSES) {
        const normalDist = damageDistribution(damageClass.dice, damageClass.sides, damageClass.flatBonus, false);
        const critDist = damageDistribution(damageClass.dice, damageClass.sides, damageClass.flatBonus, true);

        for (const protection of [0, 1, 2, 3, 5]) {
          for (const penetration of [0, 1, 2]) {
            const effective = Math.max(0, protection - penetration);
            const mitigated = damageAfterProtection(normalDist, effective);

            // Expected hits-to-down for this combination (exact, via tail sums).
            const pDownSingle = damageAtLeast(mitigated, health);
            // §8.2 invariant: crit must always exceed normal expected damage.
            const normalMean = mean(normalDist);
            const critMean = mean(critDist);
            if (critMean <= normalMean + 1e-12) {
              findings.push(`Krit erhöht erwarteten Schaden nicht: ${damageClass.name} Schutz ${protection}`);
            }

            // §8.3 invariant: more protection never increases damage taken.
            const lessProtected = damageAfterProtection(normalDist, Math.max(0, effective - 1));
            const moreProtectedMean = mean(mitigated);
            if (moreProtectedMean > mean(lessProtected) + 1e-12) {
              findings.push(`Schutz erhöht Schaden: ${damageClass.name} Schutz ${protection}/${penetration} Band ${band.rank}`);
            }

            // Edge case: heavy protection must not make light weapons strictly
            // irrelevant — a light weapon retains nonzero damage after mitigation.
            if (damageClass.name === 'Leicht' && effective >= 5) {
              const zeroShare = mitigated.get(0) ?? 0;
              if (zeroShare >= 1 - 1e-12) {
                findings.push(`Leichte Waffe komplett neutralisiert bei Schutz ${effective} (Band ${band.rank}).`);
              }
            }

            // Edge case: penetration must strictly help the attacker.
            const withPen = damageAfterProtection(normalDist, protection, penetration);
            if (penetration > 0 && mean(withPen) < mean(damageAfterProtection(normalDist, protection)) - 1e-12) {
              findings.push(`Durchdringung verschlechtert Schaden: ${damageClass.name} Schutz ${protection} Dr ${penetration}`);
            }

            rows.push({
              band: band.rank,
              profile: profile.name,
              scenario: `${damageClass.name} vs Schutz ${protection}${penetration ? ` (Dr ${penetration})` : ''}`,
              metric: 'Treffer-Chance (Schaden ≥ Gesundheit)',
              value: `${(damageAtLeast(mitigated, health) * 100).toFixed(2)}%`,
              detail: `Ø normal ${normalMean.toFixed(2)} / Ø krit ${critMean.toFixed(2)} nach Schutz ${effective}`,
            });
          }
        }
      }

      // ── Dying: death saves from start level per difficulty ─────────────────
      for (const difficulty of DIFFICULTY_LEVELS) {
        // §16.4 Heroisch: stable at 0 — no dying track, no death saves.
        if (difficulty === 'Heroisch') {
          rows.push({
            band: band.rank,
            profile: profile.name,
            scenario: 'Sterbend (Heroisch, stabil bei 0)',
            metric: 'Todeswahrscheinlichkeit über Todeswürfe',
            value: '0.00%',
            detail: '§16.4: Sterbend nur durch kritischen Treffer oder ausdrücklich tödliche Gefahr.',
          });
          continue;
        }
        const start = difficultyStartLevel(difficulty);
        const outcome = dyingOutcome({ endurance: profile.endurance, experienceBonus: eb, startLevel: start });
        rows.push({
          band: band.rank,
          profile: profile.name,
          scenario: `Sterbend (${difficulty}, Start ${start})`,
          metric: 'Todeswahrscheinlichkeit',
          value: `${(outcome.died * 100).toFixed(2)}%`,
          detail: `Todeswürfe: d20+Ausd(${profile.endurance})+EB(${eb}) vs ZW 15`,
        });
        // §16.4 ordering: Hart must not be less deadly than Standard.
        if (difficulty === 'Hart') {
          hartOutcomes.set(profile.name, outcome.died);
        } else {
          standardOutcomes.set(profile.name, outcome.died);
        }
      }
      const standardDied = standardOutcomes.get(profile.name) ?? 0;
      const hartDied = hartOutcomes.get(profile.name) ?? 0;
      if (hartDied + 1e-12 < standardDied) {
        findings.push(`Hart weniger tödlich als Standard (Band ${band.rank}, ${profile.name}): ${(hartDied * 100).toFixed(2)}% < ${(standardDied * 100).toFixed(2)}%`);
      }

      // ── Recovery ────────────────────────────────────────────────────────────
      const paths = recoveryPaths({ endurance: profile.endurance, experienceBonus: eb });
      if (typeof paths.medicalCare === 'number' && paths.medicalCare <= paths.breathBreak) {
        findings.push(`Medizinische Versorgung ersetzt Verschnaufpause nicht überlegen (Band ${band.rank}, ${profile.name}): ${paths.medicalCare} <= ${paths.breathBreak}.`);
      }
      rows.push({
        band: band.rank,
        profile: profile.name,
        scenario: 'Erholung',
        metric: 'Gesundheit pro Ruhephase',
        value: `Verschnaufpause ${paths.breathBreak} / Medizinisch ${paths.medicalCare} / Volle Ruhe ${paths.fullRest === 'full' ? 'voll' : `${paths.fullRestHart} (Hart)`}`,
        detail: `Erholungswert ${recovery} (§6.6)`,
      });

      // ── Massive damage threshold (§8.6) ────────────────────────────────────
      const massiveThreshold = health + health;
      const extremClass = DAMAGE_CLASSES[DAMAGE_CLASSES.length - 1];
      const extremCritDist = damageDistribution(extremClass.dice, extremClass.sides, extremClass.flatBonus, true);
      const massiveChance = damageAtLeast(extremCritDist, massiveThreshold);
      rows.push({
        band: band.rank,
        profile: profile.name,
        scenario: 'Massiver Schaden (§8.6)',
        metric: `Sofort-Tod ab ${massiveThreshold} Schaden (Krit)`,
        value: `${(massiveChance * 100).toFixed(2)}%`,
        detail: `aktuelle + maximale Gesundheit bei vollem Leben`,
      });
    }
  }

  return { rows, findings, bands };
}

function mean(distribution) {
  let total = 0;
  for (const [value, probability] of distribution) {
    total += value * probability;
  }
  return total;
}

const DIFFICULTY_LEVELS = DIFFICULTIES;

// ─── Report ──────────────────────────────────────────────────────────────────

function buildReport(rows, findings, bands) {
  const lines = [];
  lines.push('# SagaDrive Damage, Healing & Dying Validation Report (#23)');
  lines.push('');
  lines.push('Exact damage distributions (§8.1/§8.2), protection matrix (§8.3), dying state machine (§8.5), massive damage (§8.6), recovery (§8.8), difficulty modules (§16.4).');
  lines.push('');
  lines.push(`- Bands: ${bands.map((band) => band.rank).join(' / ')}`);
  lines.push(`- Scenario rows: ${rows.length}`);
  lines.push(`- Findings: ${findings.length}`);
  lines.push('');
  lines.push('## Findings');
  if (findings.length === 0) {
    lines.push('Keine toten oder dominanten Schutz-/Schadens-Kombinationen; Sterbe- und Erholungskurven konsistent.');
  } else {
    findings.forEach((finding) => lines.push(`- ${finding}`));
  }
  lines.push('');
  lines.push('## Representative curves (mittlere Ausdauer)');
  lines.push('');
  lines.push('| Band | Szenario | Messgröße | Wert | Detail |');
  lines.push('|---|---|---|---|---|');
  const representative = rows.filter((row) => row.profile === 'mittlere Ausdauer');
  for (const row of representative) {
    lines.push(`| ${row.band} | ${row.scenario} | ${row.metric ?? row.scenario} | ${row.value} | ${row.detail} |`);
  }
  lines.push('');
  lines.push('## Notes');
  lines.push('- Exakte Faltung der Würfelformen; kein Samplingfehler.');
  lines.push('- Krit verdoppelt nur Würfel, nicht feste Boni (§8.2).');
  lines.push('- Schutz reduziert Schaden flach, Durchdringung senkt Schutz zuerst.');
  lines.push('- Sterbewurf d20 + Ausdauer + EB vs ZW 15 (§8.5); Hart startet bei Sterbend 2 (§16.4).');
  lines.push('- Medizinische Versorgung ersetzt Verschnaufpause-Heilung (2 × Erholung), nicht additiv (§8.8).');
  return lines.join('\n');
}

// ─── Entry point ─────────────────────────────────────────────────────────────

mkdirSync('.qa/runs', { recursive: true });

const { rows, findings, bands } = runScenarios();
const report = buildReport(rows, findings, bands);
writeFileSync('.qa/runs/validate-damage-healing-dying-report.md', report, 'utf8');

if (findings.length > 0) {
  console.error(`Damage/healing/dying validation FAILED with ${findings.length} findings:`);
  findings.slice(0, 10).forEach((finding) => console.error(`- ${finding}`));
  process.exit(1);
}

console.log(
  `Damage/healing/dying validation passed: ${rows.length} scenario rows across ${bands.length} bands — report at .qa/runs/validate-damage-healing-dying-report.md.`,
);