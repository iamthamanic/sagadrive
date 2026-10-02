# Feature: LiveAct Face Setup 6/6 — Face-Setup / LiveAct E2E Gate

<!-- #424 — liveact-face-setup-e2e -->

## Intent
Schließe Epic #418 mit einem reproduzierbaren End-to-End-Gate: Face Setup (loaded/manual/auto/override/cancel/apply) + LiveAct Runtime (7 Functional Channels, Gaze, Head, Diagnostics, Lifecycle) auf face3 VRM und Generic GLB Fallback. Retarget gain/deadZone nur evidenzbasiert nach Baseline.

## Preconditions
- [x] #423 MERGED — face3 Functional QA PASS, resolver `?v=quality5-face3-repro1`
- [x] Branch from `origin/main` containing #423 publish
- [x] Design `.qa/design/liveact-face-setup-e2e.md` present

## Happy Path
- [x] Face Setup: loaded versioned sidecar, blank/manual, Auto Mapping, partial→manual, manual override protection, reset, Cancel, Apply
- [x] Runtime m5 face3: jawOpen, blink L/R, browInnerUp, smile L/R, pucker — RAW→APPLIED semantic direction PASS
- [x] Runtime f5 face3: same contract PASS
- [x] Gaze X/Y + head yaw/pitch/roll PASS; exactly one gaze path
- [x] Diagnostics: overlay, metrics, RAW→APPLIED channel table PASS
- [x] Lifecycle: setup enter/exit while tracking, lost/reacquire, stop, model swap PASS
- [x] Generic GLB fallback loads; supported channels work; missing optional channels degrade cleanly
- [x] Retarget: documented overrides **or** `NO RETARGET OVERRIDES REQUIRED`
- [x] `npm run test-gate` PASS (includes #423 face3 Functional hard gate)
- [x] Playwright Face Setup / LiveAct E2E PASS
- [x] Touched files: zero type escape hatches

## Edge Cases
- [x] Auto re-run after manual override does not silently overwrite protected anchors
- [x] Cancel leaves production/preview mapping unchanged
- [x] Face Setup enter while tracking: tracking off + neutral; exit restores clean state
- [x] Tracking lost → neutral/lost behavior → reacquire without stale jaw/blink/gaze/head
- [x] Resize / orbit / narrow viewport: markers remain usable; no coordinate drift
- [x] Gain never used to mask Functional Asset FAIL or wrong L/R semantics

## Out of scope
New face features, hand/body tracking, new retarget curves, Character Editor redesign, #423 reauthoring.

## Composition Gate
Expected hop chain: face3 asset → sidecar → Face Setup draft → Apply → LiveAct RAW → retarget → APPLIED → Character + diagnostics; plus lifecycle lost/swap/setup-enter.
