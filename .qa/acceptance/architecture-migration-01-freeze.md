# Acceptance — architecture-migration-01-freeze (#165)

## Intent
Freeze legacy paths: no new files under `src/modules/**` or feature `src/components/**` (except `components/ui`); document #94 as sole target; harden architecture gate with baseline.

## Preconditions
- Baseline committed at `.qa/architecture/legacy-freeze-baseline.json`
- `scripts/architecture-boundary-check.mjs` runs in test-gate

## Happy Path
- [x] Gate rejects a path not in the freeze baseline
- [x] Gate allows fewer current paths than baseline (deletions)
- [x] Live repo passes with current = baseline (or fewer)
- [x] `AGENTS.md` + `src/ARCHITECTURE.md` state #94-only + legacy transitional
- [x] Self-test covers freeze reject + allow-delete

## Edge Cases
- [x] `components/ui/**` not counted as frozen feature paths
- [x] Missing baseline → violation
- [x] Rename/new path fails (not in baseline)

## Composition Gate
See `.qa/runs/composition-gate-architecture-migration-01-freeze.md`

## Out of scope
- Domain migrations (#166+)
- Deleting existing legacy wholesale
- UI redesign
