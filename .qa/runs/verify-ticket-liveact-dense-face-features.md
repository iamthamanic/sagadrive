# Verify Ticket — liveact-dense-face-features (#445)

- Verdict: **PASS**
- Date: 2026-10-03
- verify-ui: **N/A** (no UI changes)

## Checks
- Design + acceptance present
- `scripts/liveact-dense-face-features-check.mjs` PASS
- Wired into `npm run test-gate`
- Face-local orthonormal normalization + rigid-transform invariance
- Lips / eyes / brows / cheeks / nose / jaw region features
- Anatomical L/R semantics (no extraction mirror)
- Partial availability + degenerate fail-closed
- Engine dense side-channel (`subscribeDenseFaceFeatures`) — not in LiveActFrameV1
- #444 contour metric measurable at feature level
- Privacy gitignore + evidence guard
- No type escape hatches in touched TS

## Non-goals confirmed
No iris gaze (#446), mouth→avatar (#447), temporal (#448), personal calib (#449),
PerformanceFaceV2 (#450), premium E2E (#451), 478→mesh warp, morphs, retarget gains.
