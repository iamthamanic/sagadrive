/**
 * Shared in-memory media data bus for multi-adapter tests (#364).
 * Location: src/infrastructure/session/media/memory-media-plane-bus.ts
 */

import type { MediaPlaneDataHandler, MediaPlaneDataMessage } from './media-plane-adapter';

export class MemoryMediaPlaneBus {
  private readonly handlers = new Set<{
    identity: string;
    handler: MediaPlaneDataHandler;
  }>();

  subscribe(identity: string, handler: MediaPlaneDataHandler): () => void {
    const entry = { identity, handler };
    this.handlers.add(entry);
    return () => {
      this.handlers.delete(entry);
    };
  }

  publish(message: MediaPlaneDataMessage): void {
    for (const entry of this.handlers) {
      if (entry.identity === message.publisherIdentity) continue;
      entry.handler(message);
    }
  }
}

/** Process-wide default bus for MemoryMediaPlaneAdapter instances. */
export const defaultMemoryMediaPlaneBus = new MemoryMediaPlaneBus();
