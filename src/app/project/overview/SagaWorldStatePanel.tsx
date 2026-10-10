/**
 * SagaWorldStatePanel — Audience-safe clocks / consequences summary (#571).
 * Location: src/app/project/overview/SagaWorldStatePanel.tsx
 *
 * Renders only the audience-safe overview world summary from the hub VM.
 */
import type { SagaWorldStateSummaryVm } from '../../../domains/project/contracts/saga-overview';

export type SagaWorldStatePanelProps = {
  summary: SagaWorldStateSummaryVm;
};

export function SagaWorldStatePanel({ summary }: SagaWorldStatePanelProps) {
  const hasClocks = summary.clocks.length > 0;
  const hasCons = summary.consequences.length > 0;

  return (
    <section className="space-y-3" data-saga-overview-world aria-labelledby="saga-overview-world-title">
      <div className="space-y-1">
        <h3 id="saga-overview-world-title" className="text-lg font-semibold text-foreground">
          Weltzustand
        </h3>
        <p className="text-sm text-muted-foreground">
          Öffentliche Uhren und was bisher geschah
          {summary.flagCount > 0 ? ` · ${summary.flagCount} Marken` : ''}
        </p>
      </div>

      {!hasClocks && !hasCons ? (
        <p className="text-sm text-muted-foreground" data-saga-overview-world-empty>
          Noch keine öffentlichen Welt-Ereignisse.
        </p>
      ) : null}

      {hasClocks ? (
        <ul className="space-y-2" data-saga-overview-clocks>
          {summary.clocks.map((clock) => {
            const max = Math.max(1, clock.max);
            const pct = Math.min(100, Math.round((clock.value / max) * 100));
            return (
              <li key={clock.id} className="space-y-1" data-saga-overview-clock={clock.id}>
                <div className="flex justify-between gap-2 text-sm">
                  <span className="font-medium text-foreground">{clock.label}</span>
                  <span className="text-muted-foreground">
                    {clock.value}/{max}
                  </span>
                </div>
                <div
                  className="h-2 w-full overflow-hidden rounded-sm bg-muted"
                  role="progressbar"
                  aria-valuenow={clock.value}
                  aria-valuemin={0}
                  aria-valuemax={max}
                  aria-label={clock.label}
                >
                  <div className="h-full bg-cyan-600" style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      {hasCons ? (
        <div className="space-y-2" data-saga-overview-consequences>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Bisher geschah</p>
          <ul className="space-y-1.5">
            {summary.consequences.map((c) => (
              <li key={c.id} className="text-sm text-foreground" data-saga-overview-consequence={c.id}>
                {c.summary}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
