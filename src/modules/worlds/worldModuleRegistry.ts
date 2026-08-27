import type { WorldModuleConfigMap } from './types/world.types';

export type WorldModuleId = 'species-development';
export type SpeciesDevelopmentMode = 'explicit' | 'progressive' | 'disabled';

export interface WorldModuleSettingOption {
  value: string;
  label: string;
  description: string;
}

export interface WorldModuleSettingDefinition {
  key: string;
  label: string;
  defaultValue: string;
  options: readonly WorldModuleSettingOption[];
}

export interface WorldModuleDefinition {
  id: WorldModuleId;
  label: string;
  description: string;
  settings: readonly WorldModuleSettingDefinition[];
}

const SPECIES_DEVELOPMENT_MODE_OPTIONS: readonly WorldModuleSettingOption[] = [
  {
    value: 'explicit',
    label: 'Explizit',
    description: 'Core-Default: Nach der Charaktererschaffung gibt es permanente Speziesentwicklungen nur durch ausdrücklich benannte Quellen. Normales Level-up vergibt keine Speziespunkte.',
  },
  {
    value: 'progressive',
    label: 'Progressiv',
    description: 'Diese Welt erlaubt regulär erwerbbare Speziesentwicklungen. Welche Entwicklungen wann verfügbar werden, definiert eine konkrete Welt- oder Regelquelle.',
  },
  {
    value: 'disabled',
    label: 'Deaktiviert',
    description: 'Nach der Charaktererschaffung sind permanente Speziesentwicklungen in dieser Welt nicht verfügbar.',
  },
] as const;

export const WORLD_MODULE_REGISTRY: readonly WorldModuleDefinition[] = [
  {
    id: 'species-development',
    label: 'Speziesentwicklung',
    description: 'Steuert, ob und wie Figuren nach der Charaktererschaffung neue permanente körperliche oder strukturelle Speziesmerkmale erhalten können.',
    settings: [
      {
        key: 'mode',
        label: 'Verfügbarkeit',
        defaultValue: 'explicit',
        options: SPECIES_DEVELOPMENT_MODE_OPTIONS,
      },
    ],
  },
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getModuleDefinition(moduleId: WorldModuleId): WorldModuleDefinition {
  const definition = WORLD_MODULE_REGISTRY.find((entry) => entry.id === moduleId);
  if (!definition) throw new Error(`Unknown world module: ${moduleId}`);
  return definition;
}

function getSettingDefinition(moduleId: WorldModuleId, settingKey: string): WorldModuleSettingDefinition {
  const setting = getModuleDefinition(moduleId).settings.find((entry) => entry.key === settingKey);
  if (!setting) throw new Error(`Unknown setting ${settingKey} for world module ${moduleId}`);
  return setting;
}

export function getWorldModuleSettingValue(
  modules: WorldModuleConfigMap,
  moduleId: WorldModuleId,
  settingKey: string,
): string {
  const setting = getSettingDefinition(moduleId, settingKey);
  const rawValue = modules[moduleId]?.[settingKey];
  if (typeof rawValue !== 'string') return setting.defaultValue;
  return setting.options.some((option) => option.value === rawValue) ? rawValue : setting.defaultValue;
}

export function setWorldModuleSettingValue(
  modules: WorldModuleConfigMap,
  moduleId: WorldModuleId,
  settingKey: string,
  value: string,
): WorldModuleConfigMap {
  const setting = getSettingDefinition(moduleId, settingKey);
  const normalizedValue = setting.options.some((option) => option.value === value)
    ? value
    : setting.defaultValue;

  return {
    ...modules,
    [moduleId]: {
      ...(modules[moduleId] ?? {}),
      [settingKey]: normalizedValue,
    },
  };
}

export function normalizeWorldModuleConfigMap(value: unknown): WorldModuleConfigMap {
  if (!isRecord(value)) return {};

  const normalized: WorldModuleConfigMap = {};
  for (const [moduleId, rawConfig] of Object.entries(value)) {
    if (!isRecord(rawConfig)) continue;
    normalized[moduleId] = { ...rawConfig };
  }

  for (const definition of WORLD_MODULE_REGISTRY) {
    const existingConfig = normalized[definition.id];
    if (!existingConfig) continue;

    const canonicalConfig = { ...existingConfig };
    for (const setting of definition.settings) {
      const rawValue = existingConfig[setting.key];
      canonicalConfig[setting.key] =
        typeof rawValue === 'string' && setting.options.some((option) => option.value === rawValue)
          ? rawValue
          : setting.defaultValue;
    }
    normalized[definition.id] = canonicalConfig;
  }

  return normalized;
}

export function getSpeciesDevelopmentMode(modules: WorldModuleConfigMap): SpeciesDevelopmentMode {
  const mode = getWorldModuleSettingValue(modules, 'species-development', 'mode');
  if (mode === 'progressive' || mode === 'disabled') return mode;
  return 'explicit';
}

export function setSpeciesDevelopmentMode(
  modules: WorldModuleConfigMap,
  mode: SpeciesDevelopmentMode,
): WorldModuleConfigMap {
  return setWorldModuleSettingValue(modules, 'species-development', 'mode', mode);
}
