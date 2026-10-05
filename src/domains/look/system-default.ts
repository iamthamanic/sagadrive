/**
 * system-default — Canonical system LookProfile id for resolution fallback (#348/#349).
 * Location: src/domains/look/system-default.ts
 */
import type { LookResolutionContext, LookResolutionResult } from './types';
import { resolveLookProfileId } from './resolve';

/** Stable id used when a saga has no defaultLookProfileId. */
export const SYSTEM_DEFAULT_LOOK_PROFILE_ID = 'look.system.default';

export function buildLookResolutionContextFromSaga(input: {
  readonly sagaDefaultProfileId: string | null;
  readonly allowPlayerCharacterLookOverride: boolean;
  readonly sessionOverrideProfileId?: string | null;
  readonly personalOverrideProfileId?: string | null;
  readonly systemDefaultProfileId?: string;
}): LookResolutionContext {
  return {
    systemDefaultProfileId:
      input.systemDefaultProfileId ?? SYSTEM_DEFAULT_LOOK_PROFILE_ID,
    sagaDefaultProfileId: input.sagaDefaultProfileId,
    sessionOverrideProfileId: input.sessionOverrideProfileId ?? null,
    personalOverrideProfileId: input.personalOverrideProfileId ?? null,
    playerOverridesAllowed: input.allowPlayerCharacterLookOverride,
  };
}

/**
 * World Look for a Live/Session surface (#349).
 * session override → saga default → system default. No URL auth.
 */
export function resolveWorldLookForSession(input: {
  readonly sagaDefaultProfileId: string | null;
  readonly sessionOverrideProfileId: string | null;
  readonly allowPlayerCharacterLookOverride?: boolean;
}): LookResolutionResult {
  const ctx = buildLookResolutionContextFromSaga({
    sagaDefaultProfileId: input.sagaDefaultProfileId,
    allowPlayerCharacterLookOverride: input.allowPlayerCharacterLookOverride ?? true,
    sessionOverrideProfileId: input.sessionOverrideProfileId,
  });
  return resolveLookProfileId('world', ctx);
}
