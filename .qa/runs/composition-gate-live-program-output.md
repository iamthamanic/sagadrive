# Composition Gate — live-program-output

- HEAD_SHA: ae869593beadf3af6bd2511229769ed19a5892aa
- Date: 2026-10-04
- Verdict: CLEAR

## Event
GM/Director switches Program source/layout → viewers/display receive public Program Output.

## Hop chain
```text
ProgramGmControls
→ applyCommand kind=program
→ sagadrive_build_program_presentation
→ shared.programPresentation
→ buildProgramPresentationReadModel
→ ProgramDisplayShell (/live/display)
```

## Simulations
| Case | Result |
|------|--------|
| N viewers | same program read model | pass |
| invalid gm_only payload | rejected | pass |
| 2 consumers | scene source projects #301 scene | pass |

## Flags
none
