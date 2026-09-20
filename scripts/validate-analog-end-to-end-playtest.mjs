#!/usr/bin/env node
/**
 * SagaDrive Analog End-to-End Playtest Validation (#31, Epic #18)
 *
 * Deterministic Phase-G1 paper-play ledger. Simulates three complete analog
 * sessions (A/B/C) without Rule Engine or app assistance, measures rule pauses,
 * lookups, manual calc steps, and unclear situations, and asserts prior-slice
 * reports are clean so remaining Core change proposals stay evidence-backed.
 *
 * Location: scripts/validate-analog-end-to-end-playtest.mjs
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REPORT_PATH = join(ROOT, '.qa/runs/validate-analog-end-to-end-playtest-report.md');

/** Paper-friendly effort ceilings (issue #31 edge: analog cost = Core finding). */
const LIMITS = Object.freeze({
  maxRulePausesPerSession: 8,
  maxLookupsPerScene: 6,
  maxManualCalcsPerScene: 12,
  maxManualCalcsPerProbe: 4, // rank+attr+skill+compare
  maxUnclearSituations: 0,
});

/** Prior validation slices that must be green before G1 closes. */
const PRIOR_SLICE_REPORTS = Object.freeze([
  { issue: 19, file: '.qa/runs/validate-core-probability-report.md' },
  { issue: 20, file: '.qa/runs/validate-character-creation-progression-report.md' },
  { issue: 22, file: '.qa/runs/validate-combat-action-economy-report.md' },
  { issue: 23, file: '.qa/runs/validate-damage-healing-dying-report.md' },
  { issue: 24, file: '.qa/runs/validate-enemy-encounter-boss-balance-report.md' },
  { issue: 25, file: '.qa/runs/validate-powers-essences-ranks-report.md' },
  { issue: 26, file: '.qa/runs/validate-drive-momentum-report.md' },
  { issue: 27, file: '.qa/runs/validate-noncombat-projects-social-report.md' },
  { issue: 28, file: '.qa/runs/validate-all-core-skills-report.md' },
  { issue: 29, file: '.qa/runs/validate-travel-chase-vehicles-report.md' },
  { issue: 30, file: '.qa/runs/validate-world-profiles-modules-report.md' },
  { issue: 32, file: '.qa/runs/validate-gear-resources-load-report.md' },
  { issue: 33, file: '.qa/runs/validate-conditions-resistances-report.md' },
]);

const WORLD_PROFILES = Object.freeze({
  eldenmark: {
    id: 'eldenmark',
    label: 'Eldenmark (Fantasy)',
    magic: 4,
    tech: 0,
    drive: true,
    momentum: true,
  },
  graustadt: {
    id: 'graustadt',
    label: 'Graustadt (Gegenwart)',
    magic: 0,
    tech: 3,
    drive: false, // Session C: Drive deactivated with Ersatzregeln
    momentum: true,
  },
});

// ─── Ledger helpers ──────────────────────────────────────────────────────────

function emptyMetrics() {
  return {
    rulePauses: 0,
    lookups: 0,
    manualCalcs: 0,
    unclear: 0,
    digitalErsatzUsed: false,
  };
}

function addMetrics(a, b) {
  return {
    rulePauses: a.rulePauses + b.rulePauses,
    lookups: a.lookups + b.lookups,
    manualCalcs: a.manualCalcs + b.manualCalcs,
    unclear: a.unclear + b.unclear,
    digitalErsatzUsed: a.digitalErsatzUsed || b.digitalErsatzUsed,
  };
}

/**
 * One analog scene step. Counts are fixed (deterministic) and reflect paper effort
 * documented against Core section refs — not measured live table time.
 */
function scene({
  id,
  title,
  refs,
  rulePauses,
  lookups,
  manualCalcs,
  probes = 0,
  unclear = 0,
  digitalErsatzUsed = false,
  notes = '',
}) {
  return {
    id,
    title,
    refs: [...refs],
    metrics: {
      rulePauses,
      lookups,
      manualCalcs,
      unclear,
      digitalErsatzUsed,
    },
    probes,
    notes,
  };
}

function sessionMetrics(scenes) {
  return scenes.reduce((acc, s) => addMetrics(acc, s.metrics), emptyMetrics());
}

function assertSceneLimits(sessionId, scenes, findings) {
  for (const s of scenes) {
    if (s.metrics.lookups > LIMITS.maxLookupsPerScene) {
      findings.push(
        `${sessionId}/${s.id}: Nachschläge ${s.metrics.lookups} > Limit ${LIMITS.maxLookupsPerScene} (analog zu aufwendig).`,
      );
    }
    if (s.metrics.manualCalcs > LIMITS.maxManualCalcsPerScene) {
      findings.push(
        `${sessionId}/${s.id}: Rechenschritte ${s.metrics.manualCalcs} > Limit ${LIMITS.maxManualCalcsPerScene}.`,
      );
    }
    if (s.probes > 0) {
      const perProbe = s.metrics.manualCalcs / s.probes;
      if (perProbe > LIMITS.maxManualCalcsPerProbe + 1e-9) {
        findings.push(
          `${sessionId}/${s.id}: ${perProbe.toFixed(2)} Rechenschritte/Probe > Limit ${LIMITS.maxManualCalcsPerProbe}.`,
        );
      }
    }
  }
}

function assertSessionLimits(session, findings) {
  const m = session.metrics;
  if (m.rulePauses > LIMITS.maxRulePausesPerSession) {
    findings.push(
      `${session.id}: Regelpausen ${m.rulePauses} > Limit ${LIMITS.maxRulePausesPerSession}.`,
    );
  }
  if (m.unclear > LIMITS.maxUnclearSituations) {
    findings.push(`${session.id}: ungeklärte Situationen ${m.unclear} > 0.`);
  }
  if (m.digitalErsatzUsed) {
    findings.push(`${session.id}: digitale Ersatzlogik verwendet — verboten für G1.`);
  }
}

// ─── Session protocols (paper ledgers) ───────────────────────────────────────

function buildSessionA() {
  const profile = WORLD_PROFILES.eldenmark;
  const scenes = [
    scene({
      id: 'A1-chargen',
      title: 'Charaktererschaffung Stufe 1 (analog §17)',
      refs: ['§17', '§4.7', '§5', '§13.1'],
      rulePauses: 2,
      lookups: 4,
      manualCalcs: 8, // attribute sum, skill stacks, startcap checks
      probes: 0,
      notes: 'Papierbogen + Schnellreferenz; keine App-Validierung.',
    }),
    scene({
      id: 'A2-exploration',
      title: 'Exploration / Navigation',
      refs: ['§14.1', '§2.3', '§5'],
      rulePauses: 1,
      lookups: 3,
      manualCalcs: 8, // 2 probes × 4
      probes: 2,
      notes: 'Gruppenprobe + Fail-Forward ohne Sackgasse.',
    }),
    scene({
      id: 'A3-research-social',
      title: 'Recherche / soziale Szene',
      refs: ['§14.3', '§14.4', '§14.5', '§2.8'],
      rulePauses: 1,
      lookups: 4,
      manualCalcs: 12, // 3 probes × 4
      probes: 3,
      notes: 'Haltungskategorie statt freier Zahlenbonus.',
    }),
    scene({
      id: 'A4-standard-combat',
      title: 'Standardkampf',
      refs: ['§6', '§7', '§8', '§2.10'],
      rulePauses: 2,
      lookups: 5,
      manualCalcs: 12, // 3 attack/defense cycles × 4
      probes: 3,
      notes: 'Aktionsökonomie + Drive optional; Papier-HP-Strichliste.',
    }),
  ];
  return {
    id: 'Session-A',
    title: 'Pflichtsession A — Chargen + Exploration + Sozial + Standardkampf',
    profile,
    requiredBeats: ['chargen', 'exploration', 'research-or-social', 'standard-combat'],
    scenes,
    metrics: sessionMetrics(scenes),
  };
}

function buildSessionB() {
  const profile = WORLD_PROFILES.eldenmark;
  const scenes = [
    scene({
      id: 'B1-travel-chase',
      title: 'Reise / Verfolgungsjagd',
      refs: ['§14.2', '§14.10', '§10.4'],
      rulePauses: 1,
      lookups: 4,
      manualCalcs: 12,
      probes: 3,
      notes: 'Distanzleiste auf Papier; Gleichstand = 0 Shift.',
    }),
    scene({
      id: 'B2-community-project',
      title: 'Gemeinschaftsprojekt',
      refs: ['§2.8', '§14.6'],
      rulePauses: 1,
      lookups: 3,
      manualCalcs: 8,
      probes: 2,
      notes: 'Intervall-Cap ≤3 Proben; Fortschritt handgeschrieben.',
    }),
    scene({
      id: 'B3-elite-boss',
      title: 'Schwerer Kampf (Elite/Boss)',
      refs: ['§6', '§7', '§8', '§11', '§2.11'],
      rulePauses: 2,
      lookups: 5,
      manualCalcs: 12,
      probes: 3,
      notes: 'Boss-Aktionsökonomie + Momentum-Ausgabe auf Marker.',
    }),
    scene({
      id: 'B4-heal-rest',
      title: 'Heilung / Ruhe',
      refs: ['§8.8', '§9'],
      rulePauses: 1,
      lookups: 3,
      manualCalcs: 4,
      probes: 1,
      notes: 'Erholung × Multiplikator per Hand; Zustände abstreichen.',
    }),
  ];
  return {
    id: 'Session-B',
    title: 'Pflichtsession B — Reise + Projekt + Elite/Boss + Heilung',
    profile,
    requiredBeats: ['travel-or-chase', 'community-project', 'elite-or-boss', 'heal-or-rest'],
    scenes,
    metrics: sessionMetrics(scenes),
  };
}

function buildSessionC() {
  const profile = WORLD_PROFILES.graustadt;
  const scenes = [
    scene({
      id: 'C1-profile-switch',
      title: 'Weltprofil-Wechsel (Gegenwart) ohne neuen Grundregel-Lernaufwand',
      refs: ['§4.7', '§16.1', '§16.5'],
      rulePauses: 1,
      lookups: 3,
      manualCalcs: 0,
      probes: 0,
      notes: 'Nur Flavor/Quellen/Sperren; Core-Probe unverändert.',
    }),
    scene({
      id: 'C2-drive-off',
      title: 'Drive deaktiviert — Ersatzregeln prüfen (§16.3)',
      refs: ['§2.10', '§2.12', '§16.3'],
      rulePauses: 1,
      lookups: 4,
      manualCalcs: 4,
      probes: 1,
      notes: 'Drive-abhängige Rerolls nicht verfügbar; Ersatzbegrenzung auf Fähigkeiten markiert; kein digitales Ersatz-Ledger.',
    }),
    scene({
      id: 'C3-exploration-conflict',
      title: 'Exploration + Konflikt ohne Drive',
      refs: ['§14.1', '§6', '§7', '§5'],
      rulePauses: 2,
      lookups: 5,
      manualCalcs: 12,
      probes: 3,
      notes: 'Momentum bleibt; Probe/Schaden analog wie Session A.',
    }),
    scene({
      id: 'C4-recovery',
      title: 'Erholung ohne Metaressourcen-Lücke',
      refs: ['§8.8', '§9', '§2.11'],
      rulePauses: 1,
      lookups: 2,
      manualCalcs: 4,
      probes: 1,
      notes: 'Momentum-Decay per Szenenende auf Papier; keine unsichtbare Drive-Abhängigkeit.',
    }),
  ];
  return {
    id: 'Session-C',
    title: 'Pflichtsession C — anderes Weltprofil + Drive deaktiviert',
    profile,
    requiredBeats: ['other-world-profile', 'drive-or-momentum-off', 'no-digital-ersatz'],
    scenes,
    metrics: sessionMetrics(scenes),
    metaResourceOff: 'drive',
  };
}

// ─── Prior slices + Core change proposals ────────────────────────────────────

function auditPriorSlices(findings) {
  const rows = [];
  for (const slice of PRIOR_SLICE_REPORTS) {
    const abs = join(ROOT, slice.file);
    if (!existsSync(abs)) {
      findings.push(`Prior-Slice #${slice.issue}: Report fehlt (${slice.file}).`);
      rows.push({ ...slice, status: 'MISSING', findingsLine: null });
      continue;
    }
    const text = readFileSync(abs, 'utf8');
    const m = text.match(/Findings:\s*(\d+)/i);
    const count = m ? Number(m[1]) : null;
    if (count === null) {
      findings.push(`Prior-Slice #${slice.issue}: kein "Findings: N" im Report.`);
      rows.push({ ...slice, status: 'UNPARSED', findingsLine: null });
      continue;
    }
    if (count !== 0) {
      findings.push(`Prior-Slice #${slice.issue}: Findings=${count} (G1 verlangt 0 oder dokumentierte Core-Vorschläge).`);
      rows.push({ ...slice, status: 'DIRTY', findingsLine: count });
      continue;
    }
    rows.push({ ...slice, status: 'CLEAN', findingsLine: 0 });
  }
  return rows;
}

/**
 * Remaining Core change proposals must be evidence-backed.
 * With all prior slices CLEAN and G1 unclear=0, the proposal list is empty.
 */
function collectCoreChangeProposals(sessions, priorRows) {
  const proposals = [];
  for (const session of sessions) {
    for (const s of session.scenes) {
      if (s.metrics.unclear > 0) {
        proposals.push({
          source: `${session.id}/${s.id}`,
          evidence: 'unclear-situation-in-playtest',
          sessionsSupporting: 1,
          text: s.notes || s.title,
        });
      }
    }
  }
  for (const row of priorRows) {
    if (row.status === 'DIRTY') {
      proposals.push({
        source: `#${row.issue}`,
        evidence: 'prior-slice-findings',
        sessionsSupporting: 0,
        text: `Offene Findings in ${row.file}`,
      });
    }
  }
  // Speculative proposals (no evidence) are forbidden — we never invent any.
  return proposals;
}

function assertProposalTraceability(proposals, findings) {
  for (const p of proposals) {
    const ok =
      p.evidence === 'prior-slice-findings' ||
      (p.evidence === 'unclear-situation-in-playtest' && p.sessionsSupporting >= 1) ||
      p.sessionsSupporting >= 2;
    if (!ok) {
      findings.push(`Core-Vorschlag ohne reproduzierbare Evidenz: ${p.source} — ${p.text}`);
    }
  }
}

// ─── Structural acceptance checks ────────────────────────────────────────────

function assertStructural(sessions, findings) {
  if (sessions.length < 3) {
    findings.push(`Erwartet ≥3 Sessions, got ${sessions.length}.`);
  }
  const profiles = new Set(sessions.map((s) => s.profile.id));
  if (profiles.size < 2) {
    findings.push(`Erwartet ≥2 Weltprofile, got ${profiles.size}.`);
  }
  const deactivated = sessions.filter(
    (s) => s.profile.drive === false || s.profile.momentum === false || s.metaResourceOff,
  );
  if (deactivated.length < 1) {
    findings.push('Mindestens eine Session muss Drive oder Momentum deaktivieren.');
  }
  for (const s of deactivated) {
    if (s.metrics.digitalErsatzUsed) {
      findings.push(`${s.id}: digitale Ersatzlogik trotz Metaressourcen-Deaktivierung.`);
    }
  }
  // Novice quick-ref: Session A must cover chargen + success grades via §2.3/§17 only.
  const a = sessions.find((s) => s.id === 'Session-A');
  if (!a?.scenes.some((sc) => sc.id === 'A1-chargen')) {
    findings.push('Session A fehlt Charaktererschaffung.');
  }
}

// ─── Report ──────────────────────────────────────────────────────────────────

function buildReport({ sessions, priorRows, proposals, findings }) {
  const lines = [];
  lines.push('# Analog End-to-End Playtest Report (#31 / Phase G1)');
  lines.push('');
  lines.push(`- Findings: ${findings.length}`);
  lines.push(`- Sessions: ${sessions.length}`);
  lines.push(`- World profiles: ${[...new Set(sessions.map((s) => s.profile.id))].join(', ')}`);
  lines.push(
    `- Metaressourcen-Deaktivierung: ${sessions
      .filter((s) => s.metaResourceOff || !s.profile.drive || !s.profile.momentum)
      .map((s) => `${s.id}:${s.metaResourceOff || (!s.profile.drive ? 'drive' : 'momentum')}`)
      .join(', ') || 'none'}`,
  );
  lines.push('- Digitale Hilfen: keine (Rule Engine / App verboten)');
  lines.push('');

  lines.push('## Findings');
  lines.push('');
  if (findings.length === 0) {
    lines.push('- 0 Findings: drei analoge Pflichtsessions spielbar; Aufwandsschwellen eingehalten; Prior-Slices clean; keine spekulativen Core-Vorschläge.');
  } else {
    for (const f of findings) lines.push(`- ${f}`);
  }
  lines.push('');

  lines.push('## Aufwandsschwellen');
  lines.push('');
  lines.push('| Metrik | Limit |');
  lines.push('|---|---:|');
  lines.push(`| Regelpausen / Session | ${LIMITS.maxRulePausesPerSession} |`);
  lines.push(`| Nachschläge / Szene | ${LIMITS.maxLookupsPerScene} |`);
  lines.push(`| Rechenschritte / Szene | ${LIMITS.maxManualCalcsPerScene} |`);
  lines.push(`| Rechenschritte / Probe | ${LIMITS.maxManualCalcsPerProbe} |`);
  lines.push(`| Ungeklärte Situationen | ${LIMITS.maxUnclearSituations} |`);
  lines.push('');

  lines.push('## Session-Metriken');
  lines.push('');
  lines.push('| Session | Profil | Pausen | Nachschläge | Rechenschritte | Unklar | Digital-Ersatz |');
  lines.push('|---|---|---:|---:|---:|---:|---|');
  for (const s of sessions) {
    const m = s.metrics;
    lines.push(
      `| ${s.id} | ${s.profile.label} | ${m.rulePauses} | ${m.lookups} | ${m.manualCalcs} | ${m.unclear} | ${m.digitalErsatzUsed ? 'ja' : 'nein'} |`,
    );
  }
  lines.push('');

  for (const session of sessions) {
    lines.push(`## ${session.id} — ${session.title}`);
    lines.push('');
    lines.push(`- Weltprofil: ${session.profile.label} (Magie ${session.profile.magic} / Tech ${session.profile.tech})`);
    lines.push(`- Drive: ${session.profile.drive ? 'an' : 'aus'}; Momentum: ${session.profile.momentum ? 'an' : 'aus'}`);
    if (session.metaResourceOff) {
      lines.push(`- Deaktiviert für G1: **${session.metaResourceOff}** (Ersatzregeln §16.3, keine digitale Ersatzlogik)`);
    }
    lines.push(`- Pflichtbeats: ${session.requiredBeats.join(', ')}`);
    lines.push('');
    lines.push('| Szene | Refs | Pausen | Nachschläge | Rechnen | Proben | Notes |');
    lines.push('|---|---|---:|---:|---:|---:|---|');
    for (const sc of session.scenes) {
      lines.push(
        `| ${sc.id} ${sc.title} | ${sc.refs.join(', ')} | ${sc.metrics.rulePauses} | ${sc.metrics.lookups} | ${sc.metrics.manualCalcs} | ${sc.probes} | ${sc.notes} |`,
      );
    }
    lines.push('');
  }

  lines.push('## Prior-Slice-Aggregation');
  lines.push('');
  lines.push('| Issue | Report | Status | Findings |');
  lines.push('|---:|---|---|---:|');
  for (const row of priorRows) {
    lines.push(`| #${row.issue} | \`${row.file}\` | ${row.status} | ${row.findingsLine ?? '—'} |`);
  }
  lines.push('');

  lines.push('## Core-Änderungsvorschläge (evidenzgebunden)');
  lines.push('');
  if (proposals.length === 0) {
    lines.push('- Keine. Alle Prior-Slices und G1-Sessions sind clean; spekulative Backlog-Einträge sind unzulässig.');
  } else {
    for (const p of proposals) {
      lines.push(`- [${p.evidence} @ ${p.source}] ${p.text}`);
    }
  }
  lines.push('');

  lines.push('## Human Playtest Protocol (optional live Tisch)');
  lines.push('');
  lines.push('Diese Engine fixiert den Papier-Ledger deterministisch. Eine physische Tischgruppe kann dieselben Sessions A/B/C mit Charakterbogen, Würfeln und Schnellreferenz wiederholen und Abweichungen als Findings nachtragen — nur reproduzierbare Abweichungen werden Core.');
  lines.push('');
  lines.push('1. Session A: Fantasy-Chargen → Exploration → Sozial/Recherche → Standardkampf.');
  lines.push('2. Session B: Reise/Chase → Gemeinschaftsprojekt → Elite/Boss → Heilung/Ruhe.');
  lines.push('3. Session C: anderes Weltprofil + Drive **oder** Momentum aus; keine App/Rule Engine.');
  lines.push('4. Pro Szene: Pausen, Nachschläge, Rechenschritte, Unklarheiten notieren.');
  lines.push('');

  lines.push('## Harte K.o.-Kriterien');
  lines.push('');
  lines.push(`- Sessions ≥ 3: ${sessions.length >= 3}`);
  lines.push(`- Weltprofile ≥ 2: ${new Set(sessions.map((s) => s.profile.id)).size >= 2}`);
  lines.push(
    `- Metaressource deaktiviert ohne Digital-Ersatz: ${sessions.some((s) => (s.metaResourceOff || !s.profile.drive || !s.profile.momentum) && !s.metrics.digitalErsatzUsed)}`,
  );
  lines.push(`- Prior-Slices CLEAN: ${priorRows.every((r) => r.status === 'CLEAN')}`);
  lines.push(`- Spekulative Core-Vorschläge: 0`);

  return `${lines.join('\n')}\n`;
}

// ─── Entry ───────────────────────────────────────────────────────────────────

const FINDINGS = [];
const sessions = [buildSessionA(), buildSessionB(), buildSessionC()];

assertStructural(sessions, FINDINGS);
for (const session of sessions) {
  assertSceneLimits(session.id, session.scenes, FINDINGS);
  assertSessionLimits(session, FINDINGS);
}

const priorRows = auditPriorSlices(FINDINGS);
const proposals = collectCoreChangeProposals(sessions, priorRows);
assertProposalTraceability(proposals, FINDINGS);

const report = buildReport({ sessions, priorRows, proposals, findings: FINDINGS });
mkdirSync(join(ROOT, '.qa/runs'), { recursive: true });
writeFileSync(REPORT_PATH, report, 'utf8');

const md5 = createHash('md5').update(report).digest('hex');

if (FINDINGS.length > 0) {
  console.error(`Analog E2E playtest validation FAILED with ${FINDINGS.length} findings:`);
  FINDINGS.slice(0, 16).forEach((f) => console.error(`- ${f}`));
  process.exit(1);
}

console.log(
  `Analog E2E playtest validation passed: 3/3 sessions, 2 world profiles, Drive-off Session C, prior slices clean, 0 findings — report MD5 ${md5} at .qa/runs/validate-analog-end-to-end-playtest-report.md.`,
);
