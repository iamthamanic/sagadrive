/**
 * SelectedSpeciesChip — Compact Spezies Wappen + label for the preview name row.
 * Shows beside the Charaktername input when a Spezies is selected.
 * Location: src/modules/characters/components/SelectedSpeciesChip.tsx
 */
import { getCharacterCreationOptionLabel, sagaDriveRaceOptions } from '../../../modules/rulesets/characterCreation';
import { getSpeciesBannerUrl } from './speciesBanners';

type SelectedSpeciesChipProps = {
  species: string;
  label?: string;
  className?: string;
};

export function SelectedSpeciesChip({ species, label, className = '' }: SelectedSpeciesChipProps) {
  const key = species.trim().toLowerCase();
  if (!key) return null;

  const defaultLabel = getCharacterCreationOptionLabel(sagaDriveRaceOptions, key);
  const displayLabel = label?.trim() || defaultLabel;

  return (
    <div
      className={`flex h-11 shrink-0 items-center gap-2 rounded-lg border border-foreground/15 bg-muted/30 px-2 ${className}`}
      title={displayLabel}
      aria-label={`Spezies: ${displayLabel}`}
    >
      <img
        src={getSpeciesBannerUrl(key)}
        alt=""
        draggable={false}
        className="h-8 w-6 object-fill"
      />
      <span className="max-w-[5.5rem] truncate text-sm font-medium sm:max-w-[7rem]">{displayLabel}</span>
    </div>
  );
}
