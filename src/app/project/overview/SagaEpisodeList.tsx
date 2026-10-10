/**
 * SagaEpisodeList — Hub episode/session list with progress (#571).
 * Location: src/app/project/overview/SagaEpisodeList.tsx
 *
 * Presentational; rows navigate via callback. Chunks long lists (>12).
 */
import { useState } from 'react';
import type { SagaEpisodeVm } from '../../../domains/project/contracts/saga-overview';
import { sessionStatusLabelDe } from '../../../domains/session/contracts/session-prepare-recap';
import { Button } from '../../../shared/ui/button';

export type SagaEpisodeListProps = {
  episodes: readonly SagaEpisodeVm[];
  onOpenEpisode: (episode: SagaEpisodeVm) => void;
};

const PAGE = 12;

export function SagaEpisodeList({ episodes, onOpenEpisode }: SagaEpisodeListProps) {
  const [showAll, setShowAll] = useState(false);
  const completed = episodes.filter((e) => e.status === 'completed').length;
  const visible = showAll ? episodes : episodes.slice(0, PAGE);
  const hasMore = episodes.length > PAGE && !showAll;

  return (
    <section className="space-y-3" data-saga-overview-episodes aria-labelledby="saga-overview-episodes-title">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Eure Sessions</p>
        <h3 id="saga-overview-episodes-title" className="text-lg font-semibold text-foreground">
          Episoden
        </h3>
        <p className="text-sm text-muted-foreground">
          {episodes.length === 0
            ? 'Noch keine Sessions in dieser Saga.'
            : `${completed} von ${episodes.length} abgeschlossen`}
        </p>
      </div>

      {episodes.length === 0 ? (
        <p className="text-sm text-muted-foreground" data-saga-overview-episodes-empty>
          Starte die erste Session über den Knopf oben.
        </p>
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {visible.map((ep) => (
            <li key={ep.sessionId}>
              <button
                type="button"
                className="flex min-h-11 w-full items-start gap-3 py-3 text-left hover:bg-accent/30"
                onClick={() => onOpenEpisode(ep)}
                data-saga-overview-episode={ep.sessionPublicId}
              >
                <span className="w-8 shrink-0 text-sm font-medium text-muted-foreground">
                  #{ep.sessionNumber}
                </span>
                <span className="min-w-0 flex-1 space-y-0.5">
                  <span className="block font-medium text-foreground">
                    {ep.name?.trim() || `Session ${ep.sessionNumber}`}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {sessionStatusLabelDe(ep.status)}
                    {ep.recapSnippet ? ` · ${ep.recapSnippet}` : ''}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {hasMore ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          onClick={() => setShowAll(true)}
          data-saga-overview-episodes-more
        >
          Ältere anzeigen ({episodes.length - PAGE})
        </Button>
      ) : null}
    </section>
  );
}
