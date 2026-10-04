# Verify Ticket — liveact-hybrid-mouth-face-solver (#447)

- Verdict: **PASS**
- Date: 2026-10-04
- Branch: `agent/liveact-hybrid-mouth-face-solver`
- Previous HEAD: a1252957222d6f48ac22d2a1b7bce0e7fd8e554f
- Base/main: 8136a3c90af8ffa164afdd9365876836c41d5c18
- verify-ui: **N/A** (no UI/control surface changed)

## Checks
- Design + acceptance present (CE-04 / CE-20 + N/A for other CE)
- `scripts/liveact-hybrid-mouth-face-solver-check.mjs` PASS
- Wired into `npm run test-gate` → PASS
- Orientation: anatomical semantic + dense → hybrid → mirror once
- Fusion order: high-confidence disagreement before under/over correction
- Neutral leakage: `hy-neutral-realistic-geometry` max unintended ≤ 0.08
- Jaw: static `chinDrop` not used as activation; gapCenter open-only
- Press/roll: inverse-gap gated on compression
- A/B: `activeUnderResponseMedianAbs` reported + gated (≥ 0.05)
- Clean active-control non-degradation PASS
- Exact V1 fallback (dense null / stale sequence)
- `#446` iris gate PASS; V1 frame not polluted

## Non-goals confirmed
No #448 temporal, #449 calib, #450 morphs, #446 gaze changes, Gain-4.
