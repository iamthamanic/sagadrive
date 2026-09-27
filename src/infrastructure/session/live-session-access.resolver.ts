/**
 * live-session-access.resolver — authoritative LiveSessionAccess from membership (#362).
 * Location: src/infrastructure/session/live-session-access.resolver.ts
 *
 * Never reads capabilities from URL, localStorage, or client command payloads.
 */

import {
  filterPayloadForAccess,
  validateLiveSessionAccess,
  type LiveSessionAccess,
} from '../../domains/session/contracts/live-session-access';
import { getAuthenticatedUserId } from '../../lib/authenticatedUser';

/**
 * Server/membership snapshot. Built by infrastructure from RLS-backed rows only.
 */
export type AuthoritativeSessionMembership = {
  readonly userId: string;
  readonly role: string;
  /** Capabilities column from membership — never from client body. */
  readonly capabilities: readonly string[];
  readonly characterId: string | null;
  readonly allowPlayerDirector?: boolean;
};

/**
 * Resolve LiveSessionAccess from an authoritative membership row.
 * Rejects if the membership userId does not match the authenticated user.
 */
export async function resolveLiveSessionAccessFromMembership(
  membership: AuthoritativeSessionMembership,
): Promise<LiveSessionAccess> {
  const userId = await getAuthenticatedUserId();
  if (membership.userId !== userId) {
    throw new Error('Session-Mitgliedschaft gehört nicht zum angemeldeten Nutzer.');
  }
  const validated = validateLiveSessionAccess({
    role: membership.role,
    capabilities: membership.capabilities,
    characterId: membership.characterId,
    allowPlayerDirector: membership.allowPlayerDirector === true,
  });
  if (validated.ok === false) {
    throw new Error(validated.message);
  }
  return validated.access;
}

/**
 * Build a viewer-safe read model. Client cannot elevate by sending extra keys
 * — gm_only / character_specific are stripped unless access allows.
 */
export function buildLiveSessionReadModel(
  access: LiveSessionAccess,
  authoritativePayload: Record<string, unknown>,
): Record<string, unknown> {
  return filterPayloadForAccess(access, authoritativePayload);
}

/**
 * Reject capability elevation attempts from client payloads.
 * Returns only the authoritative capability list.
 */
export function rejectClientCapabilityElevation(input: {
  authoritativeCapabilities: readonly string[];
  clientClaimedCapabilities: unknown;
}): readonly string[] {
  if (input.clientClaimedCapabilities === undefined || input.clientClaimedCapabilities === null) {
    return input.authoritativeCapabilities;
  }
  // Any client claim is ignored — authoritative wins.
  return input.authoritativeCapabilities;
}
