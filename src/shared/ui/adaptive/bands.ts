/**
 * Adaptive device bands — pure helpers + hook for AU contract (#482).
 * Location: src/shared/ui/adaptive/bands.ts
 */
import * as React from 'react';

/** Aligns with useIsMobile / THEME_GUIDE / AU contract. */
export const ADAPTIVE_PHONE_MAX_PX = 767;
export const ADAPTIVE_TABLET_MAX_PX = 1023;

export type AdaptiveBand = 'phone' | 'tablet' | 'desktop';

export function resolveAdaptiveBand(widthPx: number): AdaptiveBand {
  if (!Number.isFinite(widthPx) || widthPx < 0) {
    return 'desktop';
  }
  if (widthPx <= ADAPTIVE_PHONE_MAX_PX) return 'phone';
  if (widthPx <= ADAPTIVE_TABLET_MAX_PX) return 'tablet';
  return 'desktop';
}

export function useAdaptiveBand(): AdaptiveBand {
  const [band, setBand] = React.useState<AdaptiveBand>(() => {
    if (typeof window === 'undefined') return 'desktop';
    return resolveAdaptiveBand(window.innerWidth);
  });

  React.useEffect(() => {
    const sync = () => setBand(resolveAdaptiveBand(window.innerWidth));
    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, []);

  return band;
}

export function isPhoneBand(band: AdaptiveBand): boolean {
  return band === 'phone';
}

export function isCompactBand(band: AdaptiveBand): boolean {
  return band === 'phone' || band === 'tablet';
}
