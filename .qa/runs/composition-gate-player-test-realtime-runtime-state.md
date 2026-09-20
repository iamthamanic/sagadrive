# Composition Gate — player-test-realtime-runtime-state

- HEAD_SHA: 0180ea1787d8761e1368036391c25cd9c8c6d49b
- BASE_SHA: a4ce11cb3057e6a70dd2a4e5869d11c7c532faf0
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
| N-actors | Each mutation increments revision once; all clients refresh to same snapshot | CLEAR |
| Invalid/missing | Wrong expected_revision → SQL 40001 / StaleRuntimeRevisionError; non-member forbidden | CLEAR |
| Two consumers / crash | Multiple subscribers each snapshot-refresh; idempotency key prevents double-apply on retry | CLEAR |

## Flags
None.
