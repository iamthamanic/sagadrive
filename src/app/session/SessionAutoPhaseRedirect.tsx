/**
 * SessionAutoPhaseRedirect — Resolve /sessions/:id → prepare|live|recap (#492).
 * Location: src/app/session/SessionAutoPhaseRedirect.tsx
 *
 * Deterministic status→lifecycle navigation; lobby stays explicit.
 * Uses history.replaceState to avoid auto↔phase back-button loops.
 */
import { useEffect, useState } from 'react';
import { Button } from '../../shared/ui/button';
import { projectService } from '../../infrastructure/project/project-service';
import { resolveLifecycleScreenFromStatus } from '../../domains/session/contracts/session-prepare-recap';
import { pathForSessionPhase } from '../shell';
import type { SessionLifecyclePhase } from '../../domains/resource-id/session-routing';

type SessionAutoPhaseRedirectProps = {
  sagaPublicId: string;
  sessionPublicId: string;
  onNavigateHome: () => void;
};

function replaceNavigate(path: string): void {
  if (typeof window === 'undefined') return;
  window.history.replaceState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function SessionAutoPhaseRedirect({
  sagaPublicId,
  sessionPublicId,
  onNavigateHome,
}: SessionAutoPhaseRedirectProps) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const { session } = await projectService.getSessionByPublicIds(
          sagaPublicId,
          sessionPublicId,
        );
        if (cancelled) return;
        const screen = resolveLifecycleScreenFromStatus(session.status);
        const phase: SessionLifecyclePhase =
          screen === 'lobby' ? 'prepare' : screen;
        replaceNavigate(pathForSessionPhase(sagaPublicId, sessionPublicId, phase));
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Session-Status konnte nicht aufgelöst werden',
          );
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [sagaPublicId, sessionPublicId]);

  return (
    <div
      className="mx-auto flex max-w-3xl flex-col gap-4 p-6"
      data-session-auto-phase="v1"
    >
      <p className="text-xs uppercase tracking-wide text-muted-foreground">Session</p>
      <h1 className="text-2xl font-semibold text-foreground">Statusauflösung</h1>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">Lifecycle-Screen wird bestimmt…</p>
      )}
      <Button type="button" variant="ghost" className="self-start min-h-11" onClick={onNavigateHome}>
        Zurück
      </Button>
    </div>
  );
}
