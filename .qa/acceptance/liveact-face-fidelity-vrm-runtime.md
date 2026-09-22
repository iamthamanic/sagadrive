# Acceptance — liveact-face-fidelity-vrm-runtime (#406)

## Intent
Close Epic #396 with a reproducible aggregate gate: VRM-primary Human M/W,
GLB fallback retained, overlays/metrics/diagnostics, exclusive gaze, semantic QA,
and Playwright fidelity smoke (fake camera only).

## Commands
```bash
node scripts/liveact-face-fidelity-e2e-check.mjs
npx playwright test e2e/liveact-face-fidelity.spec.ts e2e/liveact-viewport-smoke.spec.ts
```

## Pass criteria
- [x] Aggregate orchestrates diagnostics, facial fidelity, overlays, human repro, species VRM resolver, VRM pack, avatar output, retarget
- [x] Public m5/f5 `.vrm` primary + `.glb` fallback both present
- [x] Playwright fidelity spec covers gear/channel-table/metrics/overlay lifecycle
- [x] No real biometric recordings committed
- [x] Wired into test-gate
