# Feature: LiveAct capability ownership split (#381)

<!-- refined by @implement from issue #381 on 2026-09-21 -->

## Intent

Korrigiere die Capability-Ownership von LiveAct: Tracking-/Input-Fähigkeiten kommen
ausschließlich aus Engine/Face-Source, Avatar-Fähigkeiten ausschließlich aus dem geladenen
VRM/GLB. Eine pure-domain Compose-Funktion liefert das öffentliche Inspector-Result.

## Preconditions

- LiveAct Engine + VRM/GLB avatar output on main
- Capability Inspector + viewport gear exist

## Happy Path

- [ ] Domain: `LiveActInputCapabilities`, `LiveActAvatarCapabilities`, `composeLiveActCapabilities`
- [ ] Output adapters report avatar-only (bones / LookAt / morphs); no camera input flags
- [ ] Engine exposes `getInputCapabilities()` from quality profile / face source
- [ ] App composes Input + Avatar for Inspector without second rig scan
- [ ] Head-only GLB: Input ✓ (face/headPose) / Avatar face — simultaneously representable

## Edge Cases

- Tracking not started: Avatar capabilities still correct; Input shows ready (·) not false
- Model swap: avatar caps rebuilt from one new output only
- VRM LookAt without eye bones: avatar gaze via LookAt flags

## Security Coverage

| Item | Applicable | How satisfied |
|------|------------|---------------|
| F-03 Camera only after explicit action | n/a | no camera change |
| P-04 No sensitive data persistence | yes | capabilities are booleans only |
| B-01 / B-04 / B-07–B-09 | n/a | no backend |

## Assumptions

- Mapping column continues to follow input support (existing inspector rows)
- `LiveActCapabilitiesV1` remains the composed public inspector shape

## Implementation Notes

- Feature slug: `liveact-capability-ownership`
- Check: `scripts/liveact-capability-ownership-check.mjs`

## Composition Gate

See `.qa/runs/composition-gate-liveact-capability-ownership.md`
