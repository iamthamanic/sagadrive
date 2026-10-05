# Design: look-runtime-adapter (#342)

## Decision

Given #341 ToonLab spike **BLOCKED**, ship provider-neutral LookRuntime now:

1. **host-mtoon** — default realtime adapter (existing MToon snapshot/restore + lights)
2. **toonlab** — stub adapter documenting peers/renderer gates; no package install

## Apply sequence

```
restore material snapshots
→ select adapter (host unless ToonLab GO + prefer)
→ apply character / lighting / postFx capability handlers
→ reserved domains no-op
```

## Non-goals

Library UI, three/VRM bump, WebGPU preview surface, world reserved domains.
