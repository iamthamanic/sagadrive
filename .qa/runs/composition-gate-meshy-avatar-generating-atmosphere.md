# Composition Gate — meshy-avatar-generating-atmosphere

Date: 2026-09-18  
Verdict: **CLEAR**

## Hop chain
1. Producer: `AvatarMeshyPanel` emits busy job via `onJobChange` (one UI state per poll tick).
2. Gate: `CharacterEditor` uses `isMeshyAvatarJobBusy(job.status)` once.
3. Consumer A (busy): mounts `AvatarMeshyGeneratingOverlay` with `fillHost` — full preview surface.
4. Consumer B (idle): mounts `AvatarSurfaceViewer` — mutually exclusive with A (no dual mount).

## Simulations
| Sim | Result |
|-----|--------|
| N-actors | One editor instance → one overlay or one viewer; no fan-out. |
| Invalid/missing job | `meshyUi?.job` falsy → viewer only; no overlay. |
| Two consumers / crash | Overlay unmount tears down CSS anim only; viewer remounts when not busy. No shared mutable canvas particle state. |

## Invariants
- Initials fallback cannot show under generating atmosphere (viewer unmounted while busy).
- Atmosphere is CSS-only (`data-avatar-meshy-atmosphere="css"`); no particle RAF competing with WebGL.
- Progress/health markers unchanged for poll UX.

## Proof path
`.qa/runs/composition-gate-meshy-avatar-generating-atmosphere.md`
