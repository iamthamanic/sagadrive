# Composition Gate — avatar-rigging-providers-skintokens

- HEAD_SHA: 87aa7b59a7bfbb74d9685b7dc714518afda275a8
- BASE_SHA: fa37073f6eaf61c6f9b9b8de3fb75d43b438221a
- Verdict: CLEAR

## Event
Submit logical asset → provider mock → job snapshot (caps pending)

## Hop chain
1. assertLogicalRiggingAssetKey
2. AvatarRiggingProvider.submit
3. assertRiggingCapabilitiesPending
4. Consumer must run #6 separately

## Simulations
| Case | Expected | Result |
|------|----------|--------|
| N-actors | Per-job maps in mocks | pass |
| Invalid/missing | free URL throw; SkinTokens unavailable | pass |
| Two consumers / crash | getStatus fail-soft | pass |

## Flags
- none

