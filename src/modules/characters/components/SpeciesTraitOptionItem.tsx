/**
 * SpeciesTraitOptionItem — Select-Option mit eigenem Beschreibungstooltip.
 * Label geht in ItemText (Trigger); Beschreibung nur über Hilfe-Icon am Eintrag.
 * Location: src/modules/characters/components/SpeciesTraitOptionItem.tsx
 */
import { useState } from 'react';
import * as SelectPrimitive from '@radix-ui/react-select@2.1.6';
import { CheckIcon, CircleHelp } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../components/ui/tooltip';
import { cn } from '../../../components/ui/utils';
import type { SagaDriveSpeciesTraitOption } from '../../rulesets/speciesTraitOptions';

type SpeciesTraitOptionItemProps = {
  option: SagaDriveSpeciesTraitOption;
  disabled?: boolean;
};

export function SpeciesTraitOptionItem({ option, disabled = false }: SpeciesTraitOptionItemProps) {
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <SelectPrimitive.Item
      value={option.value}
      textValue={option.label}
      disabled={disabled}
      className={cn(
        'focus:bg-accent/10 focus:text-foreground data-[state=checked]:bg-accent/10 data-[state=checked]:text-foreground relative flex w-full cursor-default items-center gap-2 rounded-md py-2 pr-14 pl-2.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      )}
    >
      <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
      <Tooltip open={helpOpen} onOpenChange={setHelpOpen}>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={`${option.label} erklären`}
            className="absolute right-8 inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setHelpOpen((current) => !current);
            }}
          >
            <CircleHelp className="size-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="left"
          sideOffset={8}
          className="z-[100] max-w-[280px] px-3 py-2 text-left text-xs leading-relaxed"
        >
          {option.description}
        </TooltipContent>
      </Tooltip>
      <span className="absolute right-2 flex size-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
    </SelectPrimitive.Item>
  );
}
