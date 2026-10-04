/**
 * Hook: bind local LiveAct engine + Media Plane for remote pose transport (#364).
 * Location: src/app/session/liveact/useLiveActSessionTransport.ts
 *
 * Character binding uses rosterByUserId — never client-claimed character IDs.
 */

import { useEffect, useRef, useState } from 'react';
import { canPublishTrack } from '../../../domains/session/media/media-plane-contract';
import type { LiveSessionAccess } from '../../../domains/session/contracts/live-session-access';
import { getSharedLiveActEngine } from '../../character/liveact/liveact-engine-singleton';
import {
  LiveActSessionTransport,
  type LiveActRemoteApplyTarget,
} from '../../../infrastructure/character/liveact/liveact-session-transport';
import type { SessionMediaPlane } from '../../../infrastructure/session/media/session-media-plane';

export type UseLiveActSessionTransportInput = {
  readonly enabled: boolean;
  readonly mediaPlane: SessionMediaPlane | null;
  readonly access: LiveSessionAccess | null;
  /** Authoritative userId → characterId from session runtime. */
  readonly rosterByUserId: Readonly<Record<string, string>>;
  readonly getOutputForCharacter: (characterId: string) => LiveActRemoteApplyTarget | null;
};

/**
 * Starts/stops LiveActSessionTransport when media plane + access allow.
 */
export function useLiveActSessionTransport(
  input: UseLiveActSessionTransportInput,
): { active: boolean } {
  const [active, setActive] = useState(false);
  const transportRef = useRef<LiveActSessionTransport | null>(null);
  const rosterRef = useRef(input.rosterByUserId);
  const getOutputRef = useRef(input.getOutputForCharacter);
  rosterRef.current = input.rosterByUserId;
  getOutputRef.current = input.getOutputForCharacter;

  useEffect(() => {
    const plane = input.mediaPlane;
    const access = input.access;
    if (!input.enabled || !plane || !access) {
      transportRef.current?.stop();
      transportRef.current = null;
      setActive(false);
      return;
    }

    const canPublish = canPublishTrack(access, 'liveact-data');
    const engine = getSharedLiveActEngine();
    const transport = new LiveActSessionTransport({
      mediaPlane: plane,
      canPublish: canPublish && engine !== null,
      subscribeLocalFrame: (listener) => {
        if (!engine) return () => undefined;
        return engine.subscribeFrame(listener);
      },
      getRosterByUserId: () => rosterRef.current,
      getOutputForCharacter: (characterId) => getOutputRef.current(characterId),
    });
    transport.start();
    if (canPublish) {
      void plane.publish([{ kind: 'liveact-data', enabled: true }]);
    }
    transportRef.current = transport;
    setActive(true);

    return () => {
      transport.stop();
      void plane.unpublish(['liveact-data']);
      transportRef.current = null;
      setActive(false);
    };
  }, [input.enabled, input.mediaPlane, input.access]);

  return { active };
}
