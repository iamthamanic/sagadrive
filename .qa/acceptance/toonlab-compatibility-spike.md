# Acceptance — toonlab-compatibility-spike (#341)

## Intent
Prove with real SagaDrive avatar assets whether `@call-me-sensei/toonlab` can integrate with the current avatar renderer, and record an explicit GO or BLOCKED decision with a concrete integration path.

## Acceptance
- [x] Spike tests `human-male` GLB plus an existing VRM/MToon fixture under a documented identical-camera PBR vs Toon matrix.
- [x] Animation/skeleton, morph targets, alpha/transparency, PBR map bindings, and portrait capture are explicitly checked (host baseline vs ToonLab path).
- [x] Result documents **BLOCKED** and names the minimal unblock/integration path; no silent renderer upgrade.
- [x] Performance/renderer risks and required version changes are documented in `.qa/design/toonlab-compatibility-spike.md`.
- [x] Touched files: zero type escape hatches (typed-strict).

## Composition Gate
SKIPPED — docs + isolated spike analysis/inventory; no durable producer→consumer hop.

## Out of scope
Productive Look UI, DB persistence, Saga/Session runtime adapter (#342+).
