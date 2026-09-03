# Composition Gate — skill-progression-v2-remove-legacy

- HEAD_SHA: fd9b4e91fb360b7cde74d2d2a062090e5fbefc72
- BASE_SHA: fd8ebe8404be60f4a677cd63c46c11c49bfbe25a
- Date: 2026-09-03
- Verdict: CLEAR

## Event

Character create/update (`POST/PATCH /rest/v1/characters` via `SupabaseCharacterRepository`) of a SagaDrive-core skill build (`skills`, `sagadrive_profile`, `attributes`, `level`, `ruleset_key`), and character-preset snapshot create/release (`character_presets.versions` JSONB via `characterPresetService.assertValidSnapshot`).

## Hop chain

Editor UI (`src/app/character/edit/CharacterEditor.tsx` + progression/creation slices) → `characterService` → `supabaseCharacterRepository` (load-once merge for partial updates) → domain persistence guard (`assertValidSagaDriveCharacterPersistence` → `assertSagaDriveSkillPersistence`) → Supabase JSONB.

Preset create/release: Settings Preset panel → `characterPresetService.assertValidSnapshot` → same domain persistence guard → `character_presets` versions JSONB. No worker/queue/webhook/mail path. Migration 014 unchanged.

## Simulations

| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| 1 event, N actors | One owner-scoped write per character save or preset version; other owners unreachable | `updateCharacter` still loads once via owner-scoped `getCharacterById`; preset writes stay `owner_user_id = auth.uid()`; both assert the merged SagaDrive state before write | pass |
| invalid / missing | Incomplete V2 data fails closed; never accepted as legacy; presets are not weaker than character persistence | No `legacy-unresolved` bypass; `trainedSkills` is not a source of truth; missing archetype / missing start points / partial provenance / unfilled slots / background spec `acquiredAtLevel !== 1` all throw; preset min-6 trained-skills rule removed (scripts/skill-progression-domain-check.mjs) | pass |
| 2 consumers / crash | Editor load, character persistence, and preset snapshot validation reconstruct the same V2 character; crash/reload does not invent provenance | All three hops use `assertValidSagaDriveCharacterPersistence` / `resolveSagaDriveSkillBuildState` + `resolveSagaDriveSkillRanksSafe`; sanitizer discards invalid background specs instead of rewriting level 19 → 1; stored finals are never a fallback | pass |

- N-actors: owner-scoping unchanged; foreign characters and presets stay unreachable.
- Invalid/missing: incomplete provenance, `trainedSkills`-only, partial V2, missing archetype, inconsistent partial patches, and illegal background spec levels all fail before write. Presets delegate skill/attribute rules to the same guard, so a character persistence would reject is also rejected as a preset.
- Two consumers / crash: editor, character persistence, and preset snapshots share the same V2 sources; `#101` merge-then-validate partial-update guard is preserved.

## Flags

None. No new dependencies, no rule-value/balance changes, no schema/migration changes.

## Skip reason

n/a
