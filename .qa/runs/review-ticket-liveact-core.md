# Review Ticket — liveact-core (#329)

- Date: 2026-09-21
- HEAD_SHA: 951aed7721924a3293b1410a76798dc21587e30f
- Verdict: **ACCEPT**

## Architecture
- #94 layers respected: domain pure; infra owns MediaPipe/DOM; no app UI in this slice.
- Shared MediaPipe path ownership moved to `mediapipe-face-source`; legacy re-exports.
- Camera exclusivity via `liveact-camera-claim` (avoids circular engine imports).

## Maintainability
- Atomic `LiveActFrameV1` avoids exclusive facial-layer wipe for live tracking.
- Output port deferred to 4/7 — correct scope.

## Security
- Explicit start only; `audio: false`; no landmark/video on frame; stop/dispose clears tracks.

## Findings
| Severity | Finding | Blocking |
|----------|---------|----------|
| Low | `createMediaPipeFaceTrackingDetector` still embeds its own landmarker create (same paths) until 6/7 full migration | no |

## Decision
ACCEPT for ship.
