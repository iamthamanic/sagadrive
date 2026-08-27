/**
 * SpeciesBannerFlag — Rechteckiges Spezies-Wappen oben links im Karussell.
 * Shimmer-Overlay in Wappen-Akzentfarbe pro Spezies.
 * Location: src/modules/characters/components/SpeciesBannerFlag.tsx
 */
import type { CSSProperties } from 'react';
import { getSpeciesBannerUrl, getSpeciesColorway } from './speciesBanners';

type SpeciesBannerFlagProps = {
  species: string;
  className?: string;
  /** Shimmer nur bei ausgewählter Spezies */
  isSelected?: boolean;
};

export function SpeciesBannerFlag({ species, className = '', isSelected = false }: SpeciesBannerFlagProps) {
  const key = species.trim().toLowerCase();
  const colorway = getSpeciesColorway(key);

  const shimmerStyle = {
    '--species-shimmer': colorway.accent,
    '--species-shimmer-soft': colorway.border,
  } as CSSProperties;

  return (
    <div
      className={`species-banner-flag-wrap pointer-events-none absolute left-2 top-2 z-[5] h-12 w-10 overflow-hidden md:left-3 md:top-3 md:h-14 md:w-11 ${isSelected ? 'is-selected' : ''} ${className}`}
      style={shimmerStyle}
      aria-hidden
    >
      <img
        src={getSpeciesBannerUrl(key)}
        alt=""
        draggable={false}
        className="species-banner-flag-img h-full w-full object-fill"
      />
      {isSelected && <div className="species-banner-shimmer" aria-hidden />}
    </div>
  );
}
