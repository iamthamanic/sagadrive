# Acceptance — architecture-migration-02-rulesets (#166)

## Intent
Remove `src/modules/rulesets/**` entirely; consumers use domains/infrastructure/app APIs only.

## Happy Path
- [x] Pure SagaDrive rule barrels deleted; imports point at `domains/rules/sagadrive/*`
- [x] Catalog types in `domains/rules/ruleset-catalog`
- [x] Persistence in `infrastructure/rulesets/ruleset-service.ts`
- [x] Hooks + RulesetsTest under `app/rulesets/**`
- [x] No remaining `modules/rulesets` imports in src

## Edge Cases
- [x] No compatibility barrels left under modules/rulesets
- [x] App does not import paths containing `supabase` (service file named without supabase)

## Composition Gate
See `.qa/runs/composition-gate-architecture-migration-02-rulesets.md`
