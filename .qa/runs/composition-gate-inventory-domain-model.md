# Composition Gate — inventory-domain-model

- HEAD_SHA: WORKTREE (uncommitted; base 78e3c52236fc173f865f3a88ebf5035cf5ebe41f)
- Date: 2026-09-05
- Verdict: CLEAR

## Event

A character gains, stores, equips, quick-assigns and consumes an item — the Inventory v2 state transition that #107–#114 will drive from persistence and UI.

## Hop chain

Caller (future catalog/UI/persistence, #107–#113) → `operations.ts` (`addItems` / `splitStack` / `mergeStacks` / `moveIntoContainer` / `equipItem` / `assignQuickSlot` / `consumeItem` / `removeItem`) → new `InventoryState` value → consumers reading the same state: `state.ts` (`calculateTotalLoad`, `findInstanceLocation`, `listPlacements`) for the carry-capacity label, and `validation.ts` (`validateInventory` / `normalizeInventory`) as the persistence boundary guard → UI labels `Last x / n` and quick-slot rendering.

The producer is new and both consumers are new in this diff, but the load consumer (`5 + 2 × Stärke` in `src/domains/rules/sagadrive/derived-stats` and `CharacterInventoryPanel`) is pre-existing and unchanged — this ticket only supplies the summed number, so the existing consumer was read, not assumed.

## Simulations

| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| 1 event, N actors | One add of N units yields N units owned exactly once; one two-handed equip yields **one** physical item despite two hand references | `addItems` tops up compatible partials then creates `ceil(rest/stackLimit)` stacks and refuses the whole add when N does not fit; `calculateTotalLoad` de-duplicates by instance id so the `mainHand`+`offHand` pair counts once; `listPlacements` returns exactly one location per instance (test groups 1, 2, 6) | pass |
| invalid / missing | An invalid slot, unmet requirement, unknown definition or corrupt persisted shape fails closed and never becomes a *different* valid outcome | `equipItem(greatsword, 'head')` → `NOT_EQUIPPABLE` instead of being redirected into the hands (`silent-fallback` closed); `minimumStrength` blocks equipping only, ownership and load survive; unresolvable definitions contribute 0 to the load sum **and** are reported by `validateInventory` as `UNKNOWN_DEFINITION` — an explicit, tested policy rather than a quiet total; `normalizeInventory` rebuilds untrusted shapes losslessly instead of trusting them (test groups 7, 8, 12) | pass |
| 2 consumers / crash | The load consumer and the persistence guard must never disagree about where an item is; a reload must not reissue an instance id | Both consumers derive locations from the single `findInstanceLocation` / reference enumeration in `state.ts` — no second copy of the location rule. Operations are pure and return whole states, so a crash persists either the old or the new state, never a half-applied one. `allocateInstanceId` allocates against the ids present in the state, so re-running an operation after reload cannot re-mint an existing id | pass |

## Flags

| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| `silent-fallback:` | blocker | equip request → equipment map → UI slot label | The two-handed branch derived its target slots from the definition and ignored the requested slot, so `equipItem(x, 'head')` silently equipped the hands. Reading `equipItem` alone looks correct — only following request → stored slot → displayed slot shows the retarget. | done — invalid slot requests now return `NOT_EQUIPPABLE`; asserted in test group 7 |
| `cardinality:` | blocker | equip → displacement → base grid | Displacement capacity was computed **before** vacating the source slot, so equipping from the base grid was wrongly blocked whenever the grid was otherwise full — and a two-handed occupant holding two hand refs was counted as two displaced instances. | done — the source slot is vacated first and displaced occupants are de-duplicated per instance; asserted in test group 7 |
| `identity:` | blocker | operation → persisted state → reload → next operation | Instance ids came from a module-level counter (`inst-1`, `inst-2`) plus a `__resetInstanceIdCounterForTests` export. Correct within one process; after a reload the counter restarts and collides with persisted ids — invisible until #109 persistence. | done — `allocateInstanceId` allocates against the ids in the state; the test-only reset export is gone |
| `divergent-copy:` | flag | operations vs validation | `operations.ts` defined its own `PhysicalLocation` type and location scan while `types.ts` exported a separate `InventoryLocationRef`, so the two hops could drift on what "one location" means. | done — one exported `InventoryLocation` type and one `findInstanceLocation` in `state.ts`, used by both |
| `reinterpret:` | flag | add → stack family → merge | `addItems` matched top-up candidates on `definitionId` only, while `mergeStacks` required matching per-instance state. The same "compatible stack" fact had two readings, so adding could silently absorb units into an engraved/bound stack that merge would refuse. | done — both hops use `stackStateKey`; top-up only targets state-free stacks; asserted in test group 3 |
| `note` | note | load sum → UI label | An unresolvable definition contributes 0 load. Kept (a pure sum cannot invent a load) but no longer implicit: documented on `calculateTotalLoad` and locked by a test asserting the same state is simultaneously reported invalid. | done |

No worker, outbox, queue, cron, webhook or mail path exists in this diff, so P-06 does not apply. No dependencies, migrations or rule-value changes.

## Skip reason

n/a — the diff has a real producer→consumer path (operations write state, load/validation read it), so the gate was run rather than skipped.
