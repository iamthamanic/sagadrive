# Composition Gate — liveact-session-transport

- HEAD_SHA: 69d210e18962d4b490df167886eb148cf9519b97
- Date: 2026-10-04
- Verdict: CLEAR

## Event
Calibrated LiveAct frame published ephemerally; remote applies via roster-bound identity.

## Hop chain
```text
LiveActEngine calibrated
→ encodeLiveActNetworkFrame
→ MediaPlane.publishData (identity from JWT)
→ decode + acceptLiveActRemoteFrame
→ roster user→character
→ LiveActAvatarOutput.applyLiveActFrame
```

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N actors | Each publisher identity → own character only | roster map | pass |
| invalid | Bad contract / biometrics / OOO → drop | fail-closed | pass |
| 2 consumers | Memory bus fan-out once per payload | pass | pass |

## Flags
none
