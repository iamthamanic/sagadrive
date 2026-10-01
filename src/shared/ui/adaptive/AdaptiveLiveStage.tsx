/**
 * AdaptiveLiveStage — center stage with optional side rails that collapse on phone (#482).
 * Location: src/shared/ui/adaptive/AdaptiveLiveStage.tsx
 */
import * as React from 'react';
import { cn } from '../utils';
import { useAdaptiveBand } from './bands';

export type AdaptiveLiveStageProps = {
  stage: React.ReactNode;
  leftRail?: React.ReactNode;
  rightRail?: React.ReactNode;
  bottomRail?: React.ReactNode;
  className?: string;
  stageClassName?: string;
};

export function AdaptiveLiveStage({
  stage,
  leftRail,
  rightRail,
  bottomRail,
  className,
  stageClassName,
}: AdaptiveLiveStageProps) {
  const band = useAdaptiveBand();
  const compact = band === 'phone';

  return (
    <div
      data-slot="adaptive-live-stage"
      data-au-pattern="live-stage"
      data-adaptive-band={band}
      className={cn(
        'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background',
        className,
      )}
    >
      <div
        className={cn(
          'flex min-h-0 min-w-0 flex-1',
          compact ? 'flex-col' : 'flex-row',
        )}
      >
        {!compact && leftRail ? (
          <aside
            data-slot="adaptive-live-stage-left"
            className="min-h-0 w-56 shrink-0 overflow-y-auto border-r border-border lg:w-64"
          >
            {leftRail}
          </aside>
        ) : null}
        <div
          data-slot="adaptive-live-stage-center"
          className={cn('relative min-h-0 min-w-0 flex-1 overflow-hidden', stageClassName)}
        >
          {stage}
        </div>
        {!compact && rightRail ? (
          <aside
            data-slot="adaptive-live-stage-right"
            className="min-h-0 w-56 shrink-0 overflow-y-auto border-l border-border lg:w-72"
          >
            {rightRail}
          </aside>
        ) : null}
      </div>
      {bottomRail ? (
        <div
          data-slot="adaptive-live-stage-bottom"
          className="shrink-0 border-t border-border safe-area-pb"
        >
          {bottomRail}
        </div>
      ) : null}
      {compact && (leftRail || rightRail) ? (
        <div
          data-slot="adaptive-live-stage-compact-rails"
          className="flex shrink-0 gap-2 overflow-x-auto border-t border-border px-2 py-2 safe-area-pb"
        >
          {leftRail}
          {rightRail}
        </div>
      ) : null}
    </div>
  );
}
