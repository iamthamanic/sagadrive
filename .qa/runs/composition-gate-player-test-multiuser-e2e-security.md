# composition-gate — player-test-multiuser-e2e-security (#303)

- HEAD_SHA: WORKTREE
- BASE_SHA: b08254cb3a20f6b84be3380df3a6126cc5a67eed
- Feature slug: player-test-multiuser-e2e-security
- Verdict: CLEAR

## Event
Phase 8 vertical-slice verification: multi-context E2E / structural gate asserts that
prior session commands (create/join, roll, scene, combat, status) remain authorized
and fail closed for outsiders / stale revision / completed sessions / duplicate keys.

## Hop chain
1. **Producer (test):** Playwright multi-context + `player-test-multiuser-e2e-security-check`
2. **Domain mirror:** `authorizeSessionCommand` / `classifyRuntimeSecurityError` / idempotency replay
3. **Authoritative path (prior):** `apply_session_runtime_command` + lifecycle RPCs (SECURITY DEFINER)
4. **Consumers:** GM + Player panels via runtime snapshot (unchanged; composed, not reimplemented)

## Simulations
| Simulation | Intent | Observed | Result |
|------------|--------|----------|--------|
| N-actors | GM + player contexts; outsider forbidden | `authorizeSessionCommand` non-participant → forbidden; e2e dual `newContext` | pass |
| Invalid/missing | stale revision / completed / unauthenticated | decideStaleRevision + session_closed + unauthenticated classes | pass |
| Two consumers / crash | duplicate idempotency → replay; no double-apply | `decideIdempotencyReplay` + SQL unique index still present | pass |

## Flags
None.

## Cardinality
One mutating command → one revision / one event row (idempotent replay returns prior snapshot). Gate adds no new fan-out.
