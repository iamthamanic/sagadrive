/**
 * Meshy capability schema + SagaDrive ↔ Meshy mapping.
 * Location: src/domains/character/avatar/generation/meshy-adapter.ts
 *
 * All Meshy-specific parameter names stay inside this file.
 * GeometryQuality has no Meshy "geometry_resolution" — maps to model_type / ultra_mode.
 */

import type {
  Avatar3dGenerationSettings,
  GenerationPresetDefinition,
  ProviderCapabilityDefinition,
  GeometryQuality,
  TextureQuality,
  PoseMode,
} from './types';

export const MESHY_PROVIDER_ID = 'meshy' as const;

/** Vendor payload for Image-to-3D create — only used by edge Meshy adapter. */
export interface MeshyImageTo3dMappedParams {
  readonly ai_model: string;
  readonly model_type: 'standard' | 'smart-topology';
  readonly texture_resolution: '2k' | '4k' | '8k';
  readonly pose_mode: 'a-pose' | 't-pose' | '';
  readonly enable_pbr: boolean;
  readonly image_enhancement: boolean;
  readonly should_texture: boolean;
  readonly should_remesh: boolean;
  readonly topology: 'triangle' | 'quad';
  readonly target_polycount?: number;
  readonly ultra_mode: boolean;
  readonly save_pre_remeshed_model: boolean;
  readonly target_formats: readonly ['glb'];
}

function textureFromQuality(q: TextureQuality): '2k' | '4k' | '8k' {
  if (q === '8k') return '8k';
  if (q === '4k' || q === 'standard') return q === 'standard' ? '2k' : '4k';
  return '2k';
}

function poseToMeshy(pose: PoseMode): 'a-pose' | 't-pose' | '' {
  if (pose === 'a-pose') return 'a-pose';
  if (pose === 't-pose') return 't-pose';
  return '';
}

function geometryToModelType(q: GeometryQuality): {
  model_type: 'standard' | 'smart-topology';
  ai_model: string;
  ultra_mode: boolean;
} {
  if (q === 'smart-topology') {
    return { model_type: 'smart-topology', ai_model: 'meshy-t2', ultra_mode: false };
  }
  return {
    model_type: 'standard',
    ai_model: 'latest',
    ultra_mode: q === 'maximum',
  };
}

export function mapSettingsToMeshyImageTo3d(
  settings: Avatar3dGenerationSettings,
): MeshyImageTo3dMappedParams {
  const geo = geometryToModelType(settings.geometryQuality);
  const modelFromSettings = settings.modelId.trim() || geo.ai_model;
  const ai_model =
    settings.geometryQuality === 'smart-topology'
      ? 'meshy-t2'
      : modelFromSettings === 'latest' || modelFromSettings.startsWith('meshy-')
        ? modelFromSettings
        : geo.ai_model;

  const mapped: MeshyImageTo3dMappedParams = {
    ai_model,
    model_type: geo.model_type,
    texture_resolution: textureFromQuality(settings.textureQuality),
    pose_mode: poseToMeshy(settings.pose),
    enable_pbr: settings.pbr,
    image_enhancement: settings.imageEnhancement,
    should_texture: true,
    should_remesh: settings.initialRemesh && geo.model_type === 'standard',
    topology: settings.topology,
    // Ultra only from geometryQuality — ignore providerExtras.ultra_mode alone (billing).
    ultra_mode: geo.ultra_mode && geo.model_type === 'standard',
    save_pre_remeshed_model: settings.keepMaster && settings.initialRemesh,
    target_formats: ['glb'],
  };

  if (mapped.should_remesh || geo.model_type === 'smart-topology') {
    const max =
      geo.model_type === 'smart-topology' ? 15_000 : 300_000;
    const min = 100;
    const poly = Math.round(settings.targetPolycount);
    return {
      ...mapped,
      target_polycount: Math.max(min, Math.min(max, Number.isFinite(poly) ? poly : 50_000)),
    };
  }
  return mapped;
}

const MESHY_BASE_SETTINGS = {
  outputFormat: 'glb' as const,
  topology: 'triangle' as const,
};

export const MESHY_PRESET_FAST: GenerationPresetDefinition = {
  id: 'fast',
  labelDe: 'Schnell',
  descriptionDe: 'Vorschau & Iteration — günstiger, schnellere Feedback-Schleife.',
  version: 1,
  providerId: 'meshy',
  settings: {
    ...MESHY_BASE_SETTINGS,
    modelId: 'latest',
    geometryQuality: 'standard',
    textureQuality: '2k',
    pose: 'a-pose',
    imageEnhancement: false,
    pbr: true,
    initialRemesh: true,
    targetPolycount: 40_000,
    keepMaster: false,
    runtimePolycount: 40_000,
  },
};

export const MESHY_PRESET_RECOMMENDED: GenerationPresetDefinition = {
  id: 'recommended',
  labelDe: 'Empfohlen',
  descriptionDe: 'Beste Balance für SagaDrive-Hauptcharaktere: High-Detail-Master, danach Runtime-Optimize.',
  version: 1,
  providerId: 'meshy',
  settings: {
    ...MESHY_BASE_SETTINGS,
    modelId: 'latest',
    geometryQuality: 'high',
    textureQuality: '4k',
    pose: 'a-pose',
    imageEnhancement: false,
    pbr: true,
    initialRemesh: false,
    targetPolycount: 50_000,
    keepMaster: true,
    runtimePolycount: 50_000,
  },
};

export const MESHY_PRESET_MAXIMUM: GenerationPresetDefinition = {
  id: 'maximum',
  labelDe: 'Maximale Qualität',
  descriptionDe: 'Beste aktuell verfügbare Meshy-Qualität (kann sich mit neuen Modellen ändern).',
  version: 1,
  providerId: 'meshy',
  settings: {
    ...MESHY_BASE_SETTINGS,
    modelId: 'latest',
    geometryQuality: 'maximum',
    textureQuality: '4k',
    pose: 'a-pose',
    imageEnhancement: false,
    pbr: true,
    initialRemesh: false,
    targetPolycount: 50_000,
    keepMaster: true,
    runtimePolycount: 50_000,
    providerExtras: { ultra_mode: true },
  },
};

export const MESHY_CAPABILITY: ProviderCapabilityDefinition = {
  providerId: 'meshy',
  displayName: 'Meshy',
  models: [
    { id: 'latest', labelDe: 'Latest (aktuell bestes Image-to-3D)', modes: ['text', 'image'] },
    { id: 'meshy-7', labelDe: 'Meshy 7', modes: ['image'] },
    { id: 'meshy-6', labelDe: 'Meshy 6', modes: ['image'] },
    { id: 'meshy-t2', labelDe: 'Smart Topology (meshy-t2)', modes: ['image'] },
  ],
  settings: [
    {
      key: 'modelId',
      labelDe: 'Modell',
      type: 'select',
      values: [
        { value: 'latest', labelDe: 'Latest' },
        { value: 'meshy-7', labelDe: 'Meshy 7' },
        { value: 'meshy-6', labelDe: 'Meshy 6' },
        { value: 'meshy-t2', labelDe: 'Smart Topology (t2)' },
      ],
    },
    {
      key: 'geometryQuality',
      labelDe: 'Geometrie / Model Type',
      type: 'select',
      hintDe: 'Meshy hat keine „Geometry 4K“-API — High/Maximum = Standard High Detail; Smart Topology separat.',
      values: [
        { value: 'standard', labelDe: 'Standard' },
        { value: 'high', labelDe: 'High Detail' },
        { value: 'maximum', labelDe: 'Maximum (Ultra)' },
        { value: 'smart-topology', labelDe: 'Smart Topology' },
      ],
    },
    {
      key: 'textureQuality',
      labelDe: 'Texture Resolution',
      type: 'select',
      values: [
        { value: '2k', labelDe: '2K' },
        { value: '4k', labelDe: '4K' },
        { value: '8k', labelDe: '8K' },
      ],
    },
    {
      key: 'pose',
      labelDe: 'Pose',
      type: 'select',
      values: [
        { value: 'a-pose', labelDe: 'A-Pose' },
        { value: 't-pose', labelDe: 'T-Pose' },
        { value: 'none', labelDe: 'Keine' },
      ],
    },
    {
      key: 'imageEnhancement',
      labelDe: 'Image Enhancement',
      type: 'boolean',
      hintDe: 'Bei sauberem SagaDrive-Referenzbild auslassen.',
    },
    {
      key: 'pbr',
      labelDe: 'PBR',
      type: 'boolean',
    },
    {
      key: 'topology',
      labelDe: 'Topology',
      type: 'select',
      values: [
        { value: 'triangle', labelDe: 'Triangle' },
        { value: 'quad', labelDe: 'Quad' },
      ],
    },
    {
      key: 'initialRemesh',
      labelDe: 'Initial Remesh (Provider)',
      type: 'boolean',
      hintDe: 'Für Hauptcharaktere aus — SagaDrive remesht danach für Runtime.',
    },
    {
      key: 'targetPolycount',
      labelDe: 'Polycount (bei Remesh / Smart Topology)',
      type: 'number',
      min: 100,
      max: 300_000,
      step: 1000,
    },
    {
      key: 'keepMaster',
      labelDe: 'High-Detail-Master behalten',
      type: 'boolean',
    },
    {
      key: 'runtimePolycount',
      labelDe: 'Runtime LOD0 Polycount',
      type: 'number',
      min: 10_000,
      max: 100_000,
      step: 1000,
      hintDe: 'SagaDrive-Pipeline nach dem Master (ca. 40–60k empfohlen).',
    },
    {
      key: 'outputFormat',
      labelDe: 'Output Format',
      type: 'select',
      values: [{ value: 'glb', labelDe: 'GLB' }],
    },
  ],
  presets: [MESHY_PRESET_FAST, MESHY_PRESET_RECOMMENDED, MESHY_PRESET_MAXIMUM],
  supports: {
    textTo3d: true,
    imageTo3d: true,
    remesh: true,
    rigging: true,
  },
};

export function summarizeSettingsDe(settings: Avatar3dGenerationSettings): string[] {
  const geoLabel =
    settings.geometryQuality === 'smart-topology'
      ? 'Smart Topology'
      : settings.geometryQuality === 'maximum'
        ? 'Maximum / Ultra'
        : settings.geometryQuality === 'high'
          ? 'High Detail'
          : 'Standard';
  return [
    `Modell: ${settings.modelId}`,
    `Geometrie: ${geoLabel}`,
    `Texture: ${settings.textureQuality.toUpperCase()}`,
    `Pose: ${settings.pose === 'none' ? '—' : settings.pose}`,
    `PBR: ${settings.pbr ? 'an' : 'aus'}`,
    settings.keepMaster ? 'Master behalten → Runtime-Optimize' : 'Direkt Runtime',
  ];
}
