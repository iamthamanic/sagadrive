# Acceptance — avatar-rig-vrm-normalization

## Intent
Normalize imported / loaded avatar skeletons into SagaDriveHumanoidRigV1 capabilities so later equipment and animation tickets consume flags, not raw bone names or provider success claims.

## Preconditions
- Character studio can load a GLB/VRM into CharacterStudioRuntime.
- Domain layer has no Three.js imports.

## Happy Path
- [ ] After successful model load, runtime analyzes bones with bounded traversal + aliases.
- [ ] Capabilities resolve to a ladder rung (static → skinned-wearable-ready).
- [ ] App shows DE labels for analyzing/ready/limited/failed; unsupported features disabled with reason.
- [ ] Result includes `rigContractVersion`; reproducible for same bone set.
- [ ] architecture-boundary + typed-strict + rig-check green.

## Edge Cases
- [ ] Incomplete skeleton → `rigged` but not `humanoid`.
- [ ] Twist/helper bones ignored; mapping remains unique.
- [ ] Fake provider success cannot upgrade capabilities.

## Scope
In: domain rig contract + capability resolver, infra alias mapping + bounded analyze, UI capability readout.
Out: Auto-rig jobs (#161), equipment UI, face tracking, animation assets (#8).

## Security Coverage
- B-09: Capabilities only from validated artifact analysis, never client claims.
- P-02: DE status messages without stack traces.
- Out: B-04/B-07/B-08.

## Composition Gate
- HEAD_SHA: b17b6d60359160859fd1923a290de9ecd6ca769a
- BASE_SHA: 0239079b4abc785e7f366451fdd04059cdea3c02
- Verdict: CLEAR (CI may also SKIPPED for single-hop)
- Proof: `.qa/runs/composition-gate-avatar-rig-vrm-normalization.md`

## Implementation Notes
- Domain: `rig-contract.ts` — SagaDriveHumanoidRigV1, capability ladder, DE labels.
- Infra: `rig-bone-aliases.ts` + `rig-analyzer.ts`; wired into CharacterStudioRuntime after load.
- App: AvatarRigCapabilityPanel under canvas.
- Check: `avatar-rig-normalization-check.mjs`.
