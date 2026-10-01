# Design: mobile-ui-quality-gate (#483)

## Status

Implements Adaptive UI (#481) enforcement via Playwright device matrix + deterministic audits.

## Matrix

| Project | Device | Tests |
|---|---|---|
| `chromium` | Desktop Chrome | Full `e2e/**` suite |
| `mobile-chrome` | Pixel 7 | Only `e2e/adaptive-ui-quality.spec.ts` |
| `tablet-chrome` | iPad Mini | Only `e2e/adaptive-ui-quality.spec.ts` |

This avoids multiplying every E2E journey across devices.

## Checks

- Horizontal overflow (`documentElement.scrollWidth`)
- Primary control touch targets (≥44 on phone/tablet, ≥32 desktop)
- Accessible names on interactive controls (axe-compatible lightweight audit)
- Visual snapshot of Library → Abenteuer golden screen per project

## Baseline update process

1. Intentional UI change affecting Library adventures layout.
2. Locally: `npm run test:e2e:adaptive:update-snapshots`
3. Review PNG diffs under `e2e/adaptive-ui-quality.spec.ts-snapshots/`
4. Commit updated baselines with the feature PR; note reason in PR body.
5. Do **not** update baselines to silence unrelated flaky failures — fix the product or tighten masks.

## CI paths

- Fast PR path: `npm run test-gate` includes static `mobile-ui-quality-gate-check` (config/helpers present).
- Deeper path: `npm run test:e2e` (CI Browser E2E) runs desktop suite + adaptive matrix projects.
- Local adaptive only: `npm run test:e2e:adaptive`
