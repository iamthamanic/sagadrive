# Design: live-session-golden-e2e-gate (#378)

## Decision

Extend `#303` multiuser-e2e-security. Do not create a second E2E harness.

## Composition

```
#377 Dornhain package
#484 golden-mobile-journeys (npm run test:e2e:golden-mobile)
#303 authorizeSessionCommand / classifyRuntimeSecurityError
→ live-session-golden-e2e-gate domain + Playwright multi-context
```

## Contexts

gm · player_a · player_b · viewer · director · unauthorized

## Non-goals

Full 60–90 min live dogfood in CI (opt-in `E2E_LIVE_SESSION_GOLDEN=1`).
