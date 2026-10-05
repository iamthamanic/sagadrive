# Composition Gate — live-session-golden-e2e-gate

- Issue: #378
- Feature slug: live-session-golden-e2e-gate
- HEAD_SHA: c9d9419a7ef4e53abf23395663a0a6c459e0fbc2
- BASE_SHA: 3bb8a5c61511fc119d1df2a0fa304cfcd8f4de72
- Verdict: CLEAR

## Event
Live Session Golden Run scenarios + adversarial security probes (domain checklist).

## Hop chain
Dornhain package / #303 authorizeSessionCommand / #484 golden-mobile → live-session-golden-e2e-gate domain → multi-context Playwright consumers (GM/Player/Viewer/Director/unauthorized).

## Simulations
- N-actors: GM + Player A/B + Viewer + Director + unauthorized contexts in one smoke.
- Invalid/missing: forged capability / stale revision / unauthorized → forbidden or stale_revision.
- Two consumers / crash: Viewer + Director cannot mutate gameplay; GM remains gameplay authority.

## Flags
none

## Skip reason
N/A — CLEAR
