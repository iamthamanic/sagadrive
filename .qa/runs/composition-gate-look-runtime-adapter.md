# Composition Gate — look-runtime-adapter

- Issue: #342
- Feature slug: look-runtime-adapter
- HEAD_SHA: 032cd6fef40bf77ffbe1ba8d96890c6e208c4dbe
- BASE_SHA: bd596fcda7559249a102b6d90cb9edf132d0d178
- Verdict: CLEAR

## Event
LookProfileVersion apply / PBR Neutral restore on avatar preview target.

## Hop chain
LookProfileVersion (domain) → LookRuntime → host-mtoon adapter (mtoon-style-applier snapshots) → CharacterStudioRuntime preview. ToonLab adapter is blocked stub (no hop).

## Simulations
- N-actors: single preview target (CharacterStudioRuntime).
- Invalid/missing: missing root/scene → unsupported; unknown material role → unclassified.
- Two consumers / crash: AvatarCanvas remains ToonLab-free; domains/look have no provider types.

## Flags
none

## Skip reason
N/A — CLEAR
