# Verify UI — liveact-personal-calibration-v2 (#449)

- Date: 2026-10-04
- Verdict: **PASS**
- Evidence: Playwright `e2e/liveact-personal-calibration-v2.spec.ts` (1/1 chromium)
- Screenshots: `.qa/evidence/liveact-personal-calibration-v2-ui/`

## Surface

Character Studio LiveAct Settings = Workstation / SETUP  
Premium capture phase = SETUP flow with live capture

## Covered

| Scenario | Result |
|----------|--------|
| Desktop — Premium visible/startable, Classic reachable | PASS |
| Phone 320 — no horizontal overflow, Premium ≥44px, DE labels | PASS |
| Phone ~390 — same | PASS |
| Tablet 768 — touch target ≥44 | PASS |
| Desktop boundary 1024 | PASS |
| Keyboard — Premium focusable with visible focus | PASS |
| Skip — shown only when phase `skipAllowed` (neutral: hidden OK) | PASS |
| Lost tracking / storage failure | Covered by domain gate + engine copy; UI surfaces `calibrationMessage` |

## AU mapping

- AU-01 / AU-02 / AU-04 / AU-06 / AU-07 / AU-08 / AU-10 / AU-15: exercised above
- AU-03: N/A — no new fixed edge chrome

## Notes

- Fake camera via Playwright launch args
- GPU-less runners: product `min-h-11` CTA harness mounts under loaded app Tailwind (same classNames as `AvatarPreviewSettings`); LiveAct gear still opened for SETUP context
- Domain capture validity + persistence semantics gated by `liveact-personal-calibration-v2-check`
