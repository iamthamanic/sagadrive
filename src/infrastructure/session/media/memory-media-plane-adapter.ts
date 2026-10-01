/**
 * In-memory media plane adapter for tests and degraded local paths (#363).
 * Location: src/infrastructure/session/media/memory-media-plane-adapter.ts
 */
import {
  deriveMediaRoomId,
  type MediaPlaneHealth,
  type MediaPresenceSnapshot,
  type MediaPublishIntent,
  type MediaTrackKind,
} from '../../../domains/session/media/media-plane-contract';
import type {
  MediaPlaneAdapter,
  MediaPlaneConnectInput,
} from './media-plane-adapter';

export class MemoryMediaPlaneAdapter implements MediaPlaneAdapter {
  readonly providerId = 'memory' as const;
  private health: MediaPlaneHealth = 'unavailable';
  private roomId = '';
  private localIdentity: string | null = null;
  private published: MediaTrackKind[] = [];
  private role: MediaPresenceSnapshot['participants'][number]['role'] = 'viewer';

  async connect(input: MediaPlaneConnectInput): Promise<void> {
    if (!input.token || !input.url) {
      this.health = 'unavailable';
      throw new Error('Media token/url missing');
    }
    this.health = 'connecting';
    this.roomId = deriveMediaRoomId(input.sessionId);
    this.localIdentity = input.identity;
    this.role = input.access.role;
    this.published = [];
    this.health = 'ready';
  }

  async disconnect(): Promise<void> {
    this.health = 'unavailable';
    this.localIdentity = null;
    this.published = [];
    this.roomId = '';
  }

  async publish(intents: readonly MediaPublishIntent[]): Promise<void> {
    if (this.health !== 'ready' && this.health !== 'reconnecting') {
      throw new Error('Media plane not ready');
    }
    for (const intent of intents) {
      if (!intent.enabled) continue;
      if (!this.published.includes(intent.kind)) {
        this.published.push(intent.kind);
      }
    }
  }

  async unpublish(kinds: readonly MediaTrackKind[]): Promise<void> {
    this.published = this.published.filter((k) => !kinds.includes(k));
  }

  getPresence(): MediaPresenceSnapshot {
    return {
      roomId: this.roomId,
      health: this.health,
      localIdentity: this.localIdentity,
      participants:
        this.localIdentity === null
          ? []
          : [
              {
                identity: this.localIdentity,
                role: this.role,
                published: [...this.published],
              },
            ],
    };
  }

  getHealth(): MediaPlaneHealth {
    return this.health;
  }

  /** Test helper: simulate reconnect cycle. */
  async simulateReconnect(): Promise<void> {
    this.health = 'reconnecting';
    this.health = 'ready';
  }
}
