# Composition Gate — avatar-rigid-equipment-runtime

- HEAD_SHA: 26ad9c66771f7fce830653bbc3f924c8fcaf1c97
- BASE_SHA: 2c20afef7dddcd6bab199ba143114a86354627d3
- Verdict: CLEAR

## Event
#158 visuals → planRigidEquipmentAttaches → AvatarRigidEquipmentRuntime → #6 anchors

## Hop chain
1. AvatarEquipmentVisual (ready+rigid)
2. planRigidEquipmentAttaches (available anchors)
3. GLB resolve/cache/clone
4. Anchor Object3D attach + hide regions
5. CharacterStudioRuntime apply/dispose/model-switch cleanup

## Simulations
| Case | Expected | Result |
|------|----------|--------|
| N-actors | Bounded cache; per-runtime instance maps | pass |
| Invalid/missing | skip missing/incompatible/no anchor | pass |
| Two consumers / crash | stale generation discarded; model switch clears | pass |

## Flags
- none

