/**
 * SpeciesTraitIcon — Lucide icon for each SagaDrive species talent/trait option.
 * Location: src/modules/characters/components/SpeciesTraitIcon.tsx
 */
import {
  Bird,
  Dna,
  Ear,
  Eye,
  Fish,
  Flame,
  Shield,
  ShieldHalf,
  Swords,
  Trees,
  Waves,
  type LucideIcon,
} from 'lucide-react';
import type { SagaDriveSpeciesTraitKey } from '../../rulesets/characterCreation';

const SPECIES_TRAIT_ICONS: Record<SagaDriveSpeciesTraitKey, LucideIcon> = {
  'sharpened-sense': Ear,
  'natural-weapon': Swords,
  'narrow-resistance': ShieldHalf,
  'environment-adaptation': Trees,
  'natural-protection': Shield,
  'climb-or-swim': Waves,
  amphibious: Fish,
  'enhanced-sight': Eye,
  flight: Bird,
  'extreme-environment': Flame,
  'exceptional-body': Dna,
};

type SpeciesTraitIconProps = {
  traitKey: SagaDriveSpeciesTraitKey;
  className?: string;
};

export function SpeciesTraitIcon({ traitKey, className = 'h-4 w-4' }: SpeciesTraitIconProps) {
  const Icon = SPECIES_TRAIT_ICONS[traitKey];
  return <Icon className={className} aria-hidden="true" />;
}
