# Composition Gate — saga-routing-public-id-foundation

- HEAD_SHA: WORKTREE
- Date: 2026-09-19
- Verdict: **CLEAR**

## Event
Saga/Session/Character resources gain public_id; URLs resolve to screens; session create allocates session_number.

## Hop chain
1. DB trigger/RPC assigns `public_id` + `session_number` on insert
2. Infra resolves by public_id (RLS/auth still gate)
3. `resolvePathname` maps URL → ResolvedRoute
4. AppShell renders Saga/Session shells (GM live reuses GamemasterPanel)

## Simulations
| Case | Expected | Result |
|------|----------|--------|
| N concurrent session creates | distinct session_number via advisory lock RPC | CLEAR (SQL allocate_next_session_number) |
| Invalid / wrong-prefix public id in URL | not-found | CLEAR (check script) |
| Session SE under wrong saga SA | not-found at resolve or scoped lookup | CLEAR |
| Player opens /live/gamemaster | URL alone does not authorize; domain forbid for role none | CLEAR |
| /live/player without character | player-resolve target | CLEAR |
| Foreign CH in player URL | authorizeLivePlayerCharacter deny | CLEAR |

## Notes
No bulk fan-out / outbox. Public IDs are identifiers only.
