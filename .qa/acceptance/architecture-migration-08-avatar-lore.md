# Acceptance — architecture-migration-08-avatar-lore (#172)

## Intent
Remove `src/modules/characters/**` entirely by migrating avatar + lore into #94 layers.

## Happy Path
- [x] Lore contracts/traits/examples → `domains/character`
- [x] Lore edge-function service → `infrastructure/character/character-lore-service.ts`
- [x] Avatar presets/URL helpers → `domains/character/use-cases/avatar-presets.ts`
- [x] Asset manifests + CharacterStudio runtime/parser → `infrastructure/character/avatar/*`
- [x] `AvatarCanvas` → `app/character/avatar/AvatarCanvas.tsx`
- [x] `src/modules/characters/**` deleted; no remaining imports
- [x] Consumers + avatar/character regression scripts retargeted

## Edge Cases
- [x] Three.js runtime stays out of domain
- [x] No compatibility barrels left for characters module

## Composition Gate
See `.qa/runs/composition-gate-architecture-migration-08-avatar-lore.md`
