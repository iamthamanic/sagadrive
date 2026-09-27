# Composition Gate — liveact-reference-vrm-golden-avatar

**Date:** 2026-09-25  
**Verdict:** CLEAR

## Path

Human Vorlage select → model URL (SagaDrive species path XOR Golden Reference allowlisted path) → CharacterStudioRuntime VRM loader → VrmLiveActAvatarOutput → LiveAct engine ← MediaPipe.

## Simulations

1. **N-actors:** One mesh URL / one LiveAct output at a time; switching variant replaces model, does not dual-bind.
2. **Invalid/missing:** Missing binary → runtime load error (fail closed); no Meshy/QtMesh fallback.
3. **Concurrent consumers:** Persist path uses `avatarForPersist` (strips reference URL); viewer uses `currentAvatar` with reference — no silent product default.

## Notes

No filename/TLTMedia hacks in LiveAct retarget or aliases. Gaze single-path via existing resolveLiveActGazeDrivePath.
