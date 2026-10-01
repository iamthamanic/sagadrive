# Verify Ticket — toonlab-compatibility-spike (#341)

## Intent match
Isolated ToonLab ↔ avatar renderer compatibility spike with real fixtures, explicit BLOCKED decision, and unblock path. No Look UI / persistence / silent renderer upgrade.

## Checks
- `node scripts/toonlab-compatibility-spike-check.mjs` → PASS (verdict=BLOCKED, 2 fixtures, 3 blockers)
- Wired into `scripts/test-gate.mjs` via `checkToonLabCompatibilitySpike`
- typed-strict: no `any` / `as unknown as` in spike module
- No `@call-me-sensei/toonlab` dependency added

## Acceptance mapping
| Criterion | Evidence |
|-----------|----------|
| human-male GLB + VRM fixture | fixtures + GLB JSON inventory |
| skeleton/morph/alpha/maps/portrait matrix | `buildToonLabSpikeMatrix` + design |
| GO/BLOCKED + path | design + `evaluateToonLabCompatibilitySpike` → BLOCKED |
| version/perf risks | design + decision.performanceRisks |
| typed-strict | spike-check |

## Verdict
PASS
