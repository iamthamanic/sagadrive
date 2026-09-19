# Composition Gate — avatar-v2-skinned-wearable-runtime
- # Composition Gate — avatar-v2-skinned-wearable-runtime
- HEAD_SHA: 72bdaeb4e08d63c559cb24761614711a73194c89
- BASE_SHA: 9da9bffebbccce47147d39a396405afa9665d962
- Date: 2026-09-19
- Verdict: CLEAR

## Event
Equip skinned wearable → family fit resolve → skeleton rebind → region mask apply; unequip reverses mask via ref-count.

## Hops
1. planSkinnedWearableAttaches (+ BodyFamilyVariantResolver)
2. AvatarSkinnedWearableRuntime attach/rebind/mask
3. BodyRegionMaskRegistry apply/release

## Simulations
- N-actors: two wearables hide torso → release one keeps hidden
- Invalid: bodyFamily custom → no attach
- Concurrent: generation/loadTokens discard stale loads
- Cardinality: 1 visual → 0..1 attach (never silent wrong family)


- BASE_SHA: # Composition Gate — avatar-v2-skinned-wearable-runtime
- HEAD_SHA: 72bdaeb4e08d63c559cb24761614711a73194c89
- BASE_SHA: 9da9bffebbccce47147d39a396405afa9665d962
- Date: 2026-09-19
- Verdict: CLEAR

## Event
Equip skinned wearable → family fit resolve → skeleton rebind → region mask apply; unequip reverses mask via ref-count.

## Hops
1. planSkinnedWearableAttaches (+ BodyFamilyVariantResolver)
2. AvatarSkinnedWearableRuntime attach/rebind/mask
3. BodyRegionMaskRegistry apply/release

## Simulations
- N-actors: two wearables hide torso → release one keeps hidden
- Invalid: bodyFamily custom → no attach
- Concurrent: generation/loadTokens discard stale loads
- Cardinality: 1 visual → 0..1 attach (never silent wrong family)


- Date: 2026-09-19
- Verdict: CLEAR

## Event
Equip skinned wearable → family fit resolve → skeleton rebind → region mask apply; unequip reverses mask via ref-count.

## Hops
1. planSkinnedWearableAttaches (+ BodyFamilyVariantResolver)
2. AvatarSkinnedWearableRuntime attach/rebind/mask
3. BodyRegionMaskRegistry apply/release

## Simulations
- N-actors: two wearables hide torso → release one keeps hidden
- Invalid: bodyFamily custom → no attach
- Concurrent: generation/loadTokens discard stale loads
- Cardinality: 1 visual → 0..1 attach (never silent wrong family)

