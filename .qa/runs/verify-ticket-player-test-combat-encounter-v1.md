# Verify Ticket — player-test-combat-encounter-v1 (#300)

## Ergebnis
PASS

## Checks (@test-gate)
- `npm run test-gate` → PASS (includes `player-test-combat-encounter-check`)
- architecture-boundary-check → PASS
- player-test-player-panel / shared-rolls / shared-scene → PASS (regression)

## Acceptance mapping
| Happy Path | Evidence |
|------------|----------|
| Encounter start/end | migration combat action start/end + GM panel |
| Participants PC+NPC | start seeds from characters + npc_creature_instances |
| Initiative/turn/round | server d20+bonus; nextTurn advances |
| HP damage/healing + conditions | damage/condition RPCs + domain helpers |
| Player sees own state; GM authoritative | player-panel encounter projection; GM-only mutate |
| Action/reaction spend | spendAction slots |
| Reload continues | shared.encounter in world_state |
| Zero escape hatches; test-gate | typed-strict via test-gate; gate script |

## Scope
In: session domain/contracts, migration 044, GM/Player session UI, gate script.
Out: battlemap/FoW/grid/AoE/3D (untouched).

## Secrets
No secrets in diff.
