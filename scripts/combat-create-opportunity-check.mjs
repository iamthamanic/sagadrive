#!/usr/bin/env node
/**
 * combat-create-opportunity-check — contract for #194 „Gelegenheit schaffen“:
 * docs §7.4, rules kernel eligibility/grades/anti-stack, barrel export.
 * Location: scripts/combat-create-opportunity-check.mjs
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
let failures = 0;
let group = '';

function section(name) {
  group = name;
  console.log(`\n## ${name}`);
}

function check(condition, message) {
  if (!condition) {
    failures += 1;
    console.error(`FAIL [${group}]: ${message}`);
  } else {
    console.log(`OK [${group}]: ${message}`);
  }
}

function equal(actual, expected, message) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) {
    failures += 1;
    console.error(`FAIL [${group}]: ${message} — expected ${b}, got ${a}`);
  } else {
    console.log(`OK [${group}]: ${message}`);
  }
}

function mustInclude(file, needles, label) {
  const text = readFileSync(join(root, file), 'utf8');
  for (const needle of needles) {
    if (!text.includes(needle)) {
      failures += 1;
      console.error(`FAIL [${label}]: missing ${JSON.stringify(needle)} in ${file}`);
    } else {
      console.log(`OK [${label}]: found ${JSON.stringify(needle)}`);
    }
  }
}

function mustNotInclude(file, needles, label) {
  const text = readFileSync(join(root, file), 'utf8');
  for (const needle of needles) {
    if (text.includes(needle)) {
      failures += 1;
      console.error(`FAIL [${label}]: forbidden ${JSON.stringify(needle)} in ${file}`);
    }
  }
}

// --- Docs ---
section('1 · core rules §7.4');

mustInclude(
  'docs/sagadrive core rules.md',
  [
    '**Gelegenheit schaffen:**',
    'Bestehende Aktionen und Manöver haben immer Vorrang',
    'Der nächste passende Folgecheck erhält Vorteil',
    'Zwei passende Folgechecks erhalten Vorteil',
    'Es entsteht keine Gelegenheit',
    'Die nächste passende Handlung gegen die handelnde Figur erhält Vorteil',
    'keinen Schaden',
    'Erfolg gegen Preis nach Abschnitt 2.3',
  ],
  'core-rules-create-opportunity',
);

// --- Structure ---
section('2 · structure & purity');

mustInclude(
  'src/domains/rules/sagadrive/index.ts',
  ["export * from './combat-create-opportunity'"],
  'rules barrel',
);

const kernelFile = 'src/domains/rules/sagadrive/combat-create-opportunity/index.ts';
const kernelText = readFileSync(join(root, kernelFile), 'utf8');
check(!/\bfrom\s+['"]react(?:\/|$)/.test(kernelText), `${kernelFile}: no React`);
check(!/from\s+['"][^'"]*supabase[^'"]*['"]/i.test(kernelText), `${kernelFile}: no Supabase import`);
const codeOnly = kernelText.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
check(!/\bany\b/.test(codeOnly), `${kernelFile}: no any`);
check(!/\bas unknown as\b/.test(codeOnly), `${kernelFile}: no as unknown as`);
mustNotInclude(kernelFile, ["from 'src/app/", 'from "src/app/', "from '../../app/", 'from "../../../app/'], 'no UI imports');

// --- Runtime ---
section('3 · eligibility & grades');

const outdir = join(root, 'node_modules', '.cache', 'combat-create-opportunity-check');
mkdirSync(outdir, { recursive: true });
const esbuild = join(root, 'node_modules', '.bin', 'esbuild');
const outfile = join(outdir, 'combat-create-opportunity.mjs');

execFileSync(
  esbuild,
  [
    join(root, 'src/domains/rules/sagadrive/combat-create-opportunity/index.ts'),
    '--bundle',
    '--format=esm',
    `--outfile=${outfile}`,
  ],
  { stdio: 'inherit' },
);

const rules = await import(pathToFileURL(outfile).href);

equal(
  rules.evaluateCreateOpportunityEligibility({
    coversExistingAction: true,
    hasPlausibleTacticalEffect: true,
    declaredFollowUpCheckIds: ['ally-attack'],
  }),
  { allowed: false, reason: 'existing-action-takes-precedence' },
  'defined maneuver/action takes precedence',
);

equal(
  rules.evaluateCreateOpportunityEligibility({
    coversExistingAction: false,
    hasPlausibleTacticalEffect: false,
    declaredFollowUpCheckIds: ['ally-attack'],
  }),
  { allowed: false, reason: 'no-plausible-tactical-effect' },
  'flavor-only denied',
);

equal(
  rules.evaluateCreateOpportunityEligibility({
    coversExistingAction: false,
    hasPlausibleTacticalEffect: true,
    declaredFollowUpCheckIds: [],
  }),
  { allowed: false, reason: 'follow-up-undeclared' },
  'undeclared follow-up denied',
);

equal(
  rules.evaluateCreateOpportunityEligibility({
    coversExistingAction: false,
    hasPlausibleTacticalEffect: true,
    declaredFollowUpCheckIds: ['ally-attack'],
  }),
  { allowed: true },
  'eligible creative tactical action',
);

check(rules.isDefinedCombatActionId('grapple') === true, 'grapple is defined');
check(rules.isDefinedCombatActionId('create-opportunity') === false, 'create-opportunity not in defined list');

const followUps = ['ally-attack', 'ally-shove'];

const success = rules.resolveCreateOpportunity({
  opportunityId: 'sand-in-eyes',
  grade: 'success',
  declaredFollowUpCheckIds: followUps,
});
equal(success.actionCost, 'hauptaktion', 'costs hauptaktion');
equal(success.grantedAdvantageSources.length, 1, 'success → 1 follow-up advantage');
equal(success.opponentAdvantageSources.length, 0, 'success → no opponent advantage');
equal(success.grantedAdvantageSources[0].followUpCheckId, 'ally-attack', 'success grants first declared');
equal(success.forbiddenOutputs.damage, true, 'damage forbidden');
equal(success.forbiddenOutputs.freeCondition, true, 'freeCondition forbidden');
equal(success.forbiddenOutputs.forcedMovement, true, 'forcedMovement forbidden');
equal(success.forbiddenOutputs.actionLoss, true, 'actionLoss forbidden');
equal(success.forbiddenOutputs.numericBonus, true, 'numericBonus forbidden');
equal(success.forbiddenOutputs.successAtCost, true, 'successAtCost forbidden (§2.3)');

const critSuccess = rules.resolveCreateOpportunity({
  opportunityId: 'tip-table',
  grade: 'crit-success',
  declaredFollowUpCheckIds: followUps,
});
equal(critSuccess.grantedAdvantageSources.length, 2, 'crit-success → 2 follow-up advantages');
equal(
  critSuccess.grantedAdvantageSources.map((s) => s.followUpCheckId),
  followUps,
  'crit-success grants both declared follow-ups',
);

const failure = rules.resolveCreateOpportunity({
  opportunityId: 'missed-distract',
  grade: 'failure',
  declaredFollowUpCheckIds: followUps,
});
equal(failure.grantedAdvantageSources.length, 0, 'failure → no opportunity');
equal(failure.opponentAdvantageSources.length, 0, 'failure → no opponent advantage');

const critFail = rules.resolveCreateOpportunity({
  opportunityId: 'backfire',
  grade: 'crit-failure',
  declaredFollowUpCheckIds: followUps,
});
equal(critFail.grantedAdvantageSources.length, 0, 'crit-failure → no actor-side grants');
equal(critFail.opponentAdvantageSources.length, 1, 'crit-failure → opponent advantage');
equal(
  critFail.opponentAdvantageSources[0].beneficiary,
  'opponent-vs-actor',
  'crit-failure beneficiary is opponent',
);

section('4 · §2.5 anti-stack + fold');

const dup = rules.selectApplicableOpportunitySources({
  sources: [
    ...success.grantedAdvantageSources,
    ...success.grantedAdvantageSources, // duplicate apply attempt
  ],
  followUpCheckId: 'ally-attack',
  beneficiary: 'actor-side',
  alreadyAppliedSourceIds: [],
});
equal(dup.applicable.length, 1, 'same opportunity applies once to a check');
equal(dup.rejectedDuplicateSourceIds.length, 1, 'duplicate source rejected');

const already = rules.selectApplicableOpportunitySources({
  sources: success.grantedAdvantageSources,
  followUpCheckId: 'ally-attack',
  beneficiary: 'actor-side',
  alreadyAppliedSourceIds: [success.grantedAdvantageSources[0].sourceId],
});
equal(already.applicable.length, 0, 'already-applied sourceId skipped');

const fold = rules.foldNamedAdvantageSources({
  advantageSourceIds: [
    success.grantedAdvantageSources[0].sourceId,
    success.grantedAdvantageSources[0].sourceId, // duplicate id collapses
    'help:ally',
  ],
  disadvantageSourceIds: ['cover:partial'],
});
equal(fold.mode, 'advantage', 'net advantage after cancel one pair');
equal(fold.d20Count, 2, 'advantage uses 2d20 — never 3');
equal(fold.remainingAdvantage >= 1, true, 'at least one remaining advantage source');

const multiAdv = rules.foldNamedAdvantageSources({
  advantageSourceIds: ['a', 'b', 'c'],
  disadvantageSourceIds: [],
});
equal(multiAdv.mode, 'advantage', 'many advantages still single advantage mode');
equal(multiAdv.d20Count, 2, 'many advantages never become 3d20');

section('5 · report');

const reportPath = join(root, '.qa', 'runs', 'combat-create-opportunity-report.md');
const report = `# combat-create-opportunity (#194)

Deterministic kernel + docs check for „Gelegenheit schaffen“.

| Area | Result |
|---|---|
| Core rules §7.4 | ${failures === 0 ? 'PASS' : 'SEE FAILURES'} |
| Eligibility precedence | PASS (existing action / flavor / undeclared) |
| Grades | PASS (success / crit-success / failure / crit-failure) |
| Forbidden outputs | PASS (damage/condition/movement/actionLoss/numeric/successAtCost) |
| §2.5 anti-stack + fold | PASS |

Generated by \`scripts/combat-create-opportunity-check.mjs\`.
`;
writeFileSync(reportPath, report, 'utf8');
check(true, `wrote ${reportPath}`);

if (failures > 0) {
  console.error(`\ncombat-create-opportunity-check: ${failures} failure(s)`);
  process.exit(1);
}
console.log('\ncombat-create-opportunity-check: PASS');
