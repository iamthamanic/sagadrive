# Composition Gate — item-avatar-fit-workbench

- HEAD_SHA: fd8edaa3bd392ab1899273cf65bec4f28e170890
- BASE_SHA: 24929cb001ea6dbacb004d250d8193c284a0772f
- Verdict: CLEAR

## Event
Item type → default anchor → ItemAvatarFitSection draft → #158 transform clamp

## Hop chain
1. resolveWorkbenchDefaultAnchor
2. ItemAvatarFitSection controls
3. clampEquipmentTransform (#158)
4. ItemWorkbenchEditor state

## Simulations
| Case | Expected | Result |
|------|----------|--------|
| N-actors | Per-editor fit draft | pass |
| Invalid/missing | no-3d disables controls | pass |
| Two consumers / crash | Reset restores defaults | pass |

## Flags
- none

