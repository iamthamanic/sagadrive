# Composition Gate — liveact-adaptive-temporal-solver (#448)

- Verdict: **CLEAR**
- Branch: `agent/liveact-adaptive-temporal-solver`
- Final PR HEAD verified: `67b0ebf018ff0055431ddfd7b42ca77e0c7568e5`

## Hop chain (happy path)

```text
MediaPipe detect
→ #445 dense + #446 iris → eyes
→ #447 hybrid (anatomical) → mirror once
→ mapLiveActSourceSample
→ stepAdaptiveTemporal (per-group, dt-based)
→ applyLiveActCalibration
→ applyLiveActRetargetProfile
→ avatar
```

## Lifecycle

```text
active → tracking lost
  → face neutral; head/eyes ease; temporal mode=lost
→ reacquire
  → rebase from current input (no pre-loss revive)
```

```text
model A → bindOutput(model B)
  → pipelineStep/temporal cleared
  → calibration baselines unchanged
```

## Flags

none
