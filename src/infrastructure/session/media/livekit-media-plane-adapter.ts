/**
 * LiveKit media plane adapter — SDK confined here (#363).
 * Location: src/infrastructure/session/media/livekit-media-plane-adapter.ts
 *
 * Default connect fails closed unless a `roomFactory` is injected (tests/prod
 * wiring). Avoids hard dependency on livekit-client in the main bundle.
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
  MediaPlaneDataHandler,
} from './media-plane-adapter';

type LiveKitRoomLike = {
  connect: (url: string, token: string) => Promise<void>;
  disconnect: () => Promise<void> | void;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  off?: (event: string, listener: (...args: unknown[]) => void) => void;
  localParticipant?: {
    setCameraEnabled?: (enabled: boolean) => Promise<void>;
    setMicrophoneEnabled?: (enabled: boolean) => Promise<void>;
    publishData?: (
      data: Uint8Array,
      options?: { reliable?: boolean; topic?: string },
    ) => Promise<void>;
  };
};

export type LiveKitRoomFactory = () => Promise<LiveKitRoomLike>;

export class LiveKitMediaPlaneAdapter implements MediaPlaneAdapter {
  readonly providerId = 'livekit' as const;
  private health: MediaPlaneHealth = 'unavailable';
  private roomId = '';
  private localIdentity: string | null = null;
  private role: MediaPresenceSnapshot['participants'][number]['role'] = 'viewer';
  private published: MediaTrackKind[] = [];
  private room: LiveKitRoomLike | null = null;
  private readonly dataHandlers = new Set<MediaPlaneDataHandler>();
  private dataListener: ((...args: unknown[]) => void) | null = null;

  constructor(private readonly roomFactory?: LiveKitRoomFactory) {}

  async connect(input: MediaPlaneConnectInput): Promise<void> {
    this.health = 'connecting';
    this.roomId = deriveMediaRoomId(input.sessionId);
    this.localIdentity = input.identity;
    this.role = input.access.role;
    this.published = [];

    if (!this.roomFactory) {
      this.health = 'unavailable';
      throw new Error(
        'LiveKit room factory not configured (media plane degraded).',
      );
    }

    try {
      this.room = await this.roomFactory();
      await this.room.connect(input.url, input.token);
      this.attachDataListener();
      this.health = 'ready';
    } catch (error) {
      this.room = null;
      this.health = 'unavailable';
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  async disconnect(): Promise<void> {
    try {
      this.detachDataListener();
      await this.room?.disconnect();
    } finally {
      this.room = null;
      this.health = 'unavailable';
      this.localIdentity = null;
      this.published = [];
      this.roomId = '';
      this.dataHandlers.clear();
    }
  }

  async publish(intents: readonly MediaPublishIntent[]): Promise<void> {
    if (this.health !== 'ready' || !this.room) {
      throw new Error('LiveKit room not ready');
    }
    const local = this.room.localParticipant;
    for (const intent of intents) {
      if (!intent.enabled) continue;
      if (intent.kind === 'camera') {
        await local?.setCameraEnabled?.(true);
      } else if (intent.kind === 'microphone') {
        await local?.setMicrophoneEnabled?.(true);
      }
      if (!this.published.includes(intent.kind)) {
        this.published.push(intent.kind);
      }
    }
  }

  async unpublish(kinds: readonly MediaTrackKind[]): Promise<void> {
    const local = this.room?.localParticipant;
    for (const kind of kinds) {
      if (kind === 'camera') await local?.setCameraEnabled?.(false);
      if (kind === 'microphone') await local?.setMicrophoneEnabled?.(false);
    }
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

  async publishData(topic: string, payload: string): Promise<void> {
    if (this.health !== 'ready' || !this.room?.localParticipant?.publishData) {
      throw new Error('LiveKit data publish unavailable');
    }
    const bytes = new TextEncoder().encode(payload);
    await this.room.localParticipant.publishData(bytes, {
      reliable: false,
      topic,
    });
    if (topic === 'liveact-data' && !this.published.includes('liveact-data')) {
      this.published.push('liveact-data');
    }
  }

  subscribeData(handler: MediaPlaneDataHandler): () => void {
    this.dataHandlers.add(handler);
    return () => {
      this.dataHandlers.delete(handler);
    };
  }

  private attachDataListener(): void {
    if (!this.room?.on) return;
    this.detachDataListener();
    this.dataListener = (...args: unknown[]) => {
      const payload = args[0];
      const participant = args[1] as { identity?: string } | undefined;
      const topic =
        typeof args[2] === 'string'
          ? args[2]
          : typeof (args[2] as { topic?: string } | undefined)?.topic === 'string'
            ? (args[2] as { topic: string }).topic
            : 'liveact-data';
      if (!(payload instanceof Uint8Array)) return;
      const publisherIdentity =
        typeof participant?.identity === 'string' ? participant.identity : '';
      if (!publisherIdentity || publisherIdentity === this.localIdentity) return;
      const text = new TextDecoder().decode(payload);
      const message = { topic, payload: text, publisherIdentity };
      for (const handler of this.dataHandlers) handler(message);
    };
    this.room.on('dataReceived', this.dataListener);
  }

  private detachDataListener(): void {
    if (this.room?.off && this.dataListener) {
      this.room.off('dataReceived', this.dataListener);
    }
    this.dataListener = null;
  }
}
