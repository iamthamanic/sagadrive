# Composition Gate — avatar-skinned-wearables

- HEAD_SHA: 0728c6e22bd78937b15bb2777493b07407d53e97
- BASE_SHA: 7035080bc2c9ff88f712fdf444792cf9f67ffb30
- Verdict: CLEAR

## Event
#158 skinned visuals → planSkinnedWearableAttaches → AvatarSkinnedWearableRuntime

## Hop chain
1. capability skinned-wearable-ready
2. fit/status → DE ui label
3. SkinnedMesh load/cache/attach + hide restore
4. CharacterStudioRuntime apply/dispose

## Simulations
| Case | Expected | Result |
|------|----------|--------|
| N-actors | Per-runtime maps + cache bound | pass |
| Invalid/missing | no cap / no SkinnedMesh → skip | pass |
| Two consumers / crash | generation/stale discard | pass |

## Flags
- none

