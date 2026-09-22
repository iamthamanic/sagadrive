# Acceptance — liveact-facial-fidelity-v2 (#403)

## Intent
Finalize runtime facial fidelity: exclusive gaze path, identity retarget (evidence-gated),
and a gear-panel RAW→APPLIED channel table.

## Commands
```bash
node scripts/liveact-facial-fidelity-v2-check.mjs
node scripts/liveact-avatar-output-check.mjs
node scripts/liveact-retarget-profile-check.mjs
node scripts/liveact-diagnostics-v2-check.mjs
```

## Pass criteria
- [x] Exactly one gaze drive path (bones → LookAt → morphs); eyeLook morphs skipped when pose gaze active
- [x] Blink/Squint/Wide remain facial channels (not gated by gaze path)
- [x] Retarget registry returns identity by default; no filename-based overrides
- [x] Gear inspector shows full-channel RAW / Retargeted / Applied table (not on face overlay)
- [x] Tracking lost still resets head/eyes/face via existing output reset
- [x] Zero type escape hatches on touched files
