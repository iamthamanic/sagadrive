# Feature: Adaptive UI & Mobile Experience Contract

<!-- issue #481 — feature slug: adaptive-ui-experience-contract -->

## Intent

Definiere den verbindlichen SagaDrive Adaptive-UI-Contract mit messbaren `AU-*` Gates für Layout, Touch, Safe Areas, Motion, Accessibility und gerätegerechte Re-Komposition. AGENTS.md und THEME_GUIDE verknüpfen den Contract verbindlich ohne widersprüchliche Duplikate.

## Preconditions

- Conductor- und Imagination-Contracts existieren unter `docs/concepts/`.
- THEME_GUIDE enthält Mobile-first/44px/768px Baselines.

## Happy Path

- [ ] `docs/concepts/adaptive-ui-experience-contract.md` definiert Hard Gates AU-01…AU-10 und Quality Gates AU-11…AU-15 (Overflow, Touch, Safe Areas, Keyboard, Motion, Recomposition, Touch Parity, A11y, States, Tokens).
- [ ] Contract definiert Phone/Tablet/Desktop-Bands, Patternregeln und explizite Deviation-Regel (§9).
- [ ] `AGENTS.md` macht den AU-Contract für neue user-facing UI verbindlich und verlangt `AU-*` in Acceptance.
- [ ] `src/THEME_GUIDE.md` verweist auf den Contract und entdoppelt Mobile-Regeln (keine widersprüchliche Paralleldefinition).
- [ ] Touched files: zero type escape hatches (docs-only; typed-strict N/A for pure markdown).

## Edge Cases

- [ ] Desktop-only Workstation darf nur mit benannter AU-Deviation + unterstützten Bands deferren.
- [ ] Performance/Live Surfaces referenzieren AU-* und CE-* gemeinsam.
- [ ] 320px Narrow Floor und Safe Areas sind im Contract spezifiziert.

## Regression

- [ ] Bestehende CE/IV Contract-Verweise in AGENTS.md/THEME_GUIDE bleiben erhalten.
- [ ] Keine Produktionscode-Änderungen in diesem Slice.

## Security Coverage

Secure-by-Default: out of scope — docs/contract only; no auth, storage, UGC, or authority changes. Viewport size must not grant privileges (stated in contract Non-Goals).

## Assumptions

- #482/#483 implement primitives and automated gates later.
- Parallel to ongoing #423; no LiveAct face asset changes.

## Screenshots

N/A (docs-only).

## Implementation Notes

- Added `docs/concepts/adaptive-ui-experience-contract.md`.
- Linked from `AGENTS.md` Product Experience Contracts + Canonical Design Sources.
- THEME_GUIDE Status + Responsive sections point to AU contract for measurable mobile rules.

## Composition Gate

- Verdict: SKIPPED (docs-only; no producer→consumer path)
- Proof: `.qa/runs/composition-gate-adaptive-ui-experience-contract.md`
