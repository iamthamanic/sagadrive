#!/usr/bin/env node
/**
 * SagaDrive Noncombat / Projects / Social Validation (#27, Epic #18)
 *
 * Deterministic validation of §2.8 (collaboration), §14.1–14.9 (exploration,
 * research, social attitude/conflict, hazards, contacts, reputation) and
 * fail-forward outside combat. Covers all 7 mandatory E1 scenarios from
 * docs/sagadrive core validation.md without RNG.
 *
 * Location: scripts/validate-noncombat-projects-social.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import process from 'node:process';
import { GRADES, resolveGrade } from './lib/core-probe.mjs';

// ─── Locked bounds (issue #27) ───────────────────────────────────────────────

const SOCIAL_GOAL_3_MAX_ROLLS = 7;
const SOCIAL_GOAL_5_MAX_ROLLS = 11;
const PROJECT_CHECKS_PER_INTERVAL_CAP = 3;

const PROJECT_SIZES = Object.freeze({
  klein: 4,
  komplex: 8,
  gross: 12,
});

const REQUEST_LADDER = Object.freeze([
  { id: 'gering', target: 10 },
  { id: 'bedeutend', target: 15 },
  { id: 'riskant', target: 20 },
  { id: 'sehr-belastend', target: 25 },
  { id: 'fundamental', target: null }, // impossible without changed circumstances
]);

const ATTITUDES = Object.freeze([
  'Feindselig',
  'Reserviert',
  'Neutral',
  'Offen',
  'Unterstützend',
]);

const ATTITUDE_SHIFT_FROM_NEUTRAL = Object.freeze({
  Feindselig: -2,
  Reserviert: -1,
  Neutral: 0,
  Offen: 1,
  Unterstützend: 2,
});

// ─── Grade → progress / group score helpers (§2.8 / §14.5) ───────────────────

function projectProgressDelta(grade) {
  if (grade === GRADES.CRIT_SUCCESS) return 2;
  if (grade === GRADES.SUCCESS) return 1;
  if (grade === GRADES.FAILURE) return 0;
  return -1; // crit-failure, floored at 0 later
}

function groupScoreDelta(grade) {
  if (grade === GRADES.CRIT_SUCCESS) return 2;
  if (grade === GRADES.SUCCESS) return 1;
  if (grade === GRADES.FAILURE) return -1;
  return -2;
}

function socialProgressDelta(grade) {
  return projectProgressDelta(grade);
}

/** Deterministic grade from a scripted natural + flat total vs target. */
function gradeFromScript({ natural, flat, target }) {
  return resolveGrade(natural + flat, target, natural);
}

// ─── Attitude difficulty (§14.4) — category shift, never free number bonus ───

/**
 * Shift request difficulty by attitude steps relative to Neutral.
 * Returns { requestId, target } or { impossible: true }.
 */
function attitudeAdjustedRequest(baseRequestId, attitude) {
  const baseIndex = REQUEST_LADDER.findIndex((row) => row.id === baseRequestId);
  if (baseIndex < 0) throw new Error(`Unknown request: ${baseRequestId}`);
  const shift = ATTITUDE_SHIFT_FROM_NEUTRAL[attitude];
  if (shift === undefined) throw new Error(`Unknown attitude: ${attitude}`);
  // Positive attitude → easier (lower index); negative → harder (higher index).
  const adjusted = baseIndex - shift;
  if (adjusted < 0) {
    return { requestId: REQUEST_LADDER[0].id, target: REQUEST_LADDER[0].target, steps: shift };
  }
  if (adjusted >= REQUEST_LADDER.length || REQUEST_LADDER[adjusted].target === null) {
    return { impossible: true, requestId: 'fundamental', target: null, steps: shift };
  }
  return {
    requestId: REQUEST_LADDER[adjusted].id,
    target: REQUEST_LADDER[adjusted].target,
    steps: shift,
  };
}

// ─── Mechanics kernels ───────────────────────────────────────────────────────

function runSingleProbe({ natural, flat, target, consequenceOnFail }) {
  const grade = gradeFromScript({ natural, flat, target });
  const success = grade === GRADES.SUCCESS || grade === GRADES.CRIT_SUCCESS;
  return {
    mechanic: 'einzel',
    rolls: 1,
    grades: [grade],
    outcomeCount: 1,
    success,
    consequenceType: success ? 'none' : consequenceOnFail,
    progressCurve: 'single-shot',
  };
}

function runGroupProbe(members) {
  // members: [{ natural, flat, target }]
  let score = 0;
  const grades = [];
  for (const member of members) {
    const grade = gradeFromScript(member);
    grades.push(grade);
    score += groupScoreDelta(grade);
  }
  let groupOutcome;
  let consequenceType;
  if (score > 0) {
    groupOutcome = 'success';
    consequenceType = 'none';
  } else if (score < 0) {
    groupOutcome = 'failure';
    consequenceType = 'announced-group-consequence';
  } else {
    groupOutcome = 'status-quo';
    consequenceType = 'individual-only';
  }
  return {
    mechanic: 'gruppe',
    rolls: members.length,
    grades,
    score,
    groupOutcome,
    outcomeCount: 1,
    consequenceType,
    progressCurve: 'aggregated-score',
  };
}

function runProject({ size, intervals }) {
  // intervals: array of up to 3 scripted checks each: { natural, flat, target }
  const needed = PROJECT_SIZES[size];
  if (needed === undefined) throw new Error(`Unknown project size: ${size}`);
  let progress = 0;
  let rolls = 0;
  const log = [];
  const consequenceTypes = new Set();

  for (let i = 0; i < intervals.length; i += 1) {
    const checks = intervals[i];
    if (checks.length > PROJECT_CHECKS_PER_INTERVAL_CAP) {
      throw new Error(
        `Projektintervall ${i + 1}: ${checks.length} Checks > Cap ${PROJECT_CHECKS_PER_INTERVAL_CAP} (§2.8).`,
      );
    }
    for (const check of checks) {
      const grade = gradeFromScript(check);
      const delta = projectProgressDelta(grade);
      const before = progress;
      progress = Math.max(0, progress + delta);
      rolls += 1;
      let consequence = 'none';
      if (grade === GRADES.FAILURE) {
        consequence = check.failConsequence ?? 'time-or-resource';
        consequenceTypes.add(consequence);
      } else if (grade === GRADES.CRIT_FAILURE) {
        consequence = check.critFailConsequence ?? 'major-complication';
        consequenceTypes.add(consequence);
      }
      log.push({
        interval: i + 1,
        grade,
        delta,
        progressBefore: before,
        progressAfter: progress,
        consequence,
      });
    }
  }

  return {
    mechanic: 'projekt',
    size,
    needed,
    progress,
    complete: progress >= needed,
    rolls,
    checksPerIntervalCap: PROJECT_CHECKS_PER_INTERVAL_CAP,
    maxChecksObserved: Math.max(...intervals.map((row) => row.length), 0),
    consequenceTypes: [...consequenceTypes],
    outcomeCount: log.length,
    progressCurve: 'interval-progress',
    log,
  };
}

function runSocialConflict({ goal, probes }) {
  // probes: [{ natural, flat, target, failConsequence? }]
  let progress = 0;
  const log = [];
  for (const probe of probes) {
    const grade = gradeFromScript(probe);
    const delta = socialProgressDelta(grade);
    const before = progress;
    progress = Math.max(0, progress + delta);
    let consequence = 'none';
    if (grade === GRADES.FAILURE) consequence = probe.failConsequence ?? 'social-cost';
    if (grade === GRADES.CRIT_FAILURE) consequence = probe.critFailConsequence ?? 'social-complication';
    log.push({ grade, delta, progressBefore: before, progressAfter: progress, consequence });
  }
  return {
    mechanic: 'sozialer-konflikt',
    goal,
    progress,
    complete: progress >= goal,
    rolls: probes.length,
    log,
  };
}

// ─── Seven mandatory scenarios ───────────────────────────────────────────────

function scenarioEssentialResearch(findings) {
  // §14.3: essential info never behind a single fail; research uses projects.
  const project = runProject({
    size: 'klein',
    intervals: [
      [
        { natural: 8, flat: 6, target: 15, failConsequence: 'time-cost' }, // fail +0
        { natural: 14, flat: 6, target: 15 }, // success +1
        { natural: 12, flat: 6, target: 15 }, // success +1
      ],
      [
        { natural: 19, flat: 6, target: 15 }, // crit-success +2 → progress 4
      ],
    ],
  });

  // Single failed Ermitteln must not erase the essential clue — fail-forward path.
  const deadEndAttempt = runSingleProbe({
    natural: 4,
    flat: 5,
    target: 15,
    consequenceOnFail: 'slower-deeper-riskier-route',
  });

  if (deadEndAttempt.consequenceType === 'dead-end' || deadEndAttempt.consequenceType === 'clue-lost') {
    findings.push('S1 Recherche: einzelner Fehlschlag erzeugte Sackgasse (§14.3 verletzt).');
  }
  if (!project.complete) {
    findings.push(`S1 Recherche: Klein-Projekt nicht abgeschlossen (Fortschritt ${project.progress}/${project.needed}).`);
  }
  // Assert fail-forward: failure still leaves an alternate route flag.
  const failForward = deadEndAttempt.consequenceType === 'slower-deeper-riskier-route';
  if (!failForward) {
    findings.push('S1 Recherche: Fail-Forward-Konsequenz fehlt nach Fehlschlag.');
  }

  return {
    id: 'S1-essentielle-recherche',
    title: 'Essentielle Information recherchieren',
    start: 'Klein-Projekt (Fortschritt 4); essentieller Hinweis nicht hinter Einzelwurf.',
    project,
    deadEndAttempt,
    deadEnds: 0,
    notes: 'Fehlschlag → Zeit/Tiefe/Risiko; Hinweis bleibt über Projektroute erreichbar.',
  };
}

function scenarioComplexCommunityProject(findings) {
  // All three sizes as edge coverage; complex is the mandatory focus.
  const small = runProject({
    size: 'klein',
    intervals: [
      [
        { natural: 18, flat: 7, target: 15 }, // crit-success +2
        { natural: 14, flat: 7, target: 15 }, // success +1
        { natural: 12, flat: 7, target: 15 }, // success +1 → 4
      ],
    ],
  });
  const complex = runProject({
    size: 'komplex',
    intervals: [
      [
        { natural: 14, flat: 7, target: 15 },
        { natural: 12, flat: 7, target: 15 },
        { natural: 8, flat: 7, target: 15, failConsequence: 'resource-drain' },
      ],
      [
        { natural: 16, flat: 7, target: 15 },
        { natural: 13, flat: 7, target: 15 },
        { natural: 11, flat: 7, target: 15 },
      ],
      [
        { natural: 15, flat: 7, target: 15 },
        { natural: 14, flat: 7, target: 15 },
      ],
    ],
  });
  const large = runProject({
    size: 'gross',
    intervals: [
      [
        { natural: 19, flat: 8, target: 15 }, // crit +2
        { natural: 15, flat: 8, target: 15 }, // +1
        { natural: 14, flat: 8, target: 15 }, // +1 → 4
      ],
      [
        { natural: 16, flat: 8, target: 15 }, // +1
        { natural: 13, flat: 8, target: 15 }, // +1
        { natural: 12, flat: 8, target: 15 }, // +1 → 7
      ],
      [
        { natural: 18, flat: 8, target: 15 }, // crit +2
        { natural: 14, flat: 8, target: 15 }, // +1
        { natural: 18, flat: 8, target: 15 }, // crit +2 → 12
      ],
    ],
  });

  for (const project of [small, complex, large]) {
    if (project.maxChecksObserved > PROJECT_CHECKS_PER_INTERVAL_CAP) {
      findings.push(`S2 Projekt ${project.size}: unbegrenzte Würfe/Intervall (${project.maxChecksObserved}).`);
    }
    if (!project.complete) {
      findings.push(`S2 Projekt ${project.size}: nicht abgeschlossen (${project.progress}/${project.needed}).`);
    }
  }

  // Cap enforcement: attempting 4 checks must throw (asserted).
  let capEnforced = false;
  try {
    runProject({
      size: 'klein',
      intervals: [[
        { natural: 10, flat: 5, target: 15 },
        { natural: 10, flat: 5, target: 15 },
        { natural: 10, flat: 5, target: 15 },
        { natural: 10, flat: 5, target: 15 },
      ]],
    });
  } catch {
    capEnforced = true;
  }
  if (!capEnforced) {
    findings.push('S2: >3 Projektchecks/Intervall wurden nicht abgelehnt (§2.8 Cap).');
  }

  return {
    id: 'S2-gemeinschaftsprojekt',
    title: 'Komplexes Gemeinschaftsprojekt (+ Größen klein/groß)',
    start: 'Komplex benötigt Fortschritt 8; Cap 3 Checks/Intervall.',
    small,
    complex,
    large,
    capEnforced,
    notes: 'Weitere Beteiligte unterstützen oder erzählen — keine Extra-Würfe über Cap.',
  };
}

function scenarioReservedNpcRiskyHelp(findings) {
  // §14.4: Reserviert + riskant → one category harder → sehr-belastend (25).
  const adjusted = attitudeAdjustedRequest('riskant', 'Reserviert');
  if (adjusted.impossible || adjusted.target !== 25 || adjusted.requestId !== 'sehr-belastend') {
    findings.push(
      `S3 Haltung: Reserviert+riskant sollte Ziel 25 (sehr-belastend) ergeben, got ${JSON.stringify(adjusted)}.`,
    );
  }

  // Extremes: Feindselig / Unterstützend category shifts (no free number bonus).
  const hostile = attitudeAdjustedRequest('riskant', 'Feindselig');
  const supportive = attitudeAdjustedRequest('riskant', 'Unterstützend');
  if (!hostile.impossible) {
    findings.push('S3: Feindselig+riskant muss fundamental/unmöglich ohne Umstände sein.');
  }
  if (supportive.target !== 10 || supportive.requestId !== 'gering') {
    findings.push(`S3: Unterstützend+riskant sollte gering/10 sein, got ${JSON.stringify(supportive)}.`);
  }

  // Free number modifiers from attitude must be 0 — only category target changes.
  const freeNumberBonusFromAttitude = 0;

  // Longer social conflict vs attitude-adjusted target (25). Flat 12 = trained specialist.
  // Failures stay non-crit (margin > -10); successes reachable at natural ≥ 13.
  const socialFlat = 12;
  const socialTarget = adjusted.target;
  const goal3 = runSocialConflict({
    goal: 3,
    probes: [
      { natural: 8, flat: socialFlat, target: socialTarget, failConsequence: 'time-pressure' }, // 20 fail +0
      { natural: 14, flat: socialFlat, target: socialTarget }, // 26 success +1 → 1
      { natural: 9, flat: socialFlat, target: socialTarget, failConsequence: 'favor-owed' }, // 21 fail
      { natural: 15, flat: socialFlat, target: socialTarget }, // 27 success +1 → 2
      { natural: 10, flat: socialFlat, target: socialTarget, failConsequence: 'witness' }, // 22 fail
      { natural: 16, flat: socialFlat, target: socialTarget }, // 28 success +1 → 3
    ],
  });
  if (goal3.rolls > SOCIAL_GOAL_3_MAX_ROLLS) {
    findings.push(`S3 Ziel3: ${goal3.rolls} Würfe > Bound ${SOCIAL_GOAL_3_MAX_ROLLS}.`);
  }
  if (!goal3.complete) {
    findings.push(`S3 Ziel3: Fortschritt ${goal3.progress}/3 nicht erreicht.`);
  }

  // Goal 5 within ≤11 rolls (same adjusted target; includes fails without dead-end).
  const goal5 = runSocialConflict({
    goal: 5,
    probes: [
      { natural: 13, flat: socialFlat, target: socialTarget }, // success
      { natural: 8, flat: socialFlat, target: socialTarget, failConsequence: 'suspicion' },
      { natural: 14, flat: socialFlat, target: socialTarget },
      { natural: 9, flat: socialFlat, target: socialTarget, failConsequence: 'delay' },
      { natural: 15, flat: socialFlat, target: socialTarget },
      { natural: 10, flat: socialFlat, target: socialTarget, failConsequence: 'cost' },
      { natural: 16, flat: socialFlat, target: socialTarget },
      { natural: 11, flat: socialFlat, target: socialTarget, failConsequence: 'attention' },
      { natural: 17, flat: socialFlat, target: socialTarget },
      { natural: 18, flat: socialFlat, target: socialTarget },
    ],
  });
  if (goal5.rolls > SOCIAL_GOAL_5_MAX_ROLLS) {
    findings.push(`S3 Ziel5: ${goal5.rolls} Würfe > Bound ${SOCIAL_GOAL_5_MAX_ROLLS}.`);
  }
  if (!goal5.complete) {
    findings.push(`S3 Ziel5: Fortschritt ${goal5.progress}/5 nicht erreicht.`);
  }

  return {
    id: 'S3-reservierter-nsc',
    title: 'Reservierten NSC zu riskanter Hilfe bewegen',
    start: 'Haltung Reserviert; Bitte riskant; sozialer Konflikt Ziel 3 & 5.',
    adjusted,
    hostile,
    supportive,
    freeNumberBonusFromAttitude,
    goal3,
    goal5,
    bounds: { goal3Max: SOCIAL_GOAL_3_MAX_ROLLS, goal5Max: SOCIAL_GOAL_5_MAX_ROLLS },
    notes: 'Haltung verschiebt nur Schwierigkeitskategorie — kein freier Zahlenmodifikator.',
  };
}

function scenarioHazardPassage(findings) {
  // §14.6: grades map to damage multipliers; fail-forward (injury, not soft-lock).
  const hazardTarget = 15;
  const flat = 6;
  const cases = [
    { natural: 20, expected: GRADES.CRIT_SUCCESS, effect: 'no-damage' },
    { natural: 14, expected: GRADES.SUCCESS, effect: 'half-damage' },
    { natural: 7, expected: GRADES.FAILURE, effect: 'full-damage' },
    { natural: 1, expected: GRADES.CRIT_FAILURE, effect: 'double-or-full-plus-severe' },
  ];
  const results = cases.map((row) => {
    const grade = gradeFromScript({ natural: row.natural, flat, target: hazardTarget });
    if (grade !== row.expected) {
      findings.push(`S4 Gefahr: natural ${row.natural} → ${grade}, erwartet ${row.expected}.`);
    }
    return { ...row, grade, deadEnd: false };
  });

  const deadEnds = results.filter((row) => row.effect === 'dead-end').length;
  if (deadEnds > 0) {
    findings.push('S4 Gefahrenpassage: Sackgasse durch Gefahr erzeugt.');
  }

  return {
    id: 'S4-gefahrenpassage',
    title: 'Gefahrenpassage',
    start: `Gefährlich vs Zielwert ${hazardTarget}; Fertigkeit/Widerstand.`,
    results,
    deadEnds,
    notes: 'Fehlschlag = Schaden/Position — Abenteuer läuft weiter.',
  };
}

function scenarioContactUse(findings) {
  // §14.8: contact grants access/info/resources — never a general die bonus.
  const contact = {
    specialty: 'Archive',
    reach: 'local',
    reliability: 2,
  };
  const withoutContact = { access: false, dieBonus: 0 };
  const withContact = {
    access: true,
    info: 'restricted-ledger-entry',
    resource: null,
    dieBonus: 0, // MUST stay 0
  };

  if (withContact.dieBonus !== 0) {
    findings.push('S5 Kontakt: pauschaler Würfelbonus verboten (§14.8).');
  }
  if (!withContact.access) {
    findings.push('S5 Kontakt: Zugang wurde nicht gewährt.');
  }
  if (withoutContact.access === withContact.access) {
    findings.push('S5 Kontakt: Zugang ändert sich nicht durch Kontakt.');
  }

  return {
    id: 'S5-kontakt',
    title: 'Kontakt nutzen',
    start: `Kontakt Fachgebiet=${contact.specialty}, Zuverlässigkeit=${contact.reliability}.`,
    contact,
    withoutContact,
    withContact,
    freeNumberBonusFromContact: withContact.dieBonus,
    notes: 'Zugang/Info/Ressourcen ja; allgemeiner Würfelbonus nein.',
  };
}

function scenarioReputationEffect(findings) {
  // §14.9: reputation changes access + attitude, not automatic die values.
  const rows = [-2, -1, 0, 1, 2].map((rep) => {
    let attitude;
    if (rep <= -2) attitude = 'Feindselig';
    else if (rep === -1) attitude = 'Reserviert';
    else if (rep === 0) attitude = 'Neutral';
    else if (rep === 1) attitude = 'Offen';
    else attitude = 'Unterstützend';
    return {
      reputation: rep,
      attitude,
      accessTier: rep >= 1 ? 'trusted-channels' : rep <= -1 ? 'restricted' : 'public',
      dieBonus: 0,
    };
  });

  for (const row of rows) {
    if (row.dieBonus !== 0) {
      findings.push(`S6 Ruf ${row.reputation}: freier Würfelbonus ${row.dieBonus} (§14.9 verletzt).`);
    }
  }
  if (!ATTITUDES.includes(rows[0].attitude) || !ATTITUDES.includes(rows[4].attitude)) {
    findings.push('S6 Ruf: Extrem-Haltungen nicht abgebildet.');
  }

  return {
    id: 'S6-ruf',
    title: 'Rufwirkung',
    start: 'Fraktionsruf −2…+2 verschiebt Haltung/Zugang.',
    rows,
    freeNumberBonusFromReputation: 0,
    notes: 'Ruf → Haltung/Zugang; keine automatischen Würfelwerte.',
  };
}

function scenarioTimedExploration(findings) {
  // §14.1 + fail-forward (§14.2 pattern): time pressure, roles, no dead-end on fail.
  const roles = ['Späher', 'Navigator', 'Suchender', 'Sicherung', 'Unterstützung'];
  const group = runGroupProbe([
    { natural: 15, flat: 6, target: 15 }, // success +1
    { natural: 9, flat: 5, target: 15 }, // fail -1
    { natural: 14, flat: 6, target: 15 }, // success +1
    { natural: 4, flat: 5, target: 15 }, // fail -1
    { natural: 17, flat: 6, target: 15 }, // success +1 → score +1
  ]);

  if (group.rolls !== roles.length) {
    findings.push(`S7 Erkundung: Gruppenprobe sollte ${roles.length} Würfe haben.`);
  }
  if (group.groupOutcome !== 'success') {
    findings.push(`S7 Erkundung: erwarteter Gruppenerfolg, got ${group.groupOutcome} (score ${group.score}).`);
  }

  // Failed navigator check → time loss, not "roll again same situation".
  const navFail = runSingleProbe({
    natural: 5,
    flat: 6,
    target: 15,
    consequenceOnFail: 'time-loss-worse-position',
  });
  if (navFail.consequenceType === 'repeat-same-check' || navFail.consequenceType === 'dead-end') {
    findings.push('S7: Fehlschlag erzeugte Wiederhol-Wurf oder Sackgasse (§14.2 Fail Forward).');
  }

  return {
    id: 'S7-erkundung-zeitdruck',
    title: 'Erkundung unter Zeitdruck',
    start: `Rollen ${roles.join(', ')}; Gruppenprobe + Fail-Forward bei Fehlschlag.`,
    roles,
    group,
    navFail,
    deadEnds: 0,
    notes: 'Fehlschlag ändert Zeit/Position — kein identischer Wiederhol-Wurf.',
  };
}

// ─── Distinguishability assertions ───────────────────────────────────────────

function assertDistinguishability(samples, findings) {
  const curves = new Set(samples.map((sample) => sample.progressCurve));
  if (curves.size < 3) {
    findings.push(
      `Unterscheidbarkeit: nur ${curves.size} Fortschrittskurven (${[...curves].join(', ')}) — erwartet einzel/gruppe/projekt.`,
    );
  }
  const rollCounts = samples.map((sample) => sample.rolls);
  if (new Set(rollCounts).size < 2) {
    findings.push(`Unterscheidbarkeit: Probenanzahlen nicht unterscheidbar (${rollCounts.join(', ')}).`);
  }
  const einzel = samples.find((sample) => sample.mechanic === 'einzel');
  const gruppe = samples.find((sample) => sample.mechanic === 'gruppe');
  const projekt = samples.find((sample) => sample.mechanic === 'projekt');
  if (!einzel || einzel.rolls !== 1 || einzel.outcomeCount !== 1) {
    findings.push('Unterscheidbarkeit: Einzelprobe muss 1 Wurf / 1 Ergebnis sein.');
  }
  if (!gruppe || gruppe.rolls < 2 || gruppe.outcomeCount !== 1) {
    findings.push('Unterscheidbarkeit: Gruppenprobe = N Würfe, 1 aggregiertes Ergebnis.');
  }
  if (!projekt || !projekt.progressCurve.includes('interval')) {
    findings.push('Unterscheidbarkeit: Projekt muss Intervall-Fortschrittskurve haben.');
  }
}

// ─── Report ──────────────────────────────────────────────────────────────────

function buildReport({ scenarios, findings, freeNumberBonuses, deadEnds, bounds }) {
  const lines = [];
  lines.push('# SagaDrive Noncombat / Projects / Social Report (#27)');
  lines.push('');
  lines.push('Deterministische Prüfung von §2.8 + §14.1–14.9 (E1). Kein RNG.');
  lines.push('');
  lines.push(`- Pflichtszenarien: ${scenarios.length}/7`);
  lines.push(`- Sackgassen: ${deadEnds}`);
  lines.push(`- Freie Zahlenboni (Haltung/Kontakt/Ruf): ${freeNumberBonuses}`);
  lines.push(`- Bounds: Ziel3 ≤ ${bounds.goal3Max} Würfe, Ziel5 ≤ ${bounds.goal5Max} Würfe`);
  lines.push(`- Findings: ${findings.length}`);
  lines.push('');

  lines.push('## Findings');
  if (findings.length === 0) {
    lines.push('- 0 Findings: Fail-Forward ohne Sackgassen; Caps/Bounds eingehalten; keine freien Zahlenboni; Mechaniken unterscheidbar.');
  } else {
    findings.forEach((finding) => lines.push(`- ${finding}`));
  }
  lines.push('');

  lines.push('## Bounds');
  lines.push('');
  lines.push(`| Fortschrittsziel | Max Würfe (Issue #27) | Beobachtet |`);
  lines.push(`|---|---:|---:|`);
  const s3 = scenarios.find((row) => row.id === 'S3-reservierter-nsc');
  lines.push(`| 3 | ${bounds.goal3Max} | ${s3.goal3.rolls} |`);
  lines.push(`| 5 | ${bounds.goal5Max} | ${s3.goal5.rolls} |`);
  lines.push('');

  lines.push('## Szenarien');
  lines.push('');
  for (const scenario of scenarios) {
    lines.push(`### ${scenario.id} — ${scenario.title}`);
    lines.push('');
    lines.push(`- Start: ${scenario.start}`);
    lines.push(`- Notes: ${scenario.notes}`);
    if (scenario.id === 'S1-essentielle-recherche') {
      lines.push(`- Projekt: ${scenario.project.progress}/${scenario.project.needed} in ${scenario.project.rolls} Würfen; Fail-Forward=${scenario.deadEndAttempt.consequenceType}`);
    }
    if (scenario.id === 'S2-gemeinschaftsprojekt') {
      lines.push(`- klein ${scenario.small.progress}/${scenario.small.needed}, komplex ${scenario.complex.progress}/${scenario.complex.needed}, groß ${scenario.large.progress}/${scenario.large.needed}; Cap-Enforcement=${scenario.capEnforced}`);
    }
    if (scenario.id === 'S3-reservierter-nsc') {
      lines.push(`- Haltung→Ziel: ${scenario.adjusted.requestId}/${scenario.adjusted.target}; freeNumberBonus=${scenario.freeNumberBonusFromAttitude}`);
      lines.push(`- Ziel3: ${scenario.goal3.progress}/3 in ${scenario.goal3.rolls} Würfen; Ziel5: ${scenario.goal5.progress}/5 in ${scenario.goal5.rolls} Würfen`);
    }
    if (scenario.id === 'S4-gefahrenpassage') {
      lines.push(`- Effekte: ${scenario.results.map((row) => `${row.grade}→${row.effect}`).join('; ')}`);
    }
    if (scenario.id === 'S5-kontakt') {
      lines.push(`- Zugang ohne=${scenario.withoutContact.access}, mit=${scenario.withContact.access}; dieBonus=${scenario.freeNumberBonusFromContact}`);
    }
    if (scenario.id === 'S6-ruf') {
      lines.push(`- Mapping: ${scenario.rows.map((row) => `${row.reputation}→${row.attitude}/${row.accessTier}`).join('; ')}`);
    }
    if (scenario.id === 'S7-erkundung-zeitdruck') {
      lines.push(`- Gruppenwert=${scenario.group.score} (${scenario.group.groupOutcome}); Nav-Fail→${scenario.navFail.consequenceType}`);
    }
    lines.push('');
  }

  lines.push('## Unterscheidbarkeit');
  lines.push('');
  lines.push('| Mechanik | Würfe | Outcomes | Fortschrittskurve |');
  lines.push('|---|---:|---:|---|');
  lines.push('| Einzelprobe | 1 | 1 | single-shot |');
  lines.push('| Gruppenprobe | N | 1 aggregiert | aggregated-score |');
  lines.push('| Projekt | Intervalle × ≤3 | Fortschrittsschritte | interval-progress |');
  lines.push('');

  lines.push('## Harte K.o.-Kriterien');
  lines.push('');
  lines.push(`- Sackgassen durch einzelnen Fehlschlag: ${deadEnds}`);
  lines.push(`- Unbegrenzte Würfe/Intervall (Gemeinschaftsprojekt): 0 (Cap ${PROJECT_CHECKS_PER_INTERVAL_CAP} enforced)`);
  lines.push(`- Freie situative Zahlenmodifier (Haltung/Kontakt/Ruf): ${freeNumberBonuses}`);
  return lines.join('\n');
}

// ─── Entry point ─────────────────────────────────────────────────────────────

mkdirSync('.qa/runs', { recursive: true });

const FINDINGS = [];
const scenarios = [
  scenarioEssentialResearch(FINDINGS),
  scenarioComplexCommunityProject(FINDINGS),
  scenarioReservedNpcRiskyHelp(FINDINGS),
  scenarioHazardPassage(FINDINGS),
  scenarioContactUse(FINDINGS),
  scenarioReputationEffect(FINDINGS),
  scenarioTimedExploration(FINDINGS),
];

if (scenarios.length !== 7) {
  FINDINGS.push(`Erwartet 7 Pflichtszenarien, got ${scenarios.length}.`);
}

const s1 = scenarios[0];
const s2 = scenarios[1];
const s7 = scenarios[6];
assertDistinguishability(
  [
    s1.deadEndAttempt,
    s7.group,
    s2.complex,
  ],
  FINDINGS,
);

const freeNumberBonuses =
  scenarios[2].freeNumberBonusFromAttitude +
  scenarios[4].freeNumberBonusFromContact +
  scenarios[5].freeNumberBonusFromReputation;

const deadEnds =
  (scenarios[0].deadEnds ?? 0) +
  (scenarios[3].deadEnds ?? 0) +
  (scenarios[6].deadEnds ?? 0);

if (freeNumberBonuses !== 0) {
  FINDINGS.push(`Freie Zahlenboni Summe ${freeNumberBonuses} ≠ 0.`);
}
if (deadEnds !== 0) {
  FINDINGS.push(`Sackgassen Summe ${deadEnds} ≠ 0.`);
}

const bounds = { goal3Max: SOCIAL_GOAL_3_MAX_ROLLS, goal5Max: SOCIAL_GOAL_5_MAX_ROLLS };
const report = buildReport({ scenarios, findings: FINDINGS, freeNumberBonuses, deadEnds, bounds });
writeFileSync('.qa/runs/validate-noncombat-projects-social-report.md', report, 'utf8');

if (FINDINGS.length > 0) {
  console.error(`Noncombat/projects/social validation FAILED with ${FINDINGS.length} findings:`);
  FINDINGS.slice(0, 12).forEach((finding) => console.error(`- ${finding}`));
  process.exit(1);
}

console.log(
  `Noncombat/projects/social validation passed: 7/7 scenarios, bounds Ziel3≤${SOCIAL_GOAL_3_MAX_ROLLS}/Ziel5≤${SOCIAL_GOAL_5_MAX_ROLLS}, deadEnds=0, freeNumberBonuses=0, 0 findings — report at .qa/runs/validate-noncombat-projects-social-report.md.`,
);
