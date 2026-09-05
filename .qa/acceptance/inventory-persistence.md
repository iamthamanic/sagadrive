# Feature: Inventory v2 — Persist character inventory & migrate legacy ItemDto[]

Issue: #109 (Parent: #105, Depends on: #106/#107/#108) · Slug: `inventory-persistence`

## Intent
Persist Inventory v2 as the character's authoritative inventory and migrate every
existing flat `ItemDto[]` without silent data loss. Legacy remains a read
compatibility input until `inventory_schema_version = 2`.

## Happy Path
- [x] `migrateLegacyInventory` preserves every unit; first 20 stacks → base grid;
  remainder → `legacyOverflow`; nothing auto-equipped.
- [x] Strict Core mapping only when name + mechanical fields exactly match a #108
  definition; otherwise a Personal draft with a stable fingerprint.
- [x] Identical fingerprints within one migration reuse one Personal draft.
- [x] Consumable Personal stackLimit = `max(1, quantity)` capped at 99; other types 1.
- [x] `inventory_v2` JSONB + `inventory_schema_version` on `characters` (migration 016).
- [x] Reader prefers valid v2; invalid v2 logs and falls back to legacy without overwrite.
- [x] `persistMigratedInventory` / `migrateCharacterInventoryToV2` create Personal
  definitions before flipping the version marker; legacy `inventory` is not erased.
- [x] `CharacterVm` exposes `inventoryV2` + `inventorySchemaVersion`; updates can
  write `inventory_v2` and set schema version 2.

## Edge Cases
- [x] Empty/null legacy → empty valid v2 state.
- [x] Fuzzy name-only matches do **not** become Core.
- [x] `bindPendingDefinitions` rewrites `pending:<fingerprint>` to stable ids without mutating input.
- [x] Re-running migration on the same input is deterministic (idempotent fingerprints).

## Regression
- [x] `npm run test-gate` green including new `inventory-legacy-migration-check.mjs`.

## Security Coverage
Personal definitions created during migration use the authenticated session owner
via existing #107 repository/RLS. No client-supplied owner. Legacy column is never
destructively deleted.

## Composition Gate
- Verdict: **CLEAR**
- Proof: `.qa/runs/composition-gate-inventory-persistence.md` (HEAD `0da928c`)

## Implementation Notes
| File | Purpose |
|------|---------|
| `migrate-legacy.ts` | Pure lossless migration + strict `isInventoryV2State` |
| `016_character_inventory_v2.sql` | Columns |
| `inventory-persistence.ts` | Read + persist-migrated (deterministic Personal ids, optimistic lock, catalog gate) |
| `character-service.ts` | `migrateCharacterInventoryToV2` |
| `supabase-character.repository.ts` | create/update honor validated `inventory_v2`; strip client schema marker |
| `character.commands.ts` | No client-writable `inventory_schema_version` |
| `scripts/inventory-legacy-migration-check.mjs` | Required tests |

### Hardening follow-up (`fix/109-inventory-persistence-hardening`)
- P1: `isInventoryV2State` requires containers/equipment/quickSlots + nested instance shape.
- P2: `assertWritableInventoryV2` checks owner-visible catalog before writes.
- P2: schema version derived only from validated `inventory_v2` writes.
- P2: createCharacter persists validated `inventory_v2`.
- P2: migration Personal ids `personal:mig-<hash>`; update requires `inventory_schema_version = 1`.
