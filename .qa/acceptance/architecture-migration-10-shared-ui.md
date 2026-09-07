# Acceptance — architecture-migration-10-shared-ui (#174)

## Intent
Move remaining fachlich neutrale UI from `src/components/**` into `src/shared/ui/**`; keep domain-coupled widgets in character app slices.

## Happy Path
- [x] `components/ui/**` → `shared/ui/**` (canonical kit)
- [x] AttributeD20Icon, AttributeDerivedConnector, figma/ImageWithFallback → `shared/ui`
- [x] DerivedStatCard, IdentityPreviewPills → `app/character/shared` (feature-coupled)
- [x] InventoryItemThumb → `app/character/inventory` (domain-coupled)
- [x] All consumers retargeted; `src/components/**` deleted
- [x] shared/ui index exports primitives + presentation helpers

## Edge Cases
- [x] No compatibility barrels left pointing at `components/**`
- [x] Feature UI not dumped into shared/ui

## Composition Gate
See `.qa/runs/composition-gate-architecture-migration-10-shared-ui.md`
