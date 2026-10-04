/**
 * useSessionKnowledge — Knowledge projection + GM reveal (#367).
 * Location: src/app/session/hooks/useSessionKnowledge.ts
 */
import { useEffect, useState } from 'react';
import {
  parseRevealCommandInput,
  projectKnowledgeForAccess,
  type KnowledgeProjection,
  type RevealCommandInput,
  type RevealTarget,
} from '../../../domains/session/knowledge';
import type { LiveSessionAccess } from '../../../domains/session/contracts/live-session-access';
import { projectService } from '../../../infrastructure/project/project-service';
import { useSessionRuntime } from './useSessionRuntime';

export type UseSessionKnowledgeResult = {
  projection: KnowledgeProjection | null;
  isLoading: boolean;
  error: string | null;
  isRevealing: boolean;
  reveal: (input: {
    factId: string;
    target: RevealTarget;
    title?: string;
    body?: string;
    visibility?: string;
    characterId?: string | null;
  }) => Promise<boolean>;
  resync: () => Promise<void>;
};

export function useSessionKnowledge(input: {
  sagaPublicId: string;
  sessionPublicId: string;
  access: LiveSessionAccess | null;
}): UseSessionKnowledgeResult {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isRevealing, setIsRevealing] = useState(false);

  const runtime = useSessionRuntime(sessionId);

  useEffect(() => {
    let cancelled = false;
    if (!input.sagaPublicId || !input.sessionPublicId) {
      setIsBootstrapping(false);
      setSessionId(null);
      return;
    }
    setIsBootstrapping(true);
    setBootstrapError(null);
    setSessionId(null);
    void (async () => {
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
        setBootstrapError(err instanceof Error ? err.message : 'Knowledge konnte nicht geladen werden');
        setIsBootstrapping(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [input.sagaPublicId, input.sessionPublicId]);

  const shared = runtime.state?.gameplay.shared ?? {};
  const projection =
    input.access && (runtime.state || !isBootstrapping)
      ? projectKnowledgeForAccess(shared, input.access)
      : null;

  const reveal = async (cmd: {
    factId: string;
    target: RevealTarget;
    title?: string;
    body?: string;
    visibility?: string;
    characterId?: string | null;
  }): Promise<boolean> => {
    try {
      setIsRevealing(true);
      const parsed: RevealCommandInput = parseRevealCommandInput({
        factId: cmd.factId,
        target: cmd.target,
      });
      const next = await runtime.applyCommand({
        kind: 'reveal',
        payload: {
          factId: parsed.factId,
          target: parsed.target,
          title: cmd.title,
          body: cmd.body,
          visibility: cmd.visibility,
          characterId: cmd.characterId ?? undefined,
        },
        idempotencyKey: `reveal:${crypto.randomUUID()}`,
      });
      return next !== null;
    } catch (err) {
      setBootstrapError(err instanceof Error ? err.message : 'Reveal fehlgeschlagen');
      return false;
    } finally {
      setIsRevealing(false);
    }
  };

  return {
    projection,
    isLoading: isBootstrapping || runtime.isLoading,
    error: bootstrapError ?? runtime.error,
    isRevealing,
    reveal,
    resync: runtime.resync,
  };
}
