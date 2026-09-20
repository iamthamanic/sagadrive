# Composition Gate — player-test-shared-rolls-commands

- HEAD_SHA: 3eae479329f3affe73fdf46fd045d8403dfe88eb
- Date: 2026-09-20
- Verdict: CLEAR

## Event
Player/GM submits a standard check → server resolves dice+grade authoritatively → append-only roll event + shared `lastRoll` visible to all session subscribers.

## Hop chain
1. Producer: Player Panel `requestCheck` → `applyCommand({ kind: 'roll', inputs-only })`
2. Transport: `apply_session_runtime_command` RPC (revision + membership)
3. Resolver: `sagadrive_resolve_session_check` (strip forged → character modifiers → RNG → grade → optional Drive)
4. Consumers: `session_events` audit row + `world_state.shared.lastRoll` via realtime snapshot refresh (#297)

## Simulations

| Scenario | Expected | Result |
|----------|----------|--------|
| N-actors | Two players + GM see same lastRoll after one roll | pass — single shared write; no client merge of totals |
| Invalid fallback | Client sends total/grade | pass — keys stripped; server recomputes |
| Concurrent consumers | Realtime refresh + resync | pass — snapshot is authoritative; idempotency key prevents double Drive |
| Fan-out | One roll → one event + one lastRoll | pass — cardinality 1:1 |

## Findings
None.

## Notes
Rules kernel TS is the test oracle; SQL mirrors §2.2/§2.5/§2.10 for live RNG.
