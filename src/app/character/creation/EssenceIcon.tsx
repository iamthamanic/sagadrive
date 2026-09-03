/**
 * EssenceIcon — Lucide icon for each SagaDrive primary essence option.
 * Location: src/app/character/creation/EssenceIcon.tsx
 */
import {
  Brain,
  CircuitBoard,
  Ghost,
  Link2,
  PersonStanding,
  type LucideIcon,
} from 'lucide-react';
import type { SagaDriveEssenceKey } from '../../../modules/rulesets/characterCreation';

const ESSENCE_ICONS: Record<SagaDriveEssenceKey, LucideIcon> = {
  physical: PersonStanding,
  mental: Brain,
  spiritual: Ghost,
  bound: Link2,
  technological: CircuitBoard,
};

type EssenceIconProps = {
  essenceKey: SagaDriveEssenceKey;
  className?: string;
};

export function EssenceIcon({ essenceKey, className = 'h-4 w-4' }: EssenceIconProps) {
  const Icon = ESSENCE_ICONS[essenceKey];
  return <Icon className={className} aria-hidden="true" />;
}
