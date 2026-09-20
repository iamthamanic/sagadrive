# Shared Scene Presentation V1 (#301)

Authoritative shared visual context for live sessions — not a 3D builder.

## State shape

`sessions.world_state.shared.scenePresentation` (schemaVersion 1):

- `title`, `locationLabel`, `description`, `backdropUrl`
- `visibleActors[]` — `{ kind, id, publicId, displayName, portraitUrl, role }`
- `sceneRef` — `{ kind: session-local|adventure-scene|world-location, id }` for later 3D
- `authoritative: true`, `updatedAt` — server-owned

Top-level `world_state.sceneId` stays in sync with `sceneRef.id` or explicit `sceneId`.

## Protocol

1. GM submits `apply_session_runtime_command` kind=`scene` with presentation inputs.
2. SECURITY DEFINER strips forged keys, validates URLs/title, merges into `shared.scenePresentation` (does not wipe `lastRoll`).
3. Append-only `session_events` kind=`scene`.
4. Players/display read via existing snapshot + realtime (#297).

## UI

- `SharedScenePresentationView` on Player Panel + Display live view
- `SharedSceneGmControls` on Gamemaster live view (scenes tab)

## Depends on

- #297 SessionRuntimeState
- #299 must not regress (shared merge)
