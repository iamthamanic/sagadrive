# Composition Gate — director-runtime-cues
- HEAD_SHA: ccbfb059c87f8f0d478746ea7d7e3770d835806d
- BASE_SHA: 02b4ba77b39b4bc3e9a6772eb626d33e9081ac3e
- Verdict: CLEAR

## Event
Director/GM applies cue (manual or automatic trigger) → shared.director + programPresentation revision → realtime snapshot reconnects with new programRevision.

## Hop chain
useDirectorRuntime / GmActionPalette trigger-cue
→ applyDirectorCueCommand (pure) + SQL sagadrive_resolve_cue_command
→ world_state.shared.director + programPresentation
→ get_session_runtime_snapshot (no gameplay columns)

## Simulations
- N-actors: multiple viewers receive same programPresentation revision; director capability on session_players gates cue writes.
- Invalid/missing: unknown event maps to null; automatic off skips; cooldown skips; secret fields rejected.
- Two consumers / crash: stale revision rejected; idempotent cue replay; manual override during cooldown always applies.

## Flags
none
