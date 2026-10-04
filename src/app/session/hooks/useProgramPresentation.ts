/**
 * useProgramPresentation — Program Output read + authorized switch (#365).
 * Location: src/app/session/hooks/useProgramPresentation.ts
 */
import { useEffect, useState } from 'react';
import {
  buildProgramPresentationReadModel,
  parseProgramPresentationCommandInput,
  type ProgramPresentationCommandInput,
  type ProgramPresentationReadModel,
} from '../../../domains/session/presentation/program-presentation';
import { projectService } from '../../../infrastructure/project/project-service';
import { useSessionRuntime } from './useSessionRuntime';

export type UseProgramPresentationResult = {
  readModel: ProgramPresentationReadModel | null;
  isLoading: boolean;
  error: string | null;
  isSwitching: boolean;
  resync: () => Promise<void>;
  switchProgram: (input: ProgramPresentationCommandInput) => Promise<boolean>;
};

export function useProgramPresentation(input: {
  sagaPublicId: string;
  sessionPublicId: string;
}): UseProgramPresentationResult {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);

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
          err instanceof Error ? err.message : 'Program Output konnte nicht geladen werden',
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
  const readModel =
    runtime.state || !isBootstrapping
      ? buildProgramPresentationReadModel(shared)
      : null;

  const switchProgram = async (
    commandInput: ProgramPresentationCommandInput,
  ): Promise<boolean> => {
    try {
      setIsSwitching(true);
      const parsed = parseProgramPresentationCommandInput({
        source: commandInput.source,
        layout: commandInput.layout,
        overlay: commandInput.overlay,
      });
      const next = await runtime.applyCommand({
        kind: 'program',
        payload: {
          source: parsed.source,
          layout: parsed.layout,
          overlay: parsed.overlay,
        },
        idempotencyKey: `program:${crypto.randomUUID()}`,
      });
      return next !== null;
    } catch (err) {
      setBootstrapError(
        err instanceof Error ? err.message : 'Program Output wechseln fehlgeschlagen',
      );
      return false;
    } finally {
      setIsSwitching(false);
    }
  };

  return {
    readModel,
    isLoading: isBootstrapping || runtime.isLoading,
    error: bootstrapError ?? runtime.error,
    isSwitching,
    resync: runtime.resync,
    switchProgram,
  };
}
