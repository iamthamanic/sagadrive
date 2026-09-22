# Feature: liveact-diagnostics-v2

<!-- refined from issue #397 — Epic #396 slice 1/10 -->

## Intent
Lokaler Diagnostics-V2-Trace für LiveAct: RAW → MAPPED → SMOOTHED → CALIBRATED → RETARGETED → APPLIED, korreliert per sequence + timestampMs. Ermöglicht spätere Fidelity-Fehler eindeutig einer Pipeline-Stufe zuzuordnen.

## Preconditions
- LiveActEngine + AvatarOutput (GLB oder VRM) gebunden
- Tracking aktiv oder lost/stop/dispose Pfade erreichbar

## Happy Path
- [ ] V2-Snapshot enthält alle 6 Stages mit gleicher sequence/timestampMs
- [ ] APPLIED kommt aus Output-Adapter (supported | unavailable | neutral), nie erfundenes 0 bei unsupported
- [ ] Hot path: nur refs / Listener; kein React setState pro Frame
- [ ] `scripts/liveact-diagnostics-v2-check.mjs` + test-gate grün
- [ ] typed-strict auf touched files

## Edge Cases
- [ ] trackingLost → APPLIED Neutral/Reset für supported Channels
- [ ] kein Output gebunden → APPLIED unavailable
- [ ] model swap / dispose → kein stale Applied-State
- [ ] VRM und GLB liefern denselben Trace-Contract

## Scope
In: `liveact-diagnostics-v2.ts`, engine instrumentation, avatar-output applied report, hook ref, check script  
Out: Overlay-UI, Retarget-Tuning, Assets, Anchors, VRM-Packager

## Security Coverage
- F/B video/blob: Trace nur Zahlen/IDs; `assertLiveActDiagnosticsV2LocalOnly`
- Kein localStorage / DB / Analytics / Landmark-Dumps in Console
- Non-goals: Backend-Auth (out of scope)

## Regression
- [ ] Bestehende Face-Diagnostics V1 unverändert nutzbar
- [ ] LiveAct Frame-Drive Verhalten unverändert (nur Instrumentation)

## Implementation Notes
- Domain: `liveact-diagnostics-v2.ts` (SagaDriveLiveActDiagnosticsV2)
- Engine instruments RAW/MAPPED/SMOOTHED/CALIBRATED/RETARGETED/APPLIED in `processSample`
- Output port `getAppliedDiagnostics()` on GLB + VRM adapters
- Hook: `diagnosticsV2Ref` via `subscribeDiagnosticsV2`
- Check: `scripts/liveact-diagnostics-v2-check.mjs` in test-gate
