# Composition Gate — meshy-avatar-generating-overlay

- HEAD_SHA: WORKTREE (uncommitted overlay feature)
- Date: 2026-09-18
- Verdict: CLEAR

## Event
Meshy avatar job snapshot updates while generating; Character Editor preview shows overlay until job leaves busy statuses.

## Hop chain
1. Producer: `AvatarMeshyPanel` — polls/starts job → `MeshyAvatarJobSnapshot` (existing edge `character-avatar-meshy`).
2. Notify: `onJobChange(job | null)` — same snapshot object, no clone/reinterpret.
3. Consumer: `CharacterEditor` holds `meshyJob`; `isMeshyAvatarJobBusy` gates `AvatarMeshyGeneratingOverlay`.
4. Side effects: **none** from overlay (display-only). Model materialization still only via existing `onSuccess(modelUrl)`.

## Simulations
- N-actors: one editor instance / one panel / one overlay — no fan-out.
- Invalid/missing: `job === null` or non-busy status → no overlay (fail closed).
- Two consumers/crash: unmount clears via `onJobChange(null)`; Session/Token viewers do not subscribe.

## Notes
Viewer remains Meshy-agnostic; composition does not add a second Meshy API consumer.
