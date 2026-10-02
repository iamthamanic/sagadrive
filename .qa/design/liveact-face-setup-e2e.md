# LiveAct Face Setup E2E (#424)

Feature slug: `liveact-face-setup-e2e`

## Status
**READY** — Epic #418 final slice. Depends on #423 MERGED (`quality5-face3-repro1`). Retarget: **NO RETARGET OVERRIDES REQUIRED**.

## Intent
End-to-End gate of the Face Setup epic: prove the real browser/runtime chain from versioned face3 assets through Face Setup (load / manual / auto / override / cancel / apply) into LiveAct (RAW → retarget → APPLIED → Character) with diagnostics, lifecycle, and Generic GLB fallback.

## Non-goals
- No new Face features or tracking modalities.
- No new asset authoring / QtMesh / Functional Morph rewrite (#423 closed).
- No new Retarget curve engine (gain/deadZone only).
- No Character Editor redesign.
- No asset-filename or m5/f5 retarget hacks.
- No real webcam / biometric recordings in CI.

## Core invariants
1. Reviewed mapping remains authoritative for publish/runtime sidecars.
2. Manual overrides are not silently overwritten by Auto Mapping.
3. Cancel discards draft; Apply commits draft to preview/session.
4. Face Setup forces neutral character + tracking off; no concurrent LiveAct/mapping chaos.
5. Lifecycle forbids stale RAW/APPLIED/morph state (lost → reacquire → stop → swap).
6. Exactly one gaze drive path (`bones` | `lookAt` | `morphs` | `none`).
7. Retarget profile is channel-semantic; identity until measured under/over-response.
8. Generic GLB fallback remains loadable with contract-conformant degradation.
9. Asset Functional QA ≠ Runtime Retarget Calibration — both must PASS independently.

## Sequencing (hard)
```text
Asset Functional QA PASS (#423)
  → Baseline RAW→APPLIED measurement (identity)
  → Only then evidence-backed gain/deadZone
  → Never mask geometry / binding / ownership bugs with gain
```

## Architecture (existing hop chain)
```text
face3 VRM (?v=quality5-face3-repro1)
→ versioned face-anchors sidecar
→ Face Setup (Gear → Face Mapping)
→ draft mapping (manual / auto / override)
→ Cancel | Apply
→ LiveActEngine start
→ MediaPipe / fixture sample (RAW)
→ map → smooth → calibrate → retarget → APPLIED
→ VRM/GLB avatar output
→ Diagnostics V2 + overlays + metrics
```

## Retarget policy
- Default: `DEFAULT_LIVEACT_RETARGET_PROFILE` = identity (`resolveLiveActRetargetProfile` capability-based, no filenames).
- Change only when baseline proves RAW plausible, asset morph semantics correct, and Character under/over-responds.
- Document every changed channel: old → reason → evidence → new → post result.
- If no change required: `NO RETARGET OVERRIDES REQUIRED`.

## Formats under test
- Human Male face3 VRM
- Human Female face3 VRM
- Generic `*-m5.glb` / `*-f5.glb` fallback

## Epic closeout
Do **not** close Epic #418 until #424 is MERGED and CLOSED and #419–#423 remain CLOSED.
