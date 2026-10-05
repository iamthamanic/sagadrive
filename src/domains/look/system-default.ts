/**
 * system-default — Canonical system LookProfile id for resolution fallback (#348).
 * Location: src/domains/look/system-default.ts
 */
import type { LookResolutionContext } from './types';

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
