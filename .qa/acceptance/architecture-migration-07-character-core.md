# Acceptance — architecture-migration-07-character-core (#171)

## Intent
Migrate character-core out of `src/modules/characters/**` except avatar/lore (left for #172).

## Happy Path
- [x] Character-core (types, presets, adventure-arcs, genderReading, list hooks, carousel hooks, bootstrap barrels) removed from `modules/characters`
- [x] Contracts → `domains/character/contracts/*`
- [x] Preset + adventure-arc services → `infrastructure/character/*-service.ts`
- [x] List/carousel hooks + bootstrap consumers → `app/character/{list,shared,creation,progression,edit}`
- [x] `modules/characters/index.ts` exports avatar + lore only
- [x] Consumers (CharacterEditor, Library, Dashboard, creation/progression, scripts) use canonical paths
- [x] Avatar/lore imports remain on `modules/characters` (in scope for #172)

## Edge Cases
- [x] No new compatibility barrels for migrated core
- [x] DTO/persist shapes unchanged (move + import rewrite only)
- [x] Freeze baseline deletions allowed (boundary check green)

## Composition Gate
See `.qa/runs/composition-gate-architecture-migration-07-character-core.md`
