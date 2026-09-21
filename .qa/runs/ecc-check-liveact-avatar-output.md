# ECC Check — liveact-avatar-output (#332)

- Scope: LiveAct 4/7 avatar output slice
- Verdict: **PASS**

## Layer (#94)

- Domain aliases + capabilities: pure TS
- Adapters: infrastructure (Three/VRM)
- Bind wiring: app slice only

## Security

- No new persistence or network from output path

## Quality

- `liveact-avatar-output-check.mjs` + full test-gate required before merge
