# Acceptance — session-knowledge-reveals (#367)

## Criteria
- [x] Visibility classes + projections unit-tested in gate
- [x] Unauthorized client never receives secret body (domain + SQL snapshot project)
- [x] GM reveal to everyone/players/character/program
- [x] Player character_specific persists via shared.knowledge
- [x] Viewer projection excludes gm_only until revealed
- [x] Event kind `reveal` + audit via session_events
- [x] test-gate green

## Implementation Notes
- Domain: `src/domains/session/knowledge/knowledge-contract.ts`
- Migration: `048_session_knowledge_reveals.sql`
- UI: KnowledgeGmControls + KnowledgeFeed
