# Acceptance — avatar-humanoid-morph-contract-v1

## Intent
Define a single versioned `SagaDriveAvatarMorphV1` contract so Body/Face editors, base bodies, export, and wearables share the same parameters — no UI or mesh assets in this ticket.

## Preconditions
- #6 humanoid rig contract is on main.
- Domain code under `src/domains/character/avatar/**` stays free of Three/React.

## Happy Path
- [ ] Pure types + validation + migration + UI metadata exist for all body/face params.
- [ ] Values normalize to `[-1, 1]` with default `0` unless documented otherwise.
- [ ] Colors (skin/eyes/hair) + marking/scar/cybernetic trait-ID slots are defined.
- [ ] Capabilities `morph-body-v1` / `morph-face-v1` are derived — never client-set.
- [ ] Legacy `CharacterAvatarDto` without morph migrates to defaults + mapped height/build.
- [ ] `avatar-morph-contract-check` + typed-strict green.

## Edge Cases
- [ ] Unknown future keys ignored (fail-safe), never invent a different valid key.
- [ ] Non-finite / out-of-range values clamped or rejected closed.
- [ ] Preset merge is deterministic (base → overlay, known keys only).

## Scope
In: domain morph contract, DTO migration helpers, check script.
Out: UI (#215), mesh assets (#213), MToon (#214), import morph guarantees.

## Security Coverage
- B-09: Morph capabilities derived from contract presence, not client claims.
- Out: B-04/B-07/B-08 (no new API routes).

## Composition Gate
- HEAD_SHA: aa225385d1302db1a6cac6b531af0c3e7b3f9d9f
- BASE_SHA: 061a428aa83a1060fd874f0c4919f2ae9c8a6e15
- Verdict: CLEAR
- Proof: .qa/runs/composition-gate-avatar-humanoid-morph-contract-v1.md

## Implementation Notes
- Domain: morph-contract.ts — SagaDriveAvatarMorphV1, metadata, validate, merge, migrate, capabilities.
- DTO: CharacterAvatarDto optional morph + eyes.
- Check: avatar-morph-contract-check.mjs wired into test-gate.
