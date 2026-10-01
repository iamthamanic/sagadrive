# Design: adaptive-shared-ui-primitives (#482)

## Status

Ready. Depends on merged #481.

## Patterns (8)

1. `resolveAdaptiveBand` / `useAdaptiveBand` — phone ≤767, tablet ≤1023, else desktop
2. `AdaptivePage` — gutters + safe-area header/body
3. `AdaptiveActionBar` — primary actions, min-h-11, safe-area-pb
4. `AdaptiveToolbar` — overflow-x tool row
5. `AdaptiveSheet` — Sheet with phone→bottom default
6. `AdaptiveInspector` — rail vs sheet
7. `AdaptiveMasterDetail` — split vs detail sheet
8. `AdaptiveLiveStage` — center stage + collapsing rails

## Out

Feature migrations, Playwright gates (#483), second UI framework.
