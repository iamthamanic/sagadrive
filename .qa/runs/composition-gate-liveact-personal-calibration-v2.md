# Composition Gate — liveact-personal-calibration-v2 (#449)

- Verdict: **CLEAR**
- Branch: `agent/liveact-personal-calibration-v2`

## Hop chain

```text
MediaPipe → #447 hybrid → mirror once → map
→ #448 adaptive temporal
→ Personal V2 apply (or V1 calib fallback)
→ retarget → avatar
```

## Capture

```text
Premium UI start
→ 6 auto phases (skip N/A allowed)
→ finalize Profile V2
→ localStorage save (fingerprint)
→ applyPersonalProfile → runtime
```

## Invalidation

```text
fingerprint mismatch → needsRecalibration (no silent apply)
storage missing → V1 / empty
```

## Flags

none
