# Feature: LiveAct Semantic Face Morph Validator V2 (#401)

## Intent
Offline semantic QA for face morph channels: expected-region energy, forbidden leakage, left/right dominance, and combination poses — on top of existing Khronos + structural SagaDrive gates (#383).

## Happy Path
- [x] Validator measures per-channel expected-region energy, leakage, and side correctness with versioned thresholds (`liveact-face-semantic-profile-v1.mjs`).
- [x] Core channels and combination poses are deterministically gated; violations name channel + region/threshold.
- [x] V1 structural checks unchanged; semantic runs when `--anchors` / `face-anchors.json` is supplied (skipped otherwise for m5/f5 repro).
- [x] Fixtures prove PASS and intentional FAIL (jaw forehead leak, smile wrong side).
- [x] No type escape hatches in touched TS (scripts-only slice).

## Edge Cases
- [x] Missing anchors → `semanticQa.skipped` with `no_anchors_manifest`.
- [x] Malformed anchors / GLB → fail closed.

## Regression
- [x] `npm run test-gate` includes `liveact-face-semantic-validator-check.mjs`.

## Implementation Notes
- Profile: `scripts/lib/liveact-face-semantic-profile-v1.mjs`
- Engine: `scripts/lib/liveact-face-semantic-validate.mjs`
- Orchestration: `scripts/lib/liveact-face-asset-validate.mjs` + CLI `--anchors`
- Gate: `scripts/liveact-face-semantic-validator-check.mjs`
