# Verify Ticket — liveact-iris-gaze-solver (#446)

- Verdict: **PASS**
- Date: 2026-10-03
- verify-ui: **N/A** (no UI changes)

## Checks
- Design + acceptance present
- `scripts/liveact-iris-gaze-solver-check.mjs` PASS
- Wired into `npm run test-gate`
- Iris contour provenance from `@mediapipe/tasks-vision@0.10.14` API
- Reuses `#445` `buildDenseFaceLocalFrame`
- Head-relative invariance PASS
- Per-eye solve + blendshape fallback arbitration
- A/B: iris median beats blendshape-only baseline
- `#444` stretch targets PASS on synthetic geometric fixtures
- No type escape hatches; V1 frame not polluted

## Non-goals confirmed
No mouth/cheek solver, temporal filter, personal calib V2, new morphs, second gaze driver.
