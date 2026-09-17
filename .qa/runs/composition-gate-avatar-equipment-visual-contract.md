# Composition Gate — avatar-equipment-visual-contract

- HEAD_SHA: cc27fcad309acfb750bbf38a5ed3aa8951926199
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
