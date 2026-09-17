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
- HEAD_SHA: c2551a4a5df7c2c5feaa24d94c05d2780b75b701
- BASE_SHA: d36a50dbc981d6130d90baaa2890df43e6b69e80
- Verdict: CLEAR
- Proof: `.qa/runs/composition-gate-avatar-equipment-visual-contract.md`

## Implementation Notes
- projectInventoryEquipmentVisuals
- createInMemoryAvatarEquipmentBindingRepository
