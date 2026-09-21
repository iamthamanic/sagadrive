# Composition Gate — liveact-avatar-output (#332)

- Verdict: **CLEAR**

## Event

Tracking ON → LiveActEngine → `LiveActAvatarOutput.applyLiveActFrame` → VRM expressions or GLB morphs + head/eyes.

## Hop chain

1. `AvatarSurfaceViewer` → `useLiveActViewport` + `CharacterStudioRuntime`
2. Model load → `rebuildLiveActAvatarOutput`
3. Tracking enabled → `engine.bindOutput(output)`
4. Each frame → atomic face channels (no exclusive layer wipe)
5. Stop / unbind → `resetLiveActPose`

## Simulations

| Case | Result |
|------|--------|
| Head-only GLB | head cap true, face channels false |
| Partial morphs | usable subset |
| Model swap | dispose + rebuild |
| Preview facial UI | still uses setWeight exclusivity |

## Flags

- none
