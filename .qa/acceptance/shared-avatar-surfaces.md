# Acceptance — shared-avatar-surfaces

<!-- seeded for GitHub issue #9 / avatar-order-18 -->

## Intent
Derselbe Avatar-Vertrag + Viewer für Library/Sheet/Token/Session/Player Panel; Portrait-Fallback; kein Inventory im Viewer.

## Happy Path
- [ ] Modes portrait / compact-3d / full-3d dokumentiert und resolved
- [ ] Library default portrait; Sheet full-3d via AvatarSurfaceViewer
- [ ] Session strip + Token + Player panel surfaces
- [ ] Live-3D Bound + WebGL/model missing → Portrait ohne Layoutsprung
- [ ] typed-strict + shared-avatar-surfaces-check grün

## Scope
In: shared-avatar-surface domain, AvatarSurfaceViewer, surface wiring.
Out: Screen redesigns, inventory resolver in viewer.

## Composition Gate
- HEAD_SHA: (proof)
- BASE_SHA: (proof)
- Verdict: SKIPPED/CLEAR
- Proof: `.qa/runs/composition-gate-shared-avatar-surfaces.md`

## Implementation Notes
- AVATAR_SURFACE_MAX_LIVE_3D = 4
- assertNoInventoryInSurfaceRef
