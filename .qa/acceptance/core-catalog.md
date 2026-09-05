# Feature: Inventory v2 — Complete setting-neutral SagaDrive Core item catalog

Issue: #108 (Parent: #105, Depends on: #106/#107) · Slug: `core-catalog`

## Intent
Ship option **11B**: exactly 35 setting-neutral Core definitions — reusable
mechanical archetypes sufficient to use Inventory v2 without a World profile.
Core is static, versioned (`CORE_CATALOG_VERSION = 2`), stable-ID and read-only.

## Preconditions
- `#106` ItemDefinition / equipment / container contracts are unchanged.
- `#107` Core stays a repository source; `inventory_item_definitions` still
  excludes `scope = 'core'`.
- No new mechanics beyond the #106 shape (damage, damageType, protection,
  traits, equipSlots, twoHanded, containerCapacity, minimumStrength).

## Happy Path
- [x] Exactly the 35 playtest definitions are exported by `listCoreItemDefinitions`
  with dotted stable ids (`core.weapon.light-melee`, …).
- [x] Every definition has scope `core`, German setting-neutral description,
  and table values from the issue.
- [x] Catalog covers weapons, armor/shield, tools, consumables, containers and
  misc/wearables without requiring a World profile.
- [x] Definitions resolve by id through `getCoreItemDefinition` and through
  `createDefinitionLookup(coreCatalogRecords(), …)` even with a null world profile.
- [x] Core remains deep-frozen and unreachable through the runtime repository write path.

## Edge Cases
- [x] Two-handed weapons declare both hand slots; containers have capacity ≥ 1
  and effective stack limit 1.
- [x] Shield carries `+1 Verteidigung` / `1 Hand` traits without inventing new shield math.
- [x] Headgear grants no Protection; communicator and special-device descriptions
  stay generically mundane/magical/technological.
- [x] Consumable/tool descriptions introduce no HP/currency/auto-craft effects.
- [x] Old colon-ids (`core:shortsword`) are gone — the dotted form is the contract.

## Regression
- [x] `npm run test-gate` stays green (domain #106, catalog #107, Core #108).
- [x] Core rules doc §10.0 describes the catalog as universal archetypes.

## Security Coverage
No new persistence or auth surface. Core remains read-only; write paths still
refuse `core` scope via the table CHECK from #107.

## Composition Gate
- Verdict: **CLEAR** (single producer: static catalog → lookup/Add consumers;
  no new hop that can silently retarget or invent mechanics)
- Proof: `.qa/runs/composition-gate-core-catalog.md`

## Screenshots
Not applicable — no UI in this ticket.

## Implementation Notes
| File | Purpose |
|------|---------|
| `src/domains/character/inventory-v2/core-catalog.ts` | 35 deep-frozen Core definitions + `getCoreItemDefinition` / size constant |
| `src/domains/character/inventory-v2/index.ts` | Re-exports `CORE_CATALOG_SIZE`, `getCoreItemDefinition` |
| `scripts/inventory-core-catalog-check.mjs` | Snapshot, schema, coverage, uniqueness, resolve-by-id tests |
| `docs/sagadrive core rules.md` | §10.0 Core-Gegenstandskatalog |
