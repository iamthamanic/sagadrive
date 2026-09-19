/**
 * session-routing — pure Saga/Session lifecycle and live-view role rules (#276).
 * Location: src/domains/resource-id/session-routing.ts
 *
 * URL describes the screen; membership/role authorizes access.
 */

export type ProjectSessionLifecycleStatus =
  | 'scheduled'
  | 'active'
  | 'paused'
  | 'completed'
  | 'cancelled';

export type SessionLifecyclePhase = 'prepare' | 'live' | 'recap';

export type LiveSessionRole = 'gm' | 'player' | 'observer' | 'none';

export type LiveViewTarget =
  | { kind: 'gamemaster' }
  | { kind: 'player'; characterPublicId: string }
  | { kind: 'player-resolve' }
  | { kind: 'display' }
  | { kind: 'forbidden'; reason: string };

/**
 * Neutral session route → prepare | live | recap from persisted status.
 */
export function resolveNeutralSessionPhase(
  status: ProjectSessionLifecycleStatus,
): SessionLifecyclePhase {
  switch (status) {
    case 'scheduled':
      return 'prepare';
    case 'active':
    case 'paused':
      return 'live';
    case 'completed':
      return 'recap';
    case 'cancelled':
      return 'recap';
  }
}

/**
 * Neutral `/live` entry: GM → gamemaster; player → canonical character route
 * when known, else resolve convenience route; others forbidden.
 */
export function resolveLiveEntryPath(input: {
  role: LiveSessionRole;
  assignedCharacterPublicId: string | null;
}): LiveViewTarget {
  if (input.role === 'gm') {
    return { kind: 'gamemaster' };
  }
  if (input.role === 'player') {
    if (input.assignedCharacterPublicId) {
      return {
        kind: 'player',
        characterPublicId: input.assignedCharacterPublicId,
      };
    }
    return { kind: 'player-resolve' };
  }
  return {
    kind: 'forbidden',
    reason: 'Keine Live-Session-Mitgliedschaft für diese Rolle.',
  };
}

/**
 * Character public id in the URL is routing context only — never a grant.
 */
export function authorizeLivePlayerCharacter(input: {
  role: LiveSessionRole;
  requestedCharacterPublicId: string;
  assignedCharacterPublicId: string | null;
  /** Explicit allow for GM/observer peek when product later enables it. */
  explicitlyAllowed?: boolean;
}): { allowed: boolean; reason?: string } {
  if (input.explicitlyAllowed) {
    return { allowed: true };
  }
  if (input.role === 'gm') {
    // GM may open player view for facilitation; still not a permission substitute
    // for GM-only data (that stays on gamemaster routes/services).
    return { allowed: true };
  }
  if (input.role !== 'player') {
    return {
      allowed: false,
      reason: 'Keine Player-Mitgliedschaft für diese Live-View.',
    };
  }
  if (!input.assignedCharacterPublicId) {
    return {
      allowed: false,
      reason: 'Dieser Session ist kein Character zugeordnet.',
    };
  }
  if (input.assignedCharacterPublicId !== input.requestedCharacterPublicId) {
    return {
      allowed: false,
      reason: 'Character gehört nicht zu dieser Session-Mitgliedschaft.',
    };
  }
  return { allowed: true };
}
