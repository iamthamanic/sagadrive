# Design: liveact-adaptive-temporal-solver (#448)

## Why

V1 uses one frame-based EMA (`smooth = 0.35`) for head, gaze, blink, and all
face channels. That couples FPS to filter character, over-smooths lips/gaze, and
under-smooths head jitter. #448 replaces only the smooth stage with a
deterministic, time-based, signal-group adaptive temporal solver.

## Boundaries (hard)

```text
Temporal Solver
≠
Range Calibration
≠
Personal Calibration (#449)
≠
Retarget Gain
≠
#447 Hybrid fusion
≠
#446 Iris gaze solve
```

```text
same value sequence + same timestamps + same initial state
→ same temporal output
```

## Pipeline seat

```text
map
→ adaptive temporal  (replaces smoothLiveActFrame in production)
→ calibration
→ retarget
→ avatar
```

`smoothLiveActFrame(α=0.35)` remains the authoritative **V1 fixed-smoothing
baseline** for A/B. Diagnostics stage `SMOOTHED` = adaptive temporal output.

## Algorithm

Adaptive continuous-time one-pole (no Kalman, no prediction, no momentum):

```text
alpha(dt, tau) = 1 - exp(-dt / tau)
output = previous + alpha * (target - previous)
```

Per signal group:

```text
speed = |target − previousInput| / dtSeconds
response = smoothstep(speedSlow → speedFast)
tau = lerp(tauSlow, tauFast, response)
```

## Predeclared policy parameters (tuning set)

| Group | tauSlow (ms) | tauFast (ms) | speedSlow (/s) | speedFast (/s) |
|-------|--------------|--------------|----------------|----------------|
| head | 90 | 28 | 0.4 | 3.5 |
| gaze | 18 | 6 | 0.8 | 8 |
| blink | 6 | 3 | 2 | 20 |
| lips | 18 | 7 | 0.35 | 5 |
| brows | 50 | 16 | 0.5 | 6 |
| cheeksNose | 42 | 14 | 0.5 | 6 |
| defaultFace | 42 | 14 | 0.5 | 6 |

Validation fixtures are separate from tuning fixtures. Do not retune to chase
single golden numbers after validation is frozen.

## Time / dt policy

- `dtMs = currentTs − previousTs`
- non-finite / ≤0 → use `DEFAULT_DT_MS = 33.333`
- clamp filter dt to `[1, 100]` ms
- `dtMs > LONG_GAP_MS (250)` → rebase (init from current target; no long-gap explosion)
- pause / long gap uses rebase, not a giant exponential step

## Lifecycle

| Event | Temporal behavior |
|-------|-------------------|
| tracking lost | face → neutral; head/eyes ease toward 0 with group policy; mode=`lost` |
| reacquire | **reset from current input** — no pre-loss blend |
| model swap (`bindOutput`) | clear temporal state |
| stop / dispose | clear temporal state |
| pause → resume with long gap | rebase |

## Success rules (predeclared)

### Head
- neutral jitter p95 reduced vs V1 OR already ≤ V1
- fast step: additional lag not worse than V1 by > 40 ms
- overshoot not worse than V1
- return within speech/return target band

### Gaze
- #446 angular quality preserved (no iris code changes)
- rapid switch: adaptive lag ≤ V1 + 20 ms
- no meaningful overshoot regression

### Blink
- peak ≥ 0.95 on full-blink fixture
- no material L/R cross-talk regression vs V1

### Lips (hard)
- 1–5 Hz amplitude retention **90–110%**
- additional lag p95 **≤ 66 ms**
- return additional lag **≤ 70 ms**
- saturation **< 5%**

### Speech
- #444 metrics: correlation / lag / amp / vel / sat / return
- report V1 fixed vs adaptive honestly

### Determinism / FPS
- 30 Hz vs 60 Hz comparable within declared tolerance
- dropped-frame fixture: no NaN / overshoot / explosion

## Overshoot metric (#444 extension)

`fidelityOvershoot` — max amount output exceeds a monotonic step target
envelope after onset (pure domain, versioned in fidelity math).

## CE (PERFORMANCE mode)

- **CE-04** — latencies within lip/gaze/runtime targets above
- **CE-20** — lost/reacquire/dropped frames: defined degraded path, no stale leakage
- Other CE: N/A — no UI/control surface changed

## Non-goals

#449 personal calib, #450 morphs, prediction/momentum, second gaze driver,
changing #446/#447 solvers, embedding temporal into `LiveActFrameV1`.
