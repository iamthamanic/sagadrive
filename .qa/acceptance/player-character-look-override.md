# Feature: Add personal player-character Look overrides

<!-- #351 player-character-look-override — builds on #347 UI -->

## Intent
Erlaube Spielern einen persönlichen Look nur für den eigenen Charakter, wenn die Saga dies ausdrücklich zulässt. Server prüft Permission zum Schreibzeitpunkt.

## Happy Path
- [x] Server akzeptiert personal Look Override nur für eigenen Character und nur wenn Saga-Permission aktiv ist (DB trigger `054` + `assertPersonalLookOverrideWrite` + `updateCharacterPersonalLook`).
- [x] Deaktiviert der GM Overrides, ignoriert Resolution den gespeicherten persönlichen Look (`resolveLookProfileId` + playerOverridesAllowed false).
- [x] „Welt-Look verwenden“ entfernt den persönlichen Override (`personal_look_profile_id: null`) statt inherited Look zu kopieren.
- [x] Persönlicher Override verändert ausschließlich Character Rendering via resolution target `player-character`.
- [x] Touched files: zero type escape hatches.

## Edge Cases
- [x] GM deaktiviert Overrides nach gespeicherter Auswahl → write rejected / resolution ignores; UI clears.
- [x] Personal Look archiviert → UI notice + clear.
- [x] Fremder Character → owner-scoped get / trigger blocks.

## Regression
- [x] CharacterLookSelector (#347) uses gated write helper
- [x] Session/World look paths unchanged

## Assumptions
- UI surface remains Character Editor Look selector (#347).
- DB trigger is authoritative; client preflight is fail-closed UX.

## Screenshots
| Step | Filename |
|------|----------|
| 1 | `01-happy-path.png` |

## Implementation Notes
- Migration `054_characters_personal_look_override.sql`
- Domain `personal-look-override.ts`
- `characterService.updateCharacterPersonalLook`
- Contract: `scripts/player-character-look-override-check.mjs`

## Composition Gate
- Verdict: CLEAR
- Proof: `.qa/runs/composition-gate-player-character-look-override.md`
