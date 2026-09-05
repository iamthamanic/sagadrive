# Feature: Inventory v2 — Desktop inventory grid, catalog & personal authoring

Issue: #110 (Parent: #105, Depends on: #106–#109) · Slug: `desktop-inventory-grid`

## Intent
Replace the flat `CharacterInventoryPanel` with the primary desktop Inventory-v2
experience: 20-slot grid, catalog add (Core/Welt/Eigene), Personal authoring,
deterministic sort, and legacy-overflow recovery. Equipment/container/quick-slot
surfaces stay deferred to #111 (actions may call domain ops; destination UI is #111).

## Preconditions
- Character loaded with `inventoryV2` / `inventorySchemaVersion` from #109.
- Catalog via `loadCharacterItemCatalog` (#107) with full Core (#108).
- Domain ops from #106 only — no duplicated stack/move rules in React.

## Happy Path
- [x] Sticky summary: `Inventar X / 20`, Last total / capacity (`5 + 2 × Stärke`), overload status, overflow warning.
- [x] Primary actions: Gegenstand hinzufügen, Sortieren; optional filter that does not mutate persisted order.
- [x] Exactly 20 base slots rendered (empties included); DnD + menu `Verschieben` both call `moveBaseSlot` / merge semantics.
- [x] Catalog Dialog tabs Core / Welt (only if world bound) / Eigene; search + type filter; add confirmation with atomic capacity preview.
- [x] Personal create/edit/archive with type-specific field contract from the issue.
- [x] Legacy overflow section with recover action; new stacks blocked while overflow exists.
- [x] Sort uses `sortBaseGrid`; consume/remove/split/move via domain ops; save writes `inventory_v2`.

## Edge Cases
- [x] No world profile → Welt tab omitted (not disabled).
- [x] Filtering catalog does not reorder base grid.
- [x] Add rejected atomically when slots/capacity insufficient or overflow present.
- [x] Archive Personal: owned instances still resolve; definition hidden from Add.
- [x] Remove confirmation clarifies character removal ≠ world drop.

## Regression
- [x] `npm run test-gate` green with new desktop-inventory check script.
- [ ] Playwright desktop path documented or covered when harness allows.

## Security Coverage
- Catalog/Personal writes go through authenticated catalog service/RLS (#107).
- `inventory_v2` writes validated by #109 `assertWritableInventoryV2`.
- No client-supplied owner on Personal definitions.

## Composition Gate
- Verdict: **CLEAR**
- Proof: `.qa/runs/composition-gate-desktop-inventory-grid.md`

## Implementation Notes
Desktop Inventory v2 UI lives under `src/app/character/inventory/`:

- `CharacterInventoryV2Panel` orchestrates catalog load (`loadCharacterItemCatalog`),
  domain ops (`addItems`, `moveBaseSlot`, `mergeStacks`, `sortBaseGrid`, `splitStack`,
  `consumeItem`, `removeItem`, `equipItem`, `recoverOverflowInstance`), and
  `onLoadInfoChange` for the editor sidebar Last.
- Grid: exactly `BASE_SLOT_COUNT` (20) slots; HTML5 DnD tries `mergeStacks` then
  `moveBaseSlot` (swap); menu `Verschieben` / split use the same domain paths.
- Catalog: Core / Welt (omitted when no effective world) / Eigene; add preview dry-runs
  `addItems` on `cloneInventory`; Personal form uses `createPersonalDefinition` /
  `updateDefinition` / `archiveDefinition` only (no direct Supabase table access).
- `CharacterEditor` keeps legacy `inventory` for presets/compat, holds `inventoryV2`,
  migrates via `migrateCharacterInventoryToV2` when schema ≠ 2, saves `inventory_v2`.
- Static gate: `scripts/inventory-desktop-ui-check.mjs` wired into `scripts/test-gate.mjs`.
- Out of scope retained: #111 equipment destination UI, #112 world authoring, #113 mobile.
