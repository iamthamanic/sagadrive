# Feature: LiveAct 1/7 — Contract + Engine-Kern

<!-- refined by @implement from issue #329 on 2026-09-21 -->

## Intent

Provider-neutralen LiveAct-Core als Character-Capability einführen und die bestehende
`AvatarFaceTrackingRuntime` wrappen statt einen zweiten Tracker zu bauen. Pro Tick ein
atomarer `LiveActFrameV1` mit Head, getrenntem Eye-Gaze und allen 52 Face-Channels —
ohne happy/angry/aa-Kollaps.

## Preconditions

- Browser mit `getUserMedia` (oder injizierter Detector in Tests)
- First-party MediaPipe under `/mediapipe/**` (wie #243)
- Kein zweiter Renderer / kein `src/modules/**`

## Happy Path

- [ ] `LiveActFrameV1` provider-neutral: `timestampMs`, monotone `sequence`, `confidence`,
      `trackingLost`, Head yaw/pitch/roll, getrennter linker/rechter Eye-Gaze,
      typed Facial-Channel-Record; Domain ohne MediaPipe/DOM/Three/React
- [ ] `LiveActFaceChannel` bildet die 52 Face-Blendshape-Semantiken ab und reduziert
      sie NICHT auf happy/angry/aa
- [ ] `LiveActEngine` start/stop/dispose + status/frame subscription; wrappt vorhandenen
      MediaPipe-Webcam-Pfad; höchstens eine aktive Kamera-/Detector-Instanz
- [ ] Legacy `AvatarFaceTrackingRuntime` bleibt Compatibility-Fassade; kein zweiter
      MediaPipe-Loader/Modellpfad; `npm run test-gate` grün
- [ ] Touched files: zero type escape hatches

## Edge Cases

- [ ] Zweiter Consumer: Single-owner / kein zweiter Stream
- [ ] Start während `starting`: idempotent
- [ ] Stop während `starting`: späterer Stream/Detector sofort disposed
- [ ] Face lost → `trackingLost` + kontrolliertes Neutral-Ease
- [ ] denied/unsupported/error als typed Status, keine unhandled rejections

## Security Coverage

| Item | Applicable | How satisfied |
|------|------------|---------------|
| F-03 Camera only after explicit action | yes | Engine `start()` only; `audio: false` |
| P-04 No sensitive data persistence | yes | Frame carries no video/landmarks; privacy assert |
| B-01 / B-04 / B-07–B-09 | n/a | no backend / no Supabase writes |

## Regression

- [ ] Existing Face Tracking Editor/Player/Session wiring still compiles and check scripts pass

## Assumptions

- Full 52-channel scores come from MediaPipe Face Landmarker blendshape categories when available;
  legacy drive mapping remains for AvatarFaceTrackingRuntime consumers until 4/7.

## Screenshots

N/A — no UI in this slice.

## Implementation Notes

- Domain: `src/domains/character/liveact/**` — FrameV1, 52 channels, capabilities, no MediaPipe/DOM/Three/React.
- Infra: `LiveActEngine` + shared `mediapipe-face-source` paths + camera claim + avatar output port.
- Legacy `AvatarFaceTrackingRuntime` re-exports shared MediaPipe paths and joins the shared camera claim.
- Check: `scripts/liveact-core-check.mjs` wired into `test-gate.mjs`.
