# Composition Gate — item-visual-tools-hooks

- HEAD_SHA: 435cd99b994c9a25c0fb9716da2888d7e4c16478
- BASE_SHA: b58beb6bbb9eca2a7d1ac0814e3878c8739c4b70
- Date: 2026-09-11
- Verdict: CLEAR

## Event

Item visual convert/upload tools are composed via shared hooks; Workbench remains the first consumer; asset mutate hops unchanged.

## Hop chain

1. Any item surface imports `useItemAssets` / `useItemModel3dAssets` / `useItemVisualTools` from `app/items` (or `app/items/visuals`)
2. `ItemVisualToolsBar` / `ItemVisualModeToggle` render affordances
3. Actions still call the same infrastructure services → Edge `item-thumbnail` / `item-model3d` (unchanged)

Cardinality: one snapshot/generate per click (existing submit locks); Library/Inventory do not mount 3D.

## Simulations

| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | Per-definition hook state; no cross-definition secret sharing | Hooks are instance state; `itemAssetPending` is one pending remount bridge action | pass |
| Invalid/missing | Meshy off / no thumbnail / readOnly → tools disabled | Same capability gates as pre-extract Workbench panel | pass |
| Two consumers / crash | Workbench panel + enlarge modal share one tools instance; Library never mounts 3D | Shared `useItemVisualTools` + capture callback; Library/Inventory regression checks forbid 3D | pass |

## Flags

| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| (none) | | | | |
