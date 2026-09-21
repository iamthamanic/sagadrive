# Composition Gate — liveact-face-diagnostics (#331)

- BASE_SHA: faf137b67add6327b9c435c52a8f32b1d615a651
- Verdict: **CLEAR**

## Event
Tracking ON → optional Face Overlay → landmarks drawn on PiP → Kalibrieren collects neutral baseline → avatar receives neutralized LiveAct frames.

## Hop chain
1. `useLiveActViewport` → `LiveActEngine`
2. MediaPipe detect → samples + diagnostics (split)
3. `LiveActFaceOverlay` reads diagnostics ref (overlay off = no draw)
4. `applyLiveActNeutralBaseline` before frame emit

## Simulations
| Case | Result |
|------|--------|
| Overlay off | no canvas draw |
| Calibrate without tracking | button disabled |
| Face lost during calibrate | fail; old baseline kept |
| dispose | baseline cleared |

## Flags
- none
