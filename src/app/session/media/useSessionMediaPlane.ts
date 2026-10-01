/**
 * useSessionMediaPlane — provider-neutral app facade for media plane (#363).
 * Location: src/app/session/media/useSessionMediaPlane.ts
 *
 * No LiveKit types. Explicit user gesture required before publishCamera/Mic.
 */
import { useRef, useState } from 'react';
import type { LiveSessionAccess } from '../../../domains/session/contracts/live-session-access';
import type {
  MediaPlaneStatus,
  MediaPresenceSnapshot,
  MediaPublishIntent,
} from '../../../domains/session/media/media-plane-contract';
import { SessionMediaPlane } from '../../../infrastructure/session/media/session-media-plane';

export type UseSessionMediaPlaneResult = {
  status: MediaPlaneStatus;
  presence: MediaPresenceSnapshot | null;
  connect: (input: {
    sessionId: string;
    access: LiveSessionAccess;
    identity: string;
  }) => Promise<MediaPlaneStatus>;
  disconnect: () => Promise<void>;
  /** Call only after explicit user gesture (getUserMedia permission). */
  publishAfterGesture: (
    intents: readonly MediaPublishIntent[],
  ) => Promise<MediaPlaneStatus>;
  applyAccessDowngrade: (
    access: LiveSessionAccess,
  ) => Promise<MediaPlaneStatus>;
};

export function useSessionMediaPlane(options?: {
  preferMemory?: boolean;
}): UseSessionMediaPlaneResult {
  const planeRef = useRef<SessionMediaPlane | null>(null);
  if (planeRef.current === null) {
    planeRef.current = new SessionMediaPlane({
      preferMemory: options?.preferMemory === true,
    });
  }
  const [status, setStatus] = useState<MediaPlaneStatus>(() =>
    planeRef.current!.getStatus(),
  );
  const [presence, setPresence] = useState<MediaPresenceSnapshot | null>(null);

  return {
    status,
    presence,
    connect: async (input) => {
      const next = await planeRef.current!.connect(input);
      setStatus(next);
      setPresence(planeRef.current!.getPresence());
      return next;
    },
    disconnect: async () => {
      await planeRef.current!.disconnect();
      setStatus(planeRef.current!.getStatus());
      setPresence(null);
    },
    publishAfterGesture: async (intents) => {
      const next = await planeRef.current!.publish(intents);
      setStatus(next);
      setPresence(planeRef.current!.getPresence());
      return next;
    },
    applyAccessDowngrade: async (access) => {
      const next = await planeRef.current!.applyAccessDowngrade(access);
      setStatus(next);
      setPresence(planeRef.current!.getPresence());
      return next;
    },
  };
}
