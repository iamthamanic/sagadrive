/**
 * Generation settings resolve / validate / dirty-detect — pure domain.
 * Location: src/domains/character/avatar/generation/resolve-settings.ts
 */

import { MESHY_CAPABILITY, MESHY_PRESET_RECOMMENDED } from './meshy-adapter';
import type {
  Avatar3dGenerationProviderId,
  Avatar3dGenerationRecord,
  Avatar3dGenerationSettings,
  GenerationError,
  GenerationPresetId,
  ProviderCapabilityDefinition,
  GeometryQuality,
  TextureQuality,
  PoseMode,
  TopologyMode,
} from './types';
import { AVATAR_3D_GENERATION_CONTRACT_VERSION, isAvatar3dGenerationProviderId } from './types';

const PROVIDERS: Record<Avatar3dGenerationProviderId, ProviderCapabilityDefinition> = {
  meshy: MESHY_CAPABILITY,
};

export function listAvatar3dGenerationProviders(): readonly ProviderCapabilityDefinition[] {
  return Object.values(PROVIDERS);
}

export function getProviderCapability(
  providerId: string,
): ProviderCapabilityDefinition | null {
  if (!isAvatar3dGenerationProviderId(providerId)) return null;
  return PROVIDERS[providerId] ?? null;
}

export function getPreset(
  providerId: string,
  presetId: string,
): import('./types').GenerationPresetDefinition | null {
  const cap = getProviderCapability(providerId);
  if (!cap) return null;
  return cap.presets.find((p) => p.id === presetId) ?? null;
}

export function defaultPresetForProvider(providerId: string) {
  return getPreset(providerId, 'recommended') ?? MESHY_PRESET_RECOMMENDED;
}

const GEOMETRY: ReadonlySet<string> = new Set([
  'low',
  'standard',
  'high',
  'maximum',
  'smart-topology',
]);
const TEXTURE: ReadonlySet<string> = new Set(['standard', '2k', '4k', '8k']);
const POSE: ReadonlySet<string> = new Set(['a-pose', 't-pose', 'none']);
const TOPOLOGY: ReadonlySet<string> = new Set(['triangle', 'quad']);
/** Allowed Meshy model ids at the client trust boundary (must match edge allowlist). */
const MESHY_MODEL_IDS: ReadonlySet<string> = new Set([
  'latest',
  'meshy-5',
  'meshy-6',
  'meshy-7',
  'meshy-t1',
  'meshy-t2',
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Fail-closed validation of client-supplied settings against known enums + ranges.
 */
export function validateGenerationSettings(
  raw: unknown,
): { ok: true; settings: Avatar3dGenerationSettings } | { ok: false; error: GenerationError } {
  if (!isPlainObject(raw)) {
    return {
      ok: false,
      error: {
        provider: 'sagadrive',
        code: 'validation',
        message: 'Generation-Einstellungen ungültig.',
        retryable: false,
      },
    };
  }

  const modelId = typeof raw.modelId === 'string' ? raw.modelId.trim() : '';
  if (!modelId || !MESHY_MODEL_IDS.has(modelId)) {
    return {
      ok: false,
      error: {
        provider: 'sagadrive',
        code: 'validation',
        message: 'Modell ungültig oder nicht erlaubt.',
        retryable: false,
      },
    };
  }

  if (!GEOMETRY.has(String(raw.geometryQuality))) {
    return {
      ok: false,
      error: {
        provider: 'sagadrive',
        code: 'validation',
        message: 'Geometrie-Qualität ungültig.',
        retryable: false,
      },
    };
  }
  if (!TEXTURE.has(String(raw.textureQuality))) {
    return {
      ok: false,
      error: {
        provider: 'sagadrive',
        code: 'validation',
        message: 'Texture-Qualität ungültig.',
        retryable: false,
      },
    };
  }
  if (!POSE.has(String(raw.pose))) {
    return {
      ok: false,
      error: {
        provider: 'sagadrive',
        code: 'validation',
        message: 'Pose ungültig.',
        retryable: false,
      },
    };
  }
  if (!TOPOLOGY.has(String(raw.topology))) {
    return {
      ok: false,
      error: {
        provider: 'sagadrive',
        code: 'validation',
        message: 'Topology ungültig.',
        retryable: false,
      },
    };
  }

  const targetPolycount = Number(raw.targetPolycount);
  const runtimePolycount = Number(raw.runtimePolycount);
  if (!Number.isFinite(targetPolycount) || targetPolycount < 100 || targetPolycount > 300_000) {
    return {
      ok: false,
      error: {
        provider: 'sagadrive',
        code: 'validation',
        message: 'Polycount ungültig.',
        retryable: false,
      },
    };
  }
  if (!Number.isFinite(runtimePolycount) || runtimePolycount < 1000 || runtimePolycount > 300_000) {
    return {
      ok: false,
      error: {
        provider: 'sagadrive',
        code: 'validation',
        message: 'Runtime-Polycount ungültig.',
        retryable: false,
      },
    };
  }

  if (raw.outputFormat !== 'glb') {
    return {
      ok: false,
      error: {
        provider: 'sagadrive',
        code: 'validation',
        message: 'Output-Format muss GLB sein.',
        retryable: false,
      },
    };
  }

  let providerExtras: Record<string, string | number | boolean> | undefined;
  if (raw.providerExtras !== undefined) {
    if (!isPlainObject(raw.providerExtras)) {
      return {
        ok: false,
        error: {
          provider: 'sagadrive',
          code: 'validation',
          message: 'Provider-Extras ungültig.',
          retryable: false,
        },
      };
    }
    providerExtras = {};
    for (const [key, value] of Object.entries(raw.providerExtras)) {
      if (!/^[a-z][a-z0-9_]{0,40}$/i.test(key)) continue;
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        providerExtras[key] = value;
      }
    }
    if (Object.keys(providerExtras).length === 0) providerExtras = undefined;
  }

  const settings: Avatar3dGenerationSettings = {
    modelId,
    geometryQuality: raw.geometryQuality as GeometryQuality,
    textureQuality: raw.textureQuality as TextureQuality,
    pose: raw.pose as PoseMode,
    topology: raw.topology as TopologyMode,
    imageEnhancement: raw.imageEnhancement === true,
    pbr: raw.pbr === true,
    initialRemesh: raw.initialRemesh === true,
    targetPolycount: Math.round(targetPolycount),
    outputFormat: 'glb',
    keepMaster: raw.keepMaster === true,
    runtimePolycount: Math.round(runtimePolycount),
    ...(providerExtras ? { providerExtras } : {}),
  };

  return { ok: true, settings };
}

export function settingsEqual(
  a: Avatar3dGenerationSettings,
  b: Avatar3dGenerationSettings,
): boolean {
  return JSON.stringify(normalizeForCompare(a)) === JSON.stringify(normalizeForCompare(b));
}

function normalizeForCompare(s: Avatar3dGenerationSettings): unknown {
  return {
    modelId: s.modelId,
    geometryQuality: s.geometryQuality,
    textureQuality: s.textureQuality,
    pose: s.pose,
    topology: s.topology,
    imageEnhancement: s.imageEnhancement,
    pbr: s.pbr,
    initialRemesh: s.initialRemesh,
    targetPolycount: s.targetPolycount,
    outputFormat: s.outputFormat,
    keepMaster: s.keepMaster,
    runtimePolycount: s.runtimePolycount,
    providerExtras: s.providerExtras ?? {},
  };
}

export function isPresetDirty(
  presetId: GenerationPresetId,
  providerId: string,
  settings: Avatar3dGenerationSettings,
): boolean {
  const preset = getPreset(providerId, presetId);
  if (!preset) return true;
  return !settingsEqual(preset.settings, settings);
}

export function presetLabelDe(
  presetId: GenerationPresetId | 'custom',
  dirty: boolean,
  providerId: string,
): string {
  if (presetId === 'custom') return 'Angepasst';
  const preset = getPreset(providerId, presetId);
  const base = preset?.labelDe ?? presetId;
  return dirty ? `${base} – angepasst` : base;
}

export function buildGenerationRecord(input: {
  providerId: Avatar3dGenerationProviderId;
  presetId: GenerationPresetId | 'custom';
  presetVersion: number;
  presetDirty: boolean;
  settings: Avatar3dGenerationSettings;
  sourceMode: 'text' | 'image';
  providerTaskId?: string;
  generatedAt?: string;
}): Avatar3dGenerationRecord {
  return {
    contractVersion: AVATAR_3D_GENERATION_CONTRACT_VERSION,
    providerId: input.providerId,
    providerModel: input.settings.modelId,
    presetId: input.presetId,
    presetVersion: input.presetVersion,
    presetDirty: input.presetDirty,
    settings: input.settings,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    providerTaskId: input.providerTaskId,
    sourceMode: input.sourceMode,
  };
}

export function mapProviderFailureToGenerationError(input: {
  provider: string;
  raw: unknown;
}): GenerationError {
  const message = input.raw instanceof Error ? input.raw.message : String(input.raw ?? 'unknown');
  if (message.includes('MESHY_CREDITS') || message.includes('402')) {
    return {
      provider: input.provider,
      code: 'credits',
      message: 'Nicht genug Provider-Credits.',
      retryable: false,
      originalProviderError: message,
    };
  }
  if (message.includes('MESHY_RATE') || message.includes('429')) {
    return {
      provider: input.provider,
      code: 'rate_limited',
      message: 'Provider-Rate-Limit — bitte kurz warten.',
      retryable: true,
      originalProviderError: message,
    };
  }
  if (message.includes('not configured') || message.includes('nicht konfiguriert')) {
    return {
      provider: input.provider,
      code: 'not_configured',
      message: 'Provider nicht konfiguriert.',
      retryable: false,
      originalProviderError: message,
    };
  }
  return {
    provider: input.provider,
    code: 'provider_unavailable',
    message: 'Provider nicht erreichbar.',
    retryable: true,
    originalProviderError: message.slice(0, 200),
  };
}
