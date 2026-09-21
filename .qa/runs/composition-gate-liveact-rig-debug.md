# Composition Gate — liveact-rig-debug (#333)

- Verdict: **CLEAR**

## Event

Gear toggle → `useLiveActViewport` → `CharacterStudioRuntime.setLiveActRigDebugEnabled` → SkeletonHelper visibility.

## Hop chain

1. Model load → `liveActRigDebug.bindModelRoot(root)`
2. Character Bones ON → helper visible on real skeleton
3. Portrait capture → `runWithoutHelper` → clean PNG
4. Model swap / dispose → helper removed from scene

## Simulations

| Case | Result |
|------|--------|
| No SkinnedMesh | toggle disabled + hint |
| Bones ON + portrait | helper hidden for capture |
| Model swap | rebind helper |
| Fallback CH viewport | gear open, bones disabled |

## Flags

- none
