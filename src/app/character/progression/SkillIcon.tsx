/**
 * SkillIcon — Lucide icon for each SagaDrive skill option in selects and lists.
 * Location: src/modules/characters/components/SkillIcon.tsx
 */
import {
  BookOpen,
  Car,
  Compass,
  Crosshair,
  Cpu,
  Dumbbell,
  EyeOff,
  FileSearch,
  Hand,
  Handshake,
  HeartPulse,
  Mic,
  ScanEye,
  Skull,
  Swords,
  Users,
  VenetianMask,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { SagaDriveSkillKey } from '../../../modules/rulesets/characterCreation';

const SKILL_ICONS: Record<SagaDriveSkillKey, LucideIcon> = {
  athletics: Dumbbell,
  acrobatics: Zap,
  sleight: Hand,
  stealth: EyeOff,
  melee: Swords,
  ranged: Crosshair,
  awareness: ScanEye,
  insight: Users,
  survival: Compass,
  investigation: FileSearch,
  knowledge: BookOpen,
  technology: Cpu,
  medicine: HeartPulse,
  driving: Car,
  persuasion: Handshake,
  deception: VenetianMask,
  intimidation: Skull,
  performance: Mic,
};

type SkillIconProps = {
  skillKey: SagaDriveSkillKey;
  className?: string;
};

export function SkillIcon({ skillKey, className = 'h-4 w-4' }: SkillIconProps) {
  const Icon = SKILL_ICONS[skillKey];
  return <Icon className={className} aria-hidden="true" />;
}
