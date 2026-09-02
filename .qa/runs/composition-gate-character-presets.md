# Composition Gate — character-presets

- HEAD_SHA: ed569483213f23ecff7418cd7ec974a4206a73e9
- BASE_SHA: cea1e6dbfa52dac93538b2dd59e71064dd303bc3
- Date: 2026-09-02
- Verdict: CLEAR

## Event
User creates a character (own or from preset version), saves a validated sheet, and optionally creates/appends Level versions on an owner-scoped preset. Auto-release may append one version after a successful save when the persisted level increased. Hardening rejects cross-owner source links, non-user origins, invalid snapshots on hydrate, and unsafe portrait URLs.

## Hop chain
1. **Create chooser** (`CreateCharacterEntryDialog`) → either empty editor or `assertValidSnapshot` + `setCharacterEditorBootstrap(preset snapshot)` → `CharacterEditor` re-asserts via `takeCharacterEditorBootstrap` (one-shot; new unsaved character). Preset list errors still open the presets step (empty + stub).
2. **Save** → `characterService.createCharacter` (first) or `updateCharacter` (subsequent) with `sagadrive_profile.presetReleaseMode`.
3. **Manual preset** → `CharacterPresetPanel` → `characterPresetService.createPresetFromCharacter` / `releaseVersion` with `withSafePortraitUrl` + `assertValidSnapshot` → `character_presets` row (versions JSONB append-only; RLS origin=user + owned source).
4. **Auto-release** → after successful save, `maybeAutoReleaseVersion` loads linked preset by `source_character_id`, skips if level not increased / already present / validation fails → at most one `releaseVersion` write.
5. **Delete source character** → FK `ON DELETE SET NULL`; preset remains; UI may show „Quellcharakter gelöscht“.
6. **Read path** → `normalizeVersions` re-runs `assertValidSnapshot` and drops corrupt versions; portrait via `normalizeSafeUrl`.

No queue/worker/outbox hop. Marketplace `published` stays false (no public consumer). System presets require service-role seed (client RLS forces `origin = 'user'`).

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | Each user only sees/writes own presets; releasing a version affects exactly one preset row; cannot attach another user’s character as source. | RLS `owner_user_id = auth.uid()` plus `013` WITH CHECK on owned `source_character_id` and `origin = 'user'`; updates keyed by preset id + owner. | pass |
| Invalid/missing | Invalid snapshot / duplicate level / wrong ruleset / unsafe portrait does not corrupt versions or hydrate editor; unsaved character does not write; list failure still shows empty presets UI. | `assertValidSnapshot` before insert/append/bootstrap; skip invalid on read; `normalizeSafeUrl` strips bad portraits; dialog fail-open to presets step; auto-release catch+log no-op. | pass |
| Two consumers / crash | Double release of same level must not create two Level-N entries; bootstrap must not apply twice. | Append checks existing levels before write; bootstrap consumed once via `take` + ref guard. | pass |

## Flags
| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| — | — | — | Keine offenen Flags. | done |

## Skip reason
n/a

## Notes
- Migrations `012` + `013_character_presets` must be applied on the target Supabase before live writes succeed.
- Verify-UI screenshots 03/05 deferred until a shared valid-sheet Playwright fixture exists.
