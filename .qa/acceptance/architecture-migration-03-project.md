# Acceptance — architecture-migration-03-project (#167)

## Intent
Remove `src/modules/projects/**`; move ProjectJoin to `app/project/**`; contracts/infra/hooks in #94 layers.

## Happy Path
- [x] `modules/projects` gone
- [x] contracts → `domains/project/contracts`
- [x] services → `infrastructure/project/*`
- [x] hooks + ProjectJoin → `app/project/**`
- [x] security/regression scripts retargeted
