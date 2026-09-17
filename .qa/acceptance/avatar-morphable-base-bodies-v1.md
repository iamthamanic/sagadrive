# Acceptance — avatar-morphable-base-bodies-v1

## Intent
Provide a versioned, allowlisted SagaDrive morphable humanoid base body that covers the full #212 morph contract and #6 rig versions, with species presets as morph/trait/color overlays.

## Preconditions
- #212 morph contract and #6 rig contract on main.

## Happy Path
- [ ] Base body manifest declares morph targets for every #212 body/face key.
- [ ] Material slots skin|eyes|hair-compatible|body-detail and trait sockets present.
- [ ] Species presets (human/elf/dwarf/halfling/orc/cyborg/alien) derive deterministically.
- [ ] Missing morph targets fail closed (no morph-body-v1 / morph-face-v1).
- [ ] Internal DEV fixture cycles single/extreme morphs with camera-safe bounds.
- [ ] avatar-base-bodies-check + test-gate green.

## Edge Cases
- [ ] Incomplete mesh evidence → capabilities empty + DE limitations.
- [ ] Asset/morph/rig version mismatch invalidates cache compatibility.
- [ ] Preset apply is explicit (deriveSpeciesMorphState); not auto-clobber.

## Scope
In: domain base-body contract, infra allowlisted catalog, DEV fixture, check script.
Out: Authored binary VRM bytes in git (self-hosted via VITE_AVATAR_ASSET_BASE_URL), MToon (#214), body/face UI (#215).

## Security Coverage
- B-09: Morph capabilities from mesh evidence, not client claims.
- Allowlisted self-hosted paths only (no arbitrary remote URLs).
- Out: B-04/B-07/B-08.

## Composition Gate
- HEAD_SHA: 6d68a1ca42b382aaa1fd775deebec9ad9730f12a
- BASE_SHA: 8850105eea4e734e9948c2184af973494bba86f0
- Verdict: CLEAR
- Proof: .qa/runs/composition-gate-avatar-morphable-base-bodies-v1.md

## Implementation Notes
- Domain: base-body-contract.ts — manifest, species presets, capabilities, fixture matrix.
- Infra: base-body-catalog.ts — allowlisted path + readiness.
- App: BaseBodyMorphFixture (DEV-only in CharacterEditor).
- Check: avatar-base-bodies-check.mjs.
