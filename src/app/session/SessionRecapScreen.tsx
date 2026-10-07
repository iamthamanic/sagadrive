/**
 * SessionRecapScreen — Audience-safe Recap + next-session CTA (#492).
 * Location: src/app/session/SessionRecapScreen.tsx
 *
 * Uses projected adventure consequences; GM can create next same-saga session.
 */
import { Button } from '../../shared/ui/button';
import { AdaptivePage } from '../../shared/ui/adaptive';
import { pathForSagaSection, pathForSessionPhase } from '../shell';
import { useSessionPrepareRecap } from './hooks/useSessionPrepareRecap';

type SessionRecapScreenProps = {
  sagaPublicId: string;
  sessionPublicId: string;
  onNavigateHome: () => void;
  onNavigate: (path: string) => void;
};

export function SessionRecapScreen({
  sagaPublicId,
  sessionPublicId,
  onNavigateHome,
  onNavigate,
}: SessionRecapScreenProps) {
  const { model, isLoading, error, isCreatingNext, createNextSession, refresh } =
    useSessionPrepareRecap({
      sagaPublicId,
      sessionPublicId,
    });

  const handlePrimary = async () => {
    if (!model) return;
    if (model.recapCta.kind === 'next-session') {
      const created = await createNextSession();
      if (created) {
        onNavigate(
          pathForSessionPhase(created.sagaPublicId, created.sessionPublicId, 'prepare'),
        );
      }
      return;
    }
    if (model.recapCta.kind === 'saga') {
      onNavigate(pathForSagaSection(sagaPublicId, 'overview'));
      return;
    }
    onNavigateHome();
  };

  return (
    <AdaptivePage className="h-full w-full min-h-[50vh]">
      <div
        className="mx-auto flex h-full min-h-[50vh] max-w-3xl flex-col gap-4 overflow-y-auto p-4 sm:p-6"
        data-au-surface="session-recap"
        data-session-recap="v1"
      >
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Session-Recap
            </p>
            <h1 className="text-2xl font-semibold text-foreground">
              {model?.summary.sessionName ?? 'Recap'}
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
          <p className="text-sm text-muted-foreground">Recap wird geladen…</p>
        ) : null}

        {error ? (
          <p className="text-sm text-destructive" role="alert" data-session-recap-error>
            {error}
          </p>
        ) : null}

        {model ? (
          <>
            <section
              className="rounded-lg border border-border bg-card/40 p-4"
              data-session-recap-meta
            >
              <h2 className="text-sm font-medium">Abschluss</h2>
              <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Status</dt>
                  <dd data-session-recap-status>{model.summary.statusLabelDe}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Teilnehmer</dt>
                  <dd>{model.summary.playerCount}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Freigegebene Flags</dt>
                  <dd data-session-recap-flag-count>{model.flagCount}</dd>
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
            </section>

            <section
              className="rounded-lg border border-border bg-card/40 p-4"
              data-session-recap-roster
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
              data-session-recap-actions
            >
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={() =>
                  onNavigate(pathForSagaSection(sagaPublicId, 'overview'))
                }
                data-session-recap-saga
              >
                Zur Saga
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="min-h-11"
                onClick={() => void refresh()}
                data-session-recap-refresh
              >
                Aktualisieren
              </Button>
            </section>
          </>
        ) : null}

        <section
          className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center"
          data-session-recap-actions-shell
        >
          <Button
            type="button"
            className="min-h-11"
            disabled={!model || isCreatingNext}
            onClick={() => void handlePrimary()}
            data-session-recap-primary
          >
            {isCreatingNext
              ? 'Wird erstellt…'
              : (model?.recapCta.labelDe ?? 'Zur Saga')}
          </Button>
        </section>

        <section
          className="rounded-lg border border-border bg-card/40 p-4"
          data-session-recap-highlights
        >
          <h2 className="text-sm font-medium">Wichtige Ereignisse</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Nur für deine Rolle freigegebene Adventure-Ereignisse (#374).
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {(model?.highlights ?? [
              {
                id: 'pending',
                kind: 'empty',
                summary: 'Ereignisse werden geladen…',
              },
            ]).map((h) => (
              <li
                key={h.id}
                className="rounded-md border border-border/50 px-3 py-2"
                data-session-recap-highlight={h.kind}
              >
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  {h.kind}
                </span>
                <p>{h.summary}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AdaptivePage>
  );
}
