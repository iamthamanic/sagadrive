# Verify Ticket — liveact-human-ground-truth-repair (#423) compact repro closeout

- Date: 2026-10-02
- HEAD: post-compact-republish (working tree → commit)
- Verdict: PASS

## Checks
- `npm run test-gate` PASS (includes face3 Functional 7/7 publish hard gate)
- Compact-base reauthor×2 deterministic (m5/f5 Case B)
- Smile/pucker expectNeg body-leak = 0; visual PASS
- Publish + pack + resolver `quality5-face3-repro1`
- Final identities: m5 GLB `ea483b38266b0afc…` / VRM `7d32f2f4041314ef…`; f5 GLB `871e38a732748027…` / VRM `3d288739ce733732…`

## Acceptance
Happy Path + Coupled Shell + Reproducibility closeout checked against compact published assets.
