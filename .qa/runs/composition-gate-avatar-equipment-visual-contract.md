# Composition Gate — avatar-equipment-visual-contract

- HEAD_SHA: c2551a4a5df7c2c5feaa24d94c05d2780b75b701
- BASE_SHA: d36a50dbc981d6130d90baaa2890df43e6b69e80
- Verdict: CLEAR

## Event
InventoryState equipment → projectInventoryEquipmentVisuals → AvatarEquipmentVisual[]

## Hop chain
1. Inventory-v2 equipment slots (SoT)
2. AvatarEquipmentBindingRepository lookup
3. validate + fit (#216) + transform clamp
4. Consumers receive ready|needs-review|incompatible|missing

## Simulations
| Case | Expected | Result |
|------|----------|--------|
| N-actors | Projection pure; no shared mutable inventory | pass |
| Invalid/missing | no binding → missing; free URL → incompatible | pass |
| Two consumers / crash | two-handed slots → one visual | pass |

## Flags
- none
