/**
 * AdaptiveToolbar — horizontal tool/tab row that scrolls on narrow bands (#482).
 * Location: src/shared/ui/adaptive/AdaptiveToolbar.tsx
 */
import * as React from 'react';
import { cn } from '../utils';

export type AdaptiveToolbarProps = React.ComponentProps<'div'>;

export function AdaptiveToolbar({
  className,
  children,
  ...props
}: AdaptiveToolbarProps) {
  return (
    <div
      data-slot="adaptive-toolbar"
      data-au-pattern="toolbar"
      role="toolbar"
      className={cn(
        'flex min-w-0 items-center gap-2 overflow-x-auto overflow-y-hidden px-1 py-1',
        '[&_button]:min-h-11 [&_[role=tab]]:min-h-11',
        'motion-reduce:scroll-auto',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
