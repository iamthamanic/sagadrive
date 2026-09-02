# Composition Gate — character-presets

- HEAD_SHA: b7458019865d20a7e94c6f016ac5abed5a7bb093 (product; QA stamp commit follows)
- PRODUCT_SHA: b7458019865d20a7e94c6f016ac5abed5a7bb093
- BASE_SHA: cea1e6dbfa52dac93538b2dd59e71064dd303bc3 (`origin/main`)
- Date: 2026-09-02
- Verdict: CLEAR

## Event
User creates a character (own or from preset version), saves a validated sheet, and optionally creates/appends Level versions on an owner-scoped preset. Auto-release may append one version after a successful save when the persisted level increased.

## Hop chain
1. **Create chooser** (`CreateCharacterEntryDialog`) → either empty editor or `setCharacterEditorBootstrap(preset snapshot)` → `CharacterEditor` consumes via `takeCharacterEditorBootstrap` (one-shot; new unsaved character).
2. **Save** → `characterService.createCharacter` (first) or `updateCharacter` (subsequent) with `sagadrive_profile.presetReleaseMode`.
3. **Manual preset** → `CharacterPresetPanel` → `characterPresetService.createPresetFromCharacter` / `releaseVersion` with `assertValidSnapshot` → `character_presets` row (versions JSONB append-only).
4. **Auto-release** → after successful save, `maybeAutoReleaseVersion` loads linked preset by `source_character_id`, skips if level not increased / already present / validation fails → at most one `releaseVersion` write.
5. **Delete source character** → FK `ON DELETE SET NULL`; preset remains; UI may show „Quellcharakter gelöscht“.

No queue/worker/outbox hop. Marketplace `published` stays false (no public consumer).

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | Each user only sees/writes own presets; releasing a version affects exactly one preset row. | RLS `owner_user_id = auth.uid()`; updates keyed by preset id + owner; no fan-out. | pass |
| Invalid/missing | Invalid snapshot / duplicate level / wrong ruleset does not corrupt versions; unsaved character does not write. | `assertValidSnapshot` before insert/append; duplicate level throws; panel save-first without service call; auto-release catch+log no-op. | pass |
| Two consumers / crash | Double release of same level must not create two Level-N entries; bootstrap must not apply twice. | Append checks existing levels before write; bootstrap consumed once via `take` + ref guard. | pass |

## Flags
| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| — | — | — | Keine offenen Flags. | done |

## Skip reason
n/a

## Notes
- System/SagaDrive presets and Marketplace are UI/model stubs only (`origin: system` unused in list; `published: false`).
- Migration `012_character_presets.sql` must be applied on the target Supabase before live writes succeed.
- Re-verified 2026-09-02: hop chain CLEAR for product `b745801`. 
- Gate tip after stamp: 9b088c4e6e80ec0cdee10ce7b1b1bf8ed22ed7a7
- Tip may include `.qa` stamp-only commits; no producer/consumer change after product SHA.
