/**
 * ItemTaxonomySection — setting+tech → context/capability/role (#139).
 * Item-Art + Name/Beschreibung sitzen unter Visuals (linke Spalte).
 * Location: src/app/items/workbench/ItemTaxonomySection.tsx
 */
import { Button } from '../../../shared/ui/button';
import { Label } from '../../../shared/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../shared/ui/select';
import {
  ITEM_CAPABILITIES,
  ITEM_CONTEXTS,
  ITEM_ROLES,
  ITEM_SETTING_TAGS,
  ITEM_TECH_LEVELS,
  type ItemCapability,
  type ItemContext,
  type ItemRole,
  type ItemSettingTag,
  type ItemTechLevel,
} from '../../../domains/items';
import { ITEM_CONTEXT_LABELS, ITEM_SETTING_LABELS } from '../../library';
import type { WorkbenchFormState } from './workbenchForm';
import {
  ITEM_CAPABILITY_LABELS,
  ITEM_ROLE_LABELS,
  ITEM_TECH_LEVEL_LABELS,
} from './workbenchLabels';

export interface ItemTaxonomySectionProps {
  form: WorkbenchFormState;
  readOnly: boolean;
  onChange: (next: WorkbenchFormState) => void;
}

function toggleValue<T extends string>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value];
}

export function ItemTaxonomySection({ form, readOnly, onChange }: ItemTaxonomySectionProps) {
  return (
    <section className="space-y-4" data-item-workbench-taxonomy aria-labelledby="wb-taxonomy">
      <h2 id="wb-taxonomy" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Einordnung
      </h2>

      <div
        className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(10rem,14rem)] sm:items-start"
        data-item-workbench-setting-tech
      >
        <TagGroup
          label="Setting"
          options={ITEM_SETTING_TAGS}
          labels={ITEM_SETTING_LABELS}
          selected={form.settingTags}
          readOnly={readOnly}
          onToggle={(value) =>
            onChange({
              ...form,
              settingTags: toggleValue(form.settingTags, value as ItemSettingTag),
            })
          }
        />

        <div className="space-y-2">
          <Label htmlFor="wb-tech">Tech-Level</Label>
          <Select
            value={form.techLevel || '__none__'}
            disabled={readOnly}
            onValueChange={(value) =>
              onChange({
                ...form,
                techLevel: value === '__none__' ? '' : (value as ItemTechLevel),
              })
            }
          >
            <SelectTrigger id="wb-tech" className="h-11 min-h-11 w-full">
              <SelectValue placeholder="Optional" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Kein Tech-Level</SelectItem>
              {ITEM_TECH_LEVELS.map((level) => (
                <SelectItem key={level} value={level}>
                  {ITEM_TECH_LEVEL_LABELS[level]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <TagGroup
        label="Kontexte"
        options={ITEM_CONTEXTS}
        labels={ITEM_CONTEXT_LABELS}
        selected={form.contexts}
        readOnly={readOnly}
        onToggle={(value) =>
          onChange({ ...form, contexts: toggleValue(form.contexts, value as ItemContext) })
        }
      />

      <TagGroup
        label="Fähigkeiten"
        options={ITEM_CAPABILITIES}
        labels={ITEM_CAPABILITY_LABELS}
        selected={form.capabilities}
        readOnly={readOnly}
        onToggle={(value) =>
          onChange({
            ...form,
            capabilities: toggleValue(form.capabilities, value as ItemCapability),
          })
        }
      />

      <TagGroup
        label="Rollen"
        options={ITEM_ROLES}
        labels={ITEM_ROLE_LABELS}
        selected={form.roles}
        readOnly={readOnly}
        onToggle={(value) =>
          onChange({ ...form, roles: toggleValue(form.roles, value as ItemRole) })
        }
      />
    </section>
  );
}

function TagGroup<T extends string>({
  label,
  options,
  labels,
  selected,
  readOnly,
  onToggle,
}: {
  label: string;
  options: readonly T[];
  labels: Record<T, string>;
  selected: readonly T[];
  readOnly: boolean;
  onToggle: (value: T) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <Button
              key={option}
              type="button"
              variant={active ? 'default' : 'outline'}
              size="sm"
              className="h-11 min-h-11"
              disabled={readOnly}
              aria-pressed={active}
              onClick={() => onToggle(option)}
            >
              {labels[option]}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
