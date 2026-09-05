# Feature: Inventory v2 — Complete setting-neutral Core item catalog

Issue: #108 (Parent: #105, Depends on: #106) · Slug: `core-item-catalog`

## Intent
Ship option 11B: exactly 35 setting-neutral Core definitions so Inventory v2
is usable without a World profile. Definitions are static, versioned,
stable-ID and read-only. No undeclared mechanical bonuses.

## Happy Path
- [x] Exactly 35 Core definitions exported with the specified stable IDs.
- [x] Definitions validate against #106 bounds (load/cost/stack/slots/protection).
- [x] Catalog covers weapons, armor/shield, tools, consumables, containers, misc.
- [x] Descriptions are German, setting-neutral, and introduce no hidden bonuses.
- [x] `getCoreItemDefinition` / `createDefinitionLookup` resolve every Core id.
- [x] `CORE_CATALOG_VERSION` bumped to 2; `CORE_CATALOG_SIZE` is 35.

## Edge Cases
- [x] Duplicate ids fail the gate.
- [x] Two-handed weapons occupy both hand slots.
- [x] Containers have capacity ≥ 1.
- [x] Headgear grants no protection; tools/consumables carry no damage/protection/traits.
- [x] Runtime repository still cannot persist Core (scope check excludes `core`).

## Regression
- [x] `npm run test-gate` stays green including #106/#107 inventory checks.
- [x] Core docs §10.0 describe the catalog as universal mechanical archetypes.

## Out of scope
World/Personal authoring, shops, ammo, crafting, auto-consumable effects, 3D assets.
