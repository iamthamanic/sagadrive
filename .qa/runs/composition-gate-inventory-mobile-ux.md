# Composition Gate — inventory-mobile-ux

- HEAD_SHA: a9c8406c932a8ed687610c778b745752286230e6
- BASE_SHA: 2ed350c92de7e2afba4ce1fedfff442f1d317d70
- Date: 2026-09-05
- Verdict: CLEAR

## Event

A player on a 390×844 viewport opens Character → Inventar, switches between
Inventar and Ausrüstung segments, moves stacks via numbered target Sheet
(move/merge/swap preview), opens catalog/actions/container bottom Sheets, and
equips/assigns quick slots — all without drag & drop. Mutations still call #106
domain ops; persistence remains #109 `inventory_v2`.

## Hop chain

`CharacterVm.inventoryV2` → `CharacterInventoryV2Panel` (`isNarrow` / segments)
→ `InventoryMoveTargetSheet` / `InventoryItemActions` Sheet / `InventoryContainerPanel`
→ domain (`moveBaseSlot`, `mergeStacks`, `equipItem`, …) → `onChange` →
CharacterEditor save `inventory_v2` → reload.

## Simulations

| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | Two characters use mobile inventory independently | Per-character InventoryState; no shared mutable UI state across characters | pass |
| Invalid/missing | Full merge / incompatible target / strength gate | Sheet previews merge/swap; domain refuse paths unchanged from #111 | pass |
| Two consumers / crash | Segment switch must not fork state | Single `state` prop; Inventar and Ausrüstung panes render same aggregate | pass |

## Flags

none open

## Skip reason

n/a — single-hop UI orchestration over existing domain aggregate; CLEAR.
