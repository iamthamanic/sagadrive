# Feature: Golden Mobile Journeys

<!-- issue #484 — feature slug: golden-mobile-journeys -->

## Intent

Wende den Adaptive-UI-Standard auf die wichtigsten SagaDrive-Journeys an und friere sie als Phone/Tablet/Desktop-Referenzflows ein, die #378 aufrufen kann.

## Happy Path

- [x] Vier Golden Journeys: `login-dashboard`, `dashboard-character`, `session-join-assignment`, `player-live-private`.
- [x] Journeys bestehen Overflow-/Touch-/A11y-Checks auf Chromium + mobile-chrome + tablet-chrome.
- [x] Login, Dashboard, Session Join nutzen `AdaptivePage` + `data-au-surface`.
- [x] Player Live behält AdaptiveLiveStage; private Check/Inventory auf Phone erreichbar.
- [x] `npm run test:e2e:golden-mobile` ist der #378-aufrufbare Entry.
- [x] Touched files: zero type escape hatches.

## Edge Cases

- [x] 0/1/n characters covered by existing #478 assignment surface (join journey asserts picker).
- [x] Phone uses bottom private rail; desktop uses side rail (asserted in player-live journey).

## Security Coverage

Secure-by-Default: presentation/adaptive only — no authz boundary changes; fixtures remain owner-/session-scoped.

## Composition Gate

- Verdict: SKIPPED (single presentation hop; AU surfaces → Playwright matrix; no new business producer→consumer path)
- Proof: `.qa/runs/composition-gate-golden-mobile-journeys.md`

## Implementation Notes

- Contract: `src/domains/session/contracts/golden-mobile-journeys.ts`
- E2E: `e2e/golden-mobile-journeys.spec.ts`
- Gate: `scripts/golden-mobile-journeys-check.mjs`
