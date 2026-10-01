/**
 * AdaptiveInspector — desktop/tablet side rail; phone sheet (#482).
 * Location: src/shared/ui/adaptive/AdaptiveInspector.tsx
 */
import * as React from 'react';
import { cn } from '../utils';
import {
  AdaptiveSheet,
  AdaptiveSheetContent,
  AdaptiveSheetHeader,
  AdaptiveSheetTitle,
} from './AdaptiveSheet';
import { useAdaptiveBand } from './bands';

export type AdaptiveInspectorProps = {
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
  /** Desktop/tablet rail width class. */
  railClassName?: string;
};

export function AdaptiveInspector({
  title,
  open,
  onOpenChange,
  children,
  className,
  railClassName,
}: AdaptiveInspectorProps) {
  const band = useAdaptiveBand();

  if (band === 'phone') {
    return (
      <AdaptiveSheet open={open} onOpenChange={onOpenChange}>
        <AdaptiveSheetContent
          data-slot="adaptive-inspector"
          data-au-pattern="inspector"
          className={className}
        >
          <AdaptiveSheetHeader>
            <AdaptiveSheetTitle>{title}</AdaptiveSheetTitle>
          </AdaptiveSheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{children}</div>
        </AdaptiveSheetContent>
      </AdaptiveSheet>
    );
  }

  if (!open) return null;

  return (
    <aside
      data-slot="adaptive-inspector"
      data-au-pattern="inspector"
      data-adaptive-band={band}
      aria-label={title}
      className={cn(
        'flex h-full min-h-0 w-full max-w-sm shrink-0 flex-col border-l border-border bg-card',
        railClassName,
        className,
      )}
    >
      <div className="shrink-0 border-b border-border px-4 py-3 text-sm font-semibold">
        {title}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
    </aside>
  );
}
