# Composition Gate — npc-creature-session-instances

- HEAD_SHA: pending-commit
- BASE_SHA: 0cd62e0b395aa18b203486ef03b692cdd4fc0353
- Date: 2026-09-14
- Verdict: CLEAR

## Event

GM spawns one or more adventure/session instances from a readable library definition; each instance freezes a definition snapshot and owns independent runtime (HP/conditions/temp controller). Definition updates and campaign controller (#200) do not silently rewrite instance state; session end clears only temporary controllers for that session.

## Hop chain

Library CTA / Gamemaster NPCs tab → `planNpcCreatureInstanceSpawn` (displayName Wolf #N, snapshot) → `spawnNpcCreatureInstance` service → RPC `spawn_npc_creature_instance` → `npc_creature_instances` row

Runtime hop: Instance editor → `planNpcCreatureInstanceRuntimeUpdate` → RPC `update_npc_creature_instance_runtime` (snapshot column untouched)

Session-end hop: `clearTemporaryControllersForSession` / RPC `clear_npc_creature_instance_temp_controllers_for_session` → nulls only `temporaryControllerUserId` for matching `session_id`

Cardinality: one instance row per spawn; N spawns of same definitionId → N rows with distinct sequence/displayName; one runtime upsert per GM save; leave-member trigger clears temp controller at most once per leaving user.

## Simulations

| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | Wolf #1 and Wolf #2 (and persistent unique) keep independent HP/conditions/temp controller; parallel updates do not retarget another instance | Domain sequence numbering + per-instance runtime; contract asserts A HP≠B HP and controllers independent | pass |
| Invalid/missing | Non-GM / unreadable definition / outsider temp controller / bad HP fail closed; archived definition still playable via snapshot | `planNpcCreatureInstanceSpawn` / Runtime plan + RPC definitionReadable + membership checks; `resolveInstancePlayView` definitionMissing keeps snapshot | pass |
| Two consumers / crash | Runtime RPC never rewrites snapshot; session-end clear does not touch #200 campaign controller table; definition edit after spawn leaves instance snapshot/runtime intact | Migration comment + UPDATE runtime only; `resolveInstanceAfterDefinitionChange` returns unchanged snapshot; clear RPC scoped to session_id instances only | pass |

## Flags

| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| (none) | | | | |

## Skip reason

n/a — CLEAR
