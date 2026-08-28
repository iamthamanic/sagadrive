#!/usr/bin/env node
/**
 * SagaDrive Core Probability Validation (#19, Epic #18)
 *
 * Deterministic, exact (non-Monte-Carlo) validation of the SagaDrive core probe:
 *   d20 + attribute + skill + experience bonus + specialization + explicit modifiers
 *
 * Rule source: "docs/sagadrive core rules.md" §2 (probes), §3 (attributes),
 * §5 (skills/caps/EB), §2.7 (difficulty scale), §19 (validation phase).
 * Validation plan: "docs/sagadrive core validation.md" section A1.
 *
 * Computes exact grade probabilities for the full A1 matrix plus consistency
 * assertions that fail the run on degenerate curves. Report is written to
 * .qa/runs/validate-core-probability-report.md.
 *
 * Location: scripts/validate-core-probability.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import process from 'node:process';

// ─── Core rule constants (docs/sagadrive core rules.md) ─────────────────────

/** §2.7 difficulty scale: fixed target numbers that do not scale with level. */
const TARGET_VALUES = [5, 10, 15, 20, 25, 30, 35];

/** §5.3: level band start → rank, experience bonus (trained only), skill cap. */
const RANK_TABLE = [
  { minLevel: 1, maxLevel: 4, rank: 'Novize', experienceBonus: 1, skillCap: 3 },
  { minLevel: 5, maxLevel: 8, rank: 'Spezialist', experienceBonus: 2, skillCap: 4 },
  { minLevel: 9, maxLevel: 12, rank: 'Experte', experienceBonus: 3, skillCap: 4 },
  { minLevel: 13, maxLevel: 16, rank: 'Meister', experienceBonus: 4, skillCap: 5 },
  { minLevel: 17, maxLevel: 20, rank: 'Legende', experienceBonus: 5, skillCap: 5 },
];

/** §3.2 attribute range validated by the matrix. */
const ATTRIBUTE_VALUES = [1, 2, 3, 4, 5];

/** §5.2 specialization bonus when explicitly applicable. */
const SPECIALIZATION_BONUS = 2;

/** §2.4 safety rating baseline. */
const SAFETY_BASE = 10;

/** §2.2 critical grade margin (total ≥ target ± 10). */
const CRITICAL_MARGIN = 10;

/** Validated level bands (A1 matrix). */
const LEVELS = [1, 5, 9, 13, 17, 20];

const GRADES = Object.freeze({
  CRIT_SUCCESS: 'crit-success',
  SUCCESS: 'success',
  FAILURE: 'failure',
  CRIT_FAILURE: 'crit-failure',
});

// ─── Probe model (§2.1, §2.2, §2.4, §2.5, §3.6) ─────────────────────────────

function rankRowFor(level) {
  const row = RANK_TABLE.find((entry) => level >= entry.minLevel && level <= entry.maxLevel);
  if (!row) {
    throw new Error(`Level ${level} outside the validated 1-20 band.`);
  }
  return row;
}

/**
 * Build the probe profile from a character configuration.
 * Fails closed: throws on rule violations instead of silently correcting.
 */
function createProfile({ level, attribute, skill, trained, specialization = 0 }) {
  const row = rankRowFor(level);

  if (!Number.isInteger(skill) || skill < 0 || skill > row.skillCap) {
    throw new Error(`Skill ${skill} invalid for level ${level} (cap ${row.skillCap}, ${row.rank}) — fails closed per §5.3.`);
  }
  if (trained && skill === 0) {
    throw new Error('Trained probe requires skill >= 1 (§5.3 competence table).');
  }
  if (!trained && skill !== 0) {
    throw new Error('Untrained probes use skill 0 by matrix definition.');
  }
  if (attribute < 1 || attribute > 5) {
    throw new Error(`Attribute ${attribute} outside validated range 1-5 (§3.2).`);
  }
  if (specialization !== 0 && specialization !== SPECIALIZATION_BONUS) {
    throw new Error(`Specialization must be 0 or +${SPECIALIZATION_BONUS} (§5.2).`);
  }
  if (specialization !== 0 && skill === 0) {
    throw new Error('Specialization requires trained skill (§5.2: first spec needs skill 1).');
  }

  return {
    level,
    rank: row.rank,
    attribute,
    skill,
    trained,
    experienceBonus: trained ? row.experienceBonus : 0,
    specialization,
  };
}

/**
 * Determine the success grade per §2.2: compare total against target with the
 * ±10 margins, then apply the natural 1/20 one-step grade shift (clamped at
 * crit success / crit failure).
 */
function resolveGrade(total, target, natural) {
  const margin = total - target;
  let grade;
  if (margin >= CRITICAL_MARGIN) grade = GRADES.CRIT_SUCCESS;
  else if (margin >= 0) grade = GRADES.SUCCESS;
  else if (margin <= -CRITICAL_MARGIN) grade = GRADES.CRIT_FAILURE;
  else grade = GRADES.FAILURE;

  if (natural === 20 && grade !== GRADES.CRIT_SUCCESS) {
    if (grade === GRADES.CRIT_FAILURE) grade = GRADES.FAILURE;
    else if (grade === GRADES.FAILURE) grade = GRADES.SUCCESS;
    else grade = GRADES.CRIT_SUCCESS;
  } else if (natural === 1 && grade !== GRADES.CRIT_FAILURE) {
    if (grade === GRADES.CRIT_SUCCESS) grade = GRADES.SUCCESS;
    else if (grade === GRADES.SUCCESS) grade = GRADES.FAILURE;
    else grade = GRADES.CRIT_FAILURE;
  }
  return grade;
}

/**
 * Exact outcome distribution for one probe profile against one target.
 * `mode` selects the d20 mechanism:
 *  - 'normal': single d20 (weight 1 per natural)
 *  - 'advantage' / 'disadvantage': 2d20 keep high/low; each natural n gets its
 *    exact ordered-pair weight (2n-1 / 41-2n out of 400) per §2.5 — never more
 *    than 2 dice.
 *  - 'safety': §2.4 controlled work; value = 10 + applicable bonuses; no die.
 * Returns percentages per grade summing to exactly 100 (float epsilon).
 */
function exactProbabilities(profile, target, mode = 'normal') {
  const flatBonus =
    profile.attribute + profile.skill + profile.experienceBonus + profile.specialization;

  if (mode === 'safety') {
    if (!profile.trained) {
      throw new Error('Sicheres Arbeiten requires a trained skill (§2.4).');
    }
    const safetyValue = SAFETY_BASE + flatBonus;
    const grade = resolveGrade(safetyValue, target, null);
    const distribution = {};
    for (const key of Object.values(GRADES)) {
      distribution[key] = key === grade ? 100 : 0;
    }
    return distribution;
  }

  const weights = new Map();
  if (mode === 'normal') {
    for (let natural = 1; natural <= 20; natural += 1) {
      weights.set(natural, 1);
    }
  } else {
    for (let a = 1; a <= 20; a += 1) {
      for (let b = 1; b <= 20; b += 1) {
        const kept = mode === 'advantage' ? Math.max(a, b) : Math.min(a, b);
        weights.set(kept, (weights.get(kept) ?? 0) + 1);
      }
    }
  }

  const totals = new Map();
  let grandTotal = 0;
  for (const [natural, weight] of weights) {
    const grade = resolveGrade(natural + flatBonus, target, natural);
    totals.set(grade, (totals.get(grade) ?? 0) + weight);
    grandTotal += weight;
  }

  const distribution = {};
  for (const grade of Object.values(GRADES)) {
    distribution[grade] = ((totals.get(grade) ?? 0) / grandTotal) * 100;
  }
  return distribution;
}

/**
 * Exact single-grade distribution for one natural die result. Used for the
 * safety-mode boundary invariants: nat 1 = worst §2.2-degraded outcome,
 * nat 20 = best outcome of the same profile.
 */
function singleNaturalDistribution(profile, target, natural) {
  const flatBonus =
    profile.attribute + profile.skill + profile.experienceBonus + profile.specialization;
  const grade = resolveGrade(flatBonus + natural, target, natural);
  const single = {};
  for (const key of Object.values(GRADES)) {
    single[key] = key === grade ? 100 : 0;
  }
  return single;
}

// ─── Consistency assertions (§19.5: findings, not silent corrections) ───────

function successShare(distribution) {
  return distribution[GRADES.SUCCESS] + distribution[GRADES.CRIT_SUCCESS];
}

function assertConsistency(profile, target, distributions, findings) {
  const { normal, advantage, disadvantage } = distributions;

  // §2.5 ordering: advantage ≥ normal ≥ disadvantage for identical profiles.
  if (successShare(advantage) < successShare(normal) - 1e-9) {
    findings.push(
      `Advantage underperforms normal: level=${profile.level} attr=${profile.attribute} skill=${profile.skill} spec=${profile.specialization} ZW=${target}`,
    );
  }
  if (successShare(normal) < successShare(disadvantage) - 1e-9) {
    findings.push(
      `Normal underperforms disadvantage: level=${profile.level} attr=${profile.attribute} skill=${profile.skill} spec=${profile.specialization} ZW=${target}`,
    );
  }

  // Deterministic engine invariant: each distribution sums to exactly 100%.
  for (const [mode, distribution] of Object.entries(distributions)) {
    const sum = Object.values(distribution).reduce((acc, value) => acc + value, 0);
    if (Math.abs(sum - 100) > 1e-6) {
      findings.push(`Distribution does not sum to 100%: level=${profile.level} ZW=${target} mode=${mode} sum=${sum}`);
    }
  }
}

/**
 * Monotonicity across target values for one profile: success share must be
 * non-increasing as the target rises (§2.2 fixed thresholds).
 */
function assertTargetMonotonicity(profile, distributionsByTarget, findings) {
  const sortedTargets = [...TARGET_VALUES].sort((a, b) => a - b);
  for (let i = 1; i < sortedTargets.length; i += 1) {
    const lower = successShare(distributionsByTarget[sortedTargets[i - 1]]);
    const higher = successShare(distributionsByTarget[sortedTargets[i]]);
    if (higher > lower + 1e-9) {
      findings.push(
        `Success share increases with target: level=${profile.level} attr=${profile.attribute} skill=${profile.skill} spec=${profile.specialization} ZW ${sortedTargets[i - 1]}→${sortedTargets[i]} (${lower.toFixed(2)}% → ${higher.toFixed(2)}%)`,
      );
    }
  }
}

// ─── Matrix run ──────────────────────────────────────────────────────────────

function runMatrix() {
  const findings = [];
  const rows = [];
  let profileCount = 0;

  for (const level of LEVELS) {
    const row = rankRowFor(level);

    // Untrained skill-0 profile: no EB, no specialization (§2.1, §5.2).
    const untrained = createProfile({ level, attribute: 3, skill: 0, trained: false });
    profileCount += 1;
    const untrainedByTarget = {};
    for (const target of TARGET_VALUES) {
      const normal = exactProbabilities(untrained, target, 'normal');
      const advantage = exactProbabilities(untrained, target, 'advantage');
      const disadvantage = exactProbabilities(untrained, target, 'disadvantage');
      assertConsistency(untrained, target, { normal, advantage, disadvantage }, findings);
      untrainedByTarget[target] = normal;
      rows.push({ level, rank: untrained.rank, attribute: 3, skill: 0, trained: false, specialization: 0, target, normal, advantage, disadvantage });
    }
    assertTargetMonotonicity(untrained, untrainedByTarget, findings);

    for (const attribute of ATTRIBUTE_VALUES) {
      for (let skill = 1; skill <= row.skillCap; skill += 1) {
        for (const specialization of [0, SPECIALIZATION_BONUS]) {
          let profile;
          try {
            profile = createProfile({ level, attribute, skill, trained: true, specialization });
          } catch (error) {
            findings.push(`createProfile threw for level=${level} attr=${attribute} skill=${skill} spec=${specialization}: ${error.message}`);
            continue;
          }
          profileCount += 1;

          const byTarget = {};
          for (const target of TARGET_VALUES) {
            const normal = exactProbabilities(profile, target, 'normal');
            const advantage = exactProbabilities(profile, target, 'advantage');
            const disadvantage = exactProbabilities(profile, target, 'disadvantage');
            assertConsistency(profile, target, { normal, advantage, disadvantage }, findings);
            byTarget[target] = normal;
            rows.push({ level, rank: profile.rank, attribute, skill, trained: true, specialization, target, normal, advantage, disadvantage });

            // §2.4 safety path: trained profiles only; safety value = 10 + bonuses.
            const safety = exactProbabilities(profile, target, 'safety');
            // Safety replaces the die under controlled conditions. §2.4 makes no
            // success guarantee — the sound invariants are: safety beats the
            // §2.2-degraded nat-1 outcome and does not beat the nat-20 outcome.
            const nat1 = singleNaturalDistribution(profile, target, 1);
            const nat20 = singleNaturalDistribution(profile, target, 20);
            if (successShare(safety) + 1e-9 < successShare(nat1)) {
              findings.push(`Safety below nat-1 outcome: level=${level} attr=${attribute} skill=${skill} ZW=${target}`);
            }
            if (successShare(safety) > successShare(nat20) + 1e-9) {
              findings.push(`Safety above nat-20 outcome: level=${level} attr=${attribute} skill=${skill} ZW=${target}`);
            }
          }
          assertTargetMonotonicity(profile, byTarget, findings);
        }
      }
    }
  }

  return { rows, findings, profileCount };
}

// ─── Report ──────────────────────────────────────────────────────────────────

function buildReport(rows, findings, profileCount) {
  const lines = [];
  lines.push('# SagaDrive Core Probability Validation Report (#19)');
  lines.push('');
  lines.push('Exact, deterministic validation of the core probe per A1 matrix.');
  lines.push('');
  lines.push(`- Profiles: ${profileCount}`);
  lines.push(`- Probe rows: ${rows.length}`);
  lines.push(`- Findings: ${findings.length}`);
  lines.push(`- Modes: normal / advantage / disadvantage / safety`);
  lines.push('');
  lines.push('## Findings');
  if (findings.length === 0) {
    lines.push('No degenerate curves, monotonicity violations, or nat-1/20 anomalies detected across the full A1 matrix.');
  } else {
    findings.forEach((finding) => lines.push(`- ${finding}`));
  }
  lines.push('');
  lines.push('## Representative curve excerpts');
  lines.push('');
  lines.push('Legend: S = Erfolg + krit. Erfolg kumuliert (normal roll), KS = krit. Erfolg, KF = krit. Fehlschlag.');
  lines.push('');
  lines.push('| Level | Rank | Attr | Skill | Spec | ZW | Normal S% | Adv S% | Dis S% | KS% | KF% |');
  lines.push('|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
  const excerpts = rows.filter(
    (rowItem) => rowItem.attribute === 3 && rowItem.specialization === 0 && [10, 15, 20, 25].includes(rowItem.target),
  );
  for (const rowItem of excerpts) {
    lines.push(
      `| ${rowItem.level} | ${rowItem.rank} | ${rowItem.attribute} | ${rowItem.skill} | ${rowItem.specialization} | ${rowItem.target} | ` +
        `${(rowItem.normal[GRADES.SUCCESS] + rowItem.normal[GRADES.CRIT_SUCCESS]).toFixed(2)} | ` +
        `${(rowItem.advantage[GRADES.SUCCESS] + rowItem.advantage[GRADES.CRIT_SUCCESS]).toFixed(2)} | ` +
        `${(rowItem.disadvantage[GRADES.SUCCESS] + rowItem.disadvantage[GRADES.CRIT_SUCCESS]).toFixed(2)} | ` +
        `${rowItem.normal[GRADES.CRIT_SUCCESS].toFixed(2)} | ` +
        `${rowItem.normal[GRADES.CRIT_FAILURE].toFixed(2)} |`,
    );
  }
  lines.push('');
  lines.push('## Notes');
  lines.push('- Exact calculation over the full d20/2d20 outcome space; no sampling error.');
  lines.push('- Nat 1/20 grade shift modeled per §2.2 with clamp at crit-failure/crit-success.');
  lines.push('- EB only for trained skills; untrained probes model skill 0 without EB (§2.1).');
  lines.push('- Safety value = 10 + flat bonus, trained only, no die (§2.4).');
  lines.push('- Widerstände (§2.6) share the probe formula; matrix rows double as resistance profiles.');
  return lines.join('\n');
}

// ─── Entry point ─────────────────────────────────────────────────────────────

mkdirSync('.qa/runs', { recursive: true });

const { rows, findings, profileCount } = runMatrix();
const report = buildReport(rows, findings, profileCount);
writeFileSync('.qa/runs/validate-core-probability-report.md', report, 'utf8');

if (findings.length > 0) {
  console.error(`Core probability validation FAILED with ${findings.length} findings:`);
  findings.slice(0, 10).forEach((finding) => console.error(`- ${finding}`));
  process.exit(1);
}

console.log(
  `Core probability validation passed: ${rows.length} probe rows across ${profileCount} profiles — report at .qa/runs/validate-core-probability-report.md.`,
);