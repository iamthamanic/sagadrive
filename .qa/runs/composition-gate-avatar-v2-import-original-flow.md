# composition-gate — avatar-v2-import-original-flow (#261)

- HEAD_SHA: WORKTREE
- Date: 2026-09-19
- Verdict: **CLEAR**
- Diff stat:
```
scripts/avatar-custom-import-check.mjs             |   6 +-
 scripts/avatar-source-selector-check.mjs           |   2 +-
 scripts/test-gate.mjs                              |   9 +
 src/app/character/avatar/AvatarImportPanel.tsx     | 183 +++++++++++++---
 src/app/character/edit/CharacterEditor.tsx         | 109 ++++++++-
 src/domains/character/avatar/avatar-import.ts      |  10 +-
 src/domains/character/avatar/avatar-source.ts      |   4 +-
 .../character/avatar/composition-contract-v2.ts    |   9 +-
 src/domains/character/avatar/index.ts              |  15 ++
 src/domains/character/domain/character.entity.ts   |   7 +-
 .../avatar/character-avatar-import-service.ts      | 244 ++++++++++++++++++---
 11 files changed, 517 insertions(+), 81 deletions(-)
```

## Event
Player uploads GLB/VRM → SagaDrive analyzes → player keeps original → shared capability editor.

## Producer→Consumer
uploadAndAnalyzeCharacterAvatarModel (draft is_active=false) → keepOriginalImportedAvatar (activate) → CharacterEditor importComposition/morphEvidence → useAvatarEditorSurfaces

## Simulations
- N-actors: owner_user_id scoped; cross-owner activate fail-closed
- Invalid-fallback: failed analyze leaves draft inactive; prior model_url untouched
- Concurrent-consumer: exactly-one active import only on keep

## Findings
none
