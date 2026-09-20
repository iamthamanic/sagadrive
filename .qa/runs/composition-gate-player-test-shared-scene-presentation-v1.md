# Composition Gate — player-test-shared-scene-presentation-v1

- HEAD_SHA: f9f2964f1b34c3344a32ab1cf4452b6a09b154f6
- BASE_SHA: 7534ae7499c4841ef92dbff863d61014b5697db6
- Date: 2026-09-20
- Verdict: CLEAR

## Event
GM publishes shared scene presentation → authoritative `world_state.shared.scenePresentation` + optional `sceneId` → all session subscribers see the same visual context.

## Hop chain
1. **Producer (UI):** `SharedSceneGmControls` / `useSharedScenePresentation.publishScene`
2. **Command:** `apply_session_runtime_command` kind=`scene` (inputs only; forged keys stripped)
3. **Authoritative write:** `sagadrive_build_scene_presentation` → merge `shared.scenePresentation` (does not replace entire `shared`)
4. **Consumers:** Player Panel + Display via snapshot/realtime (#297); append-only `session_events` kind=`scene`

## Simulations
| Case | Expected | Result |
|------|----------|--------|
| N-actors | Two players + display see same title/actors after one GM publish; single shared write | CLEAR |
| Invalid/missing | Non-GM / bad URL / empty title rejected; forged authoritative/updatedAt stripped | CLEAR |
| Two consumers / crash | Player + Display subscribe; snapshot refresh converges; idempotency key prevents double scene events; lastRoll preserved | CLEAR |

## Flags
None.
