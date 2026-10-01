/**
 * Session media plane facade — connect/publish with gameplay-safe degrade (#363).
 * Location: src/infrastructure/session/media/session-media-plane.ts
 */
import type { LiveSessionAccess } from '../../../domains/session/contracts/live-session-access';
import {
  canPublishTrack,
  canSubscribeMedia,
  degradedMediaStatus,
  filterPublishIntentsForAccess,
  readyMediaStatus,
  type MediaPlaneStatus,
  type MediaPresenceSnapshot,
  type MediaPublishIntent,
  type MediaTrackKind,
} from '../../../domains/session/media/media-plane-contract';
import type { MediaPlaneAdapter } from './media-plane-adapter';
import { fetchSessionMediaToken } from './media-token-client';
import { LiveKitMediaPlaneAdapter } from './livekit-media-plane-adapter';
import { MemoryMediaPlaneAdapter } from './memory-media-plane-adapter';

export type SessionMediaPlaneOptions = {
  /** Prefer memory adapter (tests). Default: LiveKit with degrade. */
  readonly preferMemory?: boolean;
  readonly adapter?: MediaPlaneAdapter;
  readonly tokenFetcher?: typeof fetchSessionMediaToken;
};

export class SessionMediaPlane {
  private adapter: MediaPlaneAdapter;
  private status: MediaPlaneStatus = degradedMediaStatus(
    'media_service_unavailable',
    'Media plane noch nicht verbunden.',
  );
  private access: LiveSessionAccess | null = null;
  private readonly tokenFetcher: typeof fetchSessionMediaToken;

  constructor(options: SessionMediaPlaneOptions = {}) {
    this.tokenFetcher = options.tokenFetcher ?? fetchSessionMediaToken;
    if (options.adapter) {
      this.adapter = options.adapter;
    } else if (options.preferMemory === true) {
      this.adapter = new MemoryMediaPlaneAdapter();
    } else {
      this.adapter = new LiveKitMediaPlaneAdapter();
    }
  }

  getStatus(): MediaPlaneStatus {
    return this.status;
  }

  getPresence(): MediaPresenceSnapshot {
    return this.adapter.getPresence();
  }

  /**
   * Connect using membership-derived token. Media outage → degraded, no throw to UI callers
   * unless `throwOnUnavailable` (tests).
   */
  async connect(input: {
    sessionId: string;
    access: LiveSessionAccess;
    identity: string;
    throwOnUnavailable?: boolean;
  }): Promise<MediaPlaneStatus> {
    this.access = input.access;
    if (!canSubscribeMedia(input.access)) {
      this.status = degradedMediaStatus(
        'permission_denied',
        'Keine Media-Berechtigung für diese Rolle.',
      );
      return this.status;
    }

    const tokenResult = await this.tokenFetcher({ sessionId: input.sessionId });
    if (tokenResult.ok === false) {
      this.status = degradedMediaStatus(
        tokenResult.reason === 'forbidden' || tokenResult.reason === 'unauthorized'
          ? 'permission_denied'
          : 'media_service_unavailable',
        tokenResult.message,
      );
      if (input.throwOnUnavailable) {
        throw new Error(tokenResult.message);
      }
      return this.status;
    }

    try {
      await this.adapter.connect({
        sessionId: input.sessionId,
        access: input.access,
        identity: input.identity,
        token: tokenResult.token,
        url: tokenResult.url,
      });
      this.status = readyMediaStatus();
      return this.status;
    } catch (error) {
      this.status = degradedMediaStatus(
        'media_service_unavailable',
        error instanceof Error
          ? error.message
          : 'Media-Verbindung fehlgeschlagen.',
      );
      if (input.throwOnUnavailable) throw error;
      return this.status;
    }
  }

  async disconnect(): Promise<void> {
    await this.adapter.disconnect();
    this.status = degradedMediaStatus(
      'media_service_unavailable',
      'Media plane getrennt.',
    );
    this.access = null;
  }

  /**
   * Publish only intents allowed by current access. Explicit gesture expected by UI.
   */
  async publish(intents: readonly MediaPublishIntent[]): Promise<MediaPlaneStatus> {
    if (!this.access) {
      this.status = degradedMediaStatus(
        'permission_denied',
        'Media plane nicht verbunden.',
      );
      return this.status;
    }
    if (this.status.health !== 'ready' && this.status.health !== 'reconnecting') {
      return this.status;
    }
    const allowed = filterPublishIntentsForAccess(this.access, intents);
    if (allowed.length === 0) {
      this.status = degradedMediaStatus(
        'permission_denied',
        'Publish für diese Rolle nicht erlaubt.',
      );
      return this.status;
    }
    try {
      await this.adapter.publish(allowed);
      this.status = readyMediaStatus();
    } catch (error) {
      this.status = degradedMediaStatus(
        'network',
        error instanceof Error ? error.message : 'Publish fehlgeschlagen.',
      );
    }
    return this.status;
  }

  async unpublish(kinds: readonly MediaTrackKind[]): Promise<void> {
    await this.adapter.unpublish(kinds);
  }

  /**
   * Apply role downgrade: drop forbidden tracks and refresh status.
   */
  async applyAccessDowngrade(access: LiveSessionAccess): Promise<MediaPlaneStatus> {
    this.access = access;
    const presence = this.adapter.getPresence();
    const local = presence.participants.find((p) => p.identity === presence.localIdentity);
    const published = local?.published ?? [];
    const forbidden = published.filter((kind) => !canPublishTrack(access, kind));
    if (forbidden.length > 0) {
      await this.adapter.unpublish(forbidden);
      this.status = degradedMediaStatus(
        'role_downgrade',
        'Publish-Rechte entzogen — Tracks entfernt.',
      );
      if (this.adapter.getHealth() === 'ready') {
        this.status = readyMediaStatus();
      }
    }
    return this.status;
  }
}
