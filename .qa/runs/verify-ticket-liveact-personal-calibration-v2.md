# Verify Ticket — liveact-personal-calibration-v2 (#449)

- Verdict: **PASS**
- Date: 2026-10-04
- Branch: `agent/liveact-personal-calibration-v2`
- Base/main: `c6a629fa9ebce038d92713f79989a9a9e1d8a171`

## Checks

- Design + acceptance present (CE-04 / CE-11 / CE-20 + AU-01..15)
- `scripts/liveact-personal-calibration-v2-check.mjs` PASS (scope, capture clock, classic override, persistence, A/B)
- Wired into `npm run test-gate` → PASS
- Choreography duration 34500 ms (20–40 s)
- Profile V2 scoped `ownerLocalId` + `characterLocalId` (no `_default`)
- Valid capture ms gating + min frames
- Classic session-overrides Personal without deleting stored Premium
- Persistence failure → session-only copy (`persisted: false`)
- V1 classic calibrate retained; #448 temporal seat unchanged
- UI: Premium + Skip `min-h-11` (≥44px); verify-ui PASS

## verify-ui

**PASS** — `e2e/liveact-personal-calibration-v2.spec.ts` + `.qa/runs/verify-ui-liveact-personal-calibration-v2.md`
