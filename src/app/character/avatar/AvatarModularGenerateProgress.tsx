/**
 * AvatarModularGenerateProgress — SagaDrive stage list for Editierbar generate (#269).
 * Location: src/app/character/avatar/AvatarModularGenerateProgress.tsx
 *
 * Shows job-graph steps without provider internals.
 */

import type { ModularGenerateStageProgressV1 } from '../../../domains/character/avatar';

interface AvatarModularGenerateProgressProps {
  stages: readonly ModularGenerateStageProgressV1[];
  headlineDe?: string;
  detailDe?: string;
}

const STATUS_DE: Record<ModularGenerateStageProgressV1['status'], string> = {
  pending: 'Wartend',
  running: 'Läuft',
  done: 'Fertig',
  skipped: 'Übersprungen',
  failed: 'Fehlgeschlagen',
};

export function AvatarModularGenerateProgress({
  stages,
  headlineDe,
  detailDe,
}: AvatarModularGenerateProgressProps) {
  if (stages.length === 0) return null;

  return (
    <section
      className="space-y-2 rounded-lg border border-border bg-muted/20 p-3 text-xs"
      aria-label="Modularer Generate-Fortschritt"
      data-avatar-modular-generate-progress
    >
      {headlineDe ? (
        <p className="text-sm font-medium" data-avatar-modular-generate-headline>
          {headlineDe}
        </p>
      ) : null}
      {detailDe ? <p className="text-muted-foreground">{detailDe}</p> : null}
      <ol className="space-y-1">
        {stages.map((stage) => (
          <li
            key={stage.stageId}
            className="flex items-center justify-between gap-2"
            data-avatar-modular-stage={stage.stageId}
            data-status={stage.status}
          >
            <span>{stage.labelDe}</span>
            <span className="text-muted-foreground">{STATUS_DE[stage.status]}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
