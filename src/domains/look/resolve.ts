/**
 * Look domain resolution — deterministic World / Player-Character inheritance (#339).
 * Location: src/domains/look/resolve.ts
 */

import type {
  LookResolutionContext,
  LookResolutionResult,
  LookResolutionTarget,
} from './types';

/**
 * Resolve which LookProfile id applies for a target.
 *
 * World: Session Override → Saga Default → System Default
 * Player Character: allowed Personal Override → Session → Saga → System Default
 */
export function resolveLookProfileId(
  target: LookResolutionTarget,
  context: LookResolutionContext,
): LookResolutionResult {
  if (!context.systemDefaultProfileId) {
    throw new Error('LookResolution: systemDefaultProfileId is required');
  }

  if (target === 'player-character') {
    if (
      context.playerOverridesAllowed &&
      context.personalOverrideProfileId !== null &&
      context.personalOverrideProfileId.length > 0
    ) {
      return {
        profileId: context.personalOverrideProfileId,
        scopeApplied: 'player-character',
        reason: 'personal-override',
      };
    }
  }

  if (
    context.sessionOverrideProfileId !== null &&
    context.sessionOverrideProfileId.length > 0
  ) {
    return {
      profileId: context.sessionOverrideProfileId,
      scopeApplied: 'session',
      reason: 'session-override',
    };
  }

  if (
    context.sagaDefaultProfileId !== null &&
    context.sagaDefaultProfileId.length > 0
  ) {
    return {
      profileId: context.sagaDefaultProfileId,
      scopeApplied: 'saga',
      reason: 'saga-default',
    };
  }

  return {
    profileId: context.systemDefaultProfileId,
    scopeApplied: 'system',
    reason: 'system-default',
  };
}
