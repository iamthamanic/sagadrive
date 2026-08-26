/**
 * genderReading — Labels and helpers for character gender-reading options.
 * Location: src/modules/characters/utils/genderReading.ts
 */
import type { CharacterGenderReading } from '../types/character.types';

export const GENDER_READING_OPTIONS: readonly {
  value: CharacterGenderReading;
  label: string;
  shortLabel: string;
}[] = [
  { value: 'masculine-read', label: 'Männlich gelesen', shortLabel: 'M gelesen' },
  { value: 'feminine-read', label: 'Weiblich gelesen', shortLabel: 'W gelesen' },
  { value: 'diverse', label: 'Divers', shortLabel: 'Divers' },
];

export function isCharacterGenderReading(value: string): value is CharacterGenderReading {
  return value === 'masculine-read' || value === 'feminine-read' || value === 'diverse';
}

export function getGenderReadingLabel(value: CharacterGenderReading): string {
  return GENDER_READING_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function getGenderReadingShortLabel(value: CharacterGenderReading): string {
  return GENDER_READING_OPTIONS.find((option) => option.value === value)?.shortLabel ?? value;
}
