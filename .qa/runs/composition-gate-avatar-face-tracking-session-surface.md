# Composition Gate — avatar-face-tracking-session-surface

- HEAD_SHA: 5cefd418d32935ecb73738688a3dc1cf03c271a0
- Date: 2026-09-19
- Verdict: CLEAR

## Event
User starts Face Tracking on Session/Player surface (or Editor) → at most one active webcam/detector app-wide → drive applies only to the claiming runtime’s bound CharacterStudioRuntime.

## Hop chain
PlayerAvatarPanel / AvatarSurfaceViewer (player-panel|session, controlMode=live) → AvatarCanvas → AvatarFaceTrackingRuntime.start → singleton claim (stop prior active) → shared mapFaceTrackingSample → applyFaceTrackingDrive on bound target → Stop/Unmount releases claim + tracks

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| 1 event, N actors | Second surface start stops the first (one cam) | activeFaceTrackingRuntime stop-other before claim; getActiveFaceTrackingRuntime | pass |
| invalid / missing | Denied/unsupported releases claim; session playable | releaseActiveClaim on fail paths; strip sm keeps FT off | pass |
| 2 consumers / crash | No dual detectors; leave during starting cleans | disposed/claim-mismatch aborts after getUserMedia; dispose releases claim | pass |

## Flags
| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| (none) | | | | |

## Skip reason
n/a
