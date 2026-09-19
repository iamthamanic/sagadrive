# Composition Gate — saga-routing-public-id-foundation

- HEAD_SHA: 21996f5140cd49f5f25b20086e6dfdfecc0235d6
- BASE_SHA: 697b8577fc416fafe9f7ebf245e00274f4066c26
- Date: 2026-09-20
- Verdict: CLEAR

## Event
Saga/Session/Character resources receive immutable public_ids; URLs resolve to screens; session create allocates saga-scoped session_number.

## Hop chain
1. DB trigger / `create_project_session` RPC writes `public_id` + `session_number`
2. Infra resolves by public_id under existing auth/RLS
3. `resolvePathname` maps untrusted URL segments → `ResolvedRoute`
4. AppShell renders Saga/Session shells (live gamemaster reuses GamemasterPanel)

## Simulations
| Case | Expected | Result |
|------|----------|--------|
| N-actors | Concurrent session creates get distinct `(project_id, session_number)` via advisory lock | CLEAR |
| Invalid/missing | Bad prefix/body or missing id → parse fail / not-found; no invent | CLEAR |
| Two consumers / crash | Router + AppShell share one History pathname SoT; crash mid-nav does not mint permissions | CLEAR |
| Cross-saga SE under wrong SA | Scoped lookup / not-found | CLEAR |
| Player hits /live/gamemaster | URL alone does not authorize GM data | CLEAR |

## Flags
None.
