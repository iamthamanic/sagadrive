/**
 * GenderReadingSelect — Dropdown for männlich/weiblich/divers gelesen with icons.
 * Location: src/modules/characters/components/GenderReadingSelect.tsx
 */
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import type { CharacterGenderReading } from '../types/character.types';
import { GENDER_READING_OPTIONS, isCharacterGenderReading } from '../utils/genderReading';
import { GenderReadingIcon } from './GenderReadingIcon';

type GenderReadingSelectProps = {
  value?: CharacterGenderReading;
  onValueChange: (value: CharacterGenderReading) => void;
  id?: string;
  className?: string;
  invalid?: boolean;
};

export function GenderReadingSelect({
  value,
  onValueChange,
  id = 'gender-reading',
  className,
  invalid = false,
}: GenderReadingSelectProps) {
  const selected = value ? GENDER_READING_OPTIONS.find((option) => option.value === value) : undefined;

  return (
    <Select
      value={value}
      onValueChange={(nextValue) => {
        if (isCharacterGenderReading(nextValue)) onValueChange(nextValue);
      }}
    >
      <SelectTrigger id={id} className={className} aria-label="Geschlecht wählen" aria-invalid={invalid}>
        {selected ? (
          <span className="flex min-w-0 items-center gap-1.5">
            <GenderReadingIcon value={selected.value} className="h-4 w-4 shrink-0" />
            <span className="truncate text-xs sm:text-sm">{selected.shortLabel}</span>
          </span>
        ) : (
          <SelectValue placeholder="Wählen" />
        )}
      </SelectTrigger>
      <SelectContent>
        {GENDER_READING_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <span className="flex items-center gap-2">
              <GenderReadingIcon value={option.value} className="h-4 w-4 shrink-0" />
              <span>{option.label}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
