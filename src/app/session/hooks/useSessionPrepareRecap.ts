/**
 * useSessionPrepareRecap — Load Prepare/Recap lifecycle product data (#492).
 * Location: src/app/session/hooks/useSessionPrepareRecap.ts
 *
 * Session + membership + audience-projected adventure consequences.
 * Next-session create stays same-saga via projectService.
 */
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../lib/auth-context';
import { projectService } from '../../../infrastructure/project/project-service';
import { sessionService } from '../../../infrastructure/session/session-service';
import { characterService } from '../../../infrastructure/character/character-service';
import type { SessionRole } from '../../../domains/session/contracts/live-session-access';
import {
  buildPreparePrimaryCta,
  buildRecapHighlightLines,
  buildRecapPrimaryCta,
  nextSessionDefaultName,
  sessionStatusLabelDe,
  type RecapHighlightLine,
  type SessionLifecycleSummary,
} from '../../../domains/session/contracts/session-prepare-recap';
import {
  projectAdventureRuntimeForAudience,
  readAdventureRuntime,
} from '../../../domains/session/contracts/adventure-runtime-state';
import { useSessionRuntime } from './useSessionRuntime';

export type PrepareRecapRosterMember = {
  readonly userId: string;
  readonly displayName: string;
  readonly role: SessionRole;
  readonly characterName: string | null;
  readonly isSelf: boolean;
};

export type PrepareRecapViewModel = {
  readonly summary: SessionLifecycleSummary;
  readonly selfRole: SessionRole;
  readonly status: string;
  readonly projectId: string;
  readonly sessionNumber: number;
  readonly roster: readonly PrepareRecapRosterMember[];
  readonly prepareCta: { readonly kind: 'lobby' | 'invite' | 'live-resume' | 'back'; readonly labelDe: string };
  readonly recapCta: { readonly kind: 'next-session' | 'saga' | 'home'; readonly labelDe: string };
  readonly highlights: readonly RecapHighlightLine[];
  readonly flagCount: number;
  readonly definitionRef: string | null;
};

type UseSessionPrepareRecapInput = {
  readonly sagaPublicId: string;
  readonly sessionPublicId: string;
};

export type UseSessionPrepareRecapResult = {
  readonly model: PrepareRecapViewModel | null;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly isCreatingNext: boolean;
  readonly createNextSession: () => Promise<{
    readonly sagaPublicId: string;
    readonly sessionPublicId: string;
  } | null>;
  readonly refresh: () => Promise<void>;
};

export function useSessionPrepareRecap(
  input: UseSessionPrepareRecapInput,
): UseSessionPrepareRecapResult {
  const { user } = useAuth();
  const [model, setModel] = useState<PrepareRecapViewModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingNext, setIsCreatingNext] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [baseMeta, setBaseMeta] = useState<{
    selfRole: SessionRole;
    status: string;
    sessionNumber: number;
    summary: SessionLifecycleSummary;
    roster: PrepareRecapRosterMember[];
  } | null>(null);

  const runtime = useSessionRuntime(sessionId);

  const loadBase = useCallback(async () => {
    if (!user) {
      setError('Anmeldung erforderlich');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const { session, project } = await projectService.getSessionByPublicIds(
        input.sagaPublicId.trim().toUpperCase(),
        input.sessionPublicId.trim().toUpperCase(),
      );
      setSessionId(session.id);
      setProjectId(project.id);
      const detail = await sessionService.getSessionById(session.id);
      const selfPlayer = detail.players.find((p) => p.userId === user.id);
      const isGm = detail.gmUserId === user.id;
      const selfRole: SessionRole = selfPlayer?.characterId
        ? 'player'
        : isGm
          ? 'gamemaster'
          : selfPlayer
            ? 'player'
            : 'viewer';

      if (selfRole === 'viewer' && !selfPlayer && !isGm) {
        setError('Keine Session-Mitgliedschaft für Prepare/Recap.');
        setBaseMeta(null);
        setIsLoading(false);
        return;
      }

      const roster: PrepareRecapRosterMember[] = [];
      if (detail.gmUserId) {
        roster.push({
          userId: detail.gmUserId,
          displayName: detail.gmUserId === user.id ? 'Du (Spielleitung)' : 'Spielleitung',
          role: 'gamemaster',
          characterName: null,
          isSelf: detail.gmUserId === user.id,
        });
      }
      for (const p of detail.players) {
        let characterName: string | null = null;
        if (p.characterId) {
          try {
            const ch = await characterService.getCharacterById(p.characterId);
            characterName = ch.name;
          } catch {
            characterName = null;
          }
        }
        roster.push({
          userId: p.userId,
          displayName: p.userId === user.id ? 'Du' : `Spieler`,
          role: 'player',
          characterName,
          isSelf: p.userId === user.id,
        });
      }

      const summary: SessionLifecycleSummary = {
        sessionId: session.id,
        sessionPublicId: session.publicId,
        sagaPublicId: project.publicId,
        sessionName: detail.name || session.name || `Session ${session.sessionNumber}`,
        sagaName: project.name,
        statusLabelDe: sessionStatusLabelDe(session.status),
        code: detail.code ?? '',
        playerCount: detail.players.length,
        startedAtIso: session.startedAt ?? null,
        endedAtIso: session.endedAt ?? null,
      };

      setBaseMeta({
        selfRole,
        status: session.status,
        sessionNumber: session.sessionNumber,
        summary,
        roster,
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Prepare/Recap konnte nicht geladen werden');
      setBaseMeta(null);
    } finally {
      setIsLoading(false);
    }
  }, [user, input.sagaPublicId, input.sessionPublicId]);

  useEffect(() => {
    void loadBase();
  }, [loadBase]);

  useEffect(() => {
    if (!baseMeta) {
      setModel(null);
      return;
    }
    const audience =
      baseMeta.selfRole === 'gamemaster'
        ? 'gamemaster'
        : baseMeta.selfRole === 'player'
          ? 'player'
          : 'viewer';
    const shared = runtime.state?.gameplay.shared ?? {};
    const projected = projectAdventureRuntimeForAudience(
      readAdventureRuntime(shared),
      audience,
    );
    const highlights = buildRecapHighlightLines({
      consequences: projected.consequences.map((c) => ({
        id: c.id,
        kind: c.kind,
        summary: c.summary,
      })),
    });
    setModel({
      summary: baseMeta.summary,
      selfRole: baseMeta.selfRole,
      status: baseMeta.status,
      projectId: projectId ?? '',
      sessionNumber: baseMeta.sessionNumber,
      roster: baseMeta.roster,
      prepareCta: buildPreparePrimaryCta({
        role: baseMeta.selfRole,
        status: baseMeta.status,
      }),
      recapCta: buildRecapPrimaryCta({ role: baseMeta.selfRole }),
      highlights,
      flagCount: Object.keys(projected.flags).length,
      definitionRef: projected.definitionRef,
    });
  }, [baseMeta, runtime.state, projectId]);

  const createNextSession = useCallback(async () => {
    if (!projectId || !baseMeta || baseMeta.selfRole !== 'gamemaster') {
      setError('Nur die Spielleitung kann die nächste Session erstellen.');
      return null;
    }
    setIsCreatingNext(true);
    try {
      const created = await projectService.createProjectSession({
        projectId,
        name: nextSessionDefaultName(baseMeta.summary.sessionName, baseMeta.sessionNumber),
      });
      if (!created.publicId) {
        throw new Error('Neue Session ohne Public ID');
      }
      return {
        sagaPublicId: input.sagaPublicId.trim().toUpperCase(),
        sessionPublicId: created.publicId.trim().toUpperCase(),
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nächste Session fehlgeschlagen');
      return null;
    } finally {
      setIsCreatingNext(false);
    }
  }, [projectId, baseMeta, input.sagaPublicId]);

  return {
    model,
    // Do not block shell paint on realtime runtime subscribe.
    isLoading,
    error: error ?? (runtime.error && !model ? runtime.error : null),
    isCreatingNext,
    createNextSession,
    refresh: loadBase,
  };
}
