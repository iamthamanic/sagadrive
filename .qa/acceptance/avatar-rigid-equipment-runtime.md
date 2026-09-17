# Acceptance — avatar-rigid-equipment-runtime

<!-- seeded for GitHub issue #159 / avatar-order-20 -->

## Intent
Rigid Equipment aus #158 an kanonische #6-Anker hängen; fail-soft; Inventory unverändert.

## Happy Path
- [ ] planRigidEquipmentAttaches nur ready+rigid+available anchor
- [ ] Runtime attach/detach, hide restore, bounded cache, stale discard
- [ ] CharacterStudioRuntime bind/apply/dispose
- [ ] typed-strict + check grün

## Scope
In: rigid-equipment-plan, AvatarRigidEquipmentRuntime, studio wiring.
Out: Skinned wearables (#160), UI equip picker.

## Composition Gate
- HEAD_SHA: (proof)
- BASE_SHA: (proof)
- Verdict: SKIPPED/CLEAR
- Proof: `.qa/runs/composition-gate-avatar-rigid-equipment-runtime.md`
