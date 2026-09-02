# Composition Gate Proof — Skill Progression v2 Post-Merge Hardening

- HEAD_SHA: 0000000000000000000000000000000000000000
- BASE_SHA: 7bd39ccdb90f09c86a8f2327a50ca07a317db387
- Verdict: CLEAR

## Event

Character save/update (`POST/PATCH /rest/v1/characters` via `SupabaseCharacterRepository`) with SagaDrive skill state (`skills`, `sagadrive_profile`, `attributes`, `level`, `ruleset_key`).

## Hop chain

Editor UI (`src/app/character/**`) → `characterService` → `supabaseCharacterRepository` → domain persistence guard (`assertValidSagaDriveCharacterPersistence`) → Supabase. No worker/queue/webhook/mail path touched; no migration added (014 unchanged, JSONB contract reused).

## Simulations

- N-actors: owner-scoping unchanged; `updateCharacter` loads the character exactly once via owner-scoped `getCharacterById`, foreign characters stay unreachable (regression: repository static check + domain behavior check).
- Invalid/missing: partial patches (`skills`-only, `profile`-only, `level`-only) are merged over the stored character and fail-closed validated before write; client-supplied `legacy-unresolved` no longer skips validation; one decision per development level enforced chronologically (scripts/skill-progression-domain-check.mjs, 20+ cases).
- Two consumers / crash: editor render uses `resolveSagaDriveSkillRanksSafe` + `sanitizeSagaDriveSkillDevelopment`, so removing an earlier slot prunes dependent later slots deterministically instead of throwing (E2E: `e2e/character-editor.spec.ts` cascade block).

## Flags

None. No new dependencies, no rule-value changes, no schema changes.
