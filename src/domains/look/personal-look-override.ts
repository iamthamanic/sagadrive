/**
 * personal-look-override — Domain rules for writing personal Look overrides (#351).
 * Location: src/domains/look/personal-look-override.ts
 *
 * Resolution already ignores personal overrides when playerOverridesAllowed is false.
 * This module covers *write* authorization (client pre-check; DB trigger is SoT).
 */
export type PersonalLookOverrideWriteInput = {
  readonly characterOwnerUserId: string;
  readonly actorUserId: string;
  /** Null/empty clears the override. */
  readonly personalLookProfileId: string | null;
  readonly lookOwnerUserId: string | null;
  readonly lookStatus: 'active' | 'archived' | string | null;
  /** False if any active saga for the character disallows overrides. */
  readonly sagaAllowsPlayerOverrides: boolean;
};

export type PersonalLookOverrideWriteResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly code: string; readonly messageDe: string };

/**
 * Fail-closed write check for personal Look overrides.
 * Clearing (null) is always ok for the character owner.
 */
export function assertPersonalLookOverrideWrite(
  input: PersonalLookOverrideWriteInput,
): PersonalLookOverrideWriteResult {
  if (input.actorUserId !== input.characterOwnerUserId) {
    return {
      ok: false,
      code: 'not-owner',
      messageDe: 'Nur der Charakter-Besitzer darf den persönlichen Look ändern.',
    };
  }

  const personal = input.personalLookProfileId?.trim() || null;
  if (personal === null) {
    return { ok: true };
  }

  if (!input.sagaAllowsPlayerOverrides) {
    return {
      ok: false,
      code: 'saga-forbidden',
      messageDe: 'Persönliche Charakter-Looks sind in dieser Saga nicht erlaubt.',
    };
  }

  if (!input.lookOwnerUserId || input.lookOwnerUserId !== input.actorUserId) {
    return {
      ok: false,
      code: 'look-not-owned',
      messageDe: 'Look nicht sichtbar oder nicht dein Look.',
    };
  }

  if (input.lookStatus !== 'active') {
    return {
      ok: false,
      code: 'look-not-active',
      messageDe: 'Look ist nicht aktiv.',
    };
  }

  return { ok: true };
}
