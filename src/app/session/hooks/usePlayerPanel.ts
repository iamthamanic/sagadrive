/**
 * usePlayerPanel — Loads session runtime + character for Player Panel V1 (#298).
 * Location: src/app/session/hooks/usePlayerPanel.ts
 */
import { useEffect, useState } from 'react';
import {
  buildPlayerPanelModel,
  type PlayerPanelModel,
} from '../../../domains/session/contracts/player-panel';
import type { SagaDriveSkillKey } from '../../../domains/rules/sagadrive/character-creation';
import type { CharacterVm } from '../../../domains/character';
import { characterService } from '../../../infrastructure/character/character-service';
import { projectService } from '../../../infrastructure/project/project-service';
import { useAuth } from '../../../lib/auth-context';
import { useSessionRuntime } from './useSessionRuntime';

export interface UsePlayerPanelResult {
  model: PlayerPanelModel;
  isBootstrapping: boolean;
  resync: () => Promise<void>;
  requestCheck: (skill: SagaDriveSkillKey) => Promise<boolean>;
}

export function usePlayerPanel(input: {
  sagaPublicId: string;
  sessionPublicId: string;
  characterPublicId: string | null;
}): UsePlayerPanelResult {
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [character, setCharacter] = useState<CharacterVm | null>(null);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const runtime = useSessionRuntime(sessionId);

  useEffect(() => {
    let cancelled = false;
    setIsBootstrapping(true);
    setBootstrapError(null);
    setSessionId(null);
    setCharacter(null);

    const load = async () => {
      try {
        const { session } = await projectService.getSessionByPublicIds(
          input.sagaPublicId,
          input.sessionPublicId,
        );
        if (cancelled) return;
        setSessionId(session.id);

        if (!input.characterPublicId) {
          setCharacter(null);
          setIsBootstrapping(false);
          return;
        }

        const loaded = await characterService.getCharacterByPublicId(input.characterPublicId);
        if (cancelled) return;
        setCharacter(loaded);
        setIsBootstrapping(false);
      } catch (err) {
        if (cancelled) return;
        setBootstrapError(err instanceof Error ? err.message : 'Player Panel konnte nicht geladen werden');
        setIsBootstrapping(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [input.sagaPublicId, input.sessionPublicId, input.characterPublicId]);

  const errorMessage = bootstrapError ?? runtime.error;
  const model = buildPlayerPanelModel({
    character,
    runtime: runtime.state,
    selfUserId: user?.id ?? null,
    isLoading: isBootstrapping || runtime.isLoading,
    errorMessage,
    characterPublicId: input.characterPublicId,
  });

  const requestCheck = async (skill: SagaDriveSkillKey): Promise<boolean> => {
    if (!model.canAttemptCheck) return false;
    const next = await runtime.applyCommand({
      kind: 'roll',
      payload: {
        skill,
        characterPublicId: input.characterPublicId,
        characterId: character?.id ?? null,
        intent: 'standard-check',
      },
      idempotencyKey: `player-check:${input.characterPublicId ?? 'none'}:${skill}:${Date.now()}`,
    });
    return next !== null;
  };

  return {
    model,
    isBootstrapping,
    resync: runtime.resync,
    requestCheck,
  };
}
