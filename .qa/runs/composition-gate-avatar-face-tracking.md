# Composition Gate — avatar-face-tracking

- HEAD_SHA: a2458357f3a90db2d23a6b706ebf6771294ac017
- BASE_SHA: f9d0c7f0481206eb469bcfa3d768156590b19866
- Verdict: CLEAR

## Event
User starts Face Tracking → local detector samples → drive → VRM head/facial APIs.

## Hop chain
1. Webcam MediaStream (browser-local)
2. FaceTrackingDetector → FaceTrackingDrive
3. CharacterStudioRuntime head bone + AvatarFacialRuntime weights

## Simulations
| Case | Expected | Result |
|------|----------|--------|
| N-actors (multi face) | primary = highest presence, tie→first | pass (domain) |
| Invalid/missing camera | denied/unsupported recoverable | pass (runtime paths) |
| Two consumers / crash | stop/unmount clears tracks + detector | pass (dispose) |

## Flags
- none

