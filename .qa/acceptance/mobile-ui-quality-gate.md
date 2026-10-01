# Feature: Mobile UI Quality Gate

<!-- issue #483 — feature slug: mobile-ui-quality-gate -->

## Intent

Erweitere Playwright um Phone/Tablet/Desktop-Projekte und deterministische Overflow-/Touch-/A11y-/Visual-Checks ohne die gesamte E2E-Suite zu multiplizieren.

## Happy Path

- [ ] Playwright projects: chromium + mobile-chrome (Pixel 7) + tablet-chrome (iPad Mini); mobile/tablet nur `adaptive-ui-quality.spec.ts`.
- [ ] Helpers detect horizontal overflow, touch targets, missing accessible names.
- [ ] Golden Library→Abenteuer visual snapshots with documented baseline update.
- [ ] `test-gate` includes fast static scaffold check; deep path via `test:e2e` / `test:e2e:adaptive`.
- [ ] Zero type escape hatches.

## Edge Cases

- [ ] Intentional visual change → `npm run test:e2e:adaptive:update-snapshots` + commit baselines.
- [ ] Desktop denser chrome uses ≥32px primary targets; phone/tablet ≥44.

## Security Coverage

Out of scope — fixture/local e2e only; no production secrets in screenshots.

## Composition Gate

SKIPPED — test/config scaffolding; no business hop chain.

## Implementation Notes

See `.qa/design/mobile-ui-quality-gate.md`.
