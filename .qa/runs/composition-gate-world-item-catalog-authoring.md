# Composition Gate — world-item-catalog-authoring

- HEAD_SHA: d1aa8dd65d5deeeee9d34e4a4ead2b23473ce051
- BASE_SHA: 4cbbe4c5b67befdc13c845a7a052ce7dc778e836
- Date: 2026-09-05
- Verdict: SKIPPED

## Event

A World-profile editor opens Ausrüstung & Gegenstände and creates/edits/archives World item definitions bound to that world, optionally cloning a Core archetype as a new World id.

## Hop chain

WorldProfileEditorDialog → WorldItemCatalogSection → item-catalog-service (createWorldDefinition / update / archive / restore / loadWorldProfileItemCatalog) → supabase repository + RLS (#107). Character catalog only adds scope badges (no new hop).

## Simulations

| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | World A definitions invisible to World B | createWorldDefinition binds worldProfileId; list filters scope+profile; RLS enforces | n/a skipped |
| Invalid/missing | Rejected drafts do not leave optimistic rows | form validates; service throws; UI shows error | n/a skipped |
| Two consumers / crash | Add catalog vs world editor agree on archive | archive uses #107 status; Add uses selectCatalogDefinitions active-only | n/a skipped |

## Flags

None for this single-hop UI over existing catalog persistence.

## Skip reason

single-hop application diff without downstream side-effect path — UI consumes existing #107 catalog APIs; no new persistence/RLS/worker hop.
