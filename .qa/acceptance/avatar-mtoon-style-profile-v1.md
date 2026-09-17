# Acceptance — avatar-mtoon-style-profile-v1

## Intent
Central SagaDriveMToonProfileV1 so all avatar screens share one stylized toon look (MToon preferred, controlled PBR fallback).

## Happy Path
- [ ] Domain profile documents 7 material classes + light/outline/performance.
- [ ] Runtime consumes profile for renderer, lights, and materials.
- [ ] Import without MToon shows non-blocking DE notice.
- [ ] Portrait capture uses same renderer path.
- [ ] No custom/user shader injection.
- [ ] avatar-mtoon-profile-check + test-gate green.

## Edge Cases
- [ ] GLB without MToon → pbr-fallback.
- [ ] Eyes/outline disabled classes avoid sorting artifacts.
- [ ] Mobile preset reduces cost, keeps style identity.

## Scope
In: mtoon-profile domain, style applier, runtime + canvas notice.
Out: Custom shaders, remeshing, per-screen style forks.

## Security Coverage
- Allowlisted profile parameters only; no dynamic shader injection.
- B-09: render path from material evidence, not client force.

## Composition Gate
- HEAD_SHA: d703ac33b56ef3596b5b9a0837c05967d623603a
- BASE_SHA: 5171597db3244d1c845612a40f8611a1d45c8ce7
- Verdict: CLEAR
- Proof: .qa/runs/composition-gate-avatar-mtoon-style-profile-v1.md

## Implementation Notes
- Domain: mtoon-profile.ts
- Infra: mtoon-style-applier.ts wired into CharacterStudioRuntime
- UI: non-blocking style notice on AvatarCanvas
- Check: avatar-mtoon-profile-check.mjs
