/**
 * speciesBanners — Flat-color heraldic coat of arms per SagaDrive Spezies.
 * Style: bold logo, distinct colors/patterns, no shading, uniform 400×512px RGB.
 * Location: src/modules/characters/components/speciesBanners.ts
 */
import alienBanner from '../../../assets/species/banners/alien.png';
import cyborgBanner from '../../../assets/species/banners/cyborg.png';
import dwarfBanner from '../../../assets/species/banners/dwarf.png';
import elfBanner from '../../../assets/species/banners/elf.png';
import halflingBanner from '../../../assets/species/banners/halfling.png';
import humanBanner from '../../../assets/species/banners/human.png';
import orcBanner from '../../../assets/species/banners/orc.png';

export const speciesBannerSources: Record<string, string> = {
  human: humanBanner,
  elf: elfBanner,
  dwarf: dwarfBanner,
  halfling: halflingBanner,
  orc: orcBanner,
  cyborg: cyborgBanner,
  alien: alienBanner,
};

export function getSpeciesBannerUrl(race: string): string {
  return speciesBannerSources[race.trim().toLowerCase()] ?? humanBanner;
}

/** Farbschema pro Spezies — abgeleitet vom jeweiligen Wappen. */
export type SpeciesColorway = {
  headerBg: string;
  headerBgPulse: string;
  accent: string;
  text: string;
  border: string;
};

export const speciesColorways: Record<string, SpeciesColorway> = {
  human: {
    headerBg: 'rgba(185, 45, 40, 0.14)',
    headerBgPulse: 'rgba(185, 45, 40, 0.22)',
    accent: '#D4A040',
    text: 'rgba(212, 180, 140, 0.88)',
    border: 'rgba(185, 45, 40, 0.55)',
  },
  elf: {
    headerBg: 'rgba(60, 120, 70, 0.14)',
    headerBgPulse: 'rgba(60, 120, 70, 0.22)',
    accent: '#8BB89A',
    text: 'rgba(139, 184, 154, 0.88)',
    border: 'rgba(60, 120, 70, 0.55)',
  },
  dwarf: {
    headerBg: 'rgba(168, 100, 50, 0.14)',
    headerBgPulse: 'rgba(168, 100, 50, 0.22)',
    accent: '#D49050',
    text: 'rgba(212, 160, 100, 0.88)',
    border: 'rgba(168, 100, 50, 0.55)',
  },
  halfling: {
    headerBg: 'rgba(80, 140, 60, 0.14)',
    headerBgPulse: 'rgba(80, 140, 60, 0.22)',
    accent: '#7CB356',
    text: 'rgba(180, 200, 120, 0.88)',
    border: 'rgba(120, 160, 70, 0.55)',
  },
  orc: {
    headerBg: 'rgba(180, 40, 40, 0.14)',
    headerBgPulse: 'rgba(180, 40, 40, 0.22)',
    accent: '#C83838',
    text: 'rgba(200, 120, 120, 0.88)',
    border: 'rgba(180, 40, 40, 0.55)',
  },
  cyborg: {
    headerBg: 'rgba(40, 120, 180, 0.14)',
    headerBgPulse: 'rgba(40, 120, 180, 0.22)',
    accent: '#40B8E0',
    text: 'rgba(100, 180, 220, 0.88)',
    border: 'rgba(40, 120, 180, 0.55)',
  },
  alien: {
    headerBg: 'rgba(100, 40, 140, 0.14)',
    headerBgPulse: 'rgba(100, 40, 140, 0.22)',
    accent: '#9AE040',
    text: 'rgba(160, 220, 100, 0.88)',
    border: 'rgba(120, 60, 160, 0.55)',
  },
};

export function getSpeciesColorway(race: string): SpeciesColorway {
  return speciesColorways[race.trim().toLowerCase()] ?? speciesColorways.human;
}
