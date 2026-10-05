/**
 * useDirectorRuntime — Public facade for Director cues / automatic mode (#375).
 * Location: src/app/session/hooks/useDirectorRuntime.ts
 *
 * Full Control Room UI lands in #376; this is the authoritative hook surface.
 */
import { useState } from 'react';
import type { LiveSessionAccess } from '../../../domains/session/contracts/live-session-access';
import {
  assertDirectorCueAccess,
  parseDirectorCueCommand,
  readDirectorRuntime,
  type DirectorCueCommand,
  type DirectorRuntimeState,
} from '../../../domains/session/director';
import { useSessionRuntime } from './useSessionRuntime';

export function useDirectorRuntime(input: {
  sessionId: string | null;
  access: LiveSessionAccess | null;
}) {
  const runtime = useSessionRuntime(input.sessionId);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const state: DirectorRuntimeState = readDirectorRuntime(
    runtime.state?.gameplay.shared ?? {},
  );

  const run = async (raw: DirectorCueCommand | Record<string, unknown>): Promise<boolean> => {
    if (!input.access) {
      setError('Kein Session-Access');
      return false;
    }
    if (!input.sessionId) {
      setError('Keine Session');
      return false;
    }
    setIsBusy(true);
    setError(null);
    try {
      assertDirectorCueAccess(input.access);
      const command = parseDirectorCueCommand(raw);
      const payload = { ...command } as Record<string, unknown>;
      const next = await runtime.applyCommand({
        kind: 'cue',
        payload,
        idempotencyKey: `cue:${command.op}:${Date.now()}`,
      });
      return next !== null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cue fehlgeschlagen');
      return false;
    } finally {
      setIsBusy(false);
    }
  };

  return {
    state,
    run,
    isBusy,
    error,
    resync: runtime.resync,
    programRevision: state.program.revision,
  };
}
