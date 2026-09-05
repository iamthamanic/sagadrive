# Composition Gate — core-item-catalog

- HEAD_SHA: b9e88538c5d87c74579614ac894ed8f65691cf02
- BASE_SHA: 26464c9bd366dd9f5f54dee851f38093daf1fdee
- Date: 2026-09-05
- Verdict: SKIPPED

## Event

A signed-in user opens Add/Catalog without a World profile and must see the complete setting-neutral Core item set (35 archetypes) as the only World-independent catalog source.

## Hop chain

Static `core-catalog.ts` (domain, read-only) → `coreCatalogRecords` / `listCoreItemDefinitions` / `getCoreItemDefinition` → existing `item-catalog-service` / repository (unchanged in this ticket) → Add/Catalog consumers (#110/#112). No new persistence, RLS, worker, or UI hop.

## Simulations

| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | Every character, regardless of world binding, sees the same 35 Core definitions | Core records are always active and visible via `isDefinitionVisible` scope `core` | n/a (skipped — single-hop static catalog) |
| Invalid/missing | Malformed Core entries fail the gate before ship | `inventory-core-catalog-check.mjs` asserts schema, duplicates, required weapon/armor/container fields | n/a (skipped) |
| Two consumers / crash | Add and owned-instance lookup both resolve Core ids | Same `coreCatalogRecords()` feed both projections | n/a (skipped) |

## Flags

None — single-hop domain catalog expansion with deterministic script gate; no producer→consumer enforcement hop changed.

## Skip reason

single-hop application diff without downstream side-effect path — Core definitions grow in place in `core-catalog.ts`; persistence/RLS/UI hops are unchanged (#107/#110).
