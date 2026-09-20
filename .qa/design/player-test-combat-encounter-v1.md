# Combat & Encounter V1 (#300)

Live session combat for Epic #210 Phase 5.

## Composition

GM Combat Panel → `applyCommand({ kind: 'combat'|'damage'|'condition', payload })`
→ `apply_session_runtime_command` (SECURITY DEFINER)
→ authoritative `world_state.shared.encounter` + `combatActive`
→ append `session_events`; NPC HP syncs to `npc_creature_instances.runtime`
→ Player Panel reads own participant from encounter (reload-safe).

## Commands

| kind | action | who | effect |
|------|--------|-----|--------|
| combat | start | GM | Build participants from PC/NPC refs; server rolls initiative; status active |
| combat | end | GM | status ended; combatActive false |
| combat | nextTurn | GM | Advance turn/round; refresh action economy |
| combat | spendAction | current actor or GM | Spend main/move/free/reaction |
| damage | damage\|heal | GM | Clamp HP; sync NPC instance |
| condition | add\|remove | GM | Mutate participant conditions |

## Forbidden client fields (stripped)

`initiative`, `hpCurrent`, `hpMax`, `round`, `currentTurnIndex`, `authoritative`,
`natural`, `actions` (on start — server seeds fresh turn).

## Out of scope

- Battlemap, FoW, grid, AoE, 3D
- Complex encounter builder / CR budget
- Full condition duration engine
