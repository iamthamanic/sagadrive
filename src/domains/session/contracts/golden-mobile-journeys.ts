/**
 * golden-mobile-journeys — Canonical Phone/Tablet/Desktop reference journey IDs (#484).
 * Location: src/domains/session/contracts/golden-mobile-journeys.ts
 *
 * #378 Multi-user Golden Run may invoke these via `npm run test:e2e:golden-mobile`
 * or by matching `e2e/golden-mobile-journeys.spec.ts`.
 */

export const GOLDEN_MOBILE_JOURNEY_SPEC = 'e2e/golden-mobile-journeys.spec.ts' as const;

export const GOLDEN_MOBILE_JOURNEY_IDS = [
  'login-dashboard',
  'dashboard-character',
  'session-join-assignment',
  'player-live-private',
] as const;

export type GoldenMobileJourneyId = (typeof GOLDEN_MOBILE_JOURNEY_IDS)[number];

/** AU surfaces that must carry data-au-surface for journey anchors. */
export const GOLDEN_MOBILE_AU_SURFACES = [
  'login',
  'dashboard',
  'session-join',
  'player-live',
] as const;
