# Review Ticket — liveact-iris-gaze-solver (#446)

- Verdict: **ACCEPT**

## Focus
- API-backed iris indices only (no 468/473 hardcodes)
- No MediaPipe indices in domain
- Reuse #445 normalization (no second face basis)
- Head-relative hard contract
- Per-eye before any binocular aggregate
- Blendshape fallback retained
- No second avatar gaze driver
- A/B measurable gain vs V1 (no target weakening)
- Minimal neutral offsets only (not #449)

## Findings
none blocking
