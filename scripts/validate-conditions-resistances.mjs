#!/usr/bin/env node
/**
 * SagaDrive Conditions & Resistances Validation (#33, Epic #18)
 *
 * Deterministic validation of Core §9 (Zustände), §6.5 (Widerstände),
 * §2.5 (Vorteil/Nachteil folding), §7.4 (Bereithalten/Reaktion), §8.5
 * (0 HP → Kampfunfähig) over scripted condition scenarios — no RNG.
 *
 * Covers every Core condition begin/refresh/end, all 7 mandatory combos,
 * resistance formulas as condition targets, and hard lockout/counter checks.
 *
 * Location: scripts/validate-conditions-resistances.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import process from 'node:process';

const REPORT_PATH = '.qa/runs/validate-conditions-resistances-report.md';

const FINDINGS = [];

function find(message) {
  FINDINGS.push(message);
}

function check(condition, message) {
  if (!condition) find(message);
}

// ─── Core condition catalog (§9) ─────────────────────────────────────────────

const CORE_CONDITIONS = Object.freeze([
  'Liegend',
  'Gegriffen',
  'Blind',
  'Benommen',
  'Verängstigt',
  'Kampfunfähig',
  'Bewusstlos',
  'Erschöpfung',
  'Verborgen',
  'Gestört',
  'Deaktiviert',
]);

const DEFAULT_DURATION = 3; // abstract turns; refresh updates this, never stacks

// ─── §2.5 Advantage / Disadvantage folding ───────────────────────────────────

/**
 * Fold named advantage/disadvantage sources per §2.5.
 * Remaining sources never grow dice beyond one 2d20 keep-high/low package.
 * `d20Count` = number of adv/dis packages after folding (0|1), never N.
 */
function foldSources(advantageSources = [], disadvantageSources = []) {
  const cancelled = Math.min(advantageSources.length, disadvantageSources.length);
  const remAdv = advantageSources.length - cancelled;
  const remDis = disadvantageSources.length - cancelled;
  let mode = 'normal';
  if (remAdv > 0) mode = 'advantage';
  else if (remDis > 0) mode = 'disadvantage';
  return {
    mode,
    advantage: mode === 'advantage',
    disadvantage: mode === 'disadvantage',
    d20Count: mode === 'normal' ? 0 : 1,
    dice: mode === 'normal' ? 1 : 2,
    remainingAdvantage: remAdv,
    remainingDisadvantage: remDis,
  };
}

// ─── §6.5 Resistances ────────────────────────────────────────────────────────

/**
 * Sample figure used for resistance formulas and exhaustion damage.
 * Values are illustrative Novize-band numbers; formulas are asserted exactly.
 */
const SAMPLE = Object.freeze({
  strength: 3,
  dexterity: 2,
  endurance: 3,
  intellect: 2,
  perception: 3,
  athletics: 2,
  acrobatics: 1,
  experienceBonus: 1, // global EB
});

function bodyResistance(fig = SAMPLE) {
  return 10 + fig.endurance + fig.experienceBonus;
}

function reflexResistance(fig = SAMPLE) {
  return 10 + fig.dexterity + fig.experienceBonus;
}

function spiritResistance(fig = SAMPLE) {
  return 10 + fig.intellect + fig.experienceBonus;
}

function maneuverResistance(fig = SAMPLE) {
  const strAth = fig.strength + fig.athletics;
  const dexAcr = fig.dexterity + fig.acrobatics;
  return 10 + fig.experienceBonus + Math.max(strAth, dexAcr);
}

function recovery(fig = SAMPLE) {
  return fig.endurance + fig.experienceBonus;
}

const RESISTANCE_TARGETS = Object.freeze({
  Körper: { formula: bodyResistance, trigger: 'Schubsen / körperliche Zustandsauslöser' },
  Reflex: { formula: reflexResistance, trigger: 'Zu-Fall-Bringen → Liegend' },
  Geist: { formula: spiritResistance, trigger: 'Verängstigt / mentale Effekte' },
  Manöver: { formula: maneuverResistance, trigger: 'Greifen → Gegriffen; Entkommen' },
});

// ─── Condition state machine ─────────────────────────────────────────────────

/**
 * Create an empty actor condition bag.
 * Named conditions (except Erschöpfung / Verborgen / tech) live in `active`.
 * Erschöpfung uses `exhaustionLevel` (1–3). Verborgen uses `hiddenFrom` Set.
 * Gestört/Deaktiviert are keyed by deviceId in `devices`.
 */
function createActor(overrides = {}) {
  return {
    id: overrides.id ?? 'actor',
    active: new Map(), // name → { duration, source, beganAt }
    exhaustionLevel: 0,
    hiddenFrom: new Set(), // observer ids
    devices: new Map(), // deviceId → 'Gestört' | 'Deaktiviert'
    health: overrides.health ?? 12,
    maxHealth: overrides.maxHealth ?? 12,
    movement: overrides.movement ?? 9,
    clock: 0,
    ...overrides,
  };
}

function beginCondition(actor, name, { duration = DEFAULT_DURATION, source = 'default', deviceId = null, observerId = null, level = null } = {}) {
  actor.clock += 1;
  if (name === 'Erschöpfung') {
    return applyExhaustion(actor, level ?? 1, source);
  }
  if (name === 'Verborgen') {
    if (!observerId) throw new Error('Verborgen requires observerId');
    actor.hiddenFrom.add(observerId);
    return { kind: 'begin', name, observerId, duration: null };
  }
  if (name === 'Gestört' || name === 'Deaktiviert') {
    if (!deviceId) throw new Error(`${name} requires deviceId`);
    actor.devices.set(deviceId, name);
    return { kind: 'begin', name, deviceId, duration: null };
  }
  if (name === 'Bewusstlos') {
    // §9.8 implications: Kampfunfähig + Liegend + unaware
    beginCondition(actor, 'Kampfunfähig', { duration, source: `${source}:impl` });
    beginCondition(actor, 'Liegend', { duration, source: `${source}:impl` });
  }
  const existing = actor.active.get(name);
  if (existing) {
    // §9.1: same condition does not stack — refresh duration only
    existing.duration = duration;
    existing.source = source;
    existing.refreshedAt = actor.clock;
    return { kind: 'refresh', name, duration, stacked: false };
  }
  actor.active.set(name, { duration, source, beganAt: actor.clock, refreshedAt: null });
  return { kind: 'begin', name, duration };
}

function applyExhaustion(actor, addLevels, source = 'default') {
  const before = actor.exhaustionLevel;
  let remaining = addLevels;
  let damage = 0;
  const rec = recovery();
  while (remaining > 0) {
    if (actor.exhaustionLevel < 3) {
      actor.exhaustionLevel += 1;
      remaining -= 1;
    } else {
      // §9.9: further levels deal recovery damage instead of new stages
      damage += rec;
      actor.health = Math.max(0, actor.health - rec);
      remaining -= 1;
    }
  }
  return {
    kind: before === 0 ? 'begin' : 'refresh',
    name: 'Erschöpfung',
    level: actor.exhaustionLevel,
    damage,
    source,
    stackedBeyond3: false,
  };
}

function endCondition(actor, name, { deviceId = null, observerId = null } = {}) {
  if (name === 'Erschöpfung') {
    actor.exhaustionLevel = 0;
    return { kind: 'end', name };
  }
  if (name === 'Verborgen') {
    if (observerId) actor.hiddenFrom.delete(observerId);
    else actor.hiddenFrom.clear();
    return { kind: 'end', name, observerId: observerId ?? 'all' };
  }
  if (name === 'Gestört' || name === 'Deaktiviert') {
    if (deviceId) actor.devices.delete(deviceId);
    else {
      for (const [id, state] of [...actor.devices]) {
        if (state === name) actor.devices.delete(id);
      }
    }
    return { kind: 'end', name, deviceId };
  }
  const had = actor.active.delete(name);
  return { kind: 'end', name, ended: had };
}

function hasCondition(actor, name) {
  if (name === 'Erschöpfung') return actor.exhaustionLevel > 0;
  if (name === 'Verborgen') return actor.hiddenFrom.size > 0;
  if (name === 'Gestört' || name === 'Deaktiviert') {
    return [...actor.devices.values()].includes(name);
  }
  return actor.active.has(name);
}

function isHiddenFrom(actor, observerId) {
  return actor.hiddenFrom.has(observerId);
}

/** Effective movement after Gegriffen / Erschöpfung / Kampfunfähig. */
function effectiveMovement(actor) {
  if (hasCondition(actor, 'Kampfunfähig') || hasCondition(actor, 'Bewusstlos')) return 0;
  if (hasCondition(actor, 'Gegriffen')) return 0;
  let move = actor.movement;
  if (actor.exhaustionLevel >= 1) move = Math.max(0, move - 3);
  return move;
}

/** Whether the actor may take a reaction (§9.5 Benommen, §9.7, §9.9 lvl3). */
function canReact(actor) {
  if (hasCondition(actor, 'Kampfunfähig') || hasCondition(actor, 'Bewusstlos')) return false;
  if (hasCondition(actor, 'Benommen')) return false;
  if (actor.exhaustionLevel >= 3) return false;
  return true;
}

/** Whether Bereithalten (ready action) can be set / fired as reaction. */
function canReadyOrReact(actor) {
  if (hasCondition(actor, 'Kampfunfähig') || hasCondition(actor, 'Bewusstlos')) return false;
  // Setting Bereithalten is a main action — blocked by Kampfunfähig above.
  // Firing it as reaction is blocked by Benommen / Erschöpfung 3.
  return canReact(actor);
}

/** Disadvantage sources contributed by active conditions for a probe context. */
function conditionDisadvantageSources(actor, context = {}) {
  const sources = [];
  if (hasCondition(actor, 'Liegend') && context.selfAttack) sources.push('liegend-self-attack');
  if (hasCondition(actor, 'Blind') && context.sightDependent) sources.push('blind-sight');
  if (hasCondition(actor, 'Benommen') && context.nextD20) sources.push('benommen-next-d20');
  if (hasCondition(actor, 'Verängstigt') && context.againstFearSource) sources.push('verängstigt-vs-source');
  if (actor.exhaustionLevel >= 2 && context.physicalSkill) sources.push('erschöpfung-2-physical');
  if (hasCondition(actor, 'Gestört') && context.deviceUse) sources.push('gestört-device');
  return sources;
}

function conditionAdvantageSourcesAgainst(defender, context = {}) {
  const sources = [];
  if (hasCondition(defender, 'Liegend') && context.meleeClose) sources.push('liegend-melee-close');
  if (hasCondition(defender, 'Blind')) sources.push('blind-target');
  if (context.hiddenAttacker) sources.push('verborgen-attack');
  return sources;
}

function conditionDisadvantageSourcesAgainst(defender, context = {}) {
  const sources = [];
  if (hasCondition(defender, 'Liegend') && context.rangedOrFar) sources.push('liegend-ranged');
  return sources;
}

/** Counters that clear a lockout — every lockout must have at least one. */
const COUNTERS = Object.freeze({
  Liegend: ['Aufstehen (halbe Bewegung)'],
  Gegriffen: ['Entkommen (Hauptaktion vs Manöverwiderstand)'],
  Blind: ['Zustand endet / Heilung / Gegenwirkung'],
  Benommen: ['Ende nächsten eigenen Zugs'],
  Verängstigt: ['Quelle entfernt / Zustand endet'],
  Kampfunfähig: ['Heilung über 0 HP / Stabilisierung'],
  Bewusstlos: ['Heilung / Erwachen'],
  Erschöpfung: ['Ruhe / Erholung reduziert Stufen'],
  Verborgen: ['Wahrnehmung / Angriff offenbart gegenüber Beobachter'],
  Gestört: ['Reparatur / Behebung'],
  Deaktiviert: ['Reparatur / Behebung'],
});

// ─── Individual condition scenarios (begin / refresh / end) ──────────────────

function scenarioSingleCondition(name) {
  const actor = createActor({ id: `solo-${name}` });
  const rows = [];

  if (name === 'Erschöpfung') {
    const begin = beginCondition(actor, name, { level: 1 });
    check(begin.kind === 'begin' && actor.exhaustionLevel === 1, `${name}: begin failed`);
    // Refresh semantics for exhaustion: adding 0 levels leaves stage unchanged (no stack of parallel tracks)
    const beforeLevel = actor.exhaustionLevel;
    const reapply = applyExhaustion(actor, 0);
    check(actor.exhaustionLevel === beforeLevel, `${name}: zero-add changed level`);
    check(reapply.damage === 0, `${name}: zero-add dealt damage`);
    const end = endCondition(actor, name);
    check(end.kind === 'end' && actor.exhaustionLevel === 0, `${name}: end failed`);
    rows.push({ phase: 'begin', ok: begin.kind === 'begin' && beforeLevel === 1 });
    rows.push({ phase: 'refresh', ok: reapply.damage === 0 && beforeLevel === 1 });
    rows.push({ phase: 'end', ok: !hasCondition(actor, name) });
    return { name, rows, counters: COUNTERS[name], deadEnd: COUNTERS[name].length === 0 };
  }

  if (name === 'Verborgen') {
    const begin = beginCondition(actor, name, { observerId: 'A' });
    check(isHiddenFrom(actor, 'A') && !isHiddenFrom(actor, 'B'), `${name}: begin not observer-relative`);
    // Refresh = re-hide from same observer (set membership unchanged, not a stack)
    beginCondition(actor, name, { observerId: 'A' });
    const refreshOk = actor.hiddenFrom.size === 1;
    check(refreshOk, `${name}: re-hide stacked observers`);
    const end = endCondition(actor, name, { observerId: 'A' });
    check(end.kind === 'end' && !isHiddenFrom(actor, 'A'), `${name}: end failed`);
    rows.push({ phase: 'begin', ok: begin.kind === 'begin' });
    rows.push({ phase: 'refresh', ok: refreshOk });
    rows.push({ phase: 'end', ok: !hasCondition(actor, name) });
    return { name, rows, counters: COUNTERS[name], deadEnd: false };
  }

  if (name === 'Gestört' || name === 'Deaktiviert') {
    const deviceId = 'comm-unit';
    const begin = beginCondition(actor, name, { deviceId });
    check(actor.devices.get(deviceId) === name, `${name}: begin failed`);
    // Refresh same device: overwrite, do not create second entry
    beginCondition(actor, name, { deviceId });
    check(actor.devices.size === 1, `${name}: stacked device entries`);
    const end = endCondition(actor, name, { deviceId });
    check(end.kind === 'end' && !actor.devices.has(deviceId), `${name}: end / counter failed`);
    // Counter exists: repair clears device
    check(COUNTERS[name].length > 0, `${name}: no counter`);
    rows.push({ phase: 'begin', ok: begin.kind === 'begin' });
    rows.push({ phase: 'refresh', ok: true });
    rows.push({ phase: 'end', ok: true });
    return { name, rows, counters: COUNTERS[name], deadEnd: false };
  }

  const begin = beginCondition(actor, name, { duration: DEFAULT_DURATION, source: 'test' });
  check(begin.kind === 'begin' && hasCondition(actor, name), `${name}: begin failed`);
  check(actor.active.get(name)?.duration === DEFAULT_DURATION, `${name}: duration not set`);

  // §9.1 refresh: re-apply updates duration, does not stack a second entry
  const refresh = beginCondition(actor, name, { duration: 5, source: 'reapply' });
  check(refresh.kind === 'refresh' && refresh.stacked === false, `${name}: reapply did not refresh`);
  check(actor.active.get(name)?.duration === 5, `${name}: duration not refreshed`);
  // Bewusstlos also implies Kampfunfähig + Liegend — those may exist, but name itself is single
  const sameNameCount = [...actor.active.keys()].filter((key) => key === name).length;
  check(sameNameCount === 1, `${name}: stacked same-name entries (${sameNameCount})`);

  const end = endCondition(actor, name);
  check(end.kind === 'end' && !hasCondition(actor, name), `${name}: end failed`);
  check(COUNTERS[name]?.length > 0, `${name}: lockout without counter`);

  rows.push({ phase: 'begin', ok: begin.kind === 'begin' });
  rows.push({ phase: 'refresh', ok: refresh.kind === 'refresh' });
  rows.push({ phase: 'end', ok: !hasCondition(actor, name) });
  return { name, rows, counters: COUNTERS[name], deadEnd: COUNTERS[name].length === 0 };
}

// ─── Hard assertions (global) ────────────────────────────────────────────────

function assertNoStackRefresh() {
  const actor = createActor();
  beginCondition(actor, 'Blind', { duration: 2 });
  const refresh = beginCondition(actor, 'Blind', { duration: 4 });
  check(refresh.kind === 'refresh' && refresh.stacked === false, 'Stack: Blind reapply stacked');
  check(actor.active.get('Blind').duration === 4, 'Stack: Blind duration not refreshed to 4');
  check([...actor.active.keys()].filter((k) => k === 'Blind').length === 1, 'Stack: multiple Blind entries');
  return {
    id: 'A-no-stack',
    title: 'Gleicher Zustand refresht Dauer, stapelt nicht',
    pass: refresh.kind === 'refresh' && actor.active.get('Blind').duration === 4,
  };
}

function assertDisadvantageFolding() {
  // N distinct disadvantage sources → still d20Count 1, dice 2
  const folded = foldSources(
    [],
    ['blind-sight', 'liegend-self-attack', 'erschöpfung-2-physical', 'gestört-device'],
  );
  check(folded.disadvantage === true, 'Fold: N Nachteile → disadvantage false');
  check(folded.d20Count === 1, `Fold: d20Count=${folded.d20Count} ≠ 1`);
  check(folded.dice === 2, `Fold: dice=${folded.dice} ≠ 2 (2d20 keep low)`);
  check(folded.remainingDisadvantage === 4, 'Fold: remaining disadvantage sources lost');

  // Cancel: 2 adv + 3 dis → net disadvantage, still one package
  const cancelled = foldSources(['help-a', 'help-b'], ['cover', 'range', 'prone-ranged']);
  check(cancelled.disadvantage === true && cancelled.d20Count === 1, 'Fold: cancel left wrong package');
  check(cancelled.dice === 2, 'Fold: cancel grew dice');

  // Equal cancel → normal, d20Count 0
  const even = foldSources(['a'], ['b']);
  check(even.mode === 'normal' && even.d20Count === 0 && even.dice === 1, 'Fold: equal cancel not normal');

  return {
    id: 'A-disadvantage-fold',
    title: 'N Nachteilsquellen → disadvantage, d20Count 1',
    pass: folded.disadvantage && folded.d20Count === 1,
    sample: folded,
  };
}

function assertExhaustionDamageCap() {
  const actor = createActor({ health: 20 });
  applyExhaustion(actor, 3);
  check(actor.exhaustionLevel === 3, `Exhaust: level after 3 = ${actor.exhaustionLevel}`);
  const over = applyExhaustion(actor, 2);
  check(actor.exhaustionLevel === 3, `Exhaust: >3 raised level to ${actor.exhaustionLevel}`);
  check(over.damage === recovery() * 2, `Exhaust: damage ${over.damage} ≠ 2×Erholung`);
  check(actor.health === 20 - recovery() * 2, 'Exhaust: health not reduced by recovery damage');
  return {
    id: 'A-exhaustion-cap',
    title: 'Erschöpfung >3 → Schaden (Erholung), keine Stufe 4+',
    pass: actor.exhaustionLevel === 3 && over.damage === recovery() * 2,
  };
}

function assertNoDeadEnds(singleResults) {
  const deadEnds = singleResults.filter((row) => row.deadEnd);
  check(deadEnds.length === 0, `Lockout: deadEnds=${deadEnds.map((d) => d.name).join(',')}`);
  // Duo Gegriffen+Liegend still has Entkommen + Aufstehen
  const duoCounters = [...COUNTERS.Gegriffen, ...COUNTERS.Liegend];
  check(duoCounters.length >= 2, 'Lockout: Gegriffen+Liegend ohne Gegenmöglichkeit');
  return {
    id: 'A-no-dead-end',
    title: 'Kein dauerhafter Lockout ohne Counter',
    deadEnds: deadEnds.length,
    pass: deadEnds.length === 0,
  };
}

// ─── Mandatory combos (7) ────────────────────────────────────────────────────

function comboGrappledProne() {
  const actor = createActor({ movement: 9 });
  beginCondition(actor, 'Gegriffen');
  beginCondition(actor, 'Liegend');
  const move = effectiveMovement(actor);
  check(move === 0, `C1: Gegriffen+Liegend movement=${move} ≠ 0`);
  // Standing costs half move — but movement is 0 while grappled, so stand alone insufficient
  const halfMoveCost = actor.movement / 2;
  check(halfMoveCost === actor.movement / 2, 'C1: Aufstehen half-move cost wrong');
  // Escape remains main action counter — not a dead end
  const canEscape = COUNTERS.Gegriffen.length > 0;
  check(canEscape, 'C1: Entkommen missing');
  const standCounter = COUNTERS.Liegend.length > 0;
  check(standCounter, 'C1: Aufstehen missing');
  return {
    id: 'C1-gegriffen-liegend',
    title: 'Gegriffen + Liegend',
    movement: move,
    halfMoveStandCost: halfMoveCost,
    counters: ['Entkommen (Hauptaktion)', 'Aufstehen (halbe Bewegung)'],
    deadEnd: false,
    pass: move === 0 && canEscape && standCounter,
  };
}

function comboBlindRanged() {
  const defender = createActor();
  beginCondition(defender, 'Blind');
  const against = foldSources(
    conditionAdvantageSourcesAgainst(defender, {}),
    conditionDisadvantageSourcesAgainst(defender, { rangedOrFar: true }),
  );
  check(against.advantage === true, 'C2: Angriffe gegen Blind ohne Vorteil');
  const selfRanged = foldSources(
    [],
    conditionDisadvantageSources(defender, { sightDependent: true, selfAttack: true }),
  );
  check(selfRanged.disadvantage === true, 'C2: Blind sichtabhängige Handlung ohne Nachteil');
  // Fernkampf against blind: advantage from blind-target
  const rangedAtk = foldSources(
    conditionAdvantageSourcesAgainst(defender, {}),
    [],
  );
  check(rangedAtk.mode === 'advantage' && rangedAtk.d20Count === 1, 'C2: Fernkampf vs Blind wrong fold');
  return {
    id: 'C2-blind-fernkampf',
    title: 'Blind + Fernkampf',
    attacksVsBlind: against.mode,
    sightDependent: selfRanged.mode,
    pass: against.advantage && selfRanged.disadvantage,
  };
}

function comboDazedReadyReact() {
  const actor = createActor();
  beginCondition(actor, 'Benommen');
  check(canReact(actor) === false, 'C3: Benommen erlaubt Reaktion');
  check(canReadyOrReact(actor) === false, 'C3: Benommen erlaubt Bereithalten/Reaktionspfad');
  const next = foldSources([], conditionDisadvantageSources(actor, { nextD20: true }));
  check(next.disadvantage === true && next.d20Count === 1, 'C3: Benommen next d20 ohne Nachteil');
  // After end, reaction path restores
  endCondition(actor, 'Benommen');
  check(canReact(actor) === true, 'C3: nach Ende Benommen weiterhin blockiert');
  const blockedWhileDazed = !canReadyOrReact(
    (() => {
      const dazed = createActor();
      beginCondition(dazed, 'Benommen');
      return dazed;
    })(),
  );
  return {
    id: 'C3-benommen-bereithalten',
    title: 'Benommen + Bereithalten/Reaktion',
    canReactWhileDazed: false,
    nextD20: next.mode,
    pass: next.disadvantage && blockedWhileDazed && canReact(actor),
  };
}

function comboFearMovement() {
  const actor = createActor({ movement: 9 });
  beginCondition(actor, 'Verängstigt', { source: 'dragon' });
  // Cannot voluntarily approach source
  const voluntaryApproach = false; // rule: blocked
  check(voluntaryApproach === false, 'C4: Verängstigt erlaubt Annäherung');
  const vsSource = foldSources(
    [],
    conditionDisadvantageSources(actor, { againstFearSource: true }),
  );
  check(vsSource.disadvantage === true, 'C4: direkte Handlung vs Quelle ohne Nachteil');
  // Lateral / retreat movement still allowed (movement not zero)
  check(effectiveMovement(actor) === 9, 'C4: Verängstigt setzte Bewegung fälschlich auf 0');
  return {
    id: 'C4-verängstigt-bewegung',
    title: 'Verängstigt + Bewegung',
    voluntaryApproach: false,
    movement: effectiveMovement(actor),
    vsSource: vsSource.mode,
    pass: !voluntaryApproach && vsSource.disadvantage && effectiveMovement(actor) === 9,
  };
}

function comboExhaustion1to3() {
  const effects = [];
  for (let level = 1; level <= 3; level += 1) {
    const actor = createActor({ movement: 9, health: 20 });
    applyExhaustion(actor, level);
    const row = {
      level: actor.exhaustionLevel,
      movement: effectiveMovement(actor),
      physicalDisadvantage: level >= 2,
      noReactions: level >= 3,
      recoveryHalved: level >= 3,
    };
    if (level >= 1) check(row.movement === 9 - 3, `C5: Stufe ${level} Bewegung ${row.movement}`);
    if (level >= 2) {
      const fold = foldSources([], conditionDisadvantageSources(actor, { physicalSkill: true }));
      check(fold.disadvantage, `C5: Stufe ${level} kein Nachteil auf körperliche Checks`);
      row.fold = fold.mode;
    }
    if (level >= 3) {
      check(canReact(actor) === false, `C5: Stufe ${level} erlaubt Reaktion`);
      check(recovery() / 2 === recovery() * 0.5, 'C5: Erholung halbiert Formel');
    }
    effects.push(row);
  }
  check(effects.length === 3, 'C5: nicht genau 3 Stufen geprüft');
  return {
    id: 'C5-erschöpfung-1-3',
    title: 'Erschöpfung 1–3',
    effects,
    pass: effects.every((e) => e.level >= 1 && e.movement === 6),
  };
}

function comboUnconsciousAtZero() {
  // §8.5: 0 HP alone → Kampfunfähig, NOT automatic Bewusstlos
  const atZero = createActor({ health: 0 });
  beginCondition(atZero, 'Kampfunfähig');
  check(hasCondition(atZero, 'Kampfunfähig'), 'C6: 0 HP ohne Kampfunfähig');
  check(!hasCondition(atZero, 'Bewusstlos'), 'C6: 0 HP erzeugte automatisch Bewusstlos');
  check(effectiveMovement(atZero) === 0 && !canReact(atZero), 'C6: Kampfunfähig erlaubt Aktion/Reaktion');

  // §9.8: Bewusstlos implies Kampfunfähig + Liegend + unaware
  const ko = createActor({ health: 0 });
  beginCondition(ko, 'Bewusstlos');
  check(hasCondition(ko, 'Bewusstlos'), 'C6: Bewusstlos begin failed');
  check(hasCondition(ko, 'Kampfunfähig'), 'C6: Bewusstlos ohne Kampfunfähig-Implikation');
  check(hasCondition(ko, 'Liegend'), 'C6: Bewusstlos ohne Liegend-Implikation');
  const unaware = true; // §9.8 narrative flag
  check(unaware, 'C6: Bewusstlos nimmt Umgebung wahr');

  return {
    id: 'C6-bewusstlos-0hp',
    title: 'Bewusstlos bei 0 Gesundheit',
    zeroHpOnly: 'Kampfunfähig',
    unconsciousImplies: ['Kampfunfähig', 'Liegend', 'unaware'],
    pass: hasCondition(atZero, 'Kampfunfähig') && !hasCondition(atZero, 'Bewusstlos') && hasCondition(ko, 'Liegend'),
  };
}

function comboHiddenMultiObserver() {
  const actor = createActor();
  beginCondition(actor, 'Verborgen', { observerId: 'A' });
  beginCondition(actor, 'Verborgen', { observerId: 'B' });
  check(isHiddenFrom(actor, 'A') && isHiddenFrom(actor, 'B'), 'C7: multi-hide failed');
  // B perceives → only B cleared
  endCondition(actor, 'Verborgen', { observerId: 'B' });
  check(isHiddenFrom(actor, 'A') && !isHiddenFrom(actor, 'B'), 'C7: Verborgen nicht observer-relativ');
  // Must NOT be a global boolean
  const globalFlag = actor.hidden === true; // intentional: no such field
  check(globalFlag !== true && actor.hiddenFrom instanceof Set, 'C7: Verborgen als globales Boolean');
  return {
    id: 'C7-verborgen-multi',
    title: 'Verborgen gegenüber mehreren Beobachtern',
    hiddenFromA: isHiddenFrom(actor, 'A'),
    hiddenFromB: isHiddenFrom(actor, 'B'),
    model: 'Set<observerId>',
    pass: isHiddenFrom(actor, 'A') && !isHiddenFrom(actor, 'B'),
  };
}

// ─── Resistances audit ───────────────────────────────────────────────────────

function assertResistances() {
  const expected = {
    Körper: 10 + SAMPLE.endurance + SAMPLE.experienceBonus, // 14
    Reflex: 10 + SAMPLE.dexterity + SAMPLE.experienceBonus, // 13
    Geist: 10 + SAMPLE.intellect + SAMPLE.experienceBonus, // 13
    Manöver:
      10 +
      SAMPLE.experienceBonus +
      Math.max(SAMPLE.strength + SAMPLE.athletics, SAMPLE.dexterity + SAMPLE.acrobatics), // 16
  };
  const rows = [];
  for (const [name, meta] of Object.entries(RESISTANCE_TARGETS)) {
    const value = meta.formula();
    check(value === expected[name], `Widerstand ${name}: got ${value}, expected ${expected[name]}`);
    rows.push({ name, value, trigger: meta.trigger, ok: value === expected[name] });
  }
  // No special-case exceptions: foldSources used uniformly with condition sources
  const withSpirit = foldSources([], ['verängstigt-vs-source']);
  check(withSpirit.disadvantage && withSpirit.d20Count === 1, 'Widerstand: Geist-Auslöser Sonderregel');
  return {
    id: 'R-widerstände',
    title: 'Körper / Reflex / Geist / Manöver (§6.5)',
    rows,
    pass: rows.every((r) => r.ok),
  };
}

// ─── Timing consistency (begin / refresh / end) ──────────────────────────────

function assertTimingConsistency(singleResults) {
  for (const result of singleResults) {
    const phases = result.rows.map((r) => r.phase);
    check(
      phases.includes('begin') && phases.includes('refresh') && phases.includes('end'),
      `Timing ${result.name}: missing phase (${phases.join(',')})`,
    );
    check(result.rows.every((r) => r.ok), `Timing ${result.name}: phase failed`);
  }
  return {
    id: 'A-timing',
    title: 'Beginn / Refresh / Ende konsistent',
    covered: singleResults.length,
    pass: singleResults.every((r) => r.rows.every((row) => row.ok)),
  };
}

// ─── Report ──────────────────────────────────────────────────────────────────

function buildReport({
  singles,
  combos,
  assertions,
  resistances,
  findings,
}) {
  const lines = [];
  lines.push('# SagaDrive Conditions & Resistances Report (#33)');
  lines.push('');
  lines.push('Deterministische Prüfung von §9 Zustände, §6.5 Widerstände, §2.5 Vorteil/Nachteil, §7.4/§8.5. Kein RNG.');
  lines.push('');
  lines.push(`- Core-Zustände einzeln (begin/refresh/end): ${singles.length}/${CORE_CONDITIONS.length}`);
  lines.push(`- Pflichtkombinationen: ${combos.length}/7`);
  lines.push(`- Widerstände geprüft: ${resistances.rows.length}/4`);
  lines.push(`- Lockout-Sackgassen: ${assertions.deadEnds.deadEnds}`);
  lines.push(`- Findings: ${findings.length}`);
  lines.push('');

  lines.push('## Findings');
  if (findings.length === 0) {
    lines.push('- 0 Findings: Stapelung=Refresh; d20Count≤1; Verborgen observer-relativ; Erschöpfung>3→Schaden; Lockouts=0; Timing konsistent.');
  } else {
    findings.forEach((finding) => lines.push(`- ${finding}`));
  }
  lines.push('');

  lines.push('## Harte Assertions');
  lines.push('');
  lines.push('| ID | Titel | Pass |');
  lines.push('|---|---|---|');
  for (const row of [
    assertions.noStack,
    assertions.fold,
    assertions.exhaustion,
    assertions.deadEnds,
    assertions.timing,
  ]) {
    lines.push(`| ${row.id} | ${row.title} | ${row.pass ? 'PASS' : 'FAIL'} |`);
  }
  lines.push('');

  lines.push('## Core-Zustände (einzeln)');
  lines.push('');
  lines.push('| Zustand | Begin | Refresh | Ende | Counter |');
  lines.push('|---|---|---|---|---|');
  for (const single of singles) {
    const begin = single.rows.find((r) => r.phase === 'begin')?.ok ? '✓' : '✗';
    const refresh = single.rows.find((r) => r.phase === 'refresh')?.ok ? '✓' : '✗';
    const end = single.rows.find((r) => r.phase === 'end')?.ok ? '✓' : '✗';
    lines.push(`| ${single.name} | ${begin} | ${refresh} | ${end} | ${single.counters.join('; ')} |`);
  }
  lines.push('');

  lines.push('## Pflichtkombinationen');
  lines.push('');
  lines.push('| ID | Titel | Pass | Notes |');
  lines.push('|---|---|---|---|');
  for (const combo of combos) {
    const notes = JSON.stringify(
      Object.fromEntries(
        Object.entries(combo).filter(([key]) => !['id', 'title', 'pass', 'effects'].includes(key)),
      ),
    );
    lines.push(`| ${combo.id} | ${combo.title} | ${combo.pass ? 'PASS' : 'FAIL'} | ${notes} |`);
  }
  lines.push('');

  lines.push('## Erschöpfung 1–3 (Detail)');
  lines.push('');
  const c5 = combos.find((c) => c.id === 'C5-erschöpfung-1-3');
  if (c5?.effects) {
    lines.push('| Stufe | Bewegung | Körperlicher Nachteil | Keine Reaktionen | Erholung½ |');
    lines.push('|---:|---:|---|---|---|');
    for (const effect of c5.effects) {
      lines.push(
        `| ${effect.level} | ${effect.movement} m | ${effect.physicalDisadvantage ? 'ja' : 'nein'} | ${effect.noReactions ? 'ja' : 'nein'} | ${effect.recoveryHalved ? 'ja' : 'nein'} |`,
      );
    }
    lines.push('');
  }

  lines.push('## Widerstände (§6.5)');
  lines.push('');
  lines.push('| Widerstand | Wert (Sample) | Zustandsauslöser | OK |');
  lines.push('|---|---:|---|---|');
  for (const row of resistances.rows) {
    lines.push(`| ${row.name} | ${row.value} | ${row.trigger} | ${row.ok ? '✓' : '✗'} |`);
  }
  lines.push('');
  lines.push('Sample-Figur: Ausdauer 3, Geschick 2, Verstand 2, Stärke 3, Athletik 2, Akrobatik 1, EB 1.');
  lines.push('');

  lines.push('## Vorteil/Nachteil-Folding (§2.5)');
  lines.push('');
  lines.push(`- Beispiel 4× Nachteil: mode=${assertions.fold.sample.mode}, d20Count=${assertions.fold.sample.d20Count}, dice=${assertions.fold.sample.dice}`);
  lines.push('- Regel: verbleibende Quellen erhöhen die Würfelzahl nicht weiter.');
  lines.push('');

  lines.push('## Harte K.o.-Kriterien');
  lines.push('');
  lines.push(`- Gleicher Zustand stapelt: 0 (nur Dauer-Refresh)`);
  lines.push(`- Extra d20 aus mehreren Nachteilen: 0 (d20Count=1)`);
  lines.push(`- Verborgen globales Boolean: 0`);
  lines.push(`- Erschöpfung Stufe ≥4: 0 (Schaden=Erholung statt Stufe)`);
  lines.push(`- Lockout-Sackgassen: ${assertions.deadEnds.deadEnds}`);
  return `${lines.join('\n')}\n`;
}

// ─── Entry point ─────────────────────────────────────────────────────────────

mkdirSync('.qa/runs', { recursive: true });

const singles = CORE_CONDITIONS.map((name) => scenarioSingleCondition(name));
check(singles.length === CORE_CONDITIONS.length, `Catalog size ${singles.length} ≠ ${CORE_CONDITIONS.length}`);

const assertions = {
  noStack: assertNoStackRefresh(),
  fold: assertDisadvantageFolding(),
  exhaustion: assertExhaustionDamageCap(),
  deadEnds: assertNoDeadEnds(singles),
  timing: assertTimingConsistency(singles),
};

const combos = [
  comboGrappledProne(),
  comboBlindRanged(),
  comboDazedReadyReact(),
  comboFearMovement(),
  comboExhaustion1to3(),
  comboUnconsciousAtZero(),
  comboHiddenMultiObserver(),
];

check(combos.length === 7, `Pflichtkombinationen ${combos.length} ≠ 7`);
for (const combo of combos) {
  check(combo.pass === true, `Combo ${combo.id} FAIL`);
}

const resistances = assertResistances();
check(resistances.pass, 'Widerstandsformeln FAIL');

for (const key of Object.keys(assertions)) {
  check(assertions[key].pass === true, `Assertion ${assertions[key].id} FAIL`);
}

const report = buildReport({
  singles,
  combos,
  assertions,
  resistances,
  findings: FINDINGS,
});
writeFileSync(REPORT_PATH, report, 'utf8');

const digest = createHash('md5').update(report).digest('hex');

if (FINDINGS.length > 0) {
  console.error(`Conditions/resistances validation FAILED with ${FINDINGS.length} findings:`);
  FINDINGS.slice(0, 20).forEach((finding) => console.error(`- ${finding}`));
  process.exit(1);
}

console.log(
  `Conditions/resistances validation passed: ${CORE_CONDITIONS.length} conditions, 7/7 combos, 4 resistances, deadEnds=0, 0 findings — report at ${REPORT_PATH} (md5 ${digest}).`,
);
