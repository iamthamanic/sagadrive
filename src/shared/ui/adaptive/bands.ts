/**
 * Adaptive device bands — pure helpers + hooks for AU contract (#482).
 * Viewport band drives shell chrome; content band drives Journey recomposition
 * inside the main pane (split IDE previews, collapsed sidebar, etc.).
 * Location: src/shared/ui/adaptive/bands.ts
 */
import * as React from 'react';

/** Aligns with useIsMobile / THEME_GUIDE / AU contract. */
export const ADAPTIVE_PHONE_MAX_PX = 767;
export const ADAPTIVE_TABLET_MAX_PX = 1023;

/** Soft readability cap for Journey columns (Tailwind max-w-2xl). */
export const ADAPTIVE_JOURNEY_COLUMN_MAX_PX = 672;

export type AdaptiveBand = 'phone' | 'tablet' | 'desktop';

export function resolveAdaptiveBand(widthPx: number): AdaptiveBand {
  if (!Number.isFinite(widthPx) || widthPx < 0) {
    return 'desktop';
  }
  if (widthPx <= ADAPTIVE_PHONE_MAX_PX) return 'phone';
  if (widthPx <= ADAPTIVE_TABLET_MAX_PX) return 'tablet';
  return 'desktop';
}

/**
 * Same thresholds as viewport bands — call with main-pane / container width
 * so Journey UI recomposes to available content space (AU-CONTENT-WIDTH).
 */
export function resolveAdaptiveContentBand(widthPx: number): AdaptiveBand {
  return resolveAdaptiveBand(widthPx);
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

/**
 * Observe a layout container (typically shell `<main>`) and return its adaptive band.
 * Falls back to viewport band when the element is missing or has no measurable width.
 */
export function useAdaptiveContentBand(
  containerRef: React.RefObject<HTMLElement | null>,
): AdaptiveBand {
  const viewportBand = useAdaptiveBand();
  const [band, setBand] = React.useState<AdaptiveBand>(viewportBand);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') {
      setBand(viewportBand);
      return;
    }

    const sync = (widthPx: number) => {
      if (!Number.isFinite(widthPx) || widthPx <= 0) {
        setBand(viewportBand);
        return;
      }
      setBand(resolveAdaptiveContentBand(widthPx));
    };

    sync(el.getBoundingClientRect().width);
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      const width = entry?.contentRect?.width ?? el.getBoundingClientRect().width;
      sync(width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [containerRef, viewportBand]);

  return band;
}

export function isPhoneBand(band: AdaptiveBand): boolean {
  return band === 'phone';
}

export function isCompactBand(band: AdaptiveBand): boolean {
  return band === 'phone' || band === 'tablet';
}
