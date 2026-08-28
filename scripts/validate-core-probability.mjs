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

import {
  TARGET_VALUES,
  ATTRIBUTE_VALUES,
  LEVELS,
  GRADES,
  SPECIALIZATION_BONUS,
  rankRowFor,
  createProfile,
  resolveGrade,
  exactProbabilities,
  singleNaturalDistribution,
  successShare,
} from './lib/core-probe.mjs';

// ─── Consistency assertions (§19.5: findings, not silent corrections) ───────


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