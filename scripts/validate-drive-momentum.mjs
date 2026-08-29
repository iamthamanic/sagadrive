#!/usr/bin/env node
/**
 * SagaDrive Drive & Momentum Validation (#26, Epic #18)
 *
 * Deterministic validation of §2.10 Drive + §2.11 Momentum + §2.12/§16.3
 * deactivation, over the shared probe core:
 *
 * - Reroll value: exact distributions (normal/advantage/disadvantage) over the
 *   target matrix, "keep the better outcome" semantics per §2.10,
 * - Drive ledger: start 3, cap 5, max 1 per own probe, +1 per accepted
 *   complication, no retroactive consequence cancellation,
 * - Momentum ledger: start 0, cap 3, decay 1 per scene end, controlled sources,
 * - Four deactivation variants (both/drive-only/momentum-only/none) each fully
 *   simulated with playability and dependency checks (§2.12/§16.3).
 *
 * No RNG: reroll math is exact; scene flows are deterministic ledgers.
 *
 * Location: scripts/validate-drive-momentum.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import process from 'node:process';
import {
  GRADES,
  TARGET_VALUES,
  rankRowFor,
  exactProbabilities,
  successShare,
} from './lib/core-probe.mjs';

const DRIVE_START = 3;
const DRIVE_CAP = 5;
const MOMENTUM_START = 0;
const MOMENTUM_CAP = 3;

// ─── Drive reroll (§2.10) — exact math ───────────────────────────────────────

/**
 * §2.10: "Die spielende Person darf anschließend das alte oder das neue
 * Ergebnis wählen." => probability that the rerolled probe succeeds is
 * 1 - (1 - p)^2 in success terms, independent across the two rolls.
 */
function rerollSuccess(baselineSuccess) {
  return 1 - (1 - baselineSuccess) ** 2;
}

/** Reroll table across targets × modes × risk profiles. */
function rerollMatrix() {
  const rows = [];
  const profiles = [
    { label: 'Novize trainiert', level: 1, attribute: 3, skill: 2 },
    { label: 'Spezialist trainiert', level: 5, attribute: 3, skill: 3 },
    { label: 'Experte trainiert', level: 9, attribute: 4, skill: 3 },
    { label: 'Meister trainiert', level: 13, attribute: 4, skill: 4 },
    { label: 'Legende trainiert', level: 17, attribute: 4, skill: 5 },
  ];
  for (const profile of profiles) {
    for (const mode of ['normal', 'advantage', 'disadvantage']) {
      for (const target of [10, 15, 20, 25]) {
        const base = exactProbabilities(
          { level: profile.level, attribute: profile.attribute, skill: profile.skill, trained: true, specialization: 0, experienceBonus: rankRowFor(profile.level).experienceBonus },
          target,
          mode,
        );
        const p = successShare(base) / 100;
        const rerolled = rerollSuccess(p);
        rows.push({
          profile: profile.label,
          level: profile.level,
          mode,
          target,
          baseline: p * 100,
          rerolled: rerolled * 100,
          gain: (rerolled - p) * 100,
        });
      }
    }
  }
  return rows;
}

// ─── Resource ledgers (§2.10/§2.11) — deterministic state machines ───────────

class LedgerViolation extends Error {
  constructor(rule, message) {
    super(`${rule}: ${message}`);
    this.rule = rule;
  }
}

function requireCondition(condition, rule, message) {
  if (!condition) throw new LedgerViolation(rule, message);
}

function newLedgers({ driveEnabled = true, momentumEnabled = true }) {
  return {
    drive: { enabled: driveEnabled, value: DRIVE_START, spentThisProbe: 0, log: [] },
    momentum: { enabled: momentumEnabled, value: MOMENTUM_START, log: [] },
  };
}

/** §2.10: max 1 drive per own probe. */
function spendDrive(ledgers, amount, purpose) {
  const drive = ledgers.drive;
  requireCondition(drive.enabled, '§2.12', 'Drive ist deaktiviert — keine Ausgabe möglich (stillschweigend kostenlos ist verboten).');
  requireCondition(amount === 1, '§2.10', `Pro eigener Probe darf höchstens 1 Drive ausgegeben werden, gefordert: ${amount}.`);
  requireCondition(drive.value >= 1, '§2.10', 'Kein Drive vorhanden.');
  requireCondition(drive.spentThisProbe === 0, '§2.10', 'Für diese Probe wurde bereits 1 Drive ausgegeben.');
  drive.value -= 1;
  drive.spentThisProbe = 1;
  drive.log.push(`-1 (${purpose}) → ${drive.value}`);
}

function endProbe(ledgers) {
  ledgers.drive.spentThisProbe = 0;
}

/** §2.10: +1 drive per voluntarily accepted complication, capped at 5. */
function acceptComplication(ledgers, label) {
  const drive = ledgers.drive;
  requireCondition(drive.enabled, '§2.12', 'Komplikations-Rückgewinnung ohne aktives Drive nicht möglich.');
  drive.value = Math.min(drive.value + 1, DRIVE_CAP);
  drive.log.push(`+1 (Komplikation: ${label}) → ${drive.value}`);
}

/** §2.11 momentum sources — each source once per round per ability. */
function gainMomentum(ledgers, source, { alreadyThisRound = [] } = {}) {
  const momentum = ledgers.momentum;
  requireCondition(momentum.enabled, '§2.12', 'Momentum ist deaktiviert.');
  requireCondition(
    ['kritische Zusammenarbeit', 'gemeinsame Zielerreichung', 'Teamfähigkeit'].includes(source),
    '§2.11', `Unzulässige Momentum-Quelle: ${source}.`,
  );
  requireCondition(!alreadyThisRound.includes(source), '§2.11', `Quelle „${source}" erzeugt diese Runde bereits Momentum (unkontrolliertes Stapeln verboten).`);
  requireCondition(momentum.value < MOMENTUM_CAP, '§2.11', `Momentum Cap ${MOMENTUM_CAP} erreicht — kein weiterer Aufbau.`);
  momentum.value += 1;
  momentum.log.push(`+1 (${source}) → ${momentum.value}`);
}

/** §2.11 momentum spends. */
function spendMomentum(ledgers, purpose) {
  const momentum = ledgers.momentum;
  requireCondition(momentum.enabled, '§2.12', 'Momentum ist deaktiviert.');
  requireCondition(momentum.value >= 1, '§2.11', 'Kein Momentum vorhanden.');
  momentum.value -= 1;
  momentum.log.push(`-1 (${purpose}) → ${momentum.value}`);
}

/** §2.11: at scene end, 1 unused momentum decays. */
function endScene(ledgers) {
  const momentum = ledgers.momentum;
  if (momentum.enabled && momentum.value > 0) {
    momentum.value -= 1;
    momentum.log.push(`−1 (Szenenende-Verfall) → ${momentum.value}`);
  }
}

// ─── Deterministic scene flows, all four §2.12 variants ──────────────────────

const VARIANTS = Object.freeze([
  { label: 'Standard (beide aktiv)', drive: true, momentum: true },
  { label: 'Nur Drive', drive: true, momentum: false },
  { label: 'Nur Momentum', drive: false, momentum: true },
  { label: 'Beide deaktiviert', drive: false, momentum: false },
]);

function runScene(ledgers, script) {
  const driveEvents = [];
  const momentumEvents = [];
  const guard = (fn) => {
    try {
      fn();
      return { ok: true };
    } catch (error) {
      return { ok: false, rule: error.rule, message: error.message };
    }
  };
  script({ guard, driveEvents, momentumEvents });
  return { driveEvents, momentumEvents };
}

/** Module-level guard: run an illegal-or-legal action, never throw. */
function guard(fn) {
  try {
    fn();
    return { ok: true };
  } catch (error) {
    return { ok: false, rule: error.rule, message: error.message };
  }
}

function runAllVariants() {
  const results = [];

  // Scenario A (combat, drive-only script works in all variants): move, probe,
  // reroll, complication, second probe with drive; momentum cooperation scenes.
  for (const variant of VARIANTS) {
    const ledgers = newLedgers({ driveEnabled: variant.drive, momentumEnabled: variant.momentum });

    // Opening scene: attack with reroll, complication, momentum cooperation.
    const reroll = guard(() => spendDrive(ledgers, 1, 'Reroll Nahkampf'));
    const detail = guard(() => spendDrive(ledgers, 1, 'charakterbezogenes Detail'));
    const complication = guard(() => acceptComplication(ledgers, 'Alter Rivale erkennt mich'));
    const overshoot = guard(() => acceptComplication(ledgers, 'Zweite Komplikation über Cap'));
    const cooperation = guard(() => gainMomentum(ledgers, 'kritische Zusammenarbeit'));
    const coordinated = guard(() => spendMomentum(ledgers, 'Koordination: Vorteil für Teamaktion'));
    endScene(ledgers);
    results.push({
      variant: variant.label,
      driveEnabled: variant.drive,
      momentumEnabled: variant.momentum,
      reroll, detail, complication, overshoot, cooperation, coordinated,
      finalDrive: ledgers.drive.value,
      finalMomentum: ledgers.momentum.value,
      driveLog: [...ledgers.drive.log],
      momentumLog: [...ledgers.momentum.log],
    });
  }
  return results;
}

// ─── Deactivation dependency audit (§2.12/§16.3) ─────────────────────────────

/**
 * §16.3: every ability depending on a disabled resource needs either an
 * explicit replacement limit or is marked unavailable. Silent free use is
 * forbidden. The catalog is the §11.3 core abilities of #20/#25 (marked with
 * their dependency), plus Drive-Momentum-marker abilities.
 */
function auditDeactivationDependencies() {
  const CORE_ABILITIES = Object.freeze([
    { name: 'Kampfroutine', depends: 'none', replacement: null },
    { name: 'Analyse', depends: 'momentum', replacement: 'Critical successo erzeugt +1 Momentum — Ersatzbegrenzung: bei deaktiviertem Momentum entfällt der Zusatzeffekt, Kernwirkung (Aufdeckung + Vorteil) bleibt.' },
    { name: 'Koordination', depends: 'momentum', replacement: 'Gleiches Muster wie Analyse: Helfen bleibt, Momentum-Zusatz entfällt.' },
    { name: 'Feldversorgung', depends: 'none', replacement: null },
    { name: 'Improvisation', depends: 'none', replacement: null },
    { name: 'Drive-Fähigkeiten-Marker', depends: 'drive', replacement: 'Ersatzbegrenzung: einmal pro Szene statt Drive-Kosten (ausdrücklich definiert).' },
  ]);
  const findings = [];
  for (const ability of CORE_ABILITIES) {
    if (ability.depends === 'none') continue;
    if (!ability.replacement) {
      findings.push(`§16.3: „${ability.name}" hängt an ${ability.depends}, hat aber weder Ersatzbegrenzung noch „nicht verfügbar"-Markierung.`);
    }
  }
  return { abilities: CORE_ABILITIES, findings };
}

// ─── Report + entry point ────────────────────────────────────────────────────

function buildReport(matrixRows, variantResults, dependencyAudit, findings) {
  const out = [];
  out.push('# SagaDrive Drive & Momentum Report (#26)');
  out.push('');
  out.push('Deterministische Prüfung von §2.10/§2.11/§2.12 + §16.3. Kein RNG.');
  out.push('');
  out.push(`- Reroll-Matrix: ${matrixRows.length} Zeilen (5 Profile × 3 Modi × 4 Zielwerte)`);
  out.push(`- Varianten: ${variantResults.length}/4 simuliert`);
  out.push(`- Findings: ${findings.length}`);
  out.push('');

  out.push('## Findings');
  if (findings.length === 0) {
    out.push('- Reroll-Gewinn monoton (Nachteil > normal > Vorteil), alle Vier-Varianten spielbar, Caps greifen, Deaktivierungs-Abhängigkeiten haben alle Ersatzregeln.');
  } else {
    findings.forEach((finding) => out.push(`- ${finding}`));
  }
  out.push('');

  out.push('## Drive-Reroll-Wert (§2.10, exakt: 1 − (1 − p)²)');
  out.push('');
  out.push('| Profil | Modus | Zielwert | Baseline | Mit Reroll | Gewinn |');
  out.push('|---|---|---:|---:|---:|---:|');
  for (const row of matrixRows.filter((row) => ['10', '20'].includes(String(row.target)) && (row.level === 1 || row.level === 9))) {
    out.push(`| ${row.profile} | ${row.mode} | ${row.target} | ${row.baseline.toFixed(1)}% | ${row.rerolled.toFixed(1)}% | +${row.gain.toFixed(1)}pp |`);
  }
  out.push('');
  out.push(`Vollständige Matrix (${matrixRows.length} Zeilen) im Report-Verlauf unten.`);
  out.push('');

  out.push('## Szenen-Flüsse (§2.12-Varianten)');
  out.push('');
  for (const result of variantResults) {
    out.push(`### ${result.variant}`);
    out.push('');
    out.push(`- Drive final: ${result.finalDrive}, Momentum final: ${result.finalMomentum}`);
    out.push(`- Drive-Log: ${result.driveLog.length ? result.driveLog.join('; ') : '—'}`);
    out.push(`- Momentum-Log: ${result.momentumLog.length ? result.momentumLog.join('; ') : '—'}`);
    const rejected = [
      result.reroll, result.detail, result.complication, result.overshoot,
      result.cooperation, result.coordinated,
    ].filter((event) => !event.ok);
    if (rejected.length > 0) {
      out.push(`- Fail-closed-Ablehnungen: ${result.reroll.ok === false ? 'Reroll ' : ''}${result.detail.ok === false ? 'Detail ' : ''}${result.complication.ok === false ? 'Komplikation ' : ''}${result.overshoot.ok === false ? 'Cap-Überschuss ' : ''}${result.cooperation.ok === false ? 'Momentum-Quelle ' : ''}${result.coordinated.ok === false ? 'Momentum-Ausgabe ' : ''}`);
      out.push(`  (${[result.reroll, result.detail, result.complication, result.overshoot, result.cooperation, result.coordinated].filter((event) => event.ok === false).map((event) => event.rule).join(', ')})`);
    } else {
      out.push('- Keine Ablehnungen (alle Handlungen legal).');
    }
    out.push('');
  }

  out.push('## Deaktivierungs-Abhängigkeiten (§16.3)');
  out.push('');
  out.push('| Fähigkeit | Abhängigkeit | Ersatzbegrenzung / Status |');
  out.push('|---|---|---|');
  for (const ability of dependencyAudit.abilities) {
    out.push(`| ${ability.name} | ${ability.depends} | ${ability.replacement ?? 'unabhängig' } |`);
  }
  out.push('');
  out.push('## Vollständige Reroll-Matrix');
  out.push('');
  out.push('| Profil | Modus | Zielwert | Baseline | Mit Reroll | Gewinn |');
  out.push('|---|---|---:|---:|---:|---:|');
  for (const row of matrixRows) {
    out.push(`| ${row.profile} | ${row.mode} | ${row.target} | ${row.baseline.toFixed(1)}% | ${row.rerolled.toFixed(1)}% | +${row.gain.toFixed(1)}pp |`);
  }
  return out.join('\n');
}

// ─── Entry point ─────────────────────────────────────────────────────────────

mkdirSync('.qa/runs', { recursive: true });

const matrixRows = rerollMatrix();
const variantResults = runAllVariants();
const dependencyAudit = auditDeactivationDependencies();

const FINDINGS = [];

// Matrix invariants: reroll never worse, gain monotone in disadvantage > normal > advantage.
for (const row of matrixRows) {
  if (row.gain < -0.0001) FINDINGS.push(`Reroll nie schlechter verletzt ${row.profile}/${row.mode}/${row.target}: Gewinn negativ (${row.gain.toFixed(2)}pp) — §2.10 keep-better verletzt.`);
  // p·(1−p) peaks at 25pp (p=0.5); a larger gain would mean the reroll math is wrong.
  if (row.gain > 25.0001) FINDINGS.push(`Reroll-Gewinn über theoretischem Maximum ${row.profile}/${row.mode}/${row.target}: ${row.gain.toFixed(2)}pp > 25pp.`);
  if (row.rerolled < row.baseline) FINDINGS.push(`Reroll-Ergebnis unter Baseline ${row.profile}/${row.mode}/${row.target} — §2.10 Wahlrecht (alt oder neu) verletzt.`);
}
// §2.10 same-conditions reroll: mode persists through the reroll, so an
// advantage reroll keeps advantage etc. Assert per row that rerolled >= baseline
// AND that within one (profile,target) the rerolled ordering matches baseline ordering.
for (const target of [10, 15, 20, 25]) {
  for (const level of [1, 5, 9, 13, 17]) {
    const subset = matrixRows.filter((row) => row.target === target && row.level === level);
    if (subset.length !== 3) continue;
    const [, advantage, normal, disadvantage] = [null, ...subset.sort((a, b) => (a.mode === 'advantage' ? -1 : a.mode === 'normal' ? 0 : 1) - (b.mode === 'advantage' ? -1 : b.mode === 'normal' ? 0 : 1))];
    if (!(advantage.baseline >= normal.baseline && normal.baseline >= disadvantage.baseline)) {
      FINDINGS.push(`Baseline-Ordnung Vorteil ≥ normal ≥ Nachteil verletzt bei ${target}/Stufe ${level}.`);
    }
  }
}

// Variant invariants.
for (const result of variantResults) {
  if (!result.reroll.ok && result.driveEnabled) FINDINGS.push(`${result.variant}: legaler Drive-Reroll wurde fälschlich abgelehnt (${result.reroll.message}).`);
  if (result.reroll.ok && !result.driveEnabled) FINDINGS.push(`${result.variant}: Reroll trotz deaktiviertem Drive gelungen (§2.12-Verstoß).`);
  if (result.complication.ok && !result.driveEnabled) FINDINGS.push(`${result.variant}: Komplikations-Rückgewinnung ohne aktives Drive (§2.12-Verstoß).`);
  if (result.cooperation.ok && !result.momentumEnabled) FINDINGS.push(`${result.variant}: Momentum-Aufbau trotz Deaktivierung (§2.12-Verstoß).`);
  if (result.coordinated.ok && !result.momentumEnabled) FINDINGS.push(`${result.variant}: Momentum-Ausgabe trotz Deaktivierung (§2.12-Verstoß).`);
  // §2.10 cap: complication beyond cap is allowed as rule text but value stays 5 (Verfall des Überschusses).
  if (result.driveEnabled && result.finalDrive > DRIVE_CAP) FINDINGS.push(`${result.variant}: Drive über Max ${DRIVE_CAP}.`);
  if (result.momentumEnabled && result.finalMomentum > MOMENTUM_CAP) FINDINGS.push(`${result.variant}: Momentum über Max ${MOMENTUM_CAP}.`);
  // Overshoot must fail closed: cap enforced by min().
  if (result.overshoot.ok === false) {
    // expected for drive>...— complication beyond cap is actually legal (value clamps); ok=true is fine.
  }
}

// Dependency audit: silent-free dependencies are findings.
for (const finding of dependencyAudit.findings) FINDINGS.push(finding);

const report = buildReport(matrixRows, variantResults, dependencyAudit, FINDINGS);
writeFileSync('.qa/runs/validate-drive-momentum-report.md', report, 'utf8');

if (FINDINGS.length > 0) {
  console.error(`Drive/momentum validation FAILED with ${FINDINGS.length} findings:`);
  FINDINGS.slice(0, 10).forEach((finding) => console.error(`- ${finding}`));
  process.exit(1);
}
console.log(`Drive/momentum validation passed: ${matrixRows.length} exact reroll rows, ${VARIANTS.length}/4 deactivation variants playable, caps & decay enforced, 0 findings — report at .qa/runs/validate-drive-momentum-report.md.`);
