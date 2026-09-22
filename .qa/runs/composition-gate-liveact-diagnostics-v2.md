# composition-gate: liveact-diagnostics-v2 (#397)

**Verdict:** CLEAR
**WORKTREE:** liveact-diagnostics-v2 implementation
**Date:** 2026-09-22

## Path
MediaPipe sample → engine processSample stages → LiveActDiagnosticsV2Snapshot → subscribeDiagnosticsV2 → diagnosticsV2Ref
APPLIED: Gltf/VrmLiveActAvatarOutput.getAppliedDiagnostics after apply/reset

## Simulations
- N-actors: single engine, multiple V2 listeners OK (Set)
- Invalid fallback: no output → createUnavailableLiveActAppliedValues (null, not fake 0)
- Concurrent: dispose clears listeners + snapshot

No FLAGGED findings.
