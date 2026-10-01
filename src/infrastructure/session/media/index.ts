/**
 * Session media infrastructure barrel (#363).
 * Location: src/infrastructure/session/media/index.ts
 */
export type { MediaPlaneAdapter, MediaPlaneConnectInput } from './media-plane-adapter';
export { MemoryMediaPlaneAdapter } from './memory-media-plane-adapter';
export { LiveKitMediaPlaneAdapter } from './livekit-media-plane-adapter';
export {
  fetchSessionMediaToken,
  type MediaTokenResult,
} from './media-token-client';
export {
  SessionMediaPlane,
  type SessionMediaPlaneOptions,
} from './session-media-plane';
