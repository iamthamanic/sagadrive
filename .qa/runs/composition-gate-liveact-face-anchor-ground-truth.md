# Composition Gate — liveact-face-anchor-ground-truth

- HEAD_SHA: WORKTREE
- Date: 2026-09-22
- Verdict: SKIPPED

## Event
Browser resolves face-anchors sidecar URLs from a model URL; offline author writes unreviewed provenance beside anchors.

## Why SKIPPED
Single-hop / no producer→consumer business path:
- No queue/worker/outbox/webhook/bulk side-effect
- Cache-bust query copy is deterministic 1:1 (model URL → sidecar candidates)
- Provenance JSON is offline authoring metadata, not a runtime fan-out

## Simulations
N/A (skip criteria met)

## Findings
None
