/**
 * AvatarGenerationAdvancedSettings — provider capability-driven advanced knobs.
 * Location: src/app/character/avatar/AvatarGenerationAdvancedSettings.tsx
 *
 * Renders only fields declared by the selected provider; no Meshy hardcoding in JSX keys.
 */

import type {
  Avatar3dGenerationSettings,
  ProviderCapabilityDefinition,
  ProviderSettingField,
} from '../../../domains/character/avatar/generation';
import { Label } from '../../../shared/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../shared/ui/select';

interface AvatarGenerationAdvancedSettingsProps {
  capability: ProviderCapabilityDefinition;
  settings: Avatar3dGenerationSettings;
  disabled?: boolean;
  onChange: (next: Avatar3dGenerationSettings) => void;
}

function patchSetting(
  settings: Avatar3dGenerationSettings,
  field: ProviderSettingField,
  raw: string | boolean | number,
): Avatar3dGenerationSettings {
  const key = field.key;
  if (typeof key === 'string' && key.startsWith('extras.')) {
    const extraKey = key.slice('extras.'.length);
    return {
      ...settings,
      providerExtras: { ...(settings.providerExtras ?? {}), [extraKey]: raw as string | number | boolean },
    };
  }
  return { ...settings, [key]: raw } as Avatar3dGenerationSettings;
}

function readFieldValue(
  settings: Avatar3dGenerationSettings,
  field: ProviderSettingField,
): string | boolean | number {
  const key = field.key;
  if (typeof key === 'string' && key.startsWith('extras.')) {
    const extraKey = key.slice('extras.'.length);
    return settings.providerExtras?.[extraKey] ?? '';
  }
  return settings[key as keyof Avatar3dGenerationSettings] as string | boolean | number;
}

export function AvatarGenerationAdvancedSettings({
  capability,
  settings,
  disabled,
  onChange,
}: AvatarGenerationAdvancedSettingsProps) {
  return (
    <div className="space-y-2 border-t border-border pt-2" data-avatar-gen-advanced>
      <p className="text-[11px] font-medium text-muted-foreground">Erweiterte Einstellungen</p>
      <div className="grid gap-2">
        {capability.settings.map((field) => {
          const value = readFieldValue(settings, field);
          const id = `avatar-gen-${capability.providerId}-${String(field.key)}`;
          if (field.type === 'boolean') {
            return (
              <label
                key={String(field.key)}
                htmlFor={id}
                className="flex cursor-pointer items-start gap-2 text-xs"
              >
                <input
                  id={id}
                  type="checkbox"
                  className="mt-0.5"
                  checked={value === true}
                  disabled={disabled}
                  data-avatar-gen-setting={String(field.key)}
                  onChange={(event) => onChange(patchSetting(settings, field, event.target.checked))}
                />
                <span>
                  <span className="font-medium">{field.labelDe}</span>
                  {field.hintDe ? (
                    <span className="mt-0.5 block text-muted-foreground">{field.hintDe}</span>
                  ) : null}
                </span>
              </label>
            );
          }
          if (field.type === 'number') {
            return (
              <div key={String(field.key)} className="space-y-1">
                <Label htmlFor={id} className="text-xs">
                  {field.labelDe}
                </Label>
                <input
                  id={id}
                  type="number"
                  className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                  value={typeof value === 'number' ? value : Number(value) || 0}
                  min={field.min}
                  max={field.max}
                  step={field.step ?? 1}
                  disabled={disabled}
                  data-avatar-gen-setting={String(field.key)}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    if (!Number.isFinite(next)) return;
                    onChange(patchSetting(settings, field, next));
                  }}
                />
                {field.hintDe ? (
                  <p className="text-[11px] text-muted-foreground">{field.hintDe}</p>
                ) : null}
              </div>
            );
          }
          return (
            <div key={String(field.key)} className="space-y-1">
              <Label htmlFor={id} className="text-xs">
                {field.labelDe}
              </Label>
              <Select
                value={String(value)}
                disabled={disabled}
                onValueChange={(next) => onChange(patchSetting(settings, field, next))}
              >
                <SelectTrigger
                  id={id}
                  size="sm"
                  className="w-full"
                  data-avatar-gen-setting={String(field.key)}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(field.values ?? []).map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.labelDe}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {field.hintDe ? (
                <p className="text-[11px] text-muted-foreground">{field.hintDe}</p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
