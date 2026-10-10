/**
 * AdaptiveJourneyColumn — Fluid Journey primary column (soft max-width).
 * Fills available main-pane width up to the readability cap; no forced side void
 * when the content container is narrower than max-w-2xl (AU-CONTENT-WIDTH).
 * Location: src/shared/ui/adaptive/AdaptiveJourneyColumn.tsx
 */
import * as React from 'react';
import { cn } from '../utils';

export type AdaptiveJourneyColumnProps = React.ComponentProps<'div'>;

export function AdaptiveJourneyColumn({
  className,
  children,
  ...props
}: AdaptiveJourneyColumnProps) {
  return (
    <div
      data-slot="adaptive-journey-column"
      data-au-pattern="journey-column"
      className={cn('mx-auto w-full min-w-0 max-w-2xl', className)}
      {...props}
    >
      {children}
    </div>
  );
}
