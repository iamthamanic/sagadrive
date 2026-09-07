# Acceptance — architecture-migration-11-eradicate (#175)

## Intent
Final eradication of legacy roots and docs; harden CI so `modules`/`components` cannot return.

## Happy Path
- [x] `src/modules/**` and `src/components/**` do not exist
- [x] `architecture-boundary-check` fails if those roots are recreated (`checkEradicatedLegacyRoots`)
- [x] AGENTS.md + ARCHITECTURE.md describe only #94 layers
- [x] Removed leftover RuleHelp compatibility re-export under progression
- [x] test-gate green

## Composition Gate
See `.qa/runs/composition-gate-architecture-migration-11-eradicate.md`
