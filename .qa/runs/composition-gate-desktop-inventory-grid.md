# Composition Gate — desktop-inventory-grid

- HEAD_SHA: WORKTREE (feat/110-desktop-inventory-grid; staged)
- BASE_SHA: b9eddf0 (main)
- Date: 2026-09-05
- Verdict: CLEAR

## Event

A player opens Character → Inventar, adds Core/Personal items via the catalog,
reorders the 20-slot grid, and saves: the same InventoryState must round-trip
through domain ops → `inventory_v2` persist → reload without silent loss or
rule reimplementation in React.

## Hop chain

`CharacterVm.inventoryV2` (+ migrate when schema 1) → `CharacterInventoryV2Panel`
local state → domain ops (`addItems` / `moveBaseSlot` / `mergeStacks` / …) →
`onChange` → CharacterEditor save `inventory_v2` → #109
`assertWritableInventoryV2` + catalog visibility → DB → reader → UI.

Catalog: `loadCharacterItemCatalog` → Add dialog → Personal create via
`createPersonalDefinition` → refresh catalog → `addItems`.

## Simulations

| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | Two characters add the same Core id independently | Core ids are shared definitions; instances are per-character InventoryState; Personal creates use session owner | pass |
| Invalid/missing | Unknown definition / overflow / full grid must refuse add | UI dry-runs / applies `addItems` refuse codes; no partial write | pass |
| Two consumers / crash | Editor sidebar load and grid must not diverge from saved state | Single `inventoryV2` state; load info derived via `calculateTotalLoad`; save writes same state | pass |

## Flags

none open

## Skip reason

n/a
