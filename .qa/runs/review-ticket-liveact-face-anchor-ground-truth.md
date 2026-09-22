# Review Ticket — liveact-face-anchor-ground-truth (#419)

- Date: 2026-09-22
- Verdict: **ACCEPT**

## Architecture
- Runtime anchors stay `SagaDriveFaceAnchorsV1`; provenance is a separate contract (correct separation).
- Domain pure (no React/Three/provider names).
- Author heuristic always emits `auto` + `reviewed:false` sibling JSON.

## Risks
- Public production sidecars still lack reviewed provenance files — intentional; #420/manual review sets ground truth later.
- CDN still needs matching `?v=` on model publish (docs + resolver enforce consistency).

## typed-strict
No `any` / `as unknown as` in new TS.
