/**
 * useCombatEncounter — Runtime-backed combat encounter read/mutate (#300).
 * Location: src/app/session/hooks/useCombatEncounter.ts
 */
import { useEffect, useState } from 'react';
import {
  parseCombatCommandInput,
  parseConditionCommandInput,
  parseDamageCommandInput,
  readEncounterState,
  type CombatCommandInput,
  type ConditionCommandInput,
  type DamageCommandInput,
  type EncounterState,
} from '../../../domains/session/contracts/combat-encounter';
import type { SessionPresenceEntry } from '../../../domains/session/contracts/session-runtime';
import { projectService } from '../../../infrastructure/project/project-service';
import { useSessionRuntime } from './useSessionRuntime';

export interface UseCombatEncounterResult {
  encounter: EncounterState | null;
  combatActive: boolean;
  roster: readonly SessionPresenceEntry[];
  isLoading: boolean;
  error: string | null;
  isBusy: boolean;
  sessionId: string | null;
  resync: () => Promise<void>;
  runCombat: (input: CombatCommandInput) => Promise<boolean>;
  applyDamage: (input: DamageCommandInput) => Promise<boolean>;
  applyCondition: (input: ConditionCommandInput) => Promise<boolean>;
}

export function useCombatEncounter(input: {
  sagaPublicId: string;
  sessionPublicId: string;
}): UseCombatEncounterResult {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isBusy, setIsBusy] = useState(false);

  const runtime = useSessionRuntime(sessionId);

  useEffect(() => {
    let cancelled = false;
    if (!input.sagaPublicId || !input.sessionPublicId) {
      setIsBootstrapping(false);
      setBootstrapError(null);
      setSessionId(null);
      return;
    }
    setIsBootstrapping(true);
    setBootstrapError(null);
    setSessionId(null);

    const load = async () => {
      try {
        const { session } = await projectService.getSessionByPublicIds(
          input.sagaPublicId,
          input.sessionPublicId,
        );
        if (cancelled) return;
        setSessionId(session.id);
        setIsBootstrapping(false);
      } catch (err) {
        if (cancelled) return;
        setBootstrapError(
          err instanceof Error ? err.message : 'Kampf konnte nicht geladen werden',
        );
        setIsBootstrapping(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [input.sagaPublicId, input.sessionPublicId]);

  const shared = runtime.state?.gameplay.shared ?? {};
  const encounter = readEncounterState(shared);
  const combatActive = runtime.state?.gameplay.combatActive === true;

  const runCombat = async (command: CombatCommandInput): Promise<boolean> => {
    try {
      setIsBusy(true);
      setBootstrapError(null);
      const parsed = parseCombatCommandInput({ ...command } as unknown as Record<string, unknown>);
      const payload: Record<string, unknown> = { action: parsed.action };
      if (parsed.action === 'start') {
        payload.participants = parsed.participants.map((p) => ({
          kind: p.kind,
          refId: p.refId,
          name: p.name ?? null,
        }));
      }
      if (parsed.action === 'spendAction') {
        payload.participantId = parsed.participantId;
        payload.slot = parsed.slot;
      }
      const next = await runtime.applyCommand({
        kind: 'combat',
        payload,
        idempotencyKey: `combat:${parsed.action}:${crypto.randomUUID()}`,
      });
      return next !== null;
    } catch (err) {
      setBootstrapError(err instanceof Error ? err.message : 'Kampfbefehl fehlgeschlagen');
      return false;
    } finally {
      setIsBusy(false);
    }
  };

  const applyDamage = async (command: DamageCommandInput): Promise<boolean> => {
    try {
      setIsBusy(true);
      setBootstrapError(null);
      const parsed = parseDamageCommandInput({ ...command });
      const next = await runtime.applyCommand({
        kind: 'damage',
        payload: {
          participantId: parsed.participantId,
          amount: parsed.amount,
          mode: parsed.mode,
        },
        idempotencyKey: `damage:${parsed.mode}:${crypto.randomUUID()}`,
      });
      return next !== null;
    } catch (err) {
      setBootstrapError(err instanceof Error ? err.message : 'Schaden fehlgeschlagen');
      return false;
    } finally {
      setIsBusy(false);
    }
  };

  const applyCondition = async (command: ConditionCommandInput): Promise<boolean> => {
    try {
      setIsBusy(true);
      setBootstrapError(null);
      const parsed = parseConditionCommandInput({ ...command });
      const next = await runtime.applyCommand({
        kind: 'condition',
        payload: {
          participantId: parsed.participantId,
          op: parsed.op,
          condition: parsed.condition,
        },
        idempotencyKey: `condition:${parsed.op}:${crypto.randomUUID()}`,
      });
      return next !== null;
    } catch (err) {
      setBootstrapError(err instanceof Error ? err.message : 'Zustand fehlgeschlagen');
      return false;
    } finally {
      setIsBusy(false);
    }
  };

  return {
    encounter,
    combatActive,
    roster: runtime.state?.roster ?? [],
    isLoading: isBootstrapping || runtime.isLoading,
    error: bootstrapError ?? runtime.error,
    isBusy,
    sessionId,
    resync: runtime.resync,
    runCombat,
    applyDamage,
    applyCondition,
  };
}
