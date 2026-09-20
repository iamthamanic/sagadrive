# Verify Ticket — player-test-shared-scene-presentation-v1 (#301)

Date: 2026-09-20
Branch: issue-301-player-test-shared-scene-presentation
Base: origin/main @ 7534ae7

## Test-gate
- Command: `npm run test-gate`
- Result: PASS (includes `player-test-shared-scene-presentation-check.mjs`)

## Acceptance match
Slug: `player-test-shared-scene-presentation-v1`

| Criterion | Evidence |
|-----------|----------|
| Shared scene title / location | `SharedScenePresentation` + view `data-scene-title` / `data-scene-location` |
| Optional backdrop + description | `backdropUrl` http(s) + description fields; GM form |
| Visible characters/NPCs | `visibleActors[]` + `data-scene-actors` |
| GM switch; players update live | `scene` command → `shared.scenePresentation`; Player/Display subscribe via #297 |
| Reusable for later 3D | opaque `sceneRef` (kind+id), schemaVersion 1 |
| Zero escapes; test-gate green | no as-any; gate PASS |

## Edge cases
Non-GM forbidden (SQL); empty title rejected; javascript: URL rejected; forged authoritative/updatedAt stripped; completed session rejected; lastRoll preserved on merge.

## Scope
In: domain shared-scene-presentation, migration 043, session UI (view/GM/hook/PlayerPanel/Display/GM panel), test-gate + acceptance/design.
Out: 3D builder, fog, grid.

## Verdict
**PASS**
