# Composition Gate — live-program-output

- HEAD_SHA: bc24d76346a0c00a4c53cecaa8de3204647f3d72
- BASE_SHA: fd5676f9575961f80199670fedd837597b269d0f
- Date: 2026-10-04
- Verdict: CLEAR

## Event
GM switches Program source/layout; display/viewer consume public Program Output only.

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
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | Multiple viewers/display clients read same program revision | shared.programPresentation fan-out via runtime snapshot | pass |
| Invalid/missing | gm_only / forged keys rejected; missing program defaults to shared-scene or neutral | fail-closed parse + defaultProgramPresentationState | pass |
| Two consumers / crash | Display + GM preview; one consumer disconnect does not corrupt program state | independent read models | pass |

## Flags
none
