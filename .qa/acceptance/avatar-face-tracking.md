# Acceptance — mediapipe-avatar-face-tracking

<!-- seeded for GitHub issue #12 / avatar-order-26 -->

## Intent
Optionales lokales MediaPipe Face Tracking: Head/Eyes/Blink/Expressions über gemeinsame Runtime (#11/#6), ohne Rohvideo-/Landmark-Persistenz oder Serverübertragung.

## Happy Path
- [x] Tracking startet nur nach explizitem „Face Tracking starten“
- [x] Drive mappt auf Head-Bone + Facial Weights
- [x] Stop/Unmount räumt MediaStreamTracks + Detector auf
- [x] Denied / unsupported / lost / paused (Tab) recoverable + a11y
- [x] FPS-Cap Desktop/Mobile; typed-strict + check grün

## Scope
In: domain face-tracking-contract, infra runtime (injectable detector + CDN MediaPipe lazy), UI controls, AvatarCanvas wiring.
Out: VTuber studio, cloud analysis, auto-start on reload.

## Composition Gate
- HEAD_SHA: a2458357f3a90db2d23a6b706ebf6771294ac017
- BASE_SHA: f9d0c7f0481206eb469bcfa3d768156590b19866
- Verdict: CLEAR
- Proof: `.qa/runs/composition-gate-avatar-face-tracking.md`

## Implementation Notes
- Privacy: drive darf keine landmarks/video Felder tragen (`assertFaceTrackingDriveLocalOnly`).
- MediaPipe WASM/model nur nach User-Start via jsDelivr; CI nutzt Domain + Strukturchecks.
