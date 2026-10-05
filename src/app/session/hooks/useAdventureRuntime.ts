/**
 * useAdventureRuntime — GM commands for typed adventure playthrough (#374).
 * Location: src/app/session/hooks/useAdventureRuntime.ts
 */
import { useState } from 'react';
import type { LiveSessionAccess } from '../../../domains/session/contracts/live-session-access';
import {
  assertAdventureRuntimeAccess,
  parseAdventureRuntimeCommand,
  projectAdventureRuntimeForAudience,
  readAdventureRuntime,
  type AdventureRuntimeCommand,
  type AdventureRuntimeState,
} from '../../../domains/session/contracts/adventure-runtime-state';
import { useSessionRuntime } from './useSessionRuntime';

export function useAdventureRuntime(input: {
  sessionId: string | null;
  access: LiveSessionAccess | null;
}) {
  const runtime = useSessionRuntime(input.sessionId);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shared = runtime.state?.gameplay.shared ?? {};
  const raw = readAdventureRuntime(shared);
  const role = input.access?.role ?? 'viewer';
  const state: AdventureRuntimeState = projectAdventureRuntimeForAudience(
    raw,
    role === 'gamemaster' ? 'gamemaster' : role === 'player' ? 'player' : 'viewer',
  );

  const run = async (rawCommand: AdventureRuntimeCommand): Promise<boolean> => {
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
      const command = parseAdventureRuntimeCommand(rawCommand);
      assertAdventureRuntimeAccess(input.access, command);
      const payload: Record<string, unknown> = { op: command.op };
      if (command.key) payload.key = command.key;
      if (command.value !== null && command.value !== undefined) payload.value = command.value;
      if (command.visibility) payload.visibility = command.visibility;
      if (command.actorRef) payload.actorRef = command.actorRef;
      if (command.targetRef) payload.targetRef = command.targetRef;
      if (command.score !== null && command.score !== undefined) payload.score = command.score;
      if (command.clockId) payload.clockId = command.clockId;
      if (command.clockLabel) payload.clockLabel = command.clockLabel;
      if (command.clockDelta !== null && command.clockDelta !== undefined) {
        payload.clockDelta = command.clockDelta;
      }
      if (command.clockMax !== null && command.clockMax !== undefined) {
        payload.clockMax = command.clockMax;
      }
      if (command.consequenceKind) payload.consequenceKind = command.consequenceKind;
      if (command.summary) payload.summary = command.summary;
      if (command.definitionRef) payload.definitionRef = command.definitionRef;
      if (command.note) payload.note = command.note;
      const next = await runtime.applyCommand({
        kind: 'adventure',
        payload,
        idempotencyKey: `adventure:${command.op}:${command.key ?? command.clockId ?? Date.now()}`,
      });
      return next !== null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Adventure-Aktion fehlgeschlagen');
      return false;
    } finally {
      setIsBusy(false);
    }
  };

  return { state, run, isBusy, error, resync: runtime.resync };
}
