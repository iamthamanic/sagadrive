# Feature: Add Session Look inheritance and overrides

<!-- #349 session-look-override -->

## Intent
Erweitere Sessions um explizite Look-Vererbung: Standardmäßig gilt der Saga-Look, der GM kann für eine einzelne Session einen LookProfile-Override setzen oder wieder auf Vererbung zurückschalten.

## Happy Path
- [x] Session speichert entweder keinen Override oder genau einen gültigen LookProfile-Verweis (`sessions.look_profile_id`).
- [x] Resolved World Look folgt `session override → saga default → system default` und ist in GM-UI sichtbar (`SessionLookSettings` + `resolveWorldLookForSession`).
- [x] „Saga-Look übernehmen“ entfernt vorhandenen Override statt den damaligen Saga-Look zu kopieren (`look_profile_id = null`).
- [x] Live-/Session-Views können resolved Look lesen (`resolveWorldLookForSession`), ohne Autorisierungslogik aus der URL abzuleiten.
- [x] Touched files: zero type escape hatches (typed-strict / Boy Scout).

## Edge Cases
- [x] Saga Default ändert sich während Session Override aktiv ist → Override bleibt, Herkunft „Session“.
- [x] Session Override Look wird archiviert → notice + clear to inherit.
- [x] Saga hat keinen Default → System-Default when inherit.
- [x] Live View lädt, bevor Look resolved ist → loading state in SessionLookSettings.

## Regression
- [x] Project `default_look_profile_id` / #348 settings unchanged
- [x] Character personal look (#347) unchanged

## Assumptions
- Persist on `public.sessions.look_profile_id` (nullable TEXT FK), GM-only write via trigger
- Resolution already supports `sessionOverrideProfileId` in `resolveLookProfileId`

## Screenshots
| Step | Filename |
|------|----------|
| 1 | `01-happy-path.png` |

## Implementation Notes
- Migration `053_sessions_look_override.sql`
- `SessionLookSettings` on GM Live World tab
- `projectService.updateSessionLookSettings`
- `resolveWorldLookForSession` domain helper
- Contract: `scripts/session-look-override-check.mjs`

## Composition Gate
- Verdict: CLEAR
- Proof: `.qa/runs/composition-gate-session-look-override.md`
