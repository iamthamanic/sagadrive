# Acceptance — avatar-skinned-wearables

<!-- seeded for GitHub issue #162 / avatar-order-23 -->

## Intent
Prepared skinned wearables on SagaDriveHumanoidRigV1 when capability + #216 fit allow; fail-soft otherwise.

## Happy Path
- [ ] planSkinnedWearableAttaches requires skinned-wearable-ready + ready status
- [ ] DE UI statuses passt / muss geprüft werden / nicht kompatibel
- [ ] Runtime requires SkinnedMesh; hide restore; cache bound
- [ ] CharacterStudioRuntime wired
- [ ] check grün

## Scope
In: skinned-wearable-plan, AvatarSkinnedWearableRuntime, studio wiring.
Out: Live provider skinning, workbench skinned authoring.

## Composition Gate
- HEAD_SHA: (proof)
- BASE_SHA: (proof)
- Verdict: SKIPPED/CLEAR
- Proof: `.qa/runs/composition-gate-avatar-skinned-wearables.md`
