# Composition Gate — liveact-core (#329)

- HEAD_SHA: 951aed7721924a3293b1410a76798dc21587e30f
- BASE_SHA: cdb84a424a387d562d84258802d741aadfcad678
- Verdict: CLEAR

## Event
Surface requests LiveAct start → shared camera claim → MediaPipe face source → atomic LiveActFrameV1 → optional LiveActAvatarOutput / status+frame subscribers.

## Hop chain
1. User/explicit `LiveActEngine.start()` (audio:false getUserMedia)
2. Shared `claimLiveActCamera` stops any other LiveAct/legacy owner
3. `createMediaPipeLiveActFaceSource` (first-party `/mediapipe/**`)
4. `mapLiveActSourceSample` + `smoothLiveActFrame` → `LiveActFrameV1` (52 channels)
5. Frame listeners + `LiveActAvatarOutput.applyLiveActFrame` (port only in 1/7)

Legacy path remains: `AvatarFaceTrackingRuntime` → same MediaPipe path consts + shared claim → FaceTrackingDrive.

## Simulations
| Case | Expected | Result |
|------|----------|--------|
| N-actors (multi face) | primary = highest presence | pass (selectPrimaryLiveActFaceIndex) |
| Invalid/missing camera | denied/unsupported typed; no unhandled rejection | pass (engine start paths) |
| Concurrent LiveAct + legacy FT | second start stops first via claim | pass (liveact-camera-claim) |
| Stop during starting | late stream/detector cleaned | pass (disposed/claim guards) |
| Face lost | trackingLost + ease neutral; no landmark persist | pass (map/smooth + assert) |

## Flags
- none
