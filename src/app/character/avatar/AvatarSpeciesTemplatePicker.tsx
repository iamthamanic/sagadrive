/**
 * AvatarSpeciesTemplatePicker — seven curated species templates for „Vorlage anpassen“ (#260).
 * Location: src/app/character/avatar/AvatarSpeciesTemplatePicker.tsx
 *
 * Renders picker DTOs from domain; never hardcodes species→body-family mapping in UI.
 */

import {
  listTemplateCreatorPickerItems,
  type BaseBodySpeciesId,
  type SpeciesTemplatePickerItemV1,
} from '../../../domains/character/avatar';
import { Badge } from '../../../shared/ui/badge';
import { Button } from '../../../shared/ui/button';

interface AvatarSpeciesTemplatePickerProps {
  selectedSpeciesId: BaseBodySpeciesId | null;
  onSelect: (speciesId: BaseBodySpeciesId) => void;
  disabled?: boolean;
  warningsDe?: readonly string[];
}

function familyLabelDe(family: SpeciesTemplatePickerItemV1['bodyFamily']): string {
  switch (family) {
    case 'compact':
      return 'Kompakt';
    case 'heavy':
      return 'Schwer';
    case 'standard':
      return 'Standard';
    default: {
      const _exhaustive: never = family;
      return _exhaustive;
    }
  }
}

export function AvatarSpeciesTemplatePicker({
  selectedSpeciesId,
  onSelect,
  disabled = false,
  warningsDe = [],
}: AvatarSpeciesTemplatePickerProps) {
  const items = listTemplateCreatorPickerItems();

  return (
    <section
      className="space-y-3"
      aria-label="Vorlage anpassen"
      data-avatar-template-picker="species-v1"
    >
      <div>
        <h3 className="text-sm font-medium">Vorlage anpassen</h3>
        <p className="text-xs text-muted-foreground">
          Wähle eine Species-Vorlage. Körper, Gesicht, Traits und Basic Outfit landen im gemeinsamen
          Editor.
        </p>
      </div>
      <div
        className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3"
        role="listbox"
        aria-label="Species-Vorlagen"
      >
        {items.map((item) => {
          const selected = selectedSpeciesId === item.speciesId;
          return (
            <Button
              key={item.speciesId}
              type="button"
              role="option"
              aria-selected={selected}
              variant={selected ? 'default' : 'outline'}
              disabled={disabled}
              data-species-template={item.speciesId}
              data-body-family={item.bodyFamily}
              data-selected={selected ? 'true' : 'false'}
              className="h-auto min-h-[5.5rem] flex-col items-start gap-1 whitespace-normal px-3 py-3 text-left"
              onClick={() => onSelect(item.speciesId)}
            >
              <span className="font-medium">{item.labelDe}</span>
              <Badge variant="secondary" className="text-[10px]">
                {familyLabelDe(item.bodyFamily)}
              </Badge>
              <span className="text-xs opacity-90">{item.lookSummaryDe}</span>
            </Button>
          );
        })}
      </div>
      {warningsDe.length > 0 ? (
        <ul
          className="space-y-1 text-xs text-amber-600 dark:text-amber-400"
          data-template-warnings
          aria-live="polite"
        >
          {warningsDe.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
