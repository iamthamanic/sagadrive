# Composition Gate — adventure-runtime-world-state
- HEAD_SHA: 72737c07ab3a7989f2a372b148706a00f75c270a
- BASE_SHA: a1fa1d80dd7fda94df86761347f6bb0b87f1b3b0
- Verdict: CLEAR

## Event
GM mutates typed adventure playthrough (flag/clock/consequence/definitionRef) → session shared.adventure + optional projects.adventure_runtime → audience-projected snapshot for player/viewer.

## Hop chain
AdventureRuntimeControls / GmActionPalette set-adventure-flag
→ useAdventureRuntime.applyCommand(kind=adventure)
→ adventure-runtime-state pure apply + SQL sagadrive_resolve_adventure_command
→ sessions.world_state.shared.adventure + projects.adventure_runtime
→ get_session_runtime_snapshot via sagadrive_project_shared_adventure

## Simulations
- N-actors: multiple sessions of same project hydrate shared saga adventure_runtime independently without mutating definition tables.
- Invalid/missing: non-GM forbidden; set_flag without key fails; add_consequence without summary fails; unknown op rejected.
- Two consumers / crash: stale revision rejected; idempotency_key replays snapshot; mid-write leaves prior revision until commit.

## Flags
none
