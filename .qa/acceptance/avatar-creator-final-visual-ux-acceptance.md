# Acceptance — avatar-creator-final-visual-ux-acceptance

<!-- seeded for GitHub issue #218 / avatar-order-25 -->

## Intent
Finales E2E-/Visual-Gate für den Avatar Character Creator: 20–30 Creator-Kombinationen, zwei Golden References, Source/Morph/Import-Flows, Save/Reload/Portrait/Equipment-Identität, Desktop/Tablet/Mobile/Keyboard.

## Happy Path
- [x] 24 reproduzierbare Creator-Kombinationen (12 Fantasy + 12 Sci-Fi)
- [x] Golden Refs Fantasy-Elf + Sci-Fi-Cyborg mit stabilen Fingerprints
- [x] SagaDrive Morph voll; Import/Meshy capability-gated Messaging
- [x] Save-Export strippt Runtime-/Equipment-Overlays
- [x] Shared Surfaces: full-3d + WebGL→Portrait Fallback
- [x] Responsive/a11y Structural (min-h-11, overflow-x-hidden, aria)
- [x] Child gates der Avatar-Queue bleiben in test-gate verdrahtet
- [x] `avatar-creator-final-acceptance-check` in test-gate

## Scope
In: deterministic acceptance matrix + golden evidence JSON; UI structural checks.
Out: Live GPU screenshots, paid Meshy smoke, Face Tracking (#12).

## Composition Gate
- HEAD_SHA: (proof)
- BASE_SHA: (proof)
- Verdict: SKIPPED/CLEAR
- Proof: `.qa/runs/composition-gate-avatar-creator-final-acceptance.md`

## Evidence
- `.qa/evidence/avatar-creator-golden-refs-v1.json`

## Implementation Notes
- No new product features — joins #212–#217, #4–#14, #158–#163 contracts.
