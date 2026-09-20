/**
 * useSharedScenePresentation — Runtime-backed shared scene read/publish (#301).
 * Location: src/app/session/hooks/useSharedScenePresentation.ts
 */
import { useEffect, useState } from 'react';
import {
  parseSharedScenePresentationCommandInput,
  readSharedScenePresentation,
  type SharedScenePresentation,
  type SharedScenePresentationCommandInput,
} from '../../../domains/session/contracts/shared-scene-presentation';
import { projectService } from '../../../infrastructure/project/project-service';
import { useSessionRuntime } from './useSessionRuntime';

export interface UseSharedScenePresentationResult {
  presentation: SharedScenePresentation | null;
  sceneId: string | null;
  isLoading: boolean;
  error: string | null;
  isPublishing: boolean;
  resync: () => Promise<void>;
  publishScene: (input: SharedScenePresentationCommandInput) => Promise<boolean>;
}

export function useSharedScenePresentation(input: {
  sagaPublicId: string;
  sessionPublicId: string;
}): UseSharedScenePresentationResult {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);

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
          err instanceof Error ? err.message : 'Szene konnte nicht geladen werden',
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
  const presentation = readSharedScenePresentation(shared);
  const sceneId = runtime.state?.gameplay.sceneId ?? null;

  const publishScene = async (
    commandInput: SharedScenePresentationCommandInput,
  ): Promise<boolean> => {
    try {
      setIsPublishing(true);
      const parsed = parseSharedScenePresentationCommandInput({
        title: commandInput.title,
        locationLabel: commandInput.locationLabel,
        description: commandInput.description,
        backdropUrl: commandInput.backdropUrl,
        sceneId: commandInput.sceneId,
        sceneRef: commandInput.sceneRef,
        visibleActors: [...commandInput.visibleActors],
      });
      const next = await runtime.applyCommand({
        kind: 'scene',
        payload: {
          title: parsed.title,
          locationLabel: parsed.locationLabel,
          description: parsed.description,
          backdropUrl: parsed.backdropUrl,
          sceneId: parsed.sceneId,
          sceneRef: parsed.sceneRef,
          visibleActors: parsed.visibleActors,
        },
        idempotencyKey: `scene:${crypto.randomUUID()}`,
      });
      return next !== null;
    } catch (err) {
      setBootstrapError(err instanceof Error ? err.message : 'Szene veröffentlichen fehlgeschlagen');
      return false;
    } finally {
      setIsPublishing(false);
    }
  };

  return {
    presentation,
    sceneId,
    isLoading: isBootstrapping || runtime.isLoading,
    error: bootstrapError ?? runtime.error,
    isPublishing,
    resync: runtime.resync,
    publishScene,
  };
}
