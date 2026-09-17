# Acceptance — avatar-equipment-visual-contract

<!-- seeded for GitHub issue #158 / avatar-order-19 -->

## Intent
Inventory-v2 bleibt Gameplay-SoT; daraus reine Visual-Projektion (`AvatarEquipmentBinding` / `AvatarEquipmentVisual`) ohne State-Duplikat.

## Happy Path
- [ ] Binding: rigid|skinned, anchor, versions, clamped transform, hide/replace
- [ ] Resolver: max. eine Visual-Instanz pro ItemInstance (two-handed collapse)
- [ ] missing / needs-review / incompatible / ready inkl. #216 Fit
- [ ] Keine freie URL; nur `model3d:` Keys
- [ ] Domain ohne React/Three/Supabase; check grün

## Scope
In: equipment-visual-contract.ts + in-memory binding repo port + unit check.
Out: Runtime rendering, UI attach, Supabase persistence implementation.

## Composition Gate
- HEAD_SHA: (proof)
- BASE_SHA: (proof)
- Verdict: SKIPPED/CLEAR
- Proof: `.qa/runs/composition-gate-avatar-equipment-visual-contract.md`

## Implementation Notes
- projectInventoryEquipmentVisuals
- createInMemoryAvatarEquipmentBindingRepository
