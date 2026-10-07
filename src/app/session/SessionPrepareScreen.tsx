/**
 * SessionPrepareScreen — Product Prepare surface before Lobby/Live (#492).
 * Location: src/app/session/SessionPrepareScreen.tsx
 *
 * Metadata, invite share, lobby entry. No parallel join flow.
 */
import { Button } from '../../shared/ui/button';
import { AdaptivePage } from '../../shared/ui/adaptive';
import { pathForSessionLobby } from '../../domains/session/contracts/session-lobby';
import { pathForSessionLive, pathForSessionPhase } from '../shell';
import { SessionInviteShareButton } from './SessionInviteShareButton';
import { useSessionPrepareRecap } from './hooks/useSessionPrepareRecap';

type SessionPrepareScreenProps = {
  sagaPublicId: string;
  sessionPublicId: string;
  onNavigateHome: () => void;
  onNavigate: (path: string) => void;
};

export function SessionPrepareScreen({
  sagaPublicId,
  sessionPublicId,
  onNavigateHome,
  onNavigate,
}: SessionPrepareScreenProps) {
  const { model, isLoading, error, refresh } = useSessionPrepareRecap({
    sagaPublicId,
    sessionPublicId,
  });

  const handlePrimary = () => {
    if (!model) return;
    if (model.prepareCta.kind === 'live-resume') {
      if (model.selfRole === 'gamemaster') {
        onNavigate(pathForSessionLive(sagaPublicId, sessionPublicId, 'gamemaster'));
        return;
      }
      onNavigate(pathForSessionPhase(sagaPublicId, sessionPublicId, 'live'));
      return;
    }
    onNavigate(pathForSessionLobby(sagaPublicId, sessionPublicId));
  };

  return (
    <AdaptivePage className="h-full w-full min-h-[50vh]">
      <div
        className="mx-auto flex h-full min-h-[50vh] max-w-3xl flex-col gap-4 overflow-y-auto p-4 sm:p-6"
        data-au-surface="session-prepare"
        data-session-prepare="v1"
      >
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Session vorbereiten
            </p>
            <h1 className="text-2xl font-semibold text-foreground">
              {model?.summary.sessionName ?? 'Prepare'}
            </h1>
            {model?.summary.sagaName ? (
              <p className="text-sm text-muted-foreground">{model.summary.sagaName}</p>
            ) : null}
          </div>
          <Button type="button" variant="ghost" className="min-h-11" onClick={onNavigateHome}>
            Zurück
          </Button>
        </header>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Prepare wird geladen…</p>
        ) : null}

        {error ? (
          <p className="text-sm text-destructive" role="alert" data-session-prepare-error>
            {error}
          </p>
        ) : null}

        {model ? (
          <>
            <section
              className="rounded-lg border border-border bg-card/40 p-4"
              data-session-prepare-meta
            >
              <h2 className="text-sm font-medium">Session-Kontext</h2>
              <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Status</dt>
                  <dd data-session-prepare-status>{model.summary.statusLabelDe}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Teilnehmer</dt>
                  <dd data-session-prepare-player-count>{model.summary.playerCount}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Code</dt>
                  <dd className="font-mono" data-session-prepare-code>
                    {model.summary.code || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Rolle</dt>
                  <dd>
                    {model.selfRole === 'gamemaster'
                      ? 'Spielleitung'
                      : model.selfRole === 'player'
                        ? 'Spieler'
                        : 'Viewer'}
                  </dd>
                </div>
              </dl>
              {model.definitionRef ? (
                <p className="mt-3 text-xs text-muted-foreground" data-session-prepare-adventure>
                  Adventure: {model.definitionRef}
                </p>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">
                  Noch kein Adventure-Kontext gebunden — Lobby und Live bleiben möglich.
                </p>
              )}
            </section>

            <section
              className="rounded-lg border border-border bg-card/40 p-4"
              data-session-prepare-roster
            >
              <h2 className="text-sm font-medium">Teilnehmer</h2>
              <ul className="mt-2 space-y-2 text-sm">
                {model.roster.map((m) => (
                  <li
                    key={`${m.userId}-${m.role}`}
                    className="flex flex-wrap justify-between gap-2 border-b border-border/40 pb-2 last:border-0"
                  >
                    <span>
                      {m.displayName}
                      {m.characterName ? ` · ${m.characterName}` : ''}
                    </span>
                    <span className="text-muted-foreground">
                      {m.role === 'gamemaster' ? 'GM' : 'Spieler'}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section
              className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center"
              data-session-prepare-actions
            >
              {model.selfRole === 'gamemaster' ? (
                <SessionInviteShareButton
                  sessionId={model.summary.sessionId}
                  className="min-h-11"
                  label="Einladung kopieren"
                />
              ) : null}
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={() => void refresh()}
                data-session-prepare-refresh
              >
                Aktualisieren
              </Button>
            </section>
          </>
        ) : null}

        <section
          className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center"
          data-session-prepare-actions-shell
        >
          <Button
            type="button"
            className="min-h-11"
            disabled={!model}
            onClick={handlePrimary}
            data-session-prepare-primary
          >
            {model?.prepareCta.labelDe ?? 'Zur Lobby'}
          </Button>
        </section>
      </div>
    </AdaptivePage>
  );
}
