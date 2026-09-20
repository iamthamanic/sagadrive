# Player-test realtime runtime (#297)

Authoritative live session state is modeled as `SessionRuntimeState` in
`src/domains/session/contracts/session-runtime.ts`, separate from play-session
definition DTOs (`SessionDto` / `SessionVm`).

## Protocol

1. Client calls `get_session_runtime_snapshot` (SECURITY DEFINER, membership-gated).
2. Client subscribes via `subscribeSessionRuntime` to `sessions`, `session_players`,
   and `session_events` postgres_changes; on any event, re-fetch snapshot (no
   client-side last-write-wins merge).
3. Mutations go through `apply_session_runtime_command` with `expected_revision`.
   Mismatch → SQLSTATE 40001 / `StaleRuntimeRevisionError` → client resyncs.
4. Optional `idempotency_key` unique per session prevents double-apply on retry.
5. Append-only `session_events` records join/leave/presence/status/gameplay kinds
   — audit log, not full event sourcing.

## Depends on

- #296 join codes + lifecycle RPCs (`040_session_join_code_security.sql`)
