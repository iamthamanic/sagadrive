# Composition Gate — skill-progression-v2-remove-legacy

- HEAD_SHA: a22cee5c6c182fc9d9259cdef16ea79a321712e8
- BASE_SHA: fd8ebe8404be60f4a677cd63c46c11c49bfbe25a
- Date: 2026-09-03
- Verdict: CLEAR

## Event

Character create/update (`POST/PATCH /rest/v1/characters` via `SupabaseCharacterRepository`) of a SagaDrive-core skill build (`skills`, `sagadrive_profile`, `attributes`, `level`, `ruleset_key`).

## Hop chain

Editor UI (`src/app/character/edit/CharacterEditor.tsx` + progression/creation slices) → `characterService` → `supabaseCharacterRepository` (load-once merge for partial updates) → domain persistence guard (`assertValidSagaDriveCharacterPersistence` → `assertSagaDriveSkillPersistence`) → Supabase JSONB. No worker/queue/webhook/mail path. Migration 014 unchanged.

## Simulations

| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| 1 event, N actors | One owner-scoped write per character save; other owners unreachable | `updateCharacter` still loads once via owner-scoped `getCharacterById`; create/update still assert the merged SagaDrive state before write | pass |
| invalid / missing | Incomplete V2 data fails closed; never accepted as legacy | No `legacy-unresolved` bypass; `trainedSkills` is not a source of truth; missing archetype / missing start points / partial provenance / unfilled slots all throw (scripts/skill-progression-domain-check.mjs cases 2–14, 18–24) | pass |
| 2 consumers / crash | Editor load and persistence assert reconstruct the same V2 character; crash/reload does not invent provenance | Both hops use `resolveSagaDriveSkillBuildState` + `resolveSagaDriveSkillRanksSafe` from free/background/archetype/advances/specs; reload E2E reconstructs the same character; stored finals are never a fallback | pass |

- N-actors: owner-scoping unchanged; foreign characters stay unreachable.
- Invalid/missing: incomplete provenance, `trainedSkills`-only, partial V2, missing archetype, and inconsistent partial patches (`skills`/`profile`/`level`) all fail before write.
- Two consumers / crash: editor and persistence share the same V2 sources; `#101` merge-then-validate partial-update guard is preserved.

## Flags

None. No new dependencies, no rule-value/balance changes, no schema/migration changes.

## Skip reason

n/a
