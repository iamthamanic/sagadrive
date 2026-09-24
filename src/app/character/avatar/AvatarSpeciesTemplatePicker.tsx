/**
 * AvatarSpeciesTemplatePicker — seven curated species templates for „Vorlage anpassen“ (#260).
 * Location: src/app/character/avatar/AvatarSpeciesTemplatePicker.tsx
 *
 * Renders picker DTOs from domain; never hardcodes species→body-family mapping in UI.
 * Look summaries live in a help tooltip next to the title (keeps cards compact, 3-col grid).
 */

import { CircleHelp } from 'lucide-react';
import {
  listTemplateCreatorPickerItems,
  type BaseBodySpeciesId,
  type SpeciesTemplatePickerItemV1,
} from '../../../domains/character/avatar';
import { Badge } from '../../../shared/ui/badge';
import { Button } from '../../../shared/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../shared/ui/tooltip';

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
        className="grid grid-cols-3 gap-2"
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
              className="h-auto min-w-0 flex-col items-start gap-1.5 whitespace-normal px-2.5 py-3 text-left"
              onClick={() => onSelect(item.speciesId)}
            >
              <span className="flex w-full min-w-0 items-center gap-1">
                <span className="min-w-0 font-medium leading-snug">{item.labelDe}</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      role="img"
                      aria-label={`${item.labelDe} erklären`}
                      data-testid={`species-template-help-${item.speciesId}`}
                      className="inline-flex size-5 shrink-0 items-center justify-center rounded-sm text-current/80 hover:bg-foreground/10 hover:text-current"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                      }}
                      onPointerDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                      }}
                    >
                      <CircleHelp className="pointer-events-none size-3.5" aria-hidden />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    sideOffset={6}
                    className="max-w-[280px] text-left text-xs leading-relaxed"
                  >
                    {item.lookSummaryDe}
                  </TooltipContent>
                </Tooltip>
              </span>
              <Badge variant="secondary" className="text-[10px]">
                {familyLabelDe(item.bodyFamily)}
              </Badge>
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
