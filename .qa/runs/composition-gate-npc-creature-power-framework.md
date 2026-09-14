# Composition Gate — npc-creature-power-framework

- HEAD_SHA: edde5e8150cd2e2c412caa2236f3723dcae2f6e4
- BASE_SHA: 8a15acaa7828589699dcab2eea86b416ba608c21
- Date: 2026-09-14
- Verdict: CLEAR

## Event

GM constructs a compact NPC/creature at a given level, profile, and combat role; derived benchmarks and encounter threat must mean the same thing in rules docs, kernel, and encounter validation.

## Hop chain

1. Core §15 + design benchmarks (normative intent)
2. `computeCompactStatblockBenchmarks` / role+profile pure functions in `npc-creature-power`
3. `npc-creature-power-framework-check.mjs` locks 20-level invariants
4. `validate-enemy-encounter-boss-balance.mjs` consumes same HP×role and threat-unit meaning (no attack/DEF blanket)

Cardinality: one benchmark computation per (level, profile, role); one HP round-up at end; impulses do not consume reactions.

## Simulations

| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | 1 Elite impulse after each other turn, max role limit/round | Kernel `impulsesPerRound` + encounter sim fires ≤ limit after party turns | pass |
| Invalid/missing | Bad level / noncombat+Boss → fail-closed or normalize | assert level; noncombat forces standard role | pass |
| Two consumers / crash | Docs, kernel check, encounter validate share same HP/threat meaning | Shared multipliers 1/1.5/2.5 and threat 1/2/4; no silent Scherge path | pass |

## Flags

| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| (none) | | | | |
