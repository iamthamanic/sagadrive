# Feature: Live Session Golden E2E Gate

<!-- issue #378 — feature slug: live-session-golden-e2e-gate -->

## Intent

Schließe Epic #361 mit Multi-User-/Multi-Role-E2E + Security Gate. Extends #303; ruft #484 Golden Mobile und #377 Dornhain als Dependencies.

## Happy Path

- [x] 20 Golden Scenarios + 9 adversarial probes as domain checklist
- [x] Multi-context Playwright smoke: GM, Player A/B, Viewer, Director, unauthorized
- [x] Knowledge audience isolation (gm_only / character_specific)
- [x] Viewer/Director cannot mutate gameplay; manual Director override wins
- [x] Dornhain package + `npm run test:e2e:golden-mobile` hooks
- [x] `npm run test-gate` includes this check; #303 gate remains
- [x] Evidence under `.qa/evidence/live-session-golden-e2e-gate/`
- [x] Zero type escape hatches

## Edge Cases

- [x] stale revision / duplicate idempotency / forged capabilities classified fail-closed
- [x] Live opt-in via `E2E_LIVE_SESSION_GOLDEN=1`

## Security Coverage

B-01/B-04/B-07/B-08 + P-04 mirrored via `authorizeGoldenGameplayMutation` / adversarial map. Server remains SoT.

## Composition Gate

- Verdict: CLEAR
- Proof: `.qa/runs/composition-gate-live-session-golden-e2e-gate.md`
