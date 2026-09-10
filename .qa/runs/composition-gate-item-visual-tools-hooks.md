# Composition Gate — item-visual-tools-hooks

- HEAD_SHA: b0c7e9e69818cf430449489d807eb7f42d31ad5b
- Date: 2026-09-11
- Verdict: CLEAR

## Event

Item visual convert/upload tools are composed via shared hooks; Workbench remains the first consumer; asset mutate hops unchanged.

## Hop chain

1. Any item surface imports `useItemAssets` / `useItemModel3dAssets` / `useItemVisualTools` from `app/items` (or `app/items/visuals`)
2. `ItemVisualToolsBar` / `ItemVisualModeToggle` render affordances
3. Actions still call the same infrastructure services → Edge `item-thumbnail` / `item-model3d` (unchanged)

## Simulations

### N-actors
Hooks are per-definition instance state; no shared mutable credential between definitions beyond existing `itemAssetPending` remount bridge (one pending action).

### Invalid / missing
Same as before: Meshy off → tools disabled; no thumbnail → Image-to-3D blocked; readOnly hides edit tools.

### Two consumers / crash
Workbench panel + enlarge modal share the same `useItemVisualTools` instance and preview capture callback — one snapshot/generate per click. Library/Inventory still do not mount 3D (regression checks).

## Findings

None.
