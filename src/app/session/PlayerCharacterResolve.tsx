/**
 * PlayerCharacterResolve — Resolve /live/player → bound membership character (#478).
 * Location: src/app/session/PlayerCharacterResolve.tsx
 *
 * URL alone is not authorization; membership character_id is source of truth.
 */
import { useEffect, useState } from 'react';
import { Button } from '../../shared/ui/button';
import { useAuth } from '../../lib/auth-context';
import { projectService } from '../../infrastructure/project/project-service';
import { sessionService } from '../../infrastructure/session/session-service';
import { characterService } from '../../infrastructure/character/character-service';
import { pathForSessionLive } from '../shell';

type PlayerCharacterResolveProps = {
  sagaPublicId: string;
  sessionPublicId: string;
  onNavigateHome: () => void;
};

export function PlayerCharacterResolve({
  sagaPublicId,
  sessionPublicId,
  onNavigateHome,
}: PlayerCharacterResolveProps) {
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('Charakter wird aufgelöst…');

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        if (!user) {
          setError('Anmeldung erforderlich');
          return;
        }
        const { session } = await projectService.getSessionByPublicIds(
          sagaPublicId,
          sessionPublicId,
        );
        if (cancelled) return;
        const detail = await sessionService.getSessionById(session.id);
        if (cancelled) return;
        const membership = detail.players.find((p) => p.userId === user.id);
        if (!membership?.characterId) {
          setError(
            'Kein Charakter an diese Session gebunden. Bitte über Session-Join mit Charakter beitreten.',
          );
          return;
        }
        const character = await characterService.getCharacterById(membership.characterId);
        if (cancelled) return;
        const publicId = character.publicId?.trim().toUpperCase();
        if (!publicId) {
          setError('Gebundener Charakter hat keine Public ID');
          return;
        }
        setStatus('Weiterleitung zur Character-Live-Route…');
        const path = pathForSessionLive(sagaPublicId, sessionPublicId, 'player', publicId);
        if (typeof window !== 'undefined') {
          window.history.replaceState(null, '', path);
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Auflösung fehlgeschlagen');
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [sagaPublicId, sessionPublicId, user]);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-3 p-6" data-player-character-resolve="v1">
      <h1 className="text-xl font-semibold">Player · Charakter auflösen</h1>
      {error ? (
        <>
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
          <Button type="button" variant="ghost" className="self-start" onClick={onNavigateHome}>
            Zurück
          </Button>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">{status}</p>
      )}
    </div>
  );
}
