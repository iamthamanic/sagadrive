# ECC Check — liveact-rig-debug (#333)

- Scope: LiveAct 5/7 rig debug + capability inspector
- Verdict: **PASS**

## Layer (#94)

- Inspector rows: domain pure TS
- SkeletonHelper: infrastructure only
- Toggle state: `app/character/liveact/**`

## Security

- No persistence; local ephemeral debug

## Quality

- `liveact-rig-debug-check.mjs` + full test-gate PASS
