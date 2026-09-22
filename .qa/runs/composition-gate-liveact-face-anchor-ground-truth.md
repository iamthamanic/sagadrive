# Composition Gate — liveact-face-anchor-ground-truth

- HEAD_SHA: 0c475b2a0ddbe6b2c64db824fa7f3c07073c493a
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
