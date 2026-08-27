# Composition Gate — sagadrive-character-editor-core

- HEAD_SHA: 233608fa5ee8c4bc47a8d773928630b571a79701
- BASE_SHA: f9b11da27bd192a586639f7c2cb86d7334956128
- Date: 2026-08-27
- Verdict: CLEAR

## Event
User creates/saves a SagaDrive Core Stufe-1 character from the Character Editor (UI polish slice: Parameter tab, Spezies/Archetyp carousels, species heraldic banners, required gender reading, header ruleset selector).

## Hop chain
`CharacterEditor.handleSaveCharacter` (client validation incl. name, gender reading, archetype, essence, background, skills; ruleset guard blocks D&D save) → `characterService.createCharacter` (normalize attributes/skills/`sagadrive_profile`/notes/inventory/appearance with `gender_reading`; set `owner_user_id`; persist `ruleset_key` from editor state) → Supabase `characters` insert (`skills` JSONB + `sagadrive_profile`/`notes` via migration `007`) → `mapToViewModel` on read (legacy CON/INT/WIS → endurance/mind/perception; safe defaults) → UI summary/tabs.

No queue/worker/outbox hop.

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | 1 Speichern → 1 Character-row owned by authenticated user | Single `insert` with `owner_user_id`; updates/deletes scoped by owner | pass |
| Invalid/missing | Incomplete build fails closed before persist | Toast + tab switch; no insert when name/gender/archetype/essence/background/skills fail; D&D ruleset blocked client-side | pass |
| Two consumers / crash | N/A (no worker) | Client-only write; no fan-out or dual-claim path | pass |

## Flags
| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| — | — | — | no open flags | done |

## Skip reason
n/a

## Notes
- Species carousel banner/sketch assets and `SpeciesBannerFlag` shimmer/pulse are presentational only; `selectedRace` still flows through existing carousel `onSelect` → editor state → unchanged save hop.
- Known product gap (documented, not a composition flag): Rank-I essence manifestation catalog absent; editor defers instead of inventing placeholders.
- Playwright evidence under `.qa/evidence/sagadrive-character-editor-core/` refreshed for updated Spezies UI; hop cardinality unchanged.
