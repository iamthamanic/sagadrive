# Review Ticket — liveact-dense-face-features (#445)

- Verdict: **ACCEPT**

## Focus
- No MediaPipe indices in domain
- No 478→avatar mapping
- No raw landmark persistence
- No V1 frame pollution
- Upper-face basis (eyes/forehead) — mouth/jaw not used for head frame
- Orthonormal Gram–Schmidt + nose-tip Z sign stabilize
- No smoothing / calibration / iris / avatar solver
- Anatomical L/R correct (smile/blink fixtures)
- Deterministic fixtures + invariance
- Reuses #421 anchor map (no duplicate index SoT)

## Findings
none blocking
