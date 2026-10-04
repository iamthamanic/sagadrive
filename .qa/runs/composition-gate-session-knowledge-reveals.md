# Composition Gate — session-knowledge-reveals

- HEAD_SHA: 4c03e7c72bb5dfe443c15838c68a1fe5c8590d16
- BASE_SHA: 6ce9b2e3ed50eec863aa2a75459a545a7fa6ff93
- Date: 2026-10-05
- Verdict: CLEAR

## Event
GM reveals knowledge fact to a target audience; unauthorized clients never receive secret body.

## Hop chain
```text
KnowledgeGmControls
→ applyCommand kind=reveal
→ sagadrive_apply_knowledge_reveal
→ shared.knowledge
→ get_session_runtime_snapshot → sagadrive_project_shared_knowledge
→ projectKnowledgeForAccess / KnowledgeFeed
```

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | Each role gets audience projection | SQL + domain project | pass |
| Invalid/missing | Bad target rejected; unknown fact stubbed on reveal | fail-closed parse | pass |
| Two consumers / crash | GM full + player stripped; independent clients | snapshot project | pass |

## Flags
none
