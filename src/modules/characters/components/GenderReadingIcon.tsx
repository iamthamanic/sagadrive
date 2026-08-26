/**
 * GenderReadingIcon — Lucide icon for character gender-reading options in the editor.
 * Location: src/modules/characters/components/GenderReadingIcon.tsx
 */
import { Mars, NonBinary, Venus, type LucideIcon } from 'lucide-react';
import type { CharacterGenderReading } from '../types/character.types';

const GENDER_READING_ICONS: Record<CharacterGenderReading, LucideIcon> = {
  'masculine-read': Mars,
  'feminine-read': Venus,
  diverse: NonBinary,
};

type GenderReadingIconProps = {
  value: CharacterGenderReading;
  className?: string;
};

export function GenderReadingIcon({ value, className = 'h-4 w-4' }: GenderReadingIconProps) {
  const Icon = GENDER_READING_ICONS[value];
  return <Icon className={className} aria-hidden="true" />;
}
