# Feature: LiveAct 5/7 — Rig-Debug + Capability Inspector

<!-- issue #333 -->

## Intent

Character Bones debug overlay (real skeleton only) and read-only Capability Inspector
(Input → Mapping → Avatar) in editor viewport gear. Debug never affects portrait capture.

## Preconditions

- #332 LiveAct avatar output + capability matrix

## Happy Path

- [ ] Character Bones toggles Three.js SkeletonHelper on loaded SkinnedMesh; no invented bones
- [ ] Toggle disabled with hint when model has no skeleton
- [ ] Model swap rebuilds helper; dispose removes helper from scene
- [ ] Capability Inspector shows head, eyes, and face channels with Input/Map/Avatar columns
- [ ] Missing avatar targets show unavailable per channel, not a global error
- [ ] Portrait capture excludes SkeletonHelper via runWithoutHelper
- [ ] `scripts/liveact-rig-debug-check.mjs` + `npm run test-gate` green; zero type escapes

## Edge Cases

- [ ] Bones ON during portrait capture — clean image
- [ ] Bones ON + model swap — old helper disposed, new skeleton bound
- [ ] Fallback viewport without canvas — gear open, bones disabled

## Security Coverage

| Item | How |
|------|-----|
| P-04 | Debug ephemeral; no save/analytics |
| F-03 | No bone data uploaded |
