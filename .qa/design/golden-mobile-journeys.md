# Design: golden-mobile-journeys (#484)

## Decision

Reuse #482 AdaptivePage / AdaptiveLiveStage and #483 AU helpers. Do not invent a second mobile layout system.

## Journeys

| ID | Path | AU surface |
|----|------|------------|
| login-dashboard | `/` → auth → Dashboard | login, dashboard |
| dashboard-character | Dashboard → Neuer Charakter | dashboard |
| session-join-assignment | `/session-join?intent=join` | session-join |
| player-live-private | `/sagas/…/live/player/…` | player-live |

## #378 hook

`npm run test:e2e:golden-mobile` runs the journey spec across Playwright projects (desktop + phone + tablet via config testMatch).

## Non-goals

GM/Director phone workstation rewrite; new gameplay rules.
