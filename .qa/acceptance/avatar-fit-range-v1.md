# Acceptance — avatar-fit-range-v1

## Intent
Versioned AvatarFitRangeV1 so traits/wearables are ready/needs-review/incompatible vs morph state — no silent auto-fit.

## Happy Path
- [ ] Fit contract + resolver exist
- [ ] Version mismatch fail-closed
- [ ] UI notice for non-ready status
- [ ] Trait panels consume morph + fit
- [ ] test-gate green

## Composition Gate
- HEAD_SHA: bc3a8b32f7d4d1019a66afac807e4f03f778ddbb
- BASE_SHA: 003f656a43bd1151c285185ee929d8dbac6cb3ba
- Verdict: CLEAR

## Implementation Notes
- fit-range-contract.ts + AvatarFitRangeNotice + AvatarTraitPanels wiring
