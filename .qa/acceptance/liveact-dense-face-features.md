# Acceptance: liveact-dense-face-features (#445)

## Contract

- [ ] `SagaDriveLiveActDenseFaceFeaturesV1` exists (provider-neutral)
- [ ] No MediaPipe indices in domain contract / extractors
- [ ] `SagaDriveLiveActFrameV1` unchanged (no landmarks / dense payload)
- [ ] Every feature has `available` / `value: number|null` / `confidence` 0..1
- [ ] Unavailable → null value (not fake 0); no NaN/Infinity outputs

## Normalization

- [ ] Translation / uniform scale / yaw / pitch / roll invariance within documented tolerance
- [ ] Mouth/jaw motion does not define the head frame
- [ ] Degenerate input fail-closed

## Regions

- [ ] Lips: width, gap L/C/R, contours, curvature, compression, protrusion, corners, asymmetry
- [ ] Eyes: bilateral opening + upper/lower lid; unilateral blink semantics
- [ ] Brows: inner/mid/outer bilateral
- [ ] Cheeks: raise, compression, volume proxy L/R
- [ ] Nose: alar + nasolabial L/R (+ width if justified)
- [ ] Jaw: chin drop, chin forward proxy, jaw width

## Quality

- [ ] Left/right anatomical semantics (no accidental mirror in extraction)
- [ ] Partial missing points → affected features unavailable; others valid
- [ ] Deterministic synthetic fixtures + rigid-transform fixtures
- [ ] Privacy: no committed raw landmarks / real face traces
- [ ] No smoothing / calibration / avatar mapping / iris gaze solver
- [ ] Authoritative gate: `scripts/liveact-dense-face-features-check.mjs` in test-gate
- [ ] `npm run test-gate` PASS
- [ ] Existing #423 / #424 / #444 gates still PASS

## Non-goals (must remain out of scope)

- Iris gaze (#446), mouth→avatar (#447), temporal (#448), personal calib (#449),
  PerformanceFaceV2 (#450), premium E2E (#451), 478→mesh warp, new morphs
