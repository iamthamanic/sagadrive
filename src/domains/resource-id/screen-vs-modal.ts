/**
 * screen-vs-modal — decision rule for Route/Screen vs Modal/Popover/Drawer.
 * Location: src/domains/resource-id/screen-vs-modal.ts
 *
 * Pure policy helper for feature design; not a runtime gate.
 */

export type ScreenOrModalSignals = {
  /** Reload should restore the same view. */
  needsReloadRestore: boolean;
  /** Browser back/forward should represent this step. */
  needsHistoryStep: boolean;
  /** View should be shareable as a link. */
  needsShareableLink: boolean;
  /** Resource has its own stable identity. */
  hasOwnResourceIdentity: boolean;
  /** User performs a longer / standalone task here. */
  isStandaloneTask: boolean;
  /** Regularly reachable via primary navigation. */
  isPrimaryNavTarget: boolean;
};

export type ScreenOrModalDecision = 'screen' | 'modal';

/**
 * Screen when any deep-link / identity signal is true; otherwise modal.
 */
export function decideScreenOrModal(signals: ScreenOrModalSignals): ScreenOrModalDecision {
  if (
    signals.needsReloadRestore
    || signals.needsHistoryStep
    || signals.needsShareableLink
    || signals.hasOwnResourceIdentity
    || signals.isStandaloneTask
    || signals.isPrimaryNavTarget
  ) {
    return 'screen';
  }
  return 'modal';
}
