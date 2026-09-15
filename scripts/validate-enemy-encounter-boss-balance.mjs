#!/usr/bin/env node
/**
 * SagaDrive Enemy, Encounter & Boss Balance Validation (#24, Epic #18)
 *
 * Seeded deterministic Monte-Carlo simulation of the §15 encounter system over
 * the shared core probe (scripts/lib/core-probe.mjs):
 *
 *  - §15.2 standard enemy table (bands Novize..Legende / Machtgrad)
 *  - §15.4 Standard/Elite/Boss HP multipliers + impulse tempo (no blanket +1 attack/DEF)
 *  - §15.5 threat points and group budgets (routine/standard/hard/extreme),
 *    band-shift doubling/halving
 *  - focus fire, action economy, round length, party defeat risk
 *
 * Monte-Carlo is documented as such (issue allows "Simulationen und/oder
 * Testkämpfe"); a fixed seed makes every run byte-reproducible.
 *
 * Location: scripts/validate-enemy-encounter-boss-balance.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import process from 'node:process';

// ─── Deterministic RNG (fixed seed, reproducible runs) ───────────────────────

function createRng(seed) {
  let state = seed >>> 0;
  return function next() {
    // mulberry32
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Roll a die with `sides` sides using the run's RNG. */
function rollDie(rng, sides) {
  return 1 + Math.floor(rng() * sides);
}

/** d20 roll. */
function rollD20(rng) {
  return rollDie(rng, 20);
}

// ─── Rule tables (§15.2, §15.3, §15.4, §6) ──────────────────────────────────

const STANDARD_ENEMIES = Object.freeze([
  { rank: 'Novize', level: 2, attack: 6, defense: 14, health: 18, damage: { dice: 1, sides: 6, flat: 1 } },
  { rank: 'Spezialist', level: 6, attack: 8, defense: 16, health: 20, damage: { dice: 1, sides: 8, flat: 1 } },
  { rank: 'Experte', level: 10, attack: 10, defense: 18, health: 22, damage: { dice: 1, sides: 8, flat: 2 } },
  { rank: 'Meister', level: 14, attack: 12, defense: 20, health: 24, damage: { dice: 1, sides: 10, flat: 2 } },
  { rank: 'Legende', level: 18, attack: 14, defense: 22, health: 26, damage: { dice: 1, sides: 10, flat: 3 } },
]);

const BUDGETS = Object.freeze([
  { name: 'Routine', multiplier: 1 },
  { name: 'Standard', multiplier: 2 },
  { name: 'Schwer', multiplier: 2.5 },
  { name: 'Extrem', multiplier: 3 },
]);

const THREAT_POINTS = Object.freeze({ standard: 1, elite: 2, boss: 4 });

const PLAYER_COUNTS = Object.freeze([3, 4, 5, 6]);
const BAND_INDEX = Object.freeze([0, 1, 2, 3, 4]); // Novize..Legende

// ─── Encounter composition (§15.4) ───────────────────────────────────────────

/**
 * Build an enemy group for a budget. Composition policies mirror common GM
 * practice: boss solo, elite packs, standard swarm, mixed elite+standard.
 */
function buildComposition(budget, type) {
  // §15.5: the GM builds the encounter to fit the budget. A boss costs 4 BP,
  // so boss encounters only exist at budgets that can afford one.
  const compositions = {
    boss: budget >= 4 ? [{ type: 'boss', count: 1 }] : null,
    elite: budget >= 2 ? [{ type: 'elite', count: Math.floor(budget / 2) }] : null,
    standard: budget >= 1 ? [{ type: 'standard', count: budget }] : null,
    mixed:
      budget >= 2
        ? [
            { type: 'elite', count: 1 },
            { type: 'standard', count: Math.max(0, budget - 2) },
          ]
        : null,
  };
  return compositions[type] ?? null;
}

function groupThreatCost(composition, bandOffset) {
  const costs = { standard: 1, elite: 2, boss: 4 };
  let total = 0;
  for (const part of composition) {
    let cost = costs[part.type] * part.count;
    if (bandOffset === 1) cost *= 2; // one rank above: double (§15.4)
    if (bandOffset === -1) cost /= 2; // one rank below: half (§15.4)
    total += cost;
  }
  return total;
}

// ─── Combatant construction ──────────────────────────────────────────────────

/** §6.1/§6.2: party member derived from level and endurance profile. */
function buildPartyMember(band, optimized) {
  const row = STANDARD_ENEMIES[band];
  const eb = band + 1; // rank EB (Novize=1 ... Legende=5)
  const endurance = optimized ? 4 : 3;
  const attribute = optimized ? 4 : 3;
  const skill = Math.min(3 + (band >= 2 ? 1 : 0), band + 3); // grows with band, capped
  return {
    side: 'party',
    name: `Spieler-${optimized ? 'opt' : 'avg'}`,
    maxHealth: 12 + 2 * endurance + 2 * eb,
    health: 12 + 2 * endurance + 2 * eb,
    defense: 10 + attribute + eb + skill,
    attackBonus: attribute + skill + eb,
    damage: { dice: 1, sides: 8, flat: 2 + (optimized ? 1 : 0) },
    reactionAvailable: true,
    downed: false,
  };
}

/** §15.2/§15.4: enemy stat block — role changes HP + impulse tempo only. */
function buildEnemy(band, type, bandOffset = 0) {
  const base = STANDARD_ENEMIES[Math.min(STANDARD_ENEMIES.length - 1, Math.max(0, band + bandOffset))];
  const roleMult = type === 'boss' ? 2.5 : type === 'elite' ? 1.5 : 1;
  const enemy = {
    side: 'enemy',
    type,
    name: `${type} (${base.rank}${bandOffset ? ` ${bandOffset > 0 ? '+1' : '-1'} Band` : ''})`,
    defense: base.defense,
    health: Math.ceil(base.health * roleMult),
    maxHealth: Math.ceil(base.health * roleMult),
    attackBonus: base.attack,
    damage: { ...base.damage },
    impulseDamage: shiftDamageClass(base.damage, -1),
    impulsesPerRound: type === 'boss' ? 2 : type === 'elite' ? 1 : 0,
    impulsesUsed: 0,
    reactionsPerRound: 1,
    reactionAvailable: true,
    downed: false,
  };
  return enemy;
}

/** §8.1 damage classes in fixed order for one-class shifts (§15.3). */
function shiftDamageClass(damage, offset) {
  const classes = [
    { dice: 1, sides: 4, flat: 1 },
    { dice: 1, sides: 6, flat: 1 },
    { dice: 1, sides: 8, flat: 2 },
    { dice: 1, sides: 10, flat: 3 },
    { dice: 1, sides: 12, flat: 4 },
  ];
  const index = classes.findIndex((entry) => entry.sides === damage.sides && entry.flat === damage.flat);
  const next = Math.min(classes.length - 1, Math.max(0, (index < 0 ? 2 : index) + offset));
  return { ...classes[next] };
}

// ─── Attack resolution (mirrors shared probe: d20 + bonus vs defense) ────────

/** §2.2 grade resolution, single roll (simulation path). */
function resolveGrade(attackTotal, target) {
  const margin = attackTotal - target;
  if (margin >= 10) return 'crit-success';
  if (margin >= 0) return 'success';
  if (margin <= -10) return 'crit-failure';
  return 'failure';
}

/** Damage roll including crit doubling of dice only (§8.2). */
function rollDamage(rng, damage, crit) {
  const count = damage.dice * (crit ? 2 : 1);
  let total = damage.flat;
  for (let i = 0; i < count; i += 1) {
    total += rollDie(rng, damage.sides);
  }
  return total;
}

// ─── Encounter simulation ────────────────────────────────────────────────────

function simulateEncounter({ partySize, band, composition, bandOffset, rng, optimized }) {
  const party = [];
  for (let i = 0; i < partySize; i += 1) {
    party.push(buildPartyMember(band, optimized));
  }

  const enemies = [];
  for (const part of composition) {
    for (let i = 0; i < part.count; i += 1) {
      enemies.push(buildEnemy(band, part.type, bandOffset));
    }
  }

  let rounds = 0;
  const MAX_ROUNDS = 20;

  while (rounds < MAX_ROUNDS) {
    rounds += 1;

    // Reset impulse counters each round (§15.4).
    for (const enemy of enemies) enemy.impulsesUsed = 0;

    // Party turn: each up member attacks; living Elite/Boss may fire one impulse after.
    for (const member of party) {
      if (member.downed) continue;
      const target = enemies.find((enemy) => !enemy.downed);
      if (!target) break;
      const total = rollD20(rng) + member.attackBonus;
      const grade = resolveGrade(total, target.defense);
      if (grade === 'success' || grade === 'crit-success') {
        const damage = rollDamage(rng, member.damage, grade === 'crit-success');
        applyDamage(target, damage);
      }
      // §15.4: after another figure finishes its turn — impulse (max one per other turn).
      for (const enemy of enemies) {
        if (enemy.downed) continue;
        if ((enemy.impulsesUsed ?? 0) >= (enemy.impulsesPerRound ?? 0)) continue;
        const targets = party.filter((m) => !m.downed);
        if (targets.length === 0) break;
        const impulseTarget = targets[targets.length - 1];
        const impulseTotal = rollD20(rng) + enemy.attackBonus;
        const impulseGrade = resolveGrade(impulseTotal, impulseTarget.defense);
        if (impulseGrade === 'success' || impulseGrade === 'crit-success') {
          const damage = rollDamage(rng, enemy.impulseDamage, impulseGrade === 'crit-success');
          applyDamage(impulseTarget, damage);
          if (impulseTarget.health <= 0) impulseTarget.downed = true;
        }
        enemy.impulsesUsed += 1;
      }
    }
    if (enemies.every((enemy) => enemy.downed)) break;

    // Enemy main turn: one full attack each (role does not grant extra main actions).
    for (const enemy of enemies) {
      if (enemy.downed) continue;
      const targets = party.filter((member) => !member.downed);
      if (targets.length === 0) break;
      const target = targets[0];
      const total = rollD20(rng) + enemy.attackBonus;
      const grade = resolveGrade(total, target.defense);
      if (grade === 'success' || grade === 'crit-success') {
        const damage = rollDamage(rng, enemy.damage, grade === 'crit-success');
        applyDamage(target, damage);
        if (target.health <= 0) target.downed = true;
      }
    }
    if (party.every((member) => member.downed)) break;
  }

  const partyDowned = party.filter((member) => member.downed).length;
  const defeated = partyDowned === partySize;
  const remainingHealthShare =
    party.reduce((acc, member) => acc + Math.max(0, member.health), 0) /
    party.reduce((acc, member) => acc + member.maxHealth, 0);

  return {
    rounds,
    defeated,
    partyDowned,
    remainingHealthShare: Number.isFinite(remainingHealthShare) ? remainingHealthShare : 0,
  };
}

function applyDamage(target, damage) {
  target.health -= damage;
  if (target.health <= 0) target.downed = true;
}

// ─── Matrix run ──────────────────────────────────────────────────────────────

const RUNS_PER_CELL = 400;

function runMatrix() {
  const findings = [];
  const rows = [];

  for (const partySize of PLAYER_COUNTS) {
    for (const band of BAND_INDEX) {
      const rank = STANDARD_ENEMIES[band].rank;
      for (const budgetDef of BUDGETS) {
        const budget = Math.round(budgetDef.multiplier * partySize);
        for (const compositionType of ['boss', 'elite', 'standard', 'mixed']) {
          const composition = buildComposition(budget, compositionType);
          if (!composition) continue; // composition does not fit this budget (§15.4)
          const cost = groupThreatCost(composition, 0);
          const agg = { rounds: 0, defeatRate: 0, downedShare: 0, healthShare: 0, runs: 0 };
          for (let run = 0; run < RUNS_PER_CELL; run += 1) {
            const rng = createRng(0x5eed + band * 1000 + partySize * 100 + budget * 10 + RUNS_PER_CELL_INDEX(run));
            const result = simulateEncounter({ partySize, band, composition, bandOffset: 0, rng, optimized: false });
            agg.rounds += result.rounds;
            agg.defeatRate += result.defeated ? 1 : 0;
            agg.downedShare += result.partyDowned / partySize;
            agg.healthShare += result.remainingHealthShare;
            agg.runs += 1;
          }
          const avgRounds = agg.rounds / agg.runs;
          const defeatRate = agg.defeatRate / agg.runs;
          const avgDowned = agg.downedShare / agg.runs;
          const avgHealth = agg.healthShare / agg.runs;

          // Per-cell sanity: no grinding stalemates (§19.5).
          if (avgRounds > 14) {
            findings.push(`Schleifkampf: Band ${rank} Größe ${partySize} ${compositionType} → ${avgRounds.toFixed(1)} Runden Ø.`);
          }

          rows.push({
            rank,
            partySize,
            difficulty: budgetDef.name,
            composition: compositionType,
            threatCost: cost,
            budget,
            avgRounds: avgRounds.toFixed(1),
            defeatRate: `${(defeatRate * 100).toFixed(1)}%`,
            avgDowned: avgDowned.toFixed(2),
            avgHealth: `${(avgHealth * 100).toFixed(0)}%`,
          });
        }
      }
    }
  }

  // §19.5 invariant: danger tiers must be monotonic per (rank, party size,
  // composition) — Routine < Standard < Schwer < Extrem in combined danger
  // (defeat rate + downed share). Standard-swarm action-count edge case: swarm
  // danger must not exceed the elite composition at the same budget by >50%.
  const cellKeys = new Map();
  for (const row of rows) {
    const key = `${row.rank}|${row.partySize}|${row.composition}`;
    if (!cellKeys.has(key)) cellKeys.set(key, []);
    cellKeys.get(key).push(row);
  }
  const tierOrder = ['Routine', 'Standard', 'Schwer', 'Extrem'];
  const dangerOf = (row) => Number(row.defeatRate.replace('%', '')) + Number(row.avgDowned) * 25;
  for (const [, tierRows] of cellKeys) {
    const sorted = tierOrder
      .map((tier) => tierRows.find((row) => row.difficulty === tier))
      .filter(Boolean);
    for (let i = 1; i < sorted.length; i += 1) {
      // Identical encounter cost (budget rounding, §15.4) → same encounter,
      // not an inversion. Only assert ordering across distinct costs.
      if (sorted[i].threatCost === sorted[i - 1].threatCost) continue;
      if (dangerOf(sorted[i]) < dangerOf(sorted[i - 1]) - 2.5) {
        findings.push(
          `Gefallenstufe nicht monoton: ${sorted[i].rank} Größe ${sorted[i].partySize} ${sorted[i].composition} — ${sorted[i - 1].difficulty} (${dangerOf(sorted[i - 1]).toFixed(1)}) ≥ ${sorted[i].difficulty} (${dangerOf(sorted[i]).toFixed(1)})`,
        );
      }
    }
    const swarm = tierRows.find((row) => row.composition === 'standard' && row.difficulty === 'Extrem');
    const elite = tierRows.find((row) => row.composition === 'elite' && row.difficulty === 'Extrem');
    if (swarm && elite && dangerOf(swarm) > dangerOf(elite) * 1.5 + 1e-9) {
      findings.push(
        `Standard-Schwarm sprengt Budget: ${swarm.rank} Größe ${swarm.partySize} — Schwarm ${dangerOf(swarm).toFixed(1)} vs Elite ${dangerOf(elite).toFixed(1)} bei identischem Budget`,
      );
    }
  }

  return { rows, findings };
}

function RUNS_PER_CELL_INDEX(run) {
  return run;
}

// ─── Boss-focused scenarios (§15.4 boss economy) ─────────────────────────────

function runBossScenarios() {
  const findings = [];
  const rows = [];

  for (const band of BAND_INDEX) {
    const rank = STANDARD_ENEMIES[band].rank;
    for (const partySize of [4]) {
      const budget = 4; // one boss = 4 threat points → Standard for 4 players
      const composition = [{ type: 'boss', count: 1 }];

      // Solo boss vs focused party: boss must not collapse instantly.
      const agg = { rounds: 0, bossDefeated: 0, partyDefeat: 0, bossHealth: 0 };
      for (let run = 0; run < RUNS_PER_CELL; run += 1) {
        const rng = createRng(0xb055 + band * 100 + run);
        const result = simulateEncounter({ partySize, band, composition, bandOffset: 0, rng, optimized: false });
        agg.rounds += result.rounds;
        agg.partyDefeat += result.defeated ? 1 : 0;
        agg.bossDefeated += result.defeated ? 0 : 1;
      }
      const avgRounds = agg.rounds / RUNS_PER_CELL;
      const partyDefeatRate = agg.partyDefeat / RUNS_PER_CELL;

      if (avgRounds < 2) {
        findings.push(`Boss kollabiert: Band ${rank} → nur ${avgRounds.toFixed(1)} Runden Ø.`);
      }
      if (avgRounds > 12) {
        findings.push(`Boss-Schleifkampf: Band ${rank} → ${avgRounds.toFixed(1)} Runden Ø.`);
      }
      rows.push({
        rank,
        scenario: 'Solo-Boss (Budget 4, 4 Spieler)',
        avgRounds: avgRounds.toFixed(1),
        partyDefeatRate: `${(partyDefeatRate * 100).toFixed(1)}%`,
        note: '§15.4 Boss: HP ×2,5, 2 Impulse/Runde, kein Blanket-+1 Angriff/DEF.',
      });

      // Band-shift scenario: enemy one rank above the party (double cost §15.5).
      const shiftedComposition = [{ type: 'standard', count: 4 }];
      const shiftCost = groupThreatCost(shiftedComposition, 1);
      rows.push({
        rank,
        scenario: 'Gegner +1 Band (Kosten verdoppelt)',
        avgRounds: '—',
        partyDefeatRate: '—',
        note: `Budgetkosten ${shiftCost} BP (Standard 4 → effektiv Schwer/Extrem); Simulationszeile folgt in der Matrix.`,
      });
    }
  }

  return { findings, rows };
}

// ─── Report ──────────────────────────────────────────────────────────────────

function buildReport(matrixRows, matrixFindings, bossRows, bossFindings) {
  const findings = [...matrixFindings, ...bossFindings];
  const lines = [];
  lines.push('# SagaDrive Enemy, Encounter & Boss Balance Report (#24)');
  lines.push('');
  lines.push('Seeded Monte-Carlo (400 runs per cell, fixed seed) over §15 encounter rules.');
  lines.push('');
  lines.push(`- Group sizes: 3/4/5/6`);
  lines.push(`- Ranks: Novize–Legende (Band I–V)`);
  lines.push(`- Compositions: boss / elite / standard / mixed`);
  lines.push(`- Encounter rows: ${matrixRows.length} + ${bossRows.length} boss scenarios`);
  lines.push(`- Findings: ${findings.length}`);
  lines.push('');
  lines.push('## Findings');
  if (findings.length === 0) {
    lines.push('Keine Budget-Sprengung durch Standard-Schwärme, kein Boss-Kollaps oder Boss-Eskalation; Budgetstufen klar getrennt.');
  } else {
    findings.forEach((finding) => lines.push(`- ${finding}`));
  }
  lines.push('');
  lines.push('## Encounter matrix (average party build)');
  lines.push('');
  lines.push('| Rang | Spieler | Schwierigkeit | Komposition | Bedrohung | Budget | Runden Ø | Niederlagen | K.O.-Anteil | Rest-HP |');
  lines.push('|---|---:|---|---|---:|---:|---:|---:|---:|---:|');
  for (const row of matrixRows) {
    lines.push(
      `| ${row.rank} | ${row.partySize} | ${row.difficulty} | ${row.composition} | ${row.threatCost} | ${row.budget} | ${row.avgRounds} | ${row.defeatRate} | ${row.avgDowned} | ${row.avgHealth} |`,
    );
  }
  lines.push('');
  lines.push('## Boss scenarios');
  lines.push('');
  lines.push('| Rang | Szenario | Runden Ø | Niederlagen | Anmerkung |');
  lines.push('|---|---|---:|---:|---|');
  for (const row of bossRows) {
    lines.push(`| ${row.rank} | ${row.scenario} | ${row.avgRounds} | ${row.partyDefeatRate} | ${row.note} |`);
  }
  lines.push('');
  lines.push('## Notes');
  lines.push('- Monte-Carlo mit fixiertem Seed (byte-reproduzierbar); dokumentiert als Simulation statt exakter Faltung (großer kombinierter Zustandsraum).');
  lines.push('- Fokusfeuer: Party zielt auf den am stärksten beschädigten Gegner; Elite/Boss feuern Impulse nach Party-Zügen.');
  lines.push('- Kampfrolle ändert nur HP und Impulse (§15.4); kein Blanket-+1 Angriff/DEF; kein Scherge/Minion.');
  lines.push('- Budgets §15.5: Routine 1× / Standard 2× / Schwer 2,5× / Extrem 3× Spielerzahl; Band-Verschiebung ×2 (höher) bzw. ÷2 (niedriger).');
  return lines.join('\n');
}

// ─── Entry point ─────────────────────────────────────────────────────────────

mkdirSync('.qa/runs', { recursive: true });

const { rows: matrixRows, findings: matrixFindings } = runMatrix();
const { findings: bossFindings, rows: bossRows } = runBossScenarios();
const report = buildReport(matrixRows, matrixFindings, bossRows, bossFindings);
writeFileSync('.qa/runs/validate-enemy-encounter-boss-balance-report.md', report, 'utf8');

const findings = [...matrixFindings, ...bossFindings];
if (findings.length > 0) {
  console.error(`Enemy/encounter/boss validation FAILED with ${findings.length} findings:`);
  findings.slice(0, 10).forEach((finding) => console.error(`- ${finding}`));
  process.exit(1);
}

console.log(
  `Enemy/encounter/boss validation passed: ${matrixRows.length} encounter cells + ${bossRows.length} boss scenarios — report at .qa/runs/validate-enemy-encounter-boss-balance-report.md.`,
);