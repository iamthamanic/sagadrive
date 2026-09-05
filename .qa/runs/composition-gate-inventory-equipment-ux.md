# Composition Gate — inventory-equipment-ux

- HEAD_SHA: WORKTREE (stamp after commit)
- BASE_SHA: origin/main (merge-base at gate time)
- Date: 2026-09-05
- Verdict: CLEAR (pending SHA stamp)

## Event

A player opens Character → Inventar, equips items into the seven Ausrüstung slots
(including two-handed span and strength gate), opens a container Sheet to move
items in/out, and assigns/clears Schnellzugriff 1–4. All transitions must call
#106 domain ops; React only orchestrates dialogs/DnD and persists via #109
`inventory_v2` already wired by CharacterEditor.

## Hop chain

`CharacterVm.inventoryV2` → `CharacterInventoryV2Panel` →
`InventoryEquipmentPanel` / `InventoryQuickSlotsBar` / `InventoryContainerPanel`
/ `InventoryItemActions` → domain ops (`equipItem`, `unequipItem`,
`moveIntoContainer`, `moveOutOfContainer`, `assignQuickSlot`, `clearQuickSlot`)
→ `onChange` → CharacterEditor save `inventory_v2` → #109 persistence → reload.

## Simulations

| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | Two characters equip the same Core definition independently | Equipment refs live in per-character InventoryState; catalog ids shared | pass |
| Invalid/missing | Strength unmet / full base on displace / nesting / full container | UI maps REQUIREMENT_NOT_MET to strength copy; BASE_SLOTS_FULL displace uses exact DE message; domain refuse for nesting/full | pass |
| Two consumers / crash | Grid occupied count and equipment must match saved state | Single `inventoryV2` state; equipment/quick/containers are fields of same aggregate | pass |

## Flags

none open

## Skip reason

n/a
