# Design: adaptive-ui-experience-contract (#481)

## Status

Design ready for docs-only implementation. Parent epic #480. No UI primitives in this slice (#482).

## Intent

Canonical Adaptive UI & Mobile Experience Contract with measurable `AU-*` gates, device bands, and deviation rules; wire into `AGENTS.md` + `THEME_GUIDE.md` without duplicating conflicting mobile rules.

## Approach

1. Mirror Conductor/Imagination contract structure (thesis → classification → baselines → gates).
2. Keep visual tokens in THEME_GUIDE; put adaptive/mobile measurables only in the new contract.
3. Align Phone cutoff with existing `useIsMobile()` / 768px THEME_GUIDE rule; add explicit Tablet band.
4. Cross-link CE-11 touch baseline; do not redefine Performance behaviour.

## Out of scope

- `src/shared/ui/**` primitives
- Playwright / visual CI
- Feature screen migrations

## Acceptance mapping

See `.qa/acceptance/adaptive-ui-experience-contract.md`.
