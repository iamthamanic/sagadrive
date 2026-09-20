/**
 * SessionResourceScreen — foundation shell for Saga session lifecycle / live views (#276/#301).
 * Location: src/app/session/SessionResourceScreen.tsx
 */
import { Button } from '../../shared/ui/button';
import { GamemasterPanel } from './GamemasterPanel';
import { PlayerPanel } from './PlayerPanel';
import { SharedScenePresentationView } from './SharedScenePresentationView';
import { useSharedScenePresentation } from './hooks/useSharedScenePresentation';
import type { LiveViewId, SessionPhaseRouteId } from '../shell';

type SessionResourceScreenProps = {
  sagaPublicId: string;
  sessionPublicId: string;
  phase?: SessionPhaseRouteId;
  liveView?: LiveViewId;
  characterPublicId?: string | null;
  onNavigateHome: () => void;
};

export function SessionResourceScreen({
  sagaPublicId,
  sessionPublicId,
  phase = 'auto',
  liveView,
  characterPublicId,
  onNavigateHome,
}: SessionResourceScreenProps) {
  if (liveView === 'gamemaster') {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="border-b border-border px-4 py-2 text-xs text-muted-foreground">
          Live Gamemaster ·
          {' '}
          {sagaPublicId}
          {' '}
          /
          {' '}
          {sessionPublicId}
          {' '}
          — URL gewährt keine Rechte
        </div>
        <div className="min-h-0 flex-1">
          <GamemasterPanel sagaPublicId={sagaPublicId} sessionPublicId={sessionPublicId} />
        </div>
      </div>
    );
  }

  if (liveView === 'player' || liveView === 'player-resolve') {
    return (
      <PlayerPanel
        sagaPublicId={sagaPublicId}
        sessionPublicId={sessionPublicId}
        characterPublicId={characterPublicId ?? null}
        onNavigateHome={onNavigateHome}
      />
    );
  }

  if (liveView === 'display') {
    return (
      <SessionDisplayView
        sagaPublicId={sagaPublicId}
        sessionPublicId={sessionPublicId}
        onNavigateHome={onNavigateHome}
      />
    );
  }

  const title = liveView
    ? liveViewLabel(liveView, characterPublicId)
    : phaseLabel(phase);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-6">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">Session</p>
      <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
      <dl className="grid gap-2 text-sm">
        <div>
          <dt className="text-muted-foreground">Saga</dt>
          <dd className="font-mono">{sagaPublicId}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Session</dt>
          <dd className="font-mono">{sessionPublicId}</dd>
        </div>
        {characterPublicId ? (
          <div>
            <dt className="text-muted-foreground">Character</dt>
            <dd className="font-mono">{characterPublicId}</dd>
          </div>
        ) : null}
      </dl>
      <p className="text-sm text-muted-foreground">
        Sessionnummer ist die Reihenfolge innerhalb der Saga; die Public ID ist die
        Resource-Identität. Display zeigt nur freigegebene Daten; Player-URLs sind
        Routing-Kontext und keine Berechtigung.
      </p>
      <Button variant="ghost" className="self-start" onClick={onNavigateHome}>
        Zurück
      </Button>
    </div>
  );
}

/**
 * SessionDisplayView — Shared tabletop display surface for scene presentation (#301).
 * Location: colocated in SessionResourceScreen.tsx
 */
function SessionDisplayView({
  sagaPublicId,
  sessionPublicId,
  onNavigateHome,
}: {
  sagaPublicId: string;
  sessionPublicId: string;
  onNavigateHome: () => void;
}) {
  const { presentation, sceneId, isLoading, error, resync } = useSharedScenePresentation({
    sagaPublicId,
    sessionPublicId,
  });

  return (
    <div className="flex h-full min-h-0 flex-col" data-session-display="v1">
      <div className="border-b border-border px-4 py-2 text-xs text-muted-foreground">
        Live Display · {sagaPublicId} / {sessionPublicId} — URL gewährt keine Rechte
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-4xl flex-col gap-4 p-4 md:p-8">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Szene wird geladen…</p>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <SharedScenePresentationView
            presentation={presentation}
            sceneIdFallback={sceneId}
          />
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => void resync()}>
              Neu laden
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onNavigateHome}>
              Zurück
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function phaseLabel(phase: SessionPhaseRouteId): string {
  switch (phase) {
    case 'prepare':
      return 'Session vorbereiten';
    case 'live':
      return 'Live-Session';
    case 'recap':
      return 'Session-Recap';
    case 'auto':
      return 'Session (Statusauflösung)';
  }
}

function liveViewLabel(liveView: LiveViewId, characterPublicId?: string | null): string {
  switch (liveView) {
    case 'gamemaster':
      return 'Live · Gamemaster';
    case 'player':
      return `Live · Spieler${characterPublicId ? ` (${characterPublicId})` : ''}`;
    case 'player-resolve':
      return 'Live · Spieler (Charakter auflösen)';
    case 'display':
      return 'Live · Display';
  }
}
