# Design: liveact-perfect-fidelity-v2-e2e (#451)

## Why

Close Epic #442 V2 8/8: prove Premium E2E on Canonical Human + ≥1 external
avatar using #450 PerformanceFaceV2, without committing biometrics.

## Boundaries

```text
#451 E2E gate + Premium drive/apply wiring
≠ inventing PerformanceFace contract (#450)
≠ changing temporal (#448) or personal calib (#449) policies
≠ Canonical Human secret vertex rules
```

## Locked decisions

1. **Drive mapping** — hybrid/semantic → PerformanceFace weights via explicit table
2. **Apply** — after ARKit morphs when bind report `premiumEligible`
3. **Canonical face3** — today Standard-only (no Premium morphs) → **documented blocker FAIL** for Premium eligibility; Standard remains green
4. **External Premium** — committed morph-name inventory fixture proving Premium contract (no filename hacks)
5. **Contour** — measurable on Premium apply path (dense lip contour + applied PerformanceFace weights); hybrid AB field updated to reference #451 measurement
6. **Privacy** — local capture root gitignored; evidence is JSON inventories/reports only

## Hop chain

```text
fixture semantic+dense → hybrid → calib/temporal (reuse)
→ drivePerformanceFaceWeights
→ validatePerformanceFaceV2 (canonical + external)
→ applyPerformanceFaceWeights (Premium only)
→ contour metric + benchmark summary
```
