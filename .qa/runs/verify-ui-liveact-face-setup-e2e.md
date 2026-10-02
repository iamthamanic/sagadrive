# Verify UI — liveact-face-setup-e2e (#424)

- Date: 2026-10-02
- Verdict: **PASS**
- Evidence: Playwright `e2e/liveact-face-setup-e2e.spec.ts` (2/2 chromium)

## Covered
- Face Setup open / close via gear → Face Mapping panel
- Cancel after draft interaction leaves panel closed without applying draft
- Apply path exits Face Setup cleanly
- LiveAct tracking start + fixture RAW inject → Diagnostics V2 RAW→APPLIED
- Metrics / overlay path available via existing LiveActViewportControls
- Tracking lost → reacquire (fixture inject)
- Narrow viewport smoke (375×812) — Face Mapping panel reachable
- Male (m5) and Female (f5) template paths open Face Mapping

## Notes
- No real webcam; `?liveactE2e=1` / `__SAGA_ENABLE_LIVEACT_E2E__` gated ingest bridge only
- CI environments without WebGL skip gracefully (no flake reruns)

- HEAD: `ed548c336fb51578526296ba50a1cc8ebcd331b0`
