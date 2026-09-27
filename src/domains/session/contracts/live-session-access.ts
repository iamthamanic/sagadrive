/**
 * Live Session access contract — roles, capabilities, visibility (#362).
 * Location: src/domains/session/contracts/live-session-access.ts
 *
 * Pure domain: URL/client flags never grant rights. Director is a capability,
 * not a base role. Compatible with legacy LiveSessionRole (gm/observer).
 */

export const SESSION_ROLES = ['player', 'gamemaster', 'viewer'] as const;

export type SessionRole = (typeof SESSION_ROLES)[number];

/** Capabilities are additive; director is never a base role. */
export const SESSION_CAPABILITIES = ['director'] as const;

export type SessionCapability = (typeof SESSION_CAPABILITIES)[number];

export const LIVE_SURFACE_KINDS = [
  'player-live',
  'gamemaster-live',
  'viewer-live',
  'director-control',
  'program-display',
] as const;

export type LiveSurfaceKind = (typeof LIVE_SURFACE_KINDS)[number];

export const VISIBILITY_AUDIENCES = [
  'public',
  'shared',
  'character_private',
  'gm_only',
  'program',
] as const;

export type VisibilityAudience = (typeof VISIBILITY_AUDIENCES)[number];

export type LiveSessionAccess = {
  readonly role: SessionRole;
  readonly capabilities: readonly SessionCapability[];
  /** Assigned character for player private knowledge; null for GM/viewer. */
  readonly characterId: string | null;
};

export type LiveSessionCommandKind =
  | 'gameplay_mutate'
  | 'reveal'
  | 'cue'
  | 'media_token'
  | 'program_switch'
  | 'director_preview';

export type LiveSessionPermission =
  | 'read_public'
  | 'read_shared'
  | 'read_character_private'
  | 'read_gm_only'
  | 'read_program'
  | 'write_gameplay'
  | 'reveal'
  | 'cue'
  | 'media_issue'
  | 'director_control';

function isSessionRole(value: string): value is SessionRole {
  return (SESSION_ROLES as readonly string[]).includes(value);
}

function isSessionCapability(value: string): value is SessionCapability {
  return (SESSION_CAPABILITIES as readonly string[]).includes(value);
}

/**
 * Fail-closed parse of a persisted/base role. Unknown → null.
 * Accepts legacy aliases: gm → gamemaster, observer → viewer.
 */
export function parseSessionRole(value: unknown): SessionRole | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'gm') return 'gamemaster';
  if (normalized === 'observer') return 'viewer';
  if (isSessionRole(normalized)) return normalized;
  return null;
}

export function parseSessionCapability(value: unknown): SessionCapability | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return isSessionCapability(normalized) ? normalized : null;
}

export function parseSessionCapabilities(value: unknown): SessionCapability[] {
  if (!Array.isArray(value)) return [];
  const out: SessionCapability[] = [];
  for (const item of value) {
    const parsed = parseSessionCapability(item);
    if (parsed !== null && !out.includes(parsed)) out.push(parsed);
  }
  return out;
}

export type LiveSessionAccessValidation =
  | { readonly ok: true; readonly access: LiveSessionAccess }
  | { readonly ok: false; readonly code: string; readonly message: string };

/**
 * Validate role + capability combination.
 * Player may not hold director unless explicitly allowed by membership policy.
 */
export function validateLiveSessionAccess(input: {
  role: unknown;
  capabilities?: unknown;
  characterId?: string | null;
  allowPlayerDirector?: boolean;
}): LiveSessionAccessValidation {
  const role = parseSessionRole(input.role);
  if (role === null) {
    return {
      ok: false,
      code: 'session-role-unknown',
      message: 'Unbekannte oder fehlende Session-Rolle (fail-closed).',
    };
  }
  const capabilities = parseSessionCapabilities(input.capabilities ?? []);
  if (role === 'player' && capabilities.includes('director')) {
    if (input.allowPlayerDirector !== true) {
      return {
        ok: false,
        code: 'session-player-director-forbidden',
        message: 'Player darf die Director-Capability nicht besitzen.',
      };
    }
  }
  const characterId =
    typeof input.characterId === 'string' && input.characterId.length > 0
      ? input.characterId
      : null;
  if (role === 'player' && characterId === null) {
    // Allowed: character may resolve later; private reads stay denied until set.
  }
  return {
    ok: true,
    access: { role, capabilities, characterId },
  };
}

export function hasSessionCapability(
  access: LiveSessionAccess,
  capability: SessionCapability,
): boolean {
  return access.capabilities.includes(capability);
}

/**
 * Visibility: which audiences a role may see.
 * Viewer never gets gm_only or character_private.
 */
export function canReadVisibilityAudience(
  access: LiveSessionAccess,
  audience: VisibilityAudience,
  options?: { characterId?: string | null },
): boolean {
  switch (audience) {
    case 'public':
    case 'program':
      return true;
    case 'shared':
      return access.role === 'player' || access.role === 'gamemaster';
    case 'gm_only':
      return access.role === 'gamemaster';
    case 'character_private': {
      if (access.role === 'gamemaster') return true;
      if (access.role !== 'player') return false;
      const target = options?.characterId ?? null;
      if (target === null || access.characterId === null) return false;
      return target === access.characterId;
    }
    default:
      return false;
  }
}

export function canExecuteLiveSessionCommand(
  access: LiveSessionAccess,
  command: LiveSessionCommandKind,
): boolean {
  const isDirector = hasSessionCapability(access, 'director');
  switch (command) {
    case 'gameplay_mutate':
    case 'reveal':
      return access.role === 'gamemaster';
    case 'cue':
    case 'program_switch':
    case 'director_preview':
      // Director capability required; director-only (viewer+director) OK for cues.
      // Gameplay mutate still requires GM above.
      return isDirector || access.role === 'gamemaster';
    case 'media_token':
      return access.role === 'player' || access.role === 'gamemaster' || isDirector;
    default:
      return false;
  }
}

export function listLiveSessionPermissions(
  access: LiveSessionAccess,
): readonly LiveSessionPermission[] {
  const perms: LiveSessionPermission[] = ['read_public', 'read_program'];
  if (canReadVisibilityAudience(access, 'shared')) perms.push('read_shared');
  if (canReadVisibilityAudience(access, 'gm_only')) perms.push('read_gm_only');
  if (
    access.role === 'player' &&
    access.characterId !== null &&
    canReadVisibilityAudience(access, 'character_private', {
      characterId: access.characterId,
    })
  ) {
    perms.push('read_character_private');
  }
  if (access.role === 'gamemaster') {
    perms.push('read_character_private', 'write_gameplay', 'reveal');
  }
  if (canExecuteLiveSessionCommand(access, 'cue')) perms.push('cue');
  if (canExecuteLiveSessionCommand(access, 'media_token')) perms.push('media_issue');
  if (hasSessionCapability(access, 'director') || access.role === 'gamemaster') {
    perms.push('director_control');
  }
  return perms;
}

/**
 * Surfaces a role may open — display is output, not a role grant.
 */
export function allowedLiveSurfaces(
  access: LiveSessionAccess,
): readonly LiveSurfaceKind[] {
  const surfaces: LiveSurfaceKind[] = ['program-display'];
  if (access.role === 'player') surfaces.push('player-live');
  if (access.role === 'gamemaster') surfaces.push('gamemaster-live');
  if (access.role === 'viewer') surfaces.push('viewer-live');
  if (hasSessionCapability(access, 'director') || access.role === 'gamemaster') {
    surfaces.push('director-control');
  }
  return surfaces;
}

/**
 * Strip gm_only / character_specific keys from a payload for viewer read models.
 */
export function filterPayloadForAccess(
  access: LiveSessionAccess,
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (key === 'gm_only' || key.startsWith('gm_only.')) {
      if (!canReadVisibilityAudience(access, 'gm_only')) continue;
    }
    if (key === 'character_specific' || key.startsWith('character_specific.')) {
      if (!canReadVisibilityAudience(access, 'character_private', {
        characterId: access.characterId,
      })) {
        continue;
      }
    }
    out[key] = value;
  }
  return out;
}
