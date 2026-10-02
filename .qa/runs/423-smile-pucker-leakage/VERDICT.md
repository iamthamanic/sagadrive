# Smile/Pucker Surface Leakage Evidence (#423)

## Verdict
**Case B confirmed** on previously published face3; **fixed** in current-HEAD compact reauthor.

## Measurement (old published face3)
### m5 components 65 / 284
- Dominant joints: Spine/neck/Shoulder family
- onGtSurfaceFrac = 0, topoReachableFrac = 0
- nonzero authored deltas (not FP roundtrip noise)

### f5 component 105
- same pattern: Euclidean-near, topologically disconnected body shell

## Fix
Reuse `buildGtBoundSurfaceGate` + topology hops for smile L/R and pucker (no coupled-shell transfer).

## Post-fix (reauthor-current compact base, HEAD a3424e1+)
- smile L/R + pucker: expectNeg hits = 0, off-surface nonzero = 0, bodyLeak = 0 (m5+f5)
- jawOpen off-surface nonzero is coupled-shell secondary only; expectNeg 65/284/105 rejected; bodyLeak = 0

PASS for Finding 4 closeout.
