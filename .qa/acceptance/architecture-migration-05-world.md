# Acceptance — architecture-migration-05-world (#169)

## Intent
Remove `src/modules/worlds/**`; world profile editor + item catalog as app/world vertical slices.

## Happy Path
- [x] modules/worlds gone
- [x] contracts + registry → domains/world
- [x] service → infrastructure/world
- [x] profile-editor + item-catalog slices under app/world
- [x] scripts/consumers retargeted
