/**
 * Provider-neutral media plane adapter contract (#363).
 * Location: src/infrastructure/session/media/media-plane-adapter.ts
 *
 * LiveKit types stay inside adapter implementations — never leak to domain/app.
 */

import type {
  MediaPlaneHealth,
  MediaPresenceSnapshot,
  MediaPublishIntent,
  MediaTrackKind,
} from '../../../domains/session/media/media-plane-contract';
import type { LiveSessionAccess } from '../../../domains/session/contracts/live-session-access';

export type MediaPlaneConnectInput = {
  readonly sessionId: string;
  readonly access: LiveSessionAccess;
  readonly identity: string;
  readonly token: string;
  readonly url: string;
};

export type MediaPlaneAdapter = {
  readonly providerId: 'livekit' | 'memory' | 'none';
  connect(input: MediaPlaneConnectInput): Promise<void>;
  disconnect(): Promise<void>;
  publish(intents: readonly MediaPublishIntent[]): Promise<void>;
  unpublish(kinds: readonly MediaTrackKind[]): Promise<void>;
  getPresence(): MediaPresenceSnapshot;
  getHealth(): MediaPlaneHealth;
};
