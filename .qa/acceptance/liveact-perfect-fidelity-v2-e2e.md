# Feature: LiveAct Perfect Fidelity V2 E2E (#451)

## Intent

Ship a reproducible Premium E2E gate for Epic #442: dual-avatar PerformanceFace
validation, hybrid→Premium drive + apply wiring, Standard fallback green,
benchmark report without biometric commits.

## Preconditions

- #450 CLOSED on main
- Slug: `liveact-perfect-fidelity-v2-e2e`
- Branch: `agent/liveact-premium-e2e-gate`

## Happy Path

- [ ] Design + acceptance artifacts present
- [ ] `drivePerformanceFaceWeights` maps hybrid/semantic → Premium controls
- [ ] GLTF/VRM apply PerformanceFace when `premiumEligible`
- [ ] Engine feeds drive weights after retarget
- [ ] Gate validates canonical inventory (Standard or documented Premium blocker)
- [ ] Gate validates external Premium inventory (Premium PASS, no filename hack)
- [ ] Contour metric measured on Premium apply path
- [ ] Benchmark summary JSON under `.qa/runs/`
- [ ] Gate wired into `test-gate`
- [ ] Privacy: local capture gitignored; no media in evidence

## Edge Cases

- [ ] ARKit-only → Standard PASS / Premium NOT AVAILABLE / import allowed
- [ ] Manifest/filename premium claim ignored
- [ ] Canonical without Premium morphs → blocker-specific FAIL documented, not silent

## Security Coverage

| Item | How |
|------|-----|
| No biometrics committed | Evidence JSON only; local dir gitignored |
| Fail closed claims | Reuse #450 manifest/filename rules |

## Implementation Notes

- Drive: `liveact-performance-face-drive.ts`
- E2E: `liveact-perfect-fidelity-v2-e2e.ts` + `scripts/liveact-perfect-fidelity-v2-e2e-check.mjs`
- Runtime: engine → `applyPerformanceFaceWeights` on GLTF/VRM when Premium eligible
- Canonical face3: Standard OK + documented Premium morph blocker
- External: committed inventory fixture Premium PASS
- Contour: MEASURED on Premium apply path; hybrid AB points to #451

## Composition Gate

```text
hybrid/semantic → drive → validate dual inventories → apply Premium weights → contour + report
```
