# Composition Gate — skill-progression-v2-character-editor-ux

- HEAD_SHA: 887ce3935bdd839202106bea88286db148dd7e4d
- BASE_SHA: 269882de798a82a796683684fb5c983f69c5a4be
- Date: 2026-09-02
- Verdict: CLEAR

## Event
User allocates three start skill sources (7 free / 2 stackable background / 1 archetype), optionally fills level 3–19 development slots, saves the character, and later reopens it from Bibliothek → Bearbeiten.

## Hop chain
1. `CharacterBackgroundPanel` + `BackgroundSkillPointsAllocator` / `CharacterSkillsPanel` + `SkillProgressionSlotsPanel` / `SkillCheckFormulaPanel` write editor state only (React). Domain caps, ranks, applied EB and advance validity come exclusively from `domains/rules/sagadrive/skill-progression` (and barrels) — no duplicated rule math in UI.
2. Explicit `handleSaveCharacter` builds one `sagadrive_profile` (+ `skills` snapshot) and calls `characterService.createCharacter` / `updateCharacter`.
3. Repository assert (`assertValidSagaDriveCharacterPersistence` from #90) validates once per write; insert/update targets existing `characters` row. Migration `014` only adds missing JSONB columns `abilities` / `emotion_profiles` already referenced by the DTO — no new table, queue, webhook, or multi-consumer fan-out.
4. After write, `characterService` invalidates the character-summary entity cache; Bibliothek force-refreshes summaries and `character-edit` bootstrap hydrates the editor via one `getCharacterById` read.

One external side-effect per explicit save. Reload is a single owner-scoped read.

## Simulations
| Case | Intended | Composed | Result |
|---|---|---|---|
| N-actors | Each user only mutates their own characters. | Insert/update/select remain `owner_user_id = auth.uid()` scoped; cache keys are in-memory per browser tab. | pass |
| Invalid/missing | Incomplete 7/2/1, background, or advances must not persist as complete provenance. | Client validation blocks save; server assert rejects invalid skill/attribute builds when provenance is complete. | pass |
| Two consumers / crash | Reopening Bibliothek or remounting the editor must not duplicate writes. | Persistence only on explicit Speichern; edit bootstrap is one-shot (cleared after hydrate); remount key is stable per edit id. | pass |

## Flags
| Tag | Severity | Hops | Why local review missed it | Fix |
|---|---|---|---|---|
| — | — | — | no open flags | done |

## Notes
- Composition gate initially FLAGGED because the diff touches persistence (migration + repository payload columns). Documented as CLEAR: same single-save hop as before, with schema columns required for that hop to succeed.
- Library list cache invalidation is a client UX fix, not a second writer.
