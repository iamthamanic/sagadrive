/**
 * AdaptivePage — Journey/Workstation page shell with AU gutters + safe areas (#482).
 * Location: src/shared/ui/adaptive/AdaptivePage.tsx
 */
import * as React from 'react';
import { cn } from '../utils';

export type AdaptivePageProps = React.ComponentProps<'div'> & {
  /** Optional sticky/header slot above the scroll body. */
  header?: React.ReactNode;
  /** Optional footer / action region (prefer AdaptiveActionBar for primary CTAs). */
  footer?: React.ReactNode;
};

export function AdaptivePage({
  className,
  header,
  footer,
  children,
  ...props
}: AdaptivePageProps) {
  return (
    <div
      data-slot="adaptive-page"
      data-au-pattern="page"
      className={cn(
        'flex min-h-0 min-w-0 flex-1 flex-col bg-background text-foreground',
        className,
      )}
      {...props}
    >
      {header ? (
        <div
          data-slot="adaptive-page-header"
          className="shrink-0 border-b border-border px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 sm:px-6"
        >
          {header}
        </div>
      ) : null}
      <div
        data-slot="adaptive-page-body"
        className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-6"
      >
        {children}
      </div>
      {footer ? (
        <div data-slot="adaptive-page-footer" className="shrink-0">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
