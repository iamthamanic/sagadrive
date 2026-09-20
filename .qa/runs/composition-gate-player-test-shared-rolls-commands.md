# Composition Gate — player-test-shared-rolls-commands

- HEAD_SHA: e4bd64ce79dfc363823517e190470a5ed76c5d35
- BASE_SHA: ab3b391dacf8391610bf02686d81a4f8fadca802
- Date: 2026-09-20
- Verdict: CLEAR

## Event
Player/GM submits a standard check → server resolves dice+grade authoritatively → append-only roll event + shared `lastRoll` visible to all session subscribers.

## Hop chain
1. **Producer (UI):** Player Panel `requestCheck` → `applyCommand({ kind: 'roll', inputs-only })`
2. **Transport:** `apply_session_runtime_command` RPC (revision + membership)
3. **Resolver:** `sagadrive_resolve_session_check` (strip forged → character modifiers → RNG → grade → optional Drive)
4. **Consumers:** `session_events` audit row + `world_state.shared.lastRoll` via realtime snapshot refresh (#297)

## Simulations
| Case | Expected | Result |
|------|----------|--------|
| N-actors | Two players + GM see the same lastRoll after one roll; single shared write | CLEAR |
| Invalid/missing | Client-forged total/grade stripped; Drive without pool fails closed; bad skill rejected | CLEAR |
| Two consumers / crash | GM + players subscribe; snapshot refresh converges; idempotency key prevents double Drive spend | CLEAR |

## Flags
None.
