/**
 * SagaOverviewHero — Hub hero: title, blurb, single primary CTA (#571).
 * Location: src/app/project/overview/SagaOverviewHero.tsx
 *
 * Presentational only; primary action resolved by domain before render.
 */
import { useState } from 'react';
import type { SagaOverviewVm, SagaPrimaryAction } from '../../../domains/project/contracts/saga-overview';
import { Button } from '../../../shared/ui/button';

export type SagaOverviewHeroProps = {
  model: SagaOverviewVm;
  primaryAction: SagaPrimaryAction;
  onPrimary: () => void;
};

const BLURB_CLAMP = 220;

export function SagaOverviewHero({ model, primaryAction, onPrimary }: SagaOverviewHeroProps) {
  const [expanded, setExpanded] = useState(false);
  const blurb = model.blurb.trim();
  const needsClamp = blurb.length > BLURB_CLAMP;
  const shown = !needsClamp || expanded ? blurb : `${blurb.slice(0, BLURB_CLAMP).trimEnd()}…`;
  const wait = primaryAction.kind === 'wait';

  return (
    <section className="space-y-4" data-saga-overview-hero aria-labelledby="saga-overview-title">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Geschichte</p>
        <h2 id="saga-overview-title" className="text-2xl font-semibold text-foreground md:text-3xl">
          {model.title}
        </h2>
        {blurb ? (
          <div className="space-y-1">
            <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{shown}</p>
            {needsClamp ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="min-h-11 px-0"
                onClick={() => setExpanded((v) => !v)}
                data-saga-overview-blurb-toggle
              >
                {expanded ? 'Weniger' : 'Mehr lesen'}
              </Button>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Noch keine Beschreibung.</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          className="min-h-11 min-w-[11rem] bg-cyan-600 text-white hover:bg-cyan-500"
          disabled={wait}
          onClick={onPrimary}
          data-saga-overview-primary={primaryAction.kind}
        >
          {primaryAction.labelDe}
        </Button>
        {wait ? (
          <p className="text-sm text-muted-foreground" data-saga-overview-wait-hint>
            Deine Spielleitung startet die nächste Session.
          </p>
        ) : null}
      </div>
    </section>
  );
}
