/**
 * production-ux-integrity — Pure helpers for production UI honesty (#493).
 * Location: src/domains/session/contracts/production-ux-integrity.ts
 *
 * Classifies deferred vs production-ready controls. No React/I/O.
 */

export type ProductionControlDisposition =
  | 'live'
  | 'disabled-deferred'
  | 'hidden-non-dev'
  | 'dev-only';

export function disposeDeferredPrimaryAction(input: {
  readonly implemented: boolean;
}): Exclude<ProductionControlDisposition, 'dev-only' | 'hidden-non-dev'> {
  return input.implemented ? 'live' : 'disabled-deferred';
}

/** Fixture / player-test panels belong only in explicit developer mode. */
export function mayShowPreparedAdventureFixturePanel(isDev: boolean): boolean {
  return isDev === true;
}

export function marketplacePaidCtaLabelDe(price: number): string {
  if (!(price > 0)) return 'Herunterladen';
  return 'Kauf nicht verfügbar';
}

export function marketplacePaidActionEnabled(price: number): boolean {
  return !(price > 0);
}

export const DEFERRED_SETTING_HINT_DE =
  'Noch nicht verfügbar — Einstellung wird nicht gespeichert.';

export const GM_DEFERRED_CONTROL_HINT_DE =
  'Noch nicht verfügbar — keine Live-Aktion hinter diesem Control.';
