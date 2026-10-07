# Acceptance — avatar-spike-promote (#323)

Slug: `avatar-spike-promote`

## Intent
Promote three production-referenced Avatar domain modules out of `*-spike*` /
`*-benchmark*` filenames so agents no longer treat live contracts as disposable
exploration — without changing runtime behavior.

## Given / When / Then

### Files promoted
- Given the three modules were productively imported
- When #323 Option 1 lands
- Then paths are:
  - `identity-transfer-v1.ts`
  - `custom-rig-decision-v1.ts`
  - `modular-generate-decomposition-v1.ts`
- And the old `*-spike-v1` / `custom-rig-benchmark-v1` domain paths are gone

### Consumers rewired
- Given body-conversion / custom-creature / modular-generate flows
- When they import the contracts
- Then they use the new module paths; barrel exports stay available

### Gates
- Given historical check scripts used `*-spike-check` names
- When test-gate runs
- Then `avatar-v2-identity-transfer-check`, `avatar-v2-custom-rig-decision-check`,
  and `avatar-v2-generate-decomposition-check` PASS

### Behavior
- Given golden matrices and decision helpers
- When invariants / resolve / plan APIs run
- Then outcomes match prior Spike/Benchmark semantics (no product behavior change)

## Composition Gate
- Verdict: SKIPPED (rename/rewire only; no new producer→consumer side-effect path)
