/**
 * SkillSelectField — Fertigkeits-Dropdown mit RuleHelp und erklärenden Optionen im Menü.
 * Location: src/modules/characters/components/SkillSelectField.tsx
 */
import * as SelectPrimitive from '@radix-ui/react-select@2.1.6';
import { CheckIcon } from 'lucide-react@0.487.0';
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { cn } from '../../../components/ui/utils';
import {
  getSagaDriveAttribute,
  getSagaDriveSkill,
  isSagaDriveSkillKey,
  type SagaDriveSkillKey,
} from '../../../modules/rulesets/characterCreation';
import { RuleHelp } from '../shared/RuleHelp';
import { SkillIcon } from './SkillIcon';
import { SkillRuleHelpContent } from './skillRuleHelp';

interface SkillSelectFieldProps {
  value: string;
  onValueChange: (value: string) => void;
  skillOptions: readonly SagaDriveSkillKey[];
  disabledSkillKeys?: readonly SagaDriveSkillKey[];
  placeholder: string;
  ariaLabel: string;
  disabled?: boolean;
}

function SkillSelectOption({
  skillKey,
  disabled,
}: {
  skillKey: SagaDriveSkillKey;
  disabled?: boolean;
}) {
  const skill = getSagaDriveSkill(skillKey);
  const attribute = getSagaDriveAttribute(skill.attribute);

  return (
    <SelectPrimitive.Item
      value={skillKey}
      disabled={disabled}
      className={cn(
        'focus:bg-accent/10 focus:text-foreground data-[state=checked]:bg-accent/10 data-[state=checked]:text-foreground relative flex w-full cursor-default flex-col items-start gap-0.5 rounded-md py-2 pr-8 pl-2.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      )}
    >
      <span className="absolute right-2 top-2 flex size-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText asChild>
        <span className="flex items-center gap-2 font-medium">
          <SkillIcon skillKey={skillKey} className="h-4 w-4 shrink-0" />
          <span>{skill.label}</span>
        </span>
      </SelectPrimitive.ItemText>
      <span className="line-clamp-2 pr-2 text-[11px] leading-snug text-muted-foreground">
        {attribute.shortLabel} · {skill.summary}
      </span>
    </SelectPrimitive.Item>
  );
}

export function SkillSelectField({
  value,
  onValueChange,
  skillOptions,
  disabledSkillKeys = [],
  placeholder,
  ariaLabel,
  disabled = false,
}: SkillSelectFieldProps) {
  const selectedSkillKey = isSagaDriveSkillKey(value) ? value : undefined;
  const disabledSet = new Set(disabledSkillKeys);
  const selectedSkill = selectedSkillKey ? getSagaDriveSkill(selectedSkillKey) : undefined;

  return (
    <div className="flex w-full items-center gap-1">
      <Select value={value || undefined} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger aria-label={ariaLabel} className="min-w-0 flex-1">
          {selectedSkill ? (
            <span className="flex min-w-0 items-center gap-2">
              <SkillIcon skillKey={selectedSkillKey} className="h-4 w-4 shrink-0" />
              <span className="truncate">{selectedSkill.label}</span>
            </span>
          ) : (
            <SelectValue placeholder={placeholder} />
          )}
        </SelectTrigger>
        <SelectContent className="max-w-[min(100vw-2rem,24rem)]">
          {skillOptions.map((skillKey) => (
            <SkillSelectOption key={skillKey} skillKey={skillKey} disabled={disabledSet.has(skillKey)} />
          ))}
        </SelectContent>
      </Select>
      {selectedSkillKey ? (
        <RuleHelp label={getSagaDriveSkill(selectedSkillKey).label}>
          <SkillRuleHelpContent skillKey={selectedSkillKey} />
        </RuleHelp>
      ) : (
        <RuleHelp label="Fertigkeit">
          Wähle eine Fertigkeit. Checks nutzen typischerweise d20 + Standardattribut + Fertigkeitswert + Erfahrungsbonus.
        </RuleHelp>
      )}
    </div>
  );
}
