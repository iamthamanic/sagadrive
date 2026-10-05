# Design — adventure-runtime-world-state v1 (#374)

## Separation
- Definition: package/fixture identity via `definitionRef` only
- Runtime: flags, relationships, clocks, consequences in versioned schema v1

## Persistence
- Live: `sessions.world_state.shared.adventure`
- Saga continuity: `projects.adventure_runtime`
- Never LiveAct / landmarks / webcam

## Visibility
Server projects gm_only out for non-GM snapshots.
