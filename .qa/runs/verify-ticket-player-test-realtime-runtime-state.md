# Verify Ticket — player-test-realtime-runtime-state

- Date: 2026-09-20
- Issue: #297
- Verdict: **PASS**

## Checks (@test-gate)
- `npm run test-gate` → PASS (includes player-test-realtime-runtime-check + #296 security check)
- typed-strict / lint / typecheck / build → PASS on changed TS files
- secrets diff → PASS

## Acceptance mapping
| Happy Path | Evidence |
|------------|----------|
| SessionRuntimeState domain separate from definition | `session-runtime.ts` vs `session.types.ts` |
| Snapshot + realtime roster/status/gameplay | RPCs + `session-runtime-channel.ts` |
| Stale revision fails / refresh | SQL 40001 + `StaleRuntimeRevisionError` + hook resync |
| Reconnect snapshot then subscribe | `subscribeSessionRuntime` + `useSessionRuntime` visibility |
| Append-only session_events | migration 041 table + no client DML |
| Idempotency | unique index + RPC replay |
| test-gate green | contract script + full gate PASS |

## Scope
In: domain runtime, migration 041, infra service/channel, hook, gate. Out: Player Panel UI (#298+).

## Security
Auth + membership on RPCs; revision server-owned; events append-only via SECURITY DEFINER.
