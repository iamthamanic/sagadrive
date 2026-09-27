# Composition Gate — liveact-expand-drive-bind

**Date:** 2026-09-25  
**HEAD:** 3ca84ee87e398e23794f5219be4357e2b50abb26  
**Verdict:** CLEAR

## Path

Webcam → LiveAct engine → **one** `bindOutput(LiveActAvatarOutput)` → morph/head on that runtime.

| State | Bound output |
|-------|----------------|
| Tracking off | `null` |
| Modal closed + card ready | editor-card output |
| Modal open + expand ready | expand output |
| Modal open, expand not ready | card (if ready) until expand ready, then switch once |

## Simulations

1. **N-actors:** One engine instance; XOR expand vs card — no fan-out to two meshes.
2. **Invalid/missing:** Expand not ready → do not bind null solely because modal open if card ready; never bind two. Close clears expand ready/ref.
3. **Concurrent consumers:** Single `this.output` on engine; rebinding replaces previous.

## Notes

Face Mapping anchors remain overlay/ground-truth only (unchanged). Applied HUD tracks bound output diagnostics.
