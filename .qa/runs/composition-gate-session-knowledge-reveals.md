# Composition Gate — session-knowledge-reveals

- HEAD_SHA: ee4f6a04c18cbf8d14a1d766d854c8e7a64de235
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
