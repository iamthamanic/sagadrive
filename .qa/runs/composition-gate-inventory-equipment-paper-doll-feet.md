# Composition Gate — inventory-equipment-paper-doll-feet

- HEAD_SHA: `c2c2b99b06813509399508f02cf4ee52a9f02ace`
- Date: 2026-09-06
- Verdict: CLEAR

## Event

Player equips / unequips an inventory instance onto a named equipment slot (incl. `feet`); UI reflects the composed equipment map. Quick-slot **UI** is removed; domain `quickSlots` remain for persistence.

## Hop chain

Catalog definition (`equipSlots`) → domain `equip` / `unequip` (fail-closed) → `InventoryState.equipment` (+ optional `quickSlots` persistence) → CharacterEditor `onChange` / save → `InventoryEquipmentPanel` paper-doll / mobile list labels

## Simulations

| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| 1 event, N actors | One character owner; equip updates that character's equipment map only | Owner-scoped inventory state; no cross-character fan-out | pass |
| invalid / missing | Wrong slot / unmet prereq → equip rejected; item stays in base | Fail-closed domain ops; UI does not invent equipment | pass |
| 2 consumers / crash | Paper-doll + mobile segment + save payload all read same `equipment` | Shared state via panel props; quickSlots still serialized without UI | pass |

## Flags

| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| (none) | | | | |

## Skip reason

n/a
