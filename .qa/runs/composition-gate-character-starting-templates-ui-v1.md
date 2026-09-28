# Composition Gate — character-starting-templates-ui-v1

- HEAD_SHA: WORKTREE
- Date: 2026-09-28
- Verdict: CLEAR

## Event

User picks a SagaDrive-Starttemplate in CreateCharacterEntryDialog. Editor
opens with mechanical Level-1 fields applied once from the domain catalog.

## Hop chain

`StartingTemplatePicker` click → `setCharacterEditorBootstrap({ kind:
'starting-template', templateKey })` → `CharacterEditor` one-shot
`getSagaDriveStartingTemplate` + `validateSagaDriveStartingTemplate` →
atomic state setters (attrs/skills/bg/archetype/essence/spec). No persist
hop until user Speichern. No species/appearance/inventory mutation.

## Simulations

| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | Same ten labels from catalog | `listSagaDriveStartingTemplates` | pass |
| Invalid/missing | Unknown key / invalid build fails closed | toast + clear bootstrap; no partial apply | pass |
| Two consumers | Dialog bootstrap + editor resolve same catalog | key-only handoff; no CharacterPresetSnapshot | pass |

## Flags

None.

## Skip reason

n/a — producer→consumer path exists (UI picker → bootstrap → editor apply).
