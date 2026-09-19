# Composition Gate — avatar-face-tracking-selfhost-mobile-profile

- HEAD_SHA: WORKTREE (uncommitted #243/#244 on feat/avatar-face-tracking-selfhost-session; tip 11a0fb2)
- Date: 2026-09-19
- Verdict: CLEAR

## Event
User explicitly starts Face Tracking → MediaPipe detector loads first-party WASM/model → local samples map to FaceTrackingDrive → CharacterStudioRuntime applies head/facial (no network landmark upload).

## Hop chain
AvatarFaceTrackingControls.onStart → AvatarFaceTrackingRuntime.start → createMediaPipeFaceTrackingDetector(profile) → `/mediapipe/wasm` + `/mediapipe/models/face_landmarker.task` → detect loop → mapFaceTrackingSample / smoothFaceTrackingDrive → applyFaceTrackingDrive → UI status/profile label

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| 1 event, N actors | One start → one detector/stream for that runtime | Single detectorFactory call per successful start; FPS capped by one quality profile | pass |
| invalid / missing | Asset/WASM fail → unsupported, avatar usable | createMediaPipe returns null → throw → status unsupported; no CDN fallback | pass |
| 2 consumers / crash | No dual CDN loaders; stop cleans tracks | First-party paths only; track.stop + detector.dispose on stop/unmount | pass |

## Flags
| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| (none) | | | | |

## Skip reason
n/a
