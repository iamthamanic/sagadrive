/**
 * AdaptiveSheet — Radix Sheet with AU defaults (bottom on phone, safe-area) (#482).
 * Location: src/shared/ui/adaptive/AdaptiveSheet.tsx
 */
import * as React from 'react';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../sheet';
import { cn } from '../utils';
import { useAdaptiveBand } from './bands';

export type AdaptiveSheetSide = 'top' | 'right' | 'bottom' | 'left';

export type AdaptiveSheetContentProps = React.ComponentProps<typeof SheetContent> & {
  /** Override automatic phone→bottom mapping. */
  forceSide?: AdaptiveSheetSide;
};

export function AdaptiveSheet(props: React.ComponentProps<typeof Sheet>) {
  return <Sheet data-au-pattern="sheet" {...props} />;
}

export function AdaptiveSheetContent({
  className,
  forceSide,
  side,
  children,
  ...props
}: AdaptiveSheetContentProps) {
  const band = useAdaptiveBand();
  const resolvedSide: AdaptiveSheetSide =
    forceSide ?? side ?? (band === 'phone' ? 'bottom' : 'right');

  return (
    <SheetContent
      side={resolvedSide}
      data-slot="adaptive-sheet-content"
      data-adaptive-band={band}
      className={cn(
        resolvedSide === 'bottom' &&
          'max-h-[90dvh] pb-[max(1rem,env(safe-area-inset-bottom))]',
        className,
      )}
      {...props}
    >
      {children}
    </SheetContent>
  );
}

export {
  SheetClose as AdaptiveSheetClose,
  SheetDescription as AdaptiveSheetDescription,
  SheetFooter as AdaptiveSheetFooter,
  SheetHeader as AdaptiveSheetHeader,
  SheetTitle as AdaptiveSheetTitle,
  SheetTrigger as AdaptiveSheetTrigger,
};
