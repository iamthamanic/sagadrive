# Composition Gate — director-control-room
- HEAD_SHA: 5a69433319b40c708893db71c8b1461750a85e51
- BASE_SHA: a26aa6433caf7512896b76296ee4e48f6313d271
- Verdict: CLEAR

## Event
Director opens /live/director → capability-gated cue/preview commands → shared.director + programPresentation → Program pane updates.

## Hop chain
DirectorControlRoomScreen
→ useDirectorRuntime / useProgramPresentation
→ director-runtime + cue SQL (#375)
→ ProgramDisplayShell

## Simulations
- N-actors: viewers see Program only; director Take does not mutate gameplay state.
- Invalid/missing: URL alone denied messaging; cue RPC forbidden without GM/director.
- Two consumers / crash: ProgramDisplayShell absorbs offline media; Preview isolated until Take.

## Flags
none
