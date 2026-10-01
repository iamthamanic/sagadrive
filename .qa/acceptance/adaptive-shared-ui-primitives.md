# Feature: Adaptive Shared UI Primitives

<!-- issue #482 — feature slug: adaptive-shared-ui-primitives -->

## Intent

Baue wenige wiederverwendbare adaptive Presentation-Primitives unter `src/shared/ui/adaptive/**`, damit Feature-Screens Phone/Tablet/Desktop-Kompositionen über zentrale Patterns erhalten statt lokaler Breakpoint-Sonderlogik.

## Preconditions

- #481 Adaptive UI Contract merged (`AU-*` gates exist).
- Existing Radix Sheet / Vaul Drawer / `useIsMobile` available.

## Happy Path

- [ ] 8 fokussierte Patterns: bands helper, Page, ActionBar, Toolbar, Sheet, Inspector, MasterDetail, LiveStage — reuse Radix/Tailwind.
- [ ] Phone/Tablet/Desktop-Komposition ohne Feature-Business-Logik im Shared Layer.
- [ ] Safe-Area, Touch-Target (min-h-11), reduced-motion zentral berücksichtigt.
- [ ] Kein neues UI-Framework; static check in test-gate.
- [ ] Touched files: zero type escape hatches.

## Edge Cases

- [ ] Phone Sheet defaults to bottom with safe-area padding.
- [ ] LiveStage rails collapse to compact strip on phone.
- [ ] Presentation-only: no supabase/auth/domain imports.

## Regression

- [ ] Existing shared/ui exports remain valid.
- [ ] `npm run test-gate` includes adaptive-shared-ui-primitives-check.

## Security Coverage

Secure-by-Default: out of scope — presentation-only shared UI; no auth/owner/session authority.

## Composition Gate

- Verdict: SKIPPED (single presentation hop; no producer→consumer business path)
- Proof: `.qa/runs/composition-gate-adaptive-shared-ui-primitives.md`

## Implementation Notes

- Added `src/shared/ui/adaptive/**` + barrel export from `src/shared/ui/index.ts`.
- Wired `scripts/adaptive-shared-ui-primitives-check.mjs` into `scripts/test-gate.mjs`.
