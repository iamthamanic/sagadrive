# Feature: Spielstand vor Spielern schützen (Column Privileges)

<!-- refined by @implement for issue #569 -->

## Intent
Verhindere, dass authentifizierte Clients (inkl. Player-Members) die Spalten `projects.adventure_runtime`, `sessions.world_state` und `sessions.notes` per direktem Table-SELECT lesen. Spielstand-Lesen nur über audience-projected SECURITY DEFINER RPCs (`get_session_runtime_snapshot` / Adventure-Pipeline).

## Preconditions
- User ist `authenticated` und active project member (Player oder GM).
- Migration `059_saga_state_column_privileges.sql` ist anwendbar.

## Happy Path
- [ ] Migration 059 entzieht SELECT auf `adventure_runtime` / `world_state` / `notes` für `anon` + `authenticated`.
- [ ] Explizites `select('adventure_runtime')` (bzw. world_state/notes) schlägt für authenticated fehl (DB privilege).
- [ ] `get_session_runtime_snapshot` bleibt EXECUTE für authenticated und liefert projected adventure.
- [ ] `src/infrastructure/**` hat kein `select('*')` und kein `!inner(*)` auf `projects` / `sessions`.
- [ ] `scripts/saga-state-column-privileges-check.mjs` ist im test-gate und grün.
- [ ] Touched files: zero type escape hatches.

## Edge Cases
- [ ] Nested embeds (`projects!inner(...)`, `sessions!inner(...)`) listen nur sichere Spalten.
- [ ] Session-DTO ohne `notes`-Spalte im SELECT → `notes: null` (kein Crash).
- [ ] `service_role` behält vollen Zugriff.
- [ ] RPC `create_project_session` Return bleibt nutzbar (SECURITY DEFINER).

## Security Coverage
| Item | How |
|------|-----|
| B-01 AuthZ server-side | Column privileges + existing RLS; no client trust |
| B-04 No secret leakage | Runtime/notes not in direct SELECT |
| P-04 Fail closed | Missing privilege → query error, no silent empty secret |

Out of scope: F-xx UI, upload, cookies, workers.

## Regression
- [ ] Project list / getById / session list / look-settings update weiterhin mit expliziten Columns.
- [ ] `project-membership-security-check` weiterhin grün.

## Assumptions
- GM liest Spielstand künftig nur über Snapshots/RPCs (kein Direct-SELECT von secrets).
- Session-`notes` in ProjectVm sind nach diesem Issue client-seitig immer `null` bis ein projected RPC existiert (Child-Recap kann später GM-Notes liefern).

## Screenshots
N/A (kein UI)

## Implementation Notes
- Migration `059` converts table-level SELECT to column allow-lists (PG ignores column REVOKE while table SELECT remains).
- `project-service` / `session-service` use `PROJECT_SAFE_COLUMNS` / `SESSION_SAFE_COLUMNS`.
- Check script `scripts/saga-state-column-privileges-check.mjs` wired into `test-gate.mjs`.
- Local verify: `has_column_privilege(authenticated, adventure_runtime/world_state/notes)=false`; `SELECT name` still works.
