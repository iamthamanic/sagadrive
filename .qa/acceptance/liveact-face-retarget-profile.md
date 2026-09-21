# Acceptance: liveact-face-retarget-profile

## Feature slug
`liveact-face-retarget-profile`

## Intent
Pure-domain `LiveActRetargetProfileV1` (gain + deadZone only) runs once before avatar output; production stays identity until QA documents overrides.

## Happy Path
1. Identity profile leaves face channels unchanged.
2. gain/deadZone transform then clamp 0..1; `_neutral` never amplified.
3. Engine applies retarget only to `applyLiveActFrame`; listeners keep semantic frame.
4. trackingLost skips retarget (adapter still resets).

## Out of scope
Curve UI, ML, persistence, filename-based profile selection, non-identity prod without QA evidence.
