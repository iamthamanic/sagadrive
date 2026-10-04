# Design — session-knowledge-reveals (#367)

## Intent
Separate Knowledge State from Gameplay/Presentation/Production. Server-side audience enforcement.

## Visibility
`public` | `gm_only` | `discovered` | `character_specific` | `program`

## Storage
`world_state.shared.knowledge` — fact refs + discovery/reveal records. Fact **bodies** for gm_only never enter unauthorized read models.

## Commands
Event kind `reveal` (extend session_events). Payload: factId, target, optional characterId. GM-only.

## Projections
- `projectKnowledgeForAccess(shared, access)` — strips unauthorized bodies
- Viewer/display: public + program only
- Player: + discovered + own character_specific
- GM: full

## Non-goals
Second world truth store; CSS-only hiding; client-forged character targets.
