# Composition Gate — avatar-content-pack-v1

- HEAD_SHA: 470f04d09526addd409adc008856c6022a44ea95
- BASE_SHA: 728207b25c14e86ea30af2b8b724af4e56ca8860
- Verdict: CLEAR

## Event
Content pack catalog → trait picker filter → base trait selection → live preview

## Hop chain
1. CONTENT_PACK_V1_ASSETS (producer metadata)
2. trait-catalog listTraitOptionsForGroup(setting)
3. TraitCardPicker setting filter
4. Consumers: CharacterEditor AvatarTraitPanels / save appearance

## Simulations
| Case | Expected | Result |
|------|----------|--------|
| N-actors | Catalog shared read-only; picker filters independently | pass |
| Invalid/missing | Unknown trait id fail-closed; empty filter shows explanation | pass |
| Two consumers / crash | Setting toggle does not clear other groups | pass |

## Flags
- none
