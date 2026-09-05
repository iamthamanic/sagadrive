# Feature: Inventory v2 — Domain model, slot/stack/container contracts & pure operations

Issue: #106 (Parent: #105) · Slug: `inventory-domain-model`

## Intent
Authoritative domain contract for Inventory v2 before any persistence or UI work.
All business rules for slots, stacks, containers, equipment and quick access live
as pure domain logic under `src/domains/character/inventory-v2/**`. Downstream
issues (#107–#114) consume this public API and must not reimplement these rules.

## Preconditions
- `src/domains/**` stays free of React, Supabase and UI imports (enforced by `scripts/architecture-boundary-check.mjs`).
- Legacy `ItemDto` remains untouched compatibility input; migration is #109.
- Carry capacity (`5 + 2 × Stärke`) and its consumers are unchanged — this ticket only supplies the load sum.

## Happy Path
- [x] Definitions (`ItemDefinition`) are modelled separately from instances (`ItemInstance`), with no UI or persistence concern in the domain.
- [x] Exactly 20 base slots and 4 quick slots are enforced by `createEmptyInventory`, `validateInventory` and `normalizeInventory`.
- [x] Add / split / merge / move / sort / container / equip / unequip / quick-slot / consume / remove satisfy the binding rules and fail atomically — the input state is never mutated.
- [x] `calculateTotalLoad` counts every physical location exactly once (base, container, equipment, overflow), multiplies by quantity, and counts a two-handed instance once despite two hand references.
- [x] Nested containers, duplicate physical locations, dangling references and incompatible equipment are rejected by `validateInventory` and repaired by an explicit, lossless `normalizeInventory` policy.
- [x] `src/domains/character/inventory-v2/index.ts` is the stable public API for #107–#114.

## Edge Cases
- [x] 21st non-stackable item is refused with `BASE_SLOTS_FULL`; a 3-unit add into 1 free slot adds nothing (no partial add).
- [x] Adding tops up compatible partial stacks before creating new stacks; `stackLimit = 1` never tops up.
- [x] A stack carrying per-instance state is never topped up and never merges with a plain stack (`INCOMPATIBLE_STACK`).
- [x] Sort orders `weapon → armor → shield → tool → consumable → container → misc`, then `de-DE` name, then definition id; it never merges stacks and never touches container/equipment/overflow.
- [x] Container-in-container is refused on move (`CONTAINER_NESTING_FORBIDDEN`), on validation (`CONTAINER_NESTING`) and during normalization.
- [x] Moving out of a container without a free target slot is blocked (`SLOT_OCCUPIED`).
- [x] A two-handed equip displacing two one-hand items succeeds when the vacated source slot plus free slots cover both; otherwise it is blocked and the original state is preserved.
- [x] An invalid slot request is refused instead of silently retargeted (`NOT_EQUIPPABLE` for `greatsword → head`).
- [x] `minimumStrength` blocks equipping only; ownership and load stay valid (`REQUIREMENT_NOT_MET`).
- [x] Quick slots accept base-grid and equipment instances only; container and overflow instances are refused and references auto-clear on remove, consume-to-zero and move-into-container.
- [x] Consuming the last unit removes the instance and cleans every reference; non-consumables are refused.
- [x] While `legacyOverflow` is non-empty, new base stacks (add, split-to-base) are blocked, but topping up an existing partial stack and recovering overflow stay allowed.
- [x] Legacy grids longer than 20 keep the first 20 positions and put the remainder into visible `legacyOverflow` — no instance is deleted.
- [x] A half-equipped two-handed item is normalized to both hand references; a conflicting one-hand occupant is displaced, not dropped.
- [x] A container instance always means exactly one container: a catalog `stackLimit > 1` on a container is pinned to 1 by `effectiveStackLimit`, so a stack can never share one capacity map. An already-stacked container is split losslessly.
- [x] `normalizeInventory` is idempotent and only reports repairs it actually made — re-normalizing a repaired state yields no repairs and an unchanged state, so a persistence layer that normalizes on load never flags a healthy save as corrupt.

## Regression
- [x] `npm run test-gate` stays green, including the existing character-editor, background, avatar and rules validations.
- [x] `scripts/architecture-boundary-check.mjs` passes — domain layer imports stay clean.

## Security Coverage
`AGENTS.md` has no Secure-by-Default checklist block; the applicable Non-Negotiables are covered as follows:

| Item | Coverage |
|------|----------|
| Owner-scoped data stays owner-scoped | Out of scope for this ticket — no persistence, no network, no client writes. Definition **scope ownership is deliberately not represented in character state** (`ItemDefinitionScope` is catalog metadata), so character state cannot claim a `world`/`personal` definition it does not own; #107 enforces resolution. |
| All severities reported | `@review-ticket` findings table below lists Low/Info items too. |
| Input validation at trust boundaries | Every operation validates indices, quantities, instance existence and definition existence, and returns a typed error instead of throwing or producing corrupt state. `normalizeInventory` accepts untrusted persisted shapes without trusting them. |

## Assumptions
- Instance ids are allocated from the existing state (`inv2-<n>`, collision-checked) rather than a module counter, so reloading persisted state can never reissue an id. #109 may supply its own ids; the contract only requires uniqueness.
- `ItemDefinitionScope` ownership metadata is resolved by the catalog layer (#107/#112) and intentionally absent from `InventoryState`.
- Normalization repairs half-equipped two-handed items by completing the grip (keeping the weapon equipped) rather than unequipping it.
- Consumers must read stack limits and container capacity through `effectiveStackLimit` / `containerCapacityOf` instead of `definition.stackLimit` / `definition.containerCapacity`, so the container rule is not reimplemented per call site in #108/#110/#111/#112.

## Composition Gate
- Verdict: **CLEAR**
- Proof: `.qa/runs/composition-gate-inventory-domain-model.md`

## Screenshots
Not applicable — pure domain layer, no UI in this ticket (`@verify-ui` skipped, see Implementation Notes).

## Implementation Notes
| File | Purpose |
|------|---------|
| `src/domains/character/inventory-v2/types.ts` | Contracts: scopes, types, slots, definitions, instances, state, typed errors, invariant codes. |
| `src/domains/character/inventory-v2/state.ts` | Shared pure primitives: clone, location lookup, stack identity, id allocation, load sum. Single implementation of "exactly one physical location". |
| `src/domains/character/inventory-v2/operations.ts` | Public operations; result-typed, atomic, non-mutating. |
| `src/domains/character/inventory-v2/validation.ts` | `validateInventory` (report-only) and `normalizeInventory` (lossless repair). |
| `src/domains/character/inventory-v2/index.ts` | Public API barrel for #107–#114. |
| `scripts/inventory-v2-domain-check.mjs` | 12 required test groups, wired into `npm run test-gate`. |

- No UI, persistence, catalog content or migration in this diff — those are #107–#113.
- The previous session's stray file `src/domains/compatibility-barrels-placeholder.ts` (a truncated copy of `validation.ts` written to the wrong path) was removed.
