/**
 * AdaptiveActionBar — primary action row with safe-area + 44px touch targets (#482).
 * Location: src/shared/ui/adaptive/AdaptiveActionBar.tsx
 */
import * as React from 'react';
import { cn } from '../utils';

export type AdaptiveActionBarProps = React.ComponentProps<'div'> & {
  /** Place bar at bottom (default) or top of a composition. */
  position?: 'bottom' | 'top';
};

export function AdaptiveActionBar({
  className,
  position = 'bottom',
  children,
  ...props
}: AdaptiveActionBarProps) {
  return (
    <div
      data-slot="adaptive-action-bar"
      data-au-pattern="action-bar"
      data-position={position}
      className={cn(
        'flex shrink-0 flex-wrap items-center gap-2 border-border bg-card px-4 py-3',
        '[&_button]:min-h-11 [&_a]:min-h-11',
        'motion-reduce:transition-none',
        position === 'bottom'
          ? 'border-t safe-area-pb'
          : 'border-b pt-[max(0.75rem,env(safe-area-inset-top))]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
