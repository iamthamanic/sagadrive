/**
 * usePlayerPanel — Loads session runtime + character for Player Panel V1 (#298/#299).
 * Location: src/app/session/hooks/usePlayerPanel.ts
 */
import { useEffect, useState } from 'react';
import {
  buildPlayerPanelModel,
  type PlayerPanelModel,
} from '../../../domains/session/contracts/player-panel';
import type { SagaDriveSkillKey } from '../../../domains/rules/sagadrive/character-creation';
import type { RollMode } from '../../../domains/session/contracts/shared-rolls';
import type { CharacterVm } from '../../../domains/character';
import { assertUrlCharacterMatchesMembership } from '../../../domains/session/contracts/player-character-assignment';
import { characterService } from '../../../infrastructure/character/character-service';
import { projectService } from '../../../infrastructure/project/project-service';
import { sessionService } from '../../../infrastructure/session/session-service';
import { useAuth } from '../../../lib/auth-context';
import { useSessionRuntime } from './useSessionRuntime';

export interface RequestCheckOptions {
  mode?: RollMode;
  useDrive?: boolean;
}

export interface UsePlayerPanelResult {
  model: PlayerPanelModel;
  sessionId: string | null;
  isBootstrapping: boolean;
  resync: () => Promise<void>;
  requestCheck: (skill: SagaDriveSkillKey, options?: RequestCheckOptions) => Promise<boolean>;
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
          setBootstrapError('Charakter-Route fehlt — bitte über Session-Join beitreten');
          setCharacter(null);
          setIsBootstrapping(false);
          return;
        }

        const detail = await sessionService.getSessionById(session.id);
        if (cancelled) return;
        const membership = detail.players.find((p) => p.userId === user?.id);
        if (!membership?.characterId) {
          setBootstrapError(
            'Kein Charakter an diese Session gebunden. Bitte über Session-Join mit Charakter beitreten.',
          );
          setIsBootstrapping(false);
          return;
        }

        const bound = await characterService.getCharacterById(membership.characterId);
        if (cancelled) return;
        assertUrlCharacterMatchesMembership({
          urlCharacterPublicId: input.characterPublicId,
          membershipCharacterPublicId: bound.publicId,
        });
        setCharacter(bound);
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
  }, [input.sagaPublicId, input.sessionPublicId, input.characterPublicId, user?.id]);

  const errorMessage = bootstrapError ?? runtime.error;
  const model = buildPlayerPanelModel({
    character,
    runtime: runtime.state,
    selfUserId: user?.id ?? null,
    isLoading: isBootstrapping || runtime.isLoading,
    errorMessage,
    characterPublicId: input.characterPublicId,
  });

  const requestCheck = async (
    skill: SagaDriveSkillKey,
    options?: RequestCheckOptions,
  ): Promise<boolean> => {
    if (!model.canAttemptCheck) return false;
    const mode = options?.mode ?? 'normal';
    const useDrive = options?.useDrive === true;
    const next = await runtime.applyCommand({
      kind: 'roll',
      payload: {
        skill,
        characterPublicId: input.characterPublicId,
        characterId: character?.id ?? null,
        intent: 'standard-check',
        mode,
        useDrive,
      },
      idempotencyKey: `player-check:${input.characterPublicId ?? 'none'}:${skill}:${mode}:${useDrive}:${Date.now()}`,
    });
    return next !== null;
  };

  return {
    model,
    sessionId,
    isBootstrapping,
    resync: runtime.resync,
    requestCheck,
  };
}
