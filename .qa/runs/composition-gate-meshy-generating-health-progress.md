# Composition Gate — meshy-generating-health-progress

- HEAD_SHA: WORKTREE
- Date: 2026-09-18
- Verdict: CLEAR

## Event
Meshy avatar job poll updates; preview overlay shows monotonic progress + poll health.

## Hop chain
1. Producer: `AvatarMeshyPanel` poll/start/retry → `MeshyAvatarJobUiState` `{ job, pollHealth, displayProgress }`.
2. Consumer: `CharacterEditor` → `AvatarMeshyGeneratingOverlay` (display only).
3. Side effects: none from health/progress display.

## Simulations
- N-actors: one panel / one overlay.
- Invalid/missing: `onJobChange(null)` clears overlay.
- Two consumers: only editor; Session viewers unchanged.

## Notes
Monotonic progress is client-derived; server may still send 90 on rigging.
