#!/usr/bin/env node
/**
 * SagaDrive Travel / Chase / Vehicles Validation (#29, Epic #18)
 *
 * Deterministic validation of Core §10.4 (vehicles & scale), §14.2 (travel),
 * and §14.10 (chases). Covers all 6 mandatory E2 scenarios without RNG.
 *
 * Location: scripts/validate-travel-chase-vehicles.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import process from 'node:process';
import { GRADES } from './lib/core-probe.mjs';

// ─── Locked constants (§14.10 / #29) ─────────────────────────────────────────

const DISTANCE_START = 2;
const DISTANCE_CAUGHT = 0;
const DISTANCE_ESCAPE = 5;

const GRADE_RANK = Object.freeze({
  [GRADES.CRIT_SUCCESS]: 3,
  [GRADES.SUCCESS]: 2,
  [GRADES.FAILURE]: 1,
  [GRADES.CRIT_FAILURE]: 0,
});

const SCALE = Object.freeze({
  person: 0,
  vehicle: 1,
  structure: 2,
  colossal: 3,
});

/** Approach → plausible skills (must justify skill choice; no cherry-pick). */
const CHASE_APPROACHES = Object.freeze({
  foot: Object.freeze({
    id: 'foot',
    label: 'Fußverfolgung',
    approaches: Object.freeze({
      sprint: Object.freeze(['Athletik']),
      parkour: Object.freeze(['Akrobatik']),
      track: Object.freeze(['Überleben']),
    }),
  }),
  mount: Object.freeze({
    id: 'mount',
    label: 'Tier-/Reitverfolgung',
    approaches: Object.freeze({
      ride: Object.freeze(['Fortbewegungsmittel']),
      herd: Object.freeze(['Naturkunde']),
    }),
  }),
  vehicle: Object.freeze({
    id: 'vehicle',
    label: 'Fahrzeugverfolgung',
    approaches: Object.freeze({
      drive: Object.freeze(['Fortbewegungsmittel']),
      navigateTraffic: Object.freeze(['Wahrnehmung']),
    }),
  }),
});

const TRAVEL_CONSEQUENCE_TYPES = Object.freeze([
  'time-loss',
  'resource-drain',
  'bad-position',
  'discovery',
  'environment',
]);

// ─── Chase engine (§14.10) ───────────────────────────────────────────────────

function gradeBeats(a, b) {
  return GRADE_RANK[a] > GRADE_RANK[b];
}

function gradesTie(a, b) {
  return GRADE_RANK[a] === GRADE_RANK[b];
}

/**
 * Opposed chase round. Pursuer win → distance toward caught (down).
 * Quarry win → distance toward escape (up). Tie → unchanged.
 * Crit-success vs failure-or-worse shifts by 2; otherwise by 1.
 */
function chaseRound({ pursuerGrade, quarryGrade, distance }) {
  if (gradesTie(pursuerGrade, quarryGrade)) {
    return {
      distance,
      shift: 0,
      winner: 'tie',
      criticalShift: false,
    };
  }

  const pursuerWins = gradeBeats(pursuerGrade, quarryGrade);
  const winnerGrade = pursuerWins ? pursuerGrade : quarryGrade;
  const loserGrade = pursuerWins ? quarryGrade : pursuerGrade;
  const criticalShift =
    winnerGrade === GRADES.CRIT_SUCCESS &&
    (loserGrade === GRADES.FAILURE || loserGrade === GRADES.CRIT_FAILURE);
  const magnitude = criticalShift ? 2 : 1;
  const next = pursuerWins
    ? Math.max(DISTANCE_CAUGHT, distance - magnitude)
    : Math.min(DISTANCE_ESCAPE, distance + magnitude);

  return {
    distance: next,
    shift: pursuerWins ? -magnitude : magnitude,
    winner: pursuerWins ? 'pursuer' : 'quarry',
    criticalShift,
  };
}

function runChase({ rounds, start = DISTANCE_START }) {
  let distance = start;
  const log = [];
  let ties = 0;
  let deadEnd = false;

  for (let i = 0; i < rounds.length; i += 1) {
    if (distance === DISTANCE_CAUGHT || distance === DISTANCE_ESCAPE) {
      deadEnd = true;
      break;
    }
    const round = rounds[i];
    const result = chaseRound({
      pursuerGrade: round.pursuerGrade,
      quarryGrade: round.quarryGrade,
      distance,
    });
    if (result.winner === 'tie') ties += 1;
    distance = result.distance;
    log.push({
      round: i + 1,
      pursuerGrade: round.pursuerGrade,
      quarryGrade: round.quarryGrade,
      pursuerSkill: round.pursuerSkill,
      quarrySkill: round.quarrySkill,
      ...result,
    });
    if (distance === DISTANCE_CAUGHT || distance === DISTANCE_ESCAPE) break;
  }

  const ended =
    distance === DISTANCE_CAUGHT
      ? 'caught'
      : distance === DISTANCE_ESCAPE
        ? 'escaped'
        : 'incomplete';

  return {
    distance,
    ended,
    roundsPlayed: log.length,
    ties,
    tieShare: log.length === 0 ? 0 : ties / log.length,
    deadEnd,
    log,
  };
}

function assertSkillJustified(chaseType, approachId, skill, findings, label) {
  const type = CHASE_APPROACHES[chaseType];
  if (!type) {
    findings.push(`${label}: unknown chase type ${chaseType}`);
    return false;
  }
  const allowed = type.approaches[approachId];
  if (!allowed) {
    findings.push(`${label}: unknown approach ${approachId} for ${chaseType}`);
    return false;
  }
  if (!allowed.includes(skill)) {
    findings.push(
      `${label}: skill "${skill}" not justified by approach "${approachId}" (allowed: ${allowed.join(', ')})`,
    );
    return false;
  }
  return true;
}

/** Reject cherry-picking: best numeric skill without matching approach. */
function rejectCherryPick({ chaseType, approachId, chosenSkill, skillPool }, findings, label) {
  const best = [...skillPool].sort((a, b) => b.value - a.value)[0];
  const type = CHASE_APPROACHES[chaseType];
  const allowed = type.approaches[approachId] ?? [];
  if (best && best.name === chosenSkill && !allowed.includes(chosenSkill)) {
    findings.push(`${label}: cherry-pick of best skill "${chosenSkill}" without approach justification`);
    return true;
  }
  // Explicit negative: if someone tries best skill that is outside approach, fail.
  if (!allowed.includes(chosenSkill)) {
    findings.push(`${label}: chosen skill outside approach`);
    return true;
  }
  return false;
}

// ─── Scale / structural damage (§10.4) ───────────────────────────────────────

/**
 * Apply damage against a scaled target after Schutz.
 * gap = targetScale - attackerScale (positive = target larger).
 */
function applyScaledStructuralDamage({
  attackerScale,
  targetScale,
  rawDamage,
  protection = 0,
  penetration = 0,
  antiVehicle = false,
  weakPoint = false,
}) {
  const gap = targetScale - attackerScale;
  const exception = Boolean(antiVehicle || weakPoint || penetration > 0);
  // penetration alone is an exception for the +1-scale halving rule;
  // for ≥2 gap, only anti-vehicle / weak-point count as structural exceptions
  // (penetration alone does not bridge two scale steps — "regulärer Schaden").
  const structuralException = Boolean(antiVehicle || weakPoint);

  if (gap >= 2 && !structuralException) {
    return {
      applied: 0,
      impossible: true,
      halved: false,
      gap,
      afterProtection: 0,
    };
  }

  const effectiveProtection = Math.max(0, protection - Math.max(0, penetration));
  let afterProtection = Math.max(0, rawDamage - effectiveProtection);
  let halved = false;

  // +1 scale: halve after Schutz unless Durchdringung / Anti-Fahrzeug / Schwachstelle
  if (gap === 1 && !(penetration > 0 || antiVehicle || weakPoint)) {
    afterProtection = Math.floor(afterProtection / 2);
    halved = true;
  }

  // With structural exception at gap≥2, damage applies after Schutz without forced half
  // (weak point / anti-vehicle opens the structural window).
  return {
    applied: afterProtection,
    impossible: false,
    halved,
    gap,
    afterProtection,
    exceptionUsed: exception || structuralException,
  };
}

// ─── Travel fail-forward (§14.2) ─────────────────────────────────────────────

function travelLegFailForward({ grade, priorState }) {
  if (grade === GRADES.SUCCESS || grade === GRADES.CRIT_SUCCESS) {
    return {
      ...priorState,
      consequenceType: null,
      situationChanged: false,
      sameRollRetry: false,
      nextAction: 'continue-route',
    };
  }

  // Deterministic consequence ladder by failure severity — never "reroll same".
  const consequenceType =
    grade === GRADES.CRIT_FAILURE ? 'bad-position' : 'time-loss';

  const next = {
    hoursElapsed: priorState.hoursElapsed + (consequenceType === 'time-loss' ? 4 : 2),
    supplies: Math.max(0, priorState.supplies - (consequenceType === 'resource-drain' ? 1 : 0)),
    position: consequenceType === 'bad-position' ? 'exposed-ridge' : priorState.position,
    discovered: priorState.discovered,
    environment: priorState.environment,
  };

  if (consequenceType === 'discovery') next.discovered = true;
  if (consequenceType === 'environment') next.environment = 'storm-front';
  if (grade === GRADES.CRIT_FAILURE) {
    next.supplies = Math.max(0, next.supplies - 1);
    next.environment = 'rough-ground';
  }

  return {
    ...next,
    consequenceType,
    situationChanged:
      next.hoursElapsed !== priorState.hoursElapsed ||
      next.supplies !== priorState.supplies ||
      next.position !== priorState.position ||
      next.discovered !== priorState.discovered ||
      next.environment !== priorState.environment,
    sameRollRetry: false,
    nextAction: 'adapt-route', // different action, not repeat same probe
  };
}

// ─── Vehicle baseline (§10.4) ────────────────────────────────────────────────

function createVehicle({ name, scale = SCALE.vehicle, structure, defense, protection, speed, handling, crew = 1, traits = [] }) {
  return {
    name,
    scale,
    structure,
    defense,
    protection,
    speed,
    handling,
    crew,
    traits: [...traits],
  };
}

// ─── Six mandatory scenarios ─────────────────────────────────────────────────

function scenarioFootChase(findings) {
  const approachId = 'sprint';
  const pursuerSkill = 'Athletik';
  const quarrySkill = 'Athletik';
  assertSkillJustified('foot', approachId, pursuerSkill, findings, 'S1 pursuer');
  assertSkillJustified('foot', approachId, quarrySkill, findings, 'S1 quarry');

  // Explicit: selecting Fernkampf for sprint must fail justification (no cherry-pick)
  const unjustified = [];
  assertSkillJustified('foot', 'sprint', 'Fernkampf', unjustified, 'S1 cherry');
  if (unjustified.length === 0) {
    findings.push('S1: expected Fernkampf to fail sprint justification');
  }

  // Chosen Athletik is approach-justified even when a higher numeric skill exists
  rejectCherryPick(
    {
      chaseType: 'foot',
      approachId,
      chosenSkill: pursuerSkill,
      skillPool: [
        { name: 'Fernkampf', value: 5 },
        { name: 'Athletik', value: 3 },
      ],
    },
    findings,
    'S1',
  );

  const rounds = [
    { pursuerGrade: GRADES.SUCCESS, quarryGrade: GRADES.SUCCESS, pursuerSkill, quarrySkill }, // tie
    { pursuerGrade: GRADES.SUCCESS, quarryGrade: GRADES.FAILURE, pursuerSkill, quarrySkill }, // -1 → 1
    { pursuerGrade: GRADES.CRIT_SUCCESS, quarryGrade: GRADES.FAILURE, pursuerSkill, quarrySkill }, // -2 → 0 caught
  ];

  const chase = runChase({ rounds });
  if (chase.ended !== 'caught') findings.push(`S1: expected caught, got ${chase.ended}`);
  if (chase.log[0].shift !== 0) findings.push('S1: Gleichstand must not change distance');
  if (chase.deadEnd) findings.push('S1: chase continued after terminal distance (dead-end)');
  if (chase.distance !== DISTANCE_CAUGHT) findings.push('S1: final distance not 0');

  // Identical distance logic cross-check: same grades on mount mode
  const mountClone = runChase({
    rounds: rounds.map((r) => ({
      ...r,
      pursuerSkill: 'Fortbewegungsmittel',
      quarrySkill: 'Fortbewegungsmittel',
    })),
  });
  if (mountClone.distance !== chase.distance || mountClone.ended !== chase.ended) {
    findings.push('S1: mount-mode distance logic diverged from foot (must be identical)');
  }

  return {
    id: 'S1-fussverfolgung',
    title: 'Fußverfolgung',
    start: `Distanz ${DISTANCE_START}; approach=sprint; skills=${pursuerSkill}`,
    notes: 'Gleichstand→0 Shift; Krit vs Fail→2; Ende eingeholt; Mount-Clone identische Distanzlogik',
    chase,
    ruleStateAfter: 'direct-conflict',
    plausibleSkills: Object.values(CHASE_APPROACHES.foot.approaches).flat(),
    handlingEffect: 'n/a',
  };
}

function scenarioUrbanVehicleChase(findings) {
  const approachId = 'drive';
  const skill = 'Fortbewegungsmittel';
  assertSkillJustified('vehicle', approachId, skill, findings, 'S2');

  const pursuerBike = createVehicle({
    name: 'Urban Bike',
    structure: 8,
    defense: 12,
    protection: 1,
    speed: 4,
    handling: 2,
    traits: ['wendig'],
  });
  const quarryVan = createVehicle({
    name: 'Cargo Van',
    structure: 14,
    defense: 11,
    protection: 3,
    speed: 3,
    handling: 0,
    traits: ['schwer'],
  });

  // Handling is a vehicle property used with Fortbewegungsmittel — documented, not free cherry skill.
  if (pursuerBike.handling <= quarryVan.handling) {
    findings.push('S2: fixture expects pursuer handling advantage');
  }

  const rounds = [
    { pursuerGrade: GRADES.FAILURE, quarryGrade: GRADES.SUCCESS, pursuerSkill: skill, quarrySkill: skill }, // +1 → 3
    { pursuerGrade: GRADES.SUCCESS, quarryGrade: GRADES.SUCCESS, pursuerSkill: skill, quarrySkill: skill }, // tie
    { pursuerGrade: GRADES.CRIT_SUCCESS, quarryGrade: GRADES.CRIT_FAILURE, pursuerSkill: skill, quarrySkill: skill }, // -2 → 1
    { pursuerGrade: GRADES.SUCCESS, quarryGrade: GRADES.FAILURE, pursuerSkill: skill, quarrySkill: skill }, // -1 → 0
  ];

  const chase = runChase({ rounds });
  if (chase.ended !== 'caught') findings.push(`S2: expected caught, got ${chase.ended}`);
  if (chase.log[1].winner !== 'tie' || chase.log[1].shift !== 0) {
    findings.push('S2: Gleichstand must leave distance unchanged');
  }

  // Traffic-nav approach uses Wahrnehmung — still justified, not best-value cherry-pick
  assertSkillJustified('vehicle', 'navigateTraffic', 'Wahrnehmung', findings, 'S2 nav');

  return {
    id: 'S2-fahrzeug-urban',
    title: 'Fahrzeugverfolgung (urban)',
    start: `Distanz ${DISTANCE_START}; ${pursuerBike.name} Handling ${pursuerBike.handling} vs ${quarryVan.name} Handling ${quarryVan.handling}`,
    notes: 'Fortbewegungsmittel+Handling; Gleichstand; urban drive approach',
    chase,
    vehicles: { pursuer: pursuerBike, quarry: quarryVan },
    ruleStateAfter: 'direct-conflict',
    plausibleSkills: Object.values(CHASE_APPROACHES.vehicle.approaches).flat(),
    handlingEffect: `pursuerHandling=${pursuerBike.handling} > quarryHandling=${quarryVan.handling}`,
  };
}

function scenarioTravelNavigationFailure(findings) {
  const prior = {
    hoursElapsed: 6,
    supplies: 3,
    position: 'trail-fork',
    discovered: false,
    environment: 'clear',
  };

  const failed = travelLegFailForward({ grade: GRADES.FAILURE, priorState: prior });
  if (!failed.situationChanged) {
    findings.push('S3: travel failure must change time/resources/position/situation');
  }
  if (failed.sameRollRetry) {
    findings.push('S3: travel failure must not be same-roll retry');
  }
  if (failed.nextAction === 'repeat-same-probe') {
    findings.push('S3: next action must not be repeat-same-probe');
  }
  if (!TRAVEL_CONSEQUENCE_TYPES.includes(failed.consequenceType)) {
    findings.push(`S3: unknown consequence type ${failed.consequenceType}`);
  }
  if (failed.hoursElapsed <= prior.hoursElapsed && failed.position === prior.position) {
    findings.push('S3: failure left time and position unchanged');
  }

  const crit = travelLegFailForward({ grade: GRADES.CRIT_FAILURE, priorState: prior });
  if (!crit.situationChanged || crit.sameRollRetry) {
    findings.push('S3: crit failure must fail-forward without retry');
  }

  // Success path: no forced consequence
  const ok = travelLegFailForward({ grade: GRADES.SUCCESS, priorState: prior });
  if (ok.consequenceType !== null || ok.nextAction !== 'continue-route') {
    findings.push('S3: success should continue-route without fail consequence');
  }

  // Transition: after adapted route, contact → chase start state is explicit
  const transition = {
    from: 'travel',
    via: failed.nextAction,
    to: 'chase',
    chaseStartDistance: DISTANCE_START,
    ruleState: 'chase-ready',
  };
  if (transition.chaseStartDistance !== DISTANCE_START) {
    findings.push('S3: chase entry distance must be Start=2');
  }

  return {
    id: 'S3-reise-navigation',
    title: 'Längere Reise mit Navigationsfehler',
    start: `hours=${prior.hoursElapsed}, supplies=${prior.supplies}, position=${prior.position}`,
    notes: `Fail→${failed.consequenceType}; next=${failed.nextAction}; crit→${crit.consequenceType}`,
    failure: failed,
    critFailure: crit,
    success: ok,
    transition,
    ruleStateAfter: transition.ruleState,
    plausibleSkills: ['Überleben', 'Wahrnehmung'],
    handlingEffect: 'n/a',
  };
}

function scenarioVehicleVsVehicle(findings) {
  const attacker = createVehicle({
    name: 'Interceptor',
    structure: 12,
    defense: 13,
    protection: 2,
    speed: 5,
    handling: 1,
    traits: ['ram'],
  });
  const target = createVehicle({
    name: 'Armored Courier',
    structure: 16,
    defense: 12,
    protection: 4,
    speed: 3,
    handling: 0,
    traits: ['armored'],
  });

  const hit = applyScaledStructuralDamage({
    attackerScale: attacker.scale,
    targetScale: target.scale,
    rawDamage: 10,
    protection: target.protection,
    penetration: 1,
  });

  if (hit.impossible) findings.push('S4: same-scale vehicle damage must be possible');
  if (hit.halved) findings.push('S4: same-scale damage must not be halved');
  if (hit.applied !== Math.max(0, 10 - Math.max(0, 4 - 1))) {
    findings.push(`S4: expected applied ${10 - 3}=7, got ${hit.applied}`);
  }

  // Chase segment between vehicles uses same distance bar
  const chase = runChase({
    rounds: [
      {
        pursuerGrade: GRADES.SUCCESS,
        quarryGrade: GRADES.FAILURE,
        pursuerSkill: 'Fortbewegungsmittel',
        quarrySkill: 'Fortbewegungsmittel',
      },
      {
        pursuerGrade: GRADES.FAILURE,
        quarryGrade: GRADES.CRIT_SUCCESS,
        pursuerSkill: 'Fortbewegungsmittel',
        quarrySkill: 'Fortbewegungsmittel',
      }, // quarry crit vs fail → +2
      {
        pursuerGrade: GRADES.SUCCESS,
        quarryGrade: GRADES.FAILURE,
        pursuerSkill: 'Fortbewegungsmittel',
        quarrySkill: 'Fortbewegungsmittel',
      },
      {
        pursuerGrade: GRADES.FAILURE,
        quarryGrade: GRADES.SUCCESS,
        pursuerSkill: 'Fortbewegungsmittel',
        quarrySkill: 'Fortbewegungsmittel',
      },
      {
        pursuerGrade: GRADES.FAILURE,
        quarryGrade: GRADES.SUCCESS,
        pursuerSkill: 'Fortbewegungsmittel',
        quarrySkill: 'Fortbewegungsmittel',
      },
    ],
  });
  // Start 2; -1→1; +2→3; -1→2; +1→3; +1→4 — incomplete unless we add more
  // Ensure terminal: add escape path
  const escapeChase = runChase({
    rounds: [
      { pursuerGrade: GRADES.FAILURE, quarryGrade: GRADES.SUCCESS, pursuerSkill: 'Fortbewegungsmittel', quarrySkill: 'Fortbewegungsmittel' },
      { pursuerGrade: GRADES.FAILURE, quarryGrade: GRADES.SUCCESS, pursuerSkill: 'Fortbewegungsmittel', quarrySkill: 'Fortbewegungsmittel' },
      { pursuerGrade: GRADES.FAILURE, quarryGrade: GRADES.CRIT_SUCCESS, pursuerSkill: 'Fortbewegungsmittel', quarrySkill: 'Fortbewegungsmittel' },
    ],
  });
  // 2→3→4→5 escaped (crit vs fail = +2 from 4 would be 5... wait from 4 +2 = 5)
  // Actually: 2+1=3, 3+1=4, 4+2=5 escaped
  if (escapeChase.ended !== 'escaped') {
    findings.push(`S4: expected vehicle chase escape, got ${escapeChase.ended} @${escapeChase.distance}`);
  }

  return {
    id: 'S4-fahrzeug-vs-fahrzeug',
    title: 'Fahrzeug gegen Fahrzeug',
    start: `${attacker.name} Maßstab ${attacker.scale} vs ${target.name} Maßstab ${target.scale}`,
    notes: `Strukturtreffer applied=${hit.applied} (Schutz/Dr); Chase escape rounds=${escapeChase.roundsPlayed}`,
    hit,
    chase: escapeChase,
    vehicles: { attacker, target },
    ruleStateAfter: escapeChase.ended === 'escaped' ? 'travel-resume' : 'direct-conflict',
    plausibleSkills: ['Fortbewegungsmittel'],
    handlingEffect: `attackerHandling=${attacker.handling}, targetHandling=${target.handling}`,
    unusedPartialChase: chase,
  };
}

function scenarioPersonVsVehicleNoAnti(findings) {
  const personScale = SCALE.person;
  const vehicle = createVehicle({
    name: 'Patrol Car',
    structure: 12,
    defense: 12,
    protection: 3,
    speed: 4,
    handling: 1,
  });

  const rawDamage = 8;
  const hit = applyScaledStructuralDamage({
    attackerScale: personScale,
    targetScale: vehicle.scale,
    rawDamage,
    protection: vehicle.protection,
    penetration: 0,
    antiVehicle: false,
    weakPoint: false,
  });

  const afterProt = Math.max(0, rawDamage - vehicle.protection);
  const expected = Math.floor(afterProt / 2);
  if (!hit.halved) findings.push('S5: +1 scale without exception must halve after Schutz');
  if (hit.applied !== expected) {
    findings.push(`S5: expected halved ${expected}, got ${hit.applied}`);
  }
  if (hit.impossible) findings.push('S5: +1 scale is possible (halved), not impossible');

  // Contrast: person vs structure (gap 2) without exception → impossible
  const vsStructure = applyScaledStructuralDamage({
    attackerScale: personScale,
    targetScale: SCALE.structure,
    rawDamage: 20,
    protection: 5,
    penetration: 2, // penetration alone does not bridge ≥2 gap
    antiVehicle: false,
    weakPoint: false,
  });
  if (!vsStructure.impossible || vsStructure.applied !== 0) {
    findings.push('S5: ≥2 scale gap without anti/weak-point must deal 0 structural damage');
  }

  return {
    id: 'S5-person-vs-fahrzeug',
    title: 'Person gegen Fahrzeug ohne Anti-Fahrzeug-Wirkung',
    start: `Person Maßstab ${personScale} vs ${vehicle.name} Maßstab ${vehicle.scale}, raw ${rawDamage}, Schutz ${vehicle.protection}`,
    notes: `halved=${hit.halved}, applied=${hit.applied}; structure-gap2 impossible=${vsStructure.impossible}`,
    hit,
    vsStructure,
    ruleStateAfter: 'direct-conflict-ineffective-structure',
    plausibleSkills: ['Nahkampf', 'Fernkampf'],
    handlingEffect: 'n/a (person attacker)',
  };
}

function scenarioDefinedWeakPoint(findings) {
  const personScale = SCALE.person;
  const vehicle = createVehicle({
    name: 'Patrol Car',
    structure: 12,
    defense: 12,
    protection: 3,
    speed: 4,
    handling: 1,
    traits: ['exposed-radiator'],
  });

  const rawDamage = 8;
  const withWeak = applyScaledStructuralDamage({
    attackerScale: personScale,
    targetScale: vehicle.scale,
    rawDamage,
    protection: vehicle.protection,
    penetration: 0,
    antiVehicle: false,
    weakPoint: true,
  });
  const without = applyScaledStructuralDamage({
    attackerScale: personScale,
    targetScale: vehicle.scale,
    rawDamage,
    protection: vehicle.protection,
    penetration: 0,
    antiVehicle: false,
    weakPoint: false,
  });

  const afterProt = Math.max(0, rawDamage - vehicle.protection);
  if (withWeak.halved) findings.push('S6: weak point must skip +1-scale halving');
  if (withWeak.applied !== afterProt) {
    findings.push(`S6: weak point expected full after-Schutz ${afterProt}, got ${withWeak.applied}`);
  }
  if (withWeak.applied <= without.applied) {
    findings.push('S6: weak point must deal more than no-exception attack');
  }

  // Weak point also opens ≥2 scale structural window
  const vsStructure = applyScaledStructuralDamage({
    attackerScale: personScale,
    targetScale: SCALE.structure,
    rawDamage: 12,
    protection: 4,
    weakPoint: true,
  });
  if (vsStructure.impossible || vsStructure.applied !== Math.max(0, 12 - 4)) {
    findings.push('S6: weak point must allow structural damage across ≥2 scale gap');
  }

  // Anti-vehicle as alternate exception (documented contrast, not a 7th scenario)
  const anti = applyScaledStructuralDamage({
    attackerScale: personScale,
    targetScale: vehicle.scale,
    rawDamage,
    protection: vehicle.protection,
    antiVehicle: true,
  });
  if (anti.halved || anti.applied !== afterProt) {
    findings.push('S6: anti-vehicle must also skip +1-scale halving');
  }

  return {
    id: 'S6-schwachstelle',
    title: 'Definierte Schwachstelle',
    start: `Person vs ${vehicle.name}; trait=${vehicle.traits.join(',')}; raw ${rawDamage}`,
    notes: `weak applied=${withWeak.applied} vs no-exception=${without.applied}; structure-with-weak=${vsStructure.applied}`,
    withWeak,
    without,
    vsStructure,
    anti,
    ruleStateAfter: 'direct-conflict-effective-structure',
    plausibleSkills: ['Fernkampf', 'Handwerk'],
    handlingEffect: 'n/a',
  };
}

function assertIdenticalDistanceLogic(findings) {
  const rounds = [
    { pursuerGrade: GRADES.SUCCESS, quarryGrade: GRADES.FAILURE },
    { pursuerGrade: GRADES.SUCCESS, quarryGrade: GRADES.SUCCESS },
    { pursuerGrade: GRADES.CRIT_SUCCESS, quarryGrade: GRADES.FAILURE },
    { pursuerGrade: GRADES.FAILURE, quarryGrade: GRADES.SUCCESS },
  ];
  const foot = runChase({ rounds: rounds.map((r) => ({ ...r, pursuerSkill: 'Athletik', quarrySkill: 'Athletik' })) });
  const mount = runChase({
    rounds: rounds.map((r) => ({ ...r, pursuerSkill: 'Fortbewegungsmittel', quarrySkill: 'Fortbewegungsmittel' })),
  });
  const vehicle = runChase({
    rounds: rounds.map((r) => ({ ...r, pursuerSkill: 'Fortbewegungsmittel', quarrySkill: 'Fortbewegungsmittel' })),
  });

  const same =
    foot.distance === mount.distance &&
    mount.distance === vehicle.distance &&
    foot.ended === mount.ended &&
    mount.ended === vehicle.ended &&
    foot.log.map((r) => r.shift).join(',') === mount.log.map((r) => r.shift).join(',') &&
    mount.log.map((r) => r.shift).join(',') === vehicle.log.map((r) => r.shift).join(',');

  if (!same) {
    findings.push('Cross-mode: foot/mount/vehicle distance shifts must be identical for same grades');
  }

  return { foot, mount, vehicle, same };
}

// ─── Report ──────────────────────────────────────────────────────────────────

function buildReport({ scenarios, findings, crossMode, deadEnds }) {
  const lines = [];
  lines.push('# SagaDrive Travel / Chase / Vehicles Report (#29)');
  lines.push('');
  lines.push('Deterministische Prüfung von §10.4 + §14.2 + §14.10 (E2). Kein RNG.');
  lines.push('');
  lines.push(`- Pflichtszenarien: ${scenarios.length}/6`);
  lines.push(`- Chase-Sackgassen: ${deadEnds}`);
  lines.push(`- Cross-mode Distanzlogik identisch: ${crossMode.same}`);
  lines.push(`- Findings: ${findings.length}`);
  lines.push('');

  lines.push('## Findings');
  if (findings.length === 0) {
    lines.push(
      '- 0 Findings: Distanzleiste ohne Sackgasse; Gleichstand=0 Shift; Reise-Fail-Forward; Maßstab/Schutz/Schwachstelle konsistent; kein Skill-Cherry-Pick.',
    );
  } else {
    findings.forEach((finding) => lines.push(`- ${finding}`));
  }
  lines.push('');

  lines.push('## Bandbreiten (dokumentiert, kein Pass/Fail-Bound)');
  lines.push('');
  lines.push('| Szenario | Runden bis Ende | Gleichstand-Anteil | Plausible Skills | Handling/Maßstab |');
  lines.push('|---|---:|---:|---|---|');
  for (const scenario of scenarios) {
    const rounds = scenario.chase?.roundsPlayed ?? 'n/a';
    const tieShare =
      scenario.chase && Number.isFinite(scenario.chase.tieShare)
        ? `${(scenario.chase.tieShare * 100).toFixed(0)}%`
        : 'n/a';
    const skills = (scenario.plausibleSkills ?? []).join(', ');
    lines.push(
      `| ${scenario.id} | ${rounds} | ${tieShare} | ${skills} | ${scenario.handlingEffect ?? 'n/a'} |`,
    );
  }
  lines.push('');

  lines.push('## Szenarien');
  lines.push('');
  for (const scenario of scenarios) {
    lines.push(`### ${scenario.id} — ${scenario.title}`);
    lines.push('');
    lines.push(`- Start: ${scenario.start}`);
    lines.push(`- Notes: ${scenario.notes}`);
    lines.push(`- Regelzustand danach: ${scenario.ruleStateAfter}`);
    if (scenario.chase) {
      lines.push(
        `- Chase: ended=${scenario.chase.ended}, distance=${scenario.chase.distance}, rounds=${scenario.chase.roundsPlayed}, ties=${scenario.chase.ties}`,
      );
      lines.push(
        `- Shifts: ${scenario.chase.log.map((row) => `R${row.round}:${row.winner}/${row.shift}`).join('; ')}`,
      );
    }
    if (scenario.failure) {
      lines.push(
        `- Reise-Fail: type=${scenario.failure.consequenceType}, hours=${scenario.failure.hoursElapsed}, next=${scenario.failure.nextAction}, retry=${scenario.failure.sameRollRetry}`,
      );
    }
    if (scenario.hit) {
      lines.push(
        `- Struktur: applied=${scenario.hit.applied}, halved=${scenario.hit.halved}, impossible=${scenario.hit.impossible}, gap=${scenario.hit.gap}`,
      );
    }
    if (scenario.withWeak) {
      lines.push(
        `- Schwachstelle applied=${scenario.withWeak.applied} vs ohne=${scenario.without.applied}; gap2+weak applied=${scenario.vsStructure.applied}`,
      );
    }
    lines.push('');
  }

  lines.push('## Cross-Mode Distanzlogik');
  lines.push('');
  lines.push(
    `- Foot distance=${crossMode.foot.distance}/${crossMode.foot.ended}; Mount=${crossMode.mount.distance}/${crossMode.mount.ended}; Vehicle=${crossMode.vehicle.distance}/${crossMode.vehicle.ended}`,
  );
  lines.push(`- Identisch: ${crossMode.same}`);
  lines.push('');

  lines.push('## Harte K.o.-Kriterien');
  lines.push('');
  lines.push(`- Chase-Sackgassen: ${deadEnds}`);
  lines.push('- Gleichstand verändert Distanz: 0 (asserted in S1/S2)');
  lines.push('- ≥2 Maßstabsstufen ohne Ausnahme → 0 Strukturschaden (S5)');
  lines.push('- Reise-Fail nie Wiederholungswurf (S3)');
  lines.push('- Kein Skill-Cherry-Pick (S1 unjustified Fernkampf rejected)');
  return `${lines.join('\n')}\n`;
}

// ─── Entry point ─────────────────────────────────────────────────────────────

mkdirSync('.qa/runs', { recursive: true });

const FINDINGS = [];
const scenarios = [
  scenarioFootChase(FINDINGS),
  scenarioUrbanVehicleChase(FINDINGS),
  scenarioTravelNavigationFailure(FINDINGS),
  scenarioVehicleVsVehicle(FINDINGS),
  scenarioPersonVsVehicleNoAnti(FINDINGS),
  scenarioDefinedWeakPoint(FINDINGS),
];

if (scenarios.length !== 6) {
  FINDINGS.push(`Erwartet 6 Pflichtszenarien, got ${scenarios.length}.`);
}

const crossMode = assertIdenticalDistanceLogic(FINDINGS);

const chaseScenarios = scenarios.filter((s) => s.chase);
const deadEnds = chaseScenarios.filter((s) => s.chase.deadEnd || s.chase.ended === 'incomplete').length;
if (deadEnds > 0) {
  FINDINGS.push(`Chase dead-ends / incomplete terminals: ${deadEnds}`);
}

// Transition coverage: every scenario documents a clear post-state
for (const scenario of scenarios) {
  if (!scenario.ruleStateAfter) {
    FINDINGS.push(`${scenario.id}: missing ruleStateAfter transition`);
  }
}

const report = buildReport({ scenarios, findings: FINDINGS, crossMode, deadEnds });
const reportPath = '.qa/runs/validate-travel-chase-vehicles-report.md';
writeFileSync(reportPath, report, 'utf8');

if (FINDINGS.length > 0) {
  console.error(`validate-travel-chase-vehicles FAILED with ${FINDINGS.length} finding(s).`);
  FINDINGS.forEach((f) => console.error(`  - ${f}`));
  process.exit(1);
}

console.log(`validate-travel-chase-vehicles OK — 6/6 scenarios, Findings: 0`);
console.log(`Report: ${reportPath}`);
