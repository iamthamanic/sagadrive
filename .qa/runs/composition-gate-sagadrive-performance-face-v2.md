# Composition Gate — sagadrive-performance-face-v2

- HEAD_SHA: WORKTREE (base `c71b6a2e99695627d1dabfeb51d132b2a0abc897` + #450 impl uncommitted)
- Date: 2026-10-04
- Verdict: CLEAR

## Event

Parsed avatar morph/expression inventory is validated into a PerformanceFace capability
level + DE report; import and LiveAct Caps V1 continue without Premium blocking.

## Hop chain

```text
presentTargetNames (+ bones/gaze/arkit)
→ resolvePerformanceFaceTargets (explicit aliases)
→ validatePerformanceFaceV2 (level 0–3, missing lists)
→ evaluateImportOriginalPerformanceFace | getPerformanceFaceReport (bind)
→ composeLiveActWithPerformanceFace (Caps V1 × PerformanceFace)
→ DE report / applyPerformanceFaceWeights (#451 drivers)
```

## Simulations

| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| 1 event, N actors | Same asset bytes → same report for every bind/import | Pure validator; no shared mutable Premium claim | pass |
| invalid / missing | Manifest/filename “premium” without morphs → not Premium; import allowed | `parsePerformanceFaceManifestV1` fail-closed; filename ignored; `importAllowed: true` | pass |
| 2 consumers / crash | Two binds / import+bind read same evidence, no double side-effect | No network persist; report is derived snapshot per call | pass |

## Flags

| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| — | — | — | — | — |

## Skip reason

n/a
