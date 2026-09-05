# Composition Gate — core-catalog

- HEAD_SHA: PLACEHOLDER
- BASE_SHA: 26464c9
- Date: 2026-09-05
- Verdict: CLEAR

## Event

A character with no World profile opens the Add catalog and equips, carries and
consumes Core items — the inventory must be fully usable from the 35 Core
archetypes alone.

## Hop chain

Static source (`core-catalog.ts`) → `coreCatalogRecords` /
`listCoreItemDefinitions` / `getCoreItemDefinition` → `selectCatalogDefinitions`
(Add surface) and `createDefinitionLookup` (owned instances) → UI (#110) and
inventory state (#109). No persistence hop: Core never enters
`inventory_item_definitions`.

## Simulations

| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | Every character, regardless of world binding, sees the same 35 Core ids | `isDefinitionVisible` always returns true for `scope: 'core'`; `selectCatalogDefinitions` includes all active Core records even when `effectiveWorldProfileId` is null | pass |
| Invalid/missing | A malformed Core entry or an invented mechanic cannot ship | Schema validator rejects out-of-bounds load/cost, missing weapon damage, missing container capacity, two-handed without both hands, unknown equip slots; banned-description patterns reject invented HP/currency effects | pass |
| Two consumers / crash | Add catalog and owned-instance lookup agree on Core existence | Both read the same deep-frozen `CORE_DEFINITIONS` via `coreCatalogRecords`; archived status is always `active` for Core | pass |

## Flags

| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| `identity:` | note | seed ids → owned instances | The #107 seed used colon-ids (`core:shortsword`); the playtest contract uses dotted ids. Leaving both would fork the public API. | done — dotted form is the only Core id shape; old colon-ids removed |
| `reinterpret:` | note | tool/consumable description → effect | Descriptions could have smuggled numeric bonuses. | done — wording forbids own bonuses; check bans HP/currency/auto-craft patterns |

## Skip reason

n/a — producer→consumer path exists (static catalog → Add/lookup consumers).
