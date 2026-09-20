# composition-gate — player-test-combat-encounter-v1 (#300)

- HEAD_SHA: 587508dedc93e585249b83b0f0a1181fa121edec
- BASE_SHA: 53e8c61d72dd6193017ab63d2cb360a1c88aa93b
- Feature slug: player-test-combat-encounter-v1
- Verdict: CLEAR

## Event
GM starts/ends an encounter or applies damage/condition/turn/spendAction; authoritative
`world_state.shared.encounter` updates; session players re-read via runtime snapshot.

## Hop chain
1. **Command:** CombatEncounterGmPanel / Player spend → `useCombatEncounter` / `useSessionRuntime.applyCommand`
2. **RPC:** `apply_session_runtime_command` (kind `combat`|`damage`|`condition`) SECURITY DEFINER
3. **Persist:** `sessions.world_state` (`combatActive` + `shared.encounter`) + append `session_events`
4. **NPC sync:** damage/condition also updates `npc_creature_instances.runtime` when kind=npc
5. **Consumers:** Player Panel / GM Panel read snapshot (realtime + reload)

## Simulations
| Simulation | Intent | Observed | Result |
|------------|--------|----------|--------|
| N-actors | GM mutates encounter; players only read own participant; spendAction only current PC owner or GM | Membership + GM checks in RPC; spendAction ownership via `owner_user_id` | pass |
| Invalid/missing | Forged initiative/HP/round stripped; non-GM start/damage forbidden; start while active fails | `sagadrive_strip_forged_encounter_keys`; RAISE forbidden / Encounter bereits aktiv | pass |
| Two consumers / crash | GM + players subscribe; snapshot refresh converges; idempotency key prevents double events; lastRoll/scene preserved | Revision bump + idempotent replay; scene/checkTarget paths do not wipe shared blob | pass |

## Flags
None.

## Cardinality
One command → one revision bump → one `session_events` row (idempotent replay returns same snapshot).
