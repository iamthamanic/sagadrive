# Composition Gate — item-epic-acceptance

- HEAD_SHA: 07de4372d9a86746f999e9703cfbef93734c0c13
- BASE_SHA: cfec90eb61ef54b1f5200c0ef23b2859e82bc609
- Date: 2026-09-06
- Verdict: CLEAR

## Event

Full Item Epic hop chain (#133–#143) proven as one flow via docs sync, meta contract
(`item-epic-acceptance-check.mjs`), existing child gates, and Playwright e2e
Library Items → Workbench → Character Inventory add-catalog — without new product
features or live Meshy CI calls.

## Hop chain

History routes (`/library`, `/items/create`, `/items/:id`) → Library Items browser
(`loadLibraryItemCatalog`) → Item Workbench (definition CRUD/fork + thumbnail/3D
asset services, Meshy fail-closed) → World `item-catalog` module
(`resolveWorldItemCatalog`) → Character Inventory add-catalog
(`composeCharacterInventoryAddCatalog` / `loadCharacterItemCatalog`) → Inventory-v2
`ItemInstance` persistence.

Meta gate asserts child scripts remain wired in `test-gate.mjs`; docs
(`docs/items.md`, `inventory-v2.md`, core rules §5.7/§10) describe the same
definition vs instance split; no `VITE_*MESHY` client secrets.

Cardinality: one catalog compose per character refresh; Library load remains a
separate hop; Library/Inventory never mount 3D renderers.

## Simulations

| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | Multiple characters / worlds keep isolated catalogs + inventories | Per-character InventoryState; world modules RLS; meta gate does not add shared mutable state | pass |
| Invalid/missing | Unwired child gate, missing docs terms, or `VITE_*MESHY` fail closed | `item-epic-acceptance-check.mjs` requireMatch/rejectMatch | pass |
| Two consumers / crash | Library browser vs Character add-catalog; inventory still no 3D | Separate load paths; e2e + prior wire-check; docs marketplace = future boundary | pass |

## Flags

| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| (none) | | | | |

## Skip reason

n/a — CLEAR: documentation + meta wiring + e2e smoke prove the epic hop chain;
no new runtime producer beyond verifying existing #133–#143 composition.
