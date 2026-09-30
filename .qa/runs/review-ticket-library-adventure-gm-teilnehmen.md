# Review Ticket — library-adventure-gm-teilnehmen

- BASE_SHA: 2aec8c83f000286f4b1ed9ab1984b7f15548e2b4 (origin/main)
- HEAD_SHA: 19f66211f56d0c594d12cfca055d4f5c1e1578a1
- Date: 2026-09-30
- Verdict: **ACCEPT**

## Scope
`src/app/library/Library.tsx` — adventure card actions only.

## Findings
| Severity | Finding | Action |
|----------|---------|--------|
| (none) | — | — |

## Notes
- GM: dual buttons Leiten → `gamemaster`, Teilnehmen → `session-join`.
- Non-GM: Teilnehmen → `session-join` (replaces misleading `join`/ProjectJoin for opening an already-joined adventure).
- No secrets, no infra, no schema.
- Composition-gate: SKIPPED (single-hop UI nav).
