# Feature: Inventory v2 — Equipment, containers & quick-access

Issue: #111 (Parent: #105, Depends on: #106/#109/#110) · Slug: `inventory-equipment-ux`

## Intent
Complete Character → Inventar with equipment (7 slots), container contents UX,
and 4 quick-access references. React only orchestrates; all mutations call #106
domain ops.

## Preconditions
- #110 desktop grid + catalog mounted via `CharacterInventoryV2Panel`.
- Domain: `equipItem`, `unequipItem`, `moveIntoContainer`, `moveOutOfContainer`,
  `assignQuickSlot`, `clearQuickSlot` (+ existing move/add/remove).
- Persist via #109 `inventory_v2` (already saved by CharacterEditor).

## Happy Path
- [x] Ausrüstung panel beside/below 20-slot grid: Kopf, Körper, Accessoire 1/2, Haupthand, Nebenhand, Spezial + Schnellzugriff 1–4.
- [x] Equip via menu `Ausrüsten` and optional DnD; destination picker when multiple empty compatible slots; conflict confirm when displacing.
- [x] Two-handed spans Haupt+Nebenhand as one item; strength gate blocks with `Benötigt Stärke X · Aktuell Y`.
- [x] Container `Öffnen` → inline/Sheet with capacity, move in/out (non-DnD + optional DnD); nesting rejected.
- [x] Quick-access assign/replace/clear; auto-clears when domain invalidates reference.
- [x] Wording: Ablegen ins Inventar ≠ Aus Inventar entfernen.

## Edge Cases
- [x] Insufficient base slots for unequip/displace → blocked before mutation with exact German message.
- [x] Full container / incompatible merge → atomic refuse.
- [x] Quick slot never references container content or overflow.

## Regression
- [x] `npm run test-gate` + new inventory-equipment-ui check.
- [x] Existing desktop inventory / character-editor checks still green.

## Security Coverage
No new persistence surfaces — uses existing authenticated character `inventory_v2`
write path (#109). No client-owned catalog writes beyond #110 Personal path.

## Composition Gate
- Verdict: pending
- Proof: `.qa/runs/composition-gate-inventory-equipment-ux.md`

## Implementation Notes
- UI under `src/app/character/inventory/`: `InventoryEquipmentPanel`, `InventoryQuickSlotsBar`,
  `InventoryContainerPanel` (Sheet), extended `InventoryItemActions` / `InventoryBaseGrid`,
  wired in `CharacterInventoryV2Panel` (`flex-col lg:flex-row` + `aside lg:w-72`).
- Labels: `EQUIPMENT_SLOT_LABELS` + category hints + strength/displace copy in `inventory-ui-labels.ts`.
- Preview helpers in `inventory-equip-preview.ts` only for destination/displace dialogs; mutations
  always call domain `equipItem` / `unequipItem` / `moveInto*` / `assignQuickSlot` / `clearQuickSlot`.
- Contract: `scripts/inventory-equipment-ui-check.mjs` wired after desktop-ui in `test-gate.mjs`.
