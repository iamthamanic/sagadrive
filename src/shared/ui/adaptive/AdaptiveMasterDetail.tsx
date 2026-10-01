/**
 * AdaptiveMasterDetail — list+detail; phone uses full-screen detail sheet (#482).
 * Location: src/shared/ui/adaptive/AdaptiveMasterDetail.tsx
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

export type AdaptiveMasterDetailProps = {
  master: React.ReactNode;
  detail: React.ReactNode;
  detailTitle: string;
  detailOpen: boolean;
  onDetailOpenChange: (open: boolean) => void;
  className?: string;
  masterClassName?: string;
  detailClassName?: string;
};

export function AdaptiveMasterDetail({
  master,
  detail,
  detailTitle,
  detailOpen,
  onDetailOpenChange,
  className,
  masterClassName,
  detailClassName,
}: AdaptiveMasterDetailProps) {
  const band = useAdaptiveBand();

  if (band === 'phone') {
    return (
      <div
        data-slot="adaptive-master-detail"
        data-au-pattern="master-detail"
        data-adaptive-band={band}
        className={cn('flex min-h-0 min-w-0 flex-1 flex-col', className)}
      >
        <div className={cn('min-h-0 flex-1 overflow-y-auto', masterClassName)}>
          {master}
        </div>
        <AdaptiveSheet open={detailOpen} onOpenChange={onDetailOpenChange}>
          <AdaptiveSheetContent
            forceSide="bottom"
            className={cn('flex flex-col', detailClassName)}
          >
            <AdaptiveSheetHeader>
              <AdaptiveSheetTitle>{detailTitle}</AdaptiveSheetTitle>
            </AdaptiveSheetHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{detail}</div>
          </AdaptiveSheetContent>
        </AdaptiveSheet>
      </div>
    );
  }

  return (
    <div
      data-slot="adaptive-master-detail"
      data-au-pattern="master-detail"
      data-adaptive-band={band}
      className={cn(
        'flex min-h-0 min-w-0 flex-1 flex-row gap-0 overflow-hidden',
        className,
      )}
    >
      <div
        className={cn(
          'min-h-0 w-full max-w-md shrink-0 overflow-y-auto border-r border-border',
          band === 'tablet' && 'max-w-sm',
          masterClassName,
        )}
      >
        {master}
      </div>
      <div className={cn('min-h-0 min-w-0 flex-1 overflow-y-auto', detailClassName)}>
        {detailOpen ? (
          detail
        ) : (
          <div className="text-muted-foreground flex h-full items-center justify-center p-6 text-sm">
            {detailTitle}
          </div>
        )}
      </div>
    </div>
  );
}
