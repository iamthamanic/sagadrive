# Composition Gate — player-test-combat-encounter-v1 (#300)

## Verdict
CLEAR

## HEAD_SHA
587508dedc93e585249b83b0f0a1181fa121edec

## Path
GM/Player UI → `apply_session_runtime_command` (kind combat|damage|condition)
→ authoritative `world_state.shared.encounter` + `combatActive`
→ append `session_events`
→ NPC path also writes `npc_creature_instances.runtime`
→ Player Panel / GM Panel re-read snapshot (reload-safe)

## Simulations
- N-actors: GM mutates; players read own participant; only current PC actor may spendAction
- Invalid fallback: forged initiative/HP stripped; non-GM start/damage forbidden
- Concurrent: revision check (40001) on stale expected_revision; idempotency keys on commands

## Cardinality
One command → one revision bump → one session_event (idempotent replay returns same snapshot).
