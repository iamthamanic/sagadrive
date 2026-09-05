# Composition Gate — inventory-persistence (hardening)

- HEAD_SHA: 1106e5987e18dafa57b7f0504ca761ab7bddfed2
- BASE_SHA: 5327bab1e7d05f61ac829ba6322b131ce50229a2
- Date: 2026-09-05
- Verdict: CLEAR

## Event

A client (or concurrent migrator) writes `inventory_v2` / flips
`inventory_schema_version`: only owner-visible definition ids must land, the
version marker must not flip without a validated v2 payload, and a retry must
not duplicate Personal definitions or clobber an already-migrated row.

## Hop chain

Client/update/create DTO → `assertWritableInventoryV2` (shape + catalog
visibility via #107 list) → `characters.inventory_v2` + derived
`inventory_schema_version=2` → `readCharacterInventory` / `CharacterVm`.

Migration path: legacy `inventory` → `migrateLegacyInventory` → deterministic
`personal:mig-*` inserts → `bindPendingDefinitions` → conditional update
(`inventory_schema_version=1` ∧ matching `updated_at`) → readers.

## Simulations

| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | Two owners migrating the same custom fingerprint each get their own Personal row under their session | `ensurePersonalDefinition` uses authenticated `owner_user_id`; ids are `personal:mig-<hash>` scoped per insert owner | pass |
| Invalid/missing | Partial JSON or unknown definition ids must not become authoritative v2 | `isInventoryV2State` rejects partials; `assertWritableInventoryV2` rejects unknown defs; schema marker stripped from DTO spread | pass |
| Two consumers / crash | Concurrent migrate vs edit must not leave duplicate defs or flip version twice | Update requires `inventory_schema_version=1` + current `updated_at`; definition ids are deterministic so retry reuses rows | pass |

## Flags

| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| `identity:` | flag | client JSON → cloneInventory | Partial payloads passed `isInventoryV2State` then threw | done — strict structural guard |
| `reinterpret:` | flag | client `inventory_schema_version` alone | Marker could flip without v2 body | done — strip from DTO; derive on write |
| `fan-out:` | flag | migrate retry → Personal catalog | Random UUIDs duplicated on retry | done — `personal:mig-<hash>` |

## Skip reason

n/a
