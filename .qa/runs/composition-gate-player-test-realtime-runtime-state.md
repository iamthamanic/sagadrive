# Composition Gate — player-test-realtime-runtime-state

- HEAD_SHA: a680966fb502bc7b659c5b49eb880efadf6bd137
- Date: 2026-09-20
- Verdict: CLEAR

## Event
Play-session runtime mutation (command / presence / status / join / leave) → authoritative revision bump + append-only `session_events` → clients converge via snapshot refresh after Realtime notification.

## Hop chain
1. **Producer:** authenticated participant/GM calls `apply_session_runtime_command` / lifecycle RPCs / `set_session_player_presence`
2. **Store:** `sessions.runtime_revision` + `world_state` updated under `FOR UPDATE`; one `session_events` INSERT
3. **Fan-out:** Realtime postgres_changes on `sessions` / `session_players` / `session_events`
4. **Consumer:** `subscribeSessionRuntime` re-fetches `get_session_runtime_snapshot` (no client merge of patches)

## Simulations
| Case | Expected | Result |
|------|----------|--------|
| N-actors (3 browsers) | Each mutation increments revision once; all refresh to same snapshot | pass — single writer path under row lock; consumers snapshot-only |
| Invalid / stale revision | Command rejected; no event; client resync | pass — `40001` + StaleRuntimeRevisionError |
| Concurrent consumers | Multiple subscribers; each refresh independently; no double-apply | pass — idempotency key unique per session |
| Idempotent retry | Same key returns prior snapshot without second bump | pass — early return on existing event |
| Non-member | Snapshot/command forbidden | pass — `is_session_participant` |

## Cardinality
One successful mutating command → exactly one revision increment → exactly one session_events row (unless idempotent replay → zero new rows).

## Notes
UI panel deferred to later #210 children; composition path is backend + hook adapter only.
