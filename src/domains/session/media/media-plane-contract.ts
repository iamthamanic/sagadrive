/**
 * Session media plane domain — track intents, presence, publish policy (#363).
 * Location: src/domains/session/media/media-plane-contract.ts
 *
 * Pure domain: no LiveKit/SDK types. Durable gameplay stays outside this plane.
 */

import {
  canExecuteLiveSessionCommand,
  hasSessionCapability,
  type LiveSessionAccess,
} from '../contracts/live-session-access';

export const MEDIA_TRACK_KINDS = ['camera', 'microphone', 'liveact-data'] as const;
export type MediaTrackKind = (typeof MEDIA_TRACK_KINDS)[number];

export const MEDIA_PLANE_HEALTH = [
  'unavailable',
  'degraded',
  'connecting',
  'ready',
  'reconnecting',
] as const;
export type MediaPlaneHealth = (typeof MEDIA_PLANE_HEALTH)[number];

export type MediaPublishIntent = {
  readonly kind: MediaTrackKind;
  readonly enabled: boolean;
};

export type MediaPresenceParticipant = {
  readonly identity: string;
  readonly role: LiveSessionAccess['role'];
  readonly published: readonly MediaTrackKind[];
};

export type MediaPresenceSnapshot = {
  readonly roomId: string;
  readonly health: MediaPlaneHealth;
  readonly localIdentity: string | null;
  readonly participants: readonly MediaPresenceParticipant[];
};

export type MediaGrant = {
  readonly canPublishCamera: boolean;
  readonly canPublishMicrophone: boolean;
  readonly canPublishLiveactData: boolean;
  readonly canSubscribe: boolean;
  /** Viewer default: receive-only. */
  readonly receiveOnly: boolean;
};

/**
 * Derive SFU room id from SagaDrive session identity — never from client room name.
 */
export function deriveMediaRoomId(sessionId: string): string {
  const trimmed = sessionId.trim();
  if (!trimmed) {
    throw new Error('sessionId required for media room');
  }
  return `sagadrive-session-${trimmed}`;
}

export function isMediaTrackKind(value: unknown): value is MediaTrackKind {
  return (
    typeof value === 'string' &&
    (MEDIA_TRACK_KINDS as readonly string[]).includes(value)
  );
}

/**
 * Publication/subscription policy from Live Session access (#362).
 * Viewer: subscribe only. Player/GM: publish A/V when media_token allowed.
 * liveact-data: player + GM only (not viewer).
 */
export function resolveMediaGrant(access: LiveSessionAccess): MediaGrant {
  const mayIssueToken = canExecuteLiveSessionCommand(access, 'media_token');
  const isViewer = access.role === 'viewer';
  const isDirector = hasSessionCapability(access, 'director');
  const canPublishAv =
    mayIssueToken && (access.role === 'player' || access.role === 'gamemaster');
  const canPublishLiveact =
    access.role === 'player' || access.role === 'gamemaster';

  return {
    canPublishCamera: canPublishAv,
    canPublishMicrophone: canPublishAv,
    canPublishLiveactData: canPublishLiveact,
    canSubscribe: isViewer || mayIssueToken || isDirector || access.role === 'gamemaster',
    receiveOnly: isViewer && !isDirector,
  };
}

export function canPublishTrack(
  access: LiveSessionAccess,
  kind: MediaTrackKind,
): boolean {
  const grant = resolveMediaGrant(access);
  switch (kind) {
    case 'camera':
      return grant.canPublishCamera;
    case 'microphone':
      return grant.canPublishMicrophone;
    case 'liveact-data':
      return grant.canPublishLiveactData;
    default:
      return false;
  }
}

export function canSubscribeMedia(access: LiveSessionAccess): boolean {
  return resolveMediaGrant(access).canSubscribe;
}

/**
 * Role downgrade: strip publish intents the new access forbids.
 */
export function filterPublishIntentsForAccess(
  access: LiveSessionAccess,
  intents: readonly MediaPublishIntent[],
): MediaPublishIntent[] {
  return intents
    .filter((intent) => intent.enabled && canPublishTrack(access, intent.kind))
    .map((intent) => ({ kind: intent.kind, enabled: true }));
}

export type MediaPlaneHealthReason =
  | 'ok'
  | 'media_service_unavailable'
  | 'permission_denied'
  | 'token_rejected'
  | 'network'
  | 'role_downgrade';

export type MediaPlaneStatus = {
  readonly health: MediaPlaneHealth;
  readonly reason: MediaPlaneHealthReason;
  readonly message: string;
};

export function degradedMediaStatus(
  reason: MediaPlaneHealthReason,
  message: string,
): MediaPlaneStatus {
  return {
    health: reason === 'media_service_unavailable' ? 'unavailable' : 'degraded',
    reason,
    message,
  };
}

export function readyMediaStatus(): MediaPlaneStatus {
  return { health: 'ready', reason: 'ok', message: 'Media plane bereit.' };
}
