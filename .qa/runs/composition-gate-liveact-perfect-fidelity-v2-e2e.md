# Composition Gate — liveact-perfect-fidelity-v2-e2e

- HEAD_SHA: 8298a6d0c12c1b325e9b9dc9e0fb29d632f5399b
- Date: 2026-10-04
- Verdict: CLEAR

## Event
Hybrid/semantic face → PerformanceFace drive → dual-avatar validate → Premium apply → contour report.

## Hop chain
```text
hybrid+face → drivePerformanceFaceWeights
→ validatePerformanceFaceV2 (canonical + external)
→ applyPerformanceFaceWeights (Premium only)
→ measurePerformanceFaceContourProxy → e2e summary
```

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N actors | Same inventories → same reports | Pure domain | pass |
| invalid | Filename premium ignored; canonical Premium blocker explicit | fail-closed | pass |
| 2 consumers | Engine+gate both derive weights; no network fan-out | pass | pass |

## Flags
none

## Skip reason
n/a
