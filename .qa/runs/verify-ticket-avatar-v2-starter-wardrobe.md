# Verify Ticket — avatar-v2-starter-wardrobe (#257)

- Date: 2026-09-19
- Base: 4bd2bd9a2a1105451efe20caffc683d4d0e33c48
- HEAD: 6d8293281af64bbc3682ec18076ec79c53392212

## Ergebnis
PASS

## Checks (@test-gate)
- npm run test-gate → PASS (includes avatar-v2-starter-wardrobe-check)
- typed-strict on touched TS: no any / ts-ignore
- Secrets diff: PASS

## Acceptance mapping
- 6 wearables × 3 families: listStarterWearableManifests + assertStarterWardrobeComplete
- Metadata slot/family/versions/hide: StarterWearableManifestV1
- Golden matrix 18: listGoldenFitMatrixEntries + fixtures
- No species-dup contract: family resolver via SPECIES_DEFAULT_BODY_FAMILY only
- Missing variant fail-closed: status missing-variant
- Morph OOR → incompatible
- Unequip reversible hide: restoreRegionsAfterUnequip
