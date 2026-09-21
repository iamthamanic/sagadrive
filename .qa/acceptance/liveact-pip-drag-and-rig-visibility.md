# Feature: LiveAct PiP drag + rig visibility + GLB capability flags

## Intent
Viewport UX polish after LiveAct ship: draggable camera PiP (default bottom-left), visible bone debug overlay, truthful GLB input capability reporting; ship offline species-authoring scripts referenced by the body pipeline.

## Composition Gate

- Verdict: SKIPPED
- HEAD_SHA: WORKTREE (see `.qa/runs/composition-gate-liveact-pip-drag-and-rig-visibility.md`)
- Reason: single-hop editor/local overlay + offline scripts; no cross-hop business event path
