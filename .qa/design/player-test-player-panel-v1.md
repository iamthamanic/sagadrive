# Player Panel V1 (#298)

Live player surface for Epic #210 Phase 3.

## Composition

`SessionResourceScreen` (`liveView=player`) → resolve session UUID via
`projectService.getSessionByPublicIds` → `useSessionRuntime` + character by
public id → domain `buildPlayerPanelModel` → `PlayerPanel` (no CharacterEditor).

## States

| Banner | When |
|--------|------|
| Waiting | runtime.status === waiting |
| Paused | runtime.status === paused |
| Disconnected | network/subscribe error or self offline in roster |
| Error | character load / fatal error |
| Ready | active + online + character loaded |

## Out of scope

- Authoritative roll math (#299)
- Full combat encounter UI
- Embedding CharacterEditor
