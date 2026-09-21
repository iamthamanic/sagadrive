# Composition Gate — liveact-viewport-ui (#330)

- HEAD_SHA: e0fe659cbd8cab8612873759557ea562f44e7f4d
- BASE_SHA: f7e309d868f56e643a1c221ac08ceaeed7d78742
- Verdict: CLEAR

## Event
Editor opens viewport gear → optional Tracking ON (only if 3D ready) → LiveActEngine.start → PiP mirrors stream → Stop/Unmount releases.

## Hop chain
1. AvatarSurfaceViewer chrome (`LiveActViewportControls`)
2. useLiveActViewport → LiveActEngine
3. Preview video srcObject mirror (no second getUserMedia)
4. AvatarCanvas remains renderer; MToon apply via onMtoonState

## Simulations
| Case | Result |
|------|--------|
| Fallback CH: gear open, actions disabled | pass |
| Tracking without runtime | blocked in hook/UI |
| PiP off / tracking on | pass (showPip gate) |
| Editor vs Player FT UI | editor hides bar; live keeps controls |

## Flags
- none
