/**
 * ArchetypeIcon — Lucide icon for each SagaDrive primary archetype option.
 * Location: src/modules/characters/components/ArchetypeIcon.tsx
 */
import {
  Brain,
  Handshake,
  HeartPulse,
  Swords,
  VenetianMask,
  type LucideIcon,
} from 'lucide-react';
import type { SagaDriveArchetypeKey } from '../../rulesets/characterCreation';

const ARCHETYPE_ICONS: Record<SagaDriveArchetypeKey, LucideIcon> = {
  fighter: Swords,
  thinker: Brain,
  healer: HeartPulse,
  rebel: VenetianMask,
  diplomat: Handshake,
};

type ArchetypeIconProps = {
  archetypeKey: SagaDriveArchetypeKey;
  className?: string;
};

export function ArchetypeIcon({ archetypeKey, className = 'h-4 w-4' }: ArchetypeIconProps) {
  const Icon = ARCHETYPE_ICONS[archetypeKey];
  return <Icon className={className} aria-hidden="true" />;
}
