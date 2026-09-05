# Composition Gate — inventory-persistence

- HEAD_SHA: 080d1e72c8e06f1ac0bbb806610a310f383f44af
- BASE_SHA: 10b85ce5ab815ca3eec7914362e472b7f5582255
- Date: 2026-09-05
- Verdict: CLEAR

## Event

A character with a legacy `ItemDto[]` inventory is opened and later saved: every
item must reappear as Inventory v2 without silent loss, and after the first v2
save the legacy list must no longer regenerate the state.

## Hop chain

Legacy `characters.inventory` (JSONB ItemDto[]) → `migrateLegacyInventory`
(domain) → Personal drafts via `supabase-item-catalog.repository` (#107) →
`bindPendingDefinitions` → `characters.inventory_v2` + `inventory_schema_version=2`
→ `readCharacterInventory` / `CharacterVm.inventoryV2` → UI (#110).

## Simulations

| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | Two characters with identical custom items each get their own Personal definitions under their owner | Migration produces fingerprints; persist creates Personal defs with `owner_user_id` from the session; RLS isolates owners | pass |
| Invalid/missing | Invalid `inventory_v2` with schema_version=2 must not be silently re-migrated over | Reader logs, falls back to legacy in memory, does not write | pass |
| Two consumers / crash | Definitions must exist before the version marker flips | `persistMigratedInventory` inserts definitions first, then updates inventory_v2 + version; retry-safe | pass |

## Flags

| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| `reinterpret:` | blocker | legacy name → Core id | Fuzzy name matching would turn custom gear into Core archetypes | done — exact mechanical field match required |
| `identity:` | flag | pending fingerprint → personal id | Saving before binding would leave `pending:` ids in persisted state | done — bind before write; version flips only after |

## Skip reason

n/a
