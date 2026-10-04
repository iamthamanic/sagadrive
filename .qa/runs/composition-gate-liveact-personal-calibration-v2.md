# Composition Gate — liveact-personal-calibration-v2 (#449)

- Verdict: **CLEAR**
- Branch: `agent/liveact-personal-calibration-v2`
- Date: 2026-10-04

## Hop chain (runtime)

```text
authenticated owner + character
→ setPersonalCalibrationScope
→ scoped profile load (or none)
→ MediaPipe → #447 hybrid → mirror once → map
→ #448 adaptive temporal
→ Personal V2 apply (or Classic V1 when personalProfile null)
→ retarget → avatar
```

## Scope switch

```text
scope switch
→ old personal profile detached
→ new scoped profile loaded (or missing)
→ no `_default` leakage
```

## Capture

```text
Premium UI start
→ valid samples accumulate validCaptureMs (bounded gaps)
→ tracking lost → clock + countdown pause
→ phase complete only with duration + min frames
→ finalize Profile V2
→ save (owner+character) or session-only if persist fails
→ applyPersonalProfile → runtime
```

## Classic override

```text
Classic selected
→ personalProfile runtime cleared (stored Premium kept)
→ Classic baseline/range apply
→ reload/new engine may restore scoped Premium
```

## Invalidation

```text
fingerprint mismatch → needsRecalibration (no silent apply)
missing scope → no persistent load/save
storage write fail → session-active + truthful copy
```

## Flags

none
