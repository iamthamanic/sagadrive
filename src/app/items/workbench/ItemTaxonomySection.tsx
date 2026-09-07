/**
 * ItemTaxonomySection — kind/setting/tech/context/capability/role (#139).
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
  ITEM_KIND_KEYS,
  ITEM_ROLES,
  ITEM_SETTING_TAGS,
  ITEM_TECH_LEVELS,
  type ItemCapability,
  type ItemContext,
  type ItemKindKey,
  type ItemRole,
  type ItemSettingTag,
  type ItemTechLevel,
} from '../../../domains/items';
import { ITEM_CONTEXT_LABELS, ITEM_SETTING_LABELS } from '../../library/items/itemLibraryLabels';
import type { WorkbenchFormState } from './workbenchForm';
import {
  ITEM_CAPABILITY_LABELS,
  ITEM_KIND_LABELS,
  ITEM_ROLE_LABELS,
  ITEM_TECH_LEVEL_LABELS,
} from './workbenchLabels';

export interface ItemTaxonomySectionProps {
  form: WorkbenchFormState;
  readOnly: boolean;
  onChange: (next: WorkbenchFormState) => void;
  onRequestTypePicker: () => void;
}

function toggleValue<T extends string>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value];
}

export function ItemTaxonomySection({
  form,
  readOnly,
  onChange,
  onRequestTypePicker,
}: ItemTaxonomySectionProps) {
  return (
    <section className="space-y-4" data-item-workbench-taxonomy aria-labelledby="wb-taxonomy">
      <h2 id="wb-taxonomy" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Einordnung
      </h2>

      <div className="space-y-2">
        <Label>Item-Art</Label>
        <div className="flex flex-wrap gap-2">
          <Select
            value={form.kindKey}
            disabled={readOnly}
            onValueChange={(value) => {
              if ((ITEM_KIND_KEYS as readonly string[]).includes(value)) {
                onChange({ ...form, kindKey: value as ItemKindKey });
              }
            }}
          >
            <SelectTrigger className="h-11 min-h-11 min-w-[12rem]" data-item-workbench-kind>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ITEM_KIND_KEYS.map((key) => (
                <SelectItem key={key} value={key}>
                  {ITEM_KIND_LABELS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!readOnly && (
            <Button
              type="button"
              variant="outline"
              className="h-11 min-h-11"
              onClick={onRequestTypePicker}
            >
              Typ-Vorlage…
            </Button>
          )}
        </div>
      </div>

      <TagGroup
        label="Setting"
        options={ITEM_SETTING_TAGS}
        labels={ITEM_SETTING_LABELS}
        selected={form.settingTags}
        readOnly={readOnly}
        onToggle={(value) =>
          onChange({ ...form, settingTags: toggleValue(form.settingTags, value as ItemSettingTag) })
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
          <SelectTrigger id="wb-tech" className="h-11 min-h-11">
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
