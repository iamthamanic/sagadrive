# Composition Gate — avatar-v2-starter-wardrobe

- HEAD_SHA: 976e4174cf61b19cea131ecad3bd39a86e212513
- BASE_SHA: 4bd2bd9a2a1105451efe20caffc683d4d0e33c48
- Date: 2026-09-19
- Verdict: CLEAR

## Event
Resolve logical starter wearable → body-family fit variant (asset + hide mask).

## Hops
1. Producer: resolveStarterWearableFit / resolveStarterWearableFitForSpecies (domain)
2. Consumer: future skinned wearable runtime / equipment visual (reads variant + hideRule)
Single logical id; family selects asset — no species-duplicated producer.

## Simulations
- N-actors: human (standard) + dwarf (compact) same wearableId → distinct family assets, ready
- Invalid fallback: missing heavy variant → missing-variant, variant=null (no silent wrong fit)
- Concurrent: morph OOR → incompatible (fit disabled)
- Unequip: restoreRegionsAfterUnequip returns bodyMaskRegions (reversible)

## Cardinality
1 resolve call → 1 ResolvedStarterWearableFitV1 (never fan-out to species clones)

## Notes
No queue/worker/webhook. Domain-only hop; runtime attach remains #258.
