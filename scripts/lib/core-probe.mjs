/**
 * Shared SagaDrive core probe models — single source of truth for all
 * validation engines. Extracted from scripts/validate-core-probability.mjs (#19).
 *
 * Rule source: "docs/sagadrive core rules.md" §2 (probes), §3 (attributes),
 * §5 (skills/caps/EB). Consumers: validate-core-probability.mjs (#19),
 * validate-combat-action-economy.mjs (#22).
 *
 * Location: scripts/lib/core-probe.mjs
 */

/** §2.7 difficulty scale: fixed target numbers that do not scale with level. */
export const TARGET_VALUES = [5, 10, 15, 20, 25, 30, 35];

/** §5.3: level band → rank, experience bonus (trained only), skill cap. */
export const RANK_TABLE = [
  { minLevel: 1, maxLevel: 4, rank: 'Novize', experienceBonus: 1, skillCap: 3 },
  { minLevel: 5, maxLevel: 8, rank: 'Spezialist', experienceBonus: 2, skillCap: 4 },
  { minLevel: 9, maxLevel: 12, rank: 'Experte', experienceBonus: 3, skillCap: 4 },
  { minLevel: 13, maxLevel: 16, rank: 'Meister', experienceBonus: 4, skillCap: 5 },
  { minLevel: 17, maxLevel: 20, rank: 'Legende', experienceBonus: 5, skillCap: 5 },
];

/** §3.2 attribute range validated by the matrices. */
export const ATTRIBUTE_VALUES = [1, 2, 3, 4, 5];

/** §5.2 specialization bonus when explicitly applicable. */
export const SPECIALIZATION_BONUS = 2;

/** §2.4 safety rating baseline. */
export const SAFETY_BASE = 10;

/** §2.2 critical grade margin (total ≥ target ± 10). */
export const CRITICAL_MARGIN = 10;

/** Validated level bands (A1 matrix). */
export const LEVELS = [1, 5, 9, 13, 17, 20];

export const GRADES = Object.freeze({
  CRIT_SUCCESS: 'crit-success',
  SUCCESS: 'success',
  FAILURE: 'failure',
  CRIT_FAILURE: 'crit-failure',
});

export function rankRowFor(level) {
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
export function createProfile({ level, attribute, skill, trained, specialization = 0 }) {
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
export function resolveGrade(total, target, natural) {
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
 *    exact ordered-pair weight over 400 ordered pairs per §2.5 — never more
 *    than 2 dice.
 *  - 'safety': §2.4 controlled work; value = 10 + applicable bonuses; no die.
 * Returns percentages per grade summing to exactly 100 (float epsilon).
 */
export function exactProbabilities(profile, target, mode = 'normal') {
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
 * Exact single-grade distribution for one natural die result. Used for
 * boundary invariants: nat 1 = worst §2.2-degraded outcome, nat 20 = best.
 */
export function singleNaturalDistribution(profile, target, natural) {
  const flatBonus =
    profile.attribute + profile.skill + profile.experienceBonus + profile.specialization;
  const grade = resolveGrade(flatBonus + natural, target, natural);
  const single = {};
  for (const key of Object.values(GRADES)) {
    single[key] = key === grade ? 100 : 0;
  }
  return single;
}

export function successShare(distribution) {
  return distribution[GRADES.SUCCESS] + distribution[GRADES.CRIT_SUCCESS];
}