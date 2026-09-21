# Composition Gate — liveact-pip-drag-and-rig-visibility

- HEAD_SHA: 0551a71f87387be53e3d9efa74bf7a66ba764b2e
- Date: 2026-09-21
- Verdict: SKIPPED

## Event
Editor-local LiveAct viewport UX (draggable PiP, SkeletonHelper depth, GLB capability input flags) + offline species authoring helper scripts.

## Skip reason (single-hop)
- No new producer→consumer business event; no queue/webhook/outbox; no write-in-A / read-in-B identity change.
- PiP position is ephemeral React state inside the viewport; does not alter LiveActFrame or persistence.
- Rig-debug material `depthTest` is local Three.js overlay visibility only.
- GLB `createLiveActCapabilities({ face, headPose, eyeGaze })` only corrects capability **reporting** for the inspector; does not change frame shipping or camera claim.
- Species-authoring `*.mjs` scripts are offline Meshy/GLB tooling referenced by `AUTHORING-PIPELINE.md`, not runtime hops.

## Simulations
N/A — skipped (documented single-hop).

## Notes
Re-stamp with commit SHA after commit if required by merge skill.
