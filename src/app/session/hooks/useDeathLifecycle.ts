/**
 * useDeathLifecycle — GM-facing authoritative life-state commands (#373).
 * Location: src/app/session/hooks/useDeathLifecycle.ts
 *
 * Persists via session runtime kind `life` (SQL resolve). No client-forged HP.
 */
import { useState } from 'react';
import type { LiveSessionAccess } from '../../../domains/session/contracts/live-session-access';
import {
  assertDeathLifecycleAccess,
  parseDeathLifecycleCommand,
  readLifeByCharacter,
  readSessionLifeDifficulty,
  type DeathLifecycleCommand,
  type CharacterLifeState,
} from '../../../domains/session/contracts/session-death-lifecycle';
import { useSessionRuntime } from './useSessionRuntime';

export function useDeathLifecycle(input: {
  sessionId: string | null;
  access: LiveSessionAccess | null;
}) {
  const runtime = useSessionRuntime(input.sessionId);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shared = runtime.state?.gameplay.shared ?? {};
  const sessionDifficulty = readSessionLifeDifficulty(shared);

  const lifeFor = (characterId: string | null | undefined): CharacterLifeState | null => {
    if (!characterId) return null;
    return readLifeByCharacter(shared, characterId);
  };

  const run = async (raw: DeathLifecycleCommand): Promise<boolean> => {
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
      const command = parseDeathLifecycleCommand(raw);
      assertDeathLifecycleAccess(input.access, command);
      const payload: Record<string, unknown> = {
        op: command.op,
        characterId: command.characterId,
      };
      if (command.participantId) payload.participantId = command.participantId;
      if (command.grade) payload.grade = command.grade;
      if (command.difficulty) payload.difficulty = command.difficulty;
      if (command.explicitDeadly === true) payload.explicitDeadly = true;
      if (command.confirmDead === true) payload.confirmDead = true;
      if (command.note) payload.note = command.note;
      const next = await runtime.applyCommand({
        kind: 'life',
        payload,
        idempotencyKey: `life:${command.op}:${command.characterId}:${Date.now()}`,
      });
      return next !== null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Life-Aktion fehlgeschlagen');
      return false;
    } finally {
      setIsBusy(false);
    }
  };

  return {
    run,
    isBusy,
    error,
    sessionDifficulty,
    lifeFor,
    resync: runtime.resync,
  };
}
