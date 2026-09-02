# Composition Gate Proof — Skill Progression v2 Post-Merge Hardening Follow-up

- HEAD_SHA: e93857c9fed84fa374cdce75b0dbf66cd2de2b8e
- BASE_SHA: 7bd39ccdb90f09c86a8f2327a50ca07a317db387
- Verdict: CLEAR

## Event

Character save/update (`POST/PATCH /rest/v1/characters` via `SupabaseCharacterRepository`) with SagaDrive skill state (`skills`, `sagadrive_profile`, `attributes`, `level`, `ruleset_key`), plus editor slot-drafting UX in `SkillProgressionSlotsPanel`.

## Hop chain

Editor UI (`src/app/character/**`) → `characterService` → `supabaseCharacterRepository` → domain persistence guard (`assertValidSagaDriveCharacterPersistence` → `assertSagaDriveSkillPersistence`) → Supabase. No worker/queue/webhook/mail path touched; no migration added (JSONB contract unchanged). The persistence guard now gates on the raw-data-derived `provenanceStatus` from `resolveSagaDriveSkillBuildState` instead of re-deriving completeness on compat-enriched build data.

## Simulations

- N-actors: owner-scoping unchanged; `updateCharacter` still loads the character exactly once via owner-scoped `getCharacterById`, foreign characters stay unreachable (repository static check + domain behavior check green).
- Invalid/missing: legacy profiles with real `trainedSkills` and no v2 provenance stay readable and keep final ranks through `normalizeSagaDriveProfile`/`normalizeSkills`; client-supplied `skillProvenanceStatus` strings ('complete' or 'legacy-unresolved') never override data-derived provenance in either direction; level-5 builds with only the L3 slot filled now fail validation and persistence (scripts/skill-progression-domain-check.mjs, cases 14/14b/15/18).
- Two consumers / crash: editor render keeps using `resolveSagaDriveSkillRanksSafe` + `sanitizeSagaDriveSkillDevelopment`; kind switches on persisted decisions stay draft-only until the replacement completes, and specialization skill changes commit atomically through the same sanitize path (E2E: `e2e/character-editor.spec.ts` cascade block, L7 refill, specialization skill change with reload assertions).

## Flags

None. No new dependencies, no rule-value changes, no schema changes.
