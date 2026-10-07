# Composition Gate — starting-template-editor-ux

- HEAD_SHA: 0edd448b46e810218f6c892441b1777b2ff72aef
- Date: 2026-10-07
- Verdict: CLEAR

## Event

Player picks a SagaDrive starttemplate or user preset; create dialog bootstraps
the editor; picker/editor chrome shows icons, playstyle copy, Vorlage badge,
and incomplete-tab hints without changing persistence.

## Hop chain

`StartingTemplatePicker` (icon + `summaryDe` tooltip) →
`setCharacterEditorBootstrap({ kind: 'starting-template', templateKey })` →
`CharacterEditor` one-shot catalog resolve/validate → mechanical L1 apply +
session-only `appliedVorlage` badge + `IncompleteTabHint` from existing
`validationProblems`. User-preset path same; Bookmark badge from bootstrap name.
No new persist hop; Speichern unchanged. No species/look/inventory mutation.

## Simulations

| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | Ten labels + summaryDe from catalog | `listSagaDriveStartingTemplates` | pass |
| Invalid/missing | Unknown/invalid template fails closed | toast + clear bootstrap; no partial apply | pass |
| Two consumers | Picker chrome + editor badge read same catalog key | key-only handoff; badge session state only | pass |

## Flags

None.

## Skip reason

n/a — producer→consumer path exists (picker → bootstrap → editor apply + chrome).
