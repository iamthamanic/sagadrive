# Composition Gate — item-inventory-world-catalog-wire

- HEAD_SHA: ea61b7fc32981efcf1716847eba4b57c8b47b547
- BASE_SHA: ea61b7fc32981efcf1716847eba4b57c8b47b547
- Date: 2026-09-06
- Verdict: CLEAR

## Event

Character Inventory v2 opens Add-catalog; infrastructure loads effective world + `item-catalog` module modules JSONB + catalog records; domain `composeCharacterInventoryAddCatalog` / `resolveWorldItemCatalog` yields the addable set; UI shows Core/Standard/Welt/Eigen text labels and thumbnails; add still creates Inventory-v2 ItemInstance by definitionId.

## Hop chain

CharacterInventoryV2Panel → `loadCharacterItemCatalog` (`item-catalog-service`) → `resolveEffectiveWorldProfileId` + `listCatalogRecords` + `loadWorldProfileModules` (RLS via `current_user_can_read_world_profile`) → `getItemCatalogModuleConfig` + `composeCharacterInventoryAddCatalog` (packs #137, Core, world defs, personal flag) → InventoryCatalogDialog (source badges / filters / InventoryItemThumb) → `addItems` → ItemInstance persistence unchanged.

Cardinality: one catalog load per character refresh; Library `loadLibraryItemCatalog` remains a separate hop (global Core+builtin+persisted).

## Simulations

| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | Fantasy pack + smartphone include − torch exclude + world def + personal-off yield unique defs + Core 36 | `composeCharacterInventoryAddCatalog` stress path in wire-check | pass |
| Invalid/missing | Null/unreadable world modules → defaults; null effective world → Core+Personal only (packs ignored) | compose null-world + empty-module paths | pass |
| Two consumers / crash | Character add-catalog vs Library Items browser; inventory still no 3D | Separate `loadCharacterItemCatalog` vs `loadLibraryItemCatalog`; dialog forbids model3d/GLB | pass |

## Flags

| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| (none) | | | | |

## Skip reason

n/a — CLEAR
