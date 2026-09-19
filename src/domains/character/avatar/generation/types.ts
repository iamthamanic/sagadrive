/**
 * Provider-agnostic 3D generation contracts — pure domain (no React / network).
 * Location: src/domains/character/avatar/generation/types.ts
 *
 * UI + services depend on these; provider adapters map to vendor APIs.
 * Capabilities are never inferred from provider success (#6 owns rig analysis).
 */

export const AVATAR_3D_GENERATION_CONTRACT_VERSION = 'SagaDriveAvatar3dGenerationV1' as const;

/** Wired avatar 3D generators — add Tripo etc. here when adapters ship. */
export const AVATAR_3D_GENERATION_PROVIDER_IDS = ['meshy'] as const;
export type Avatar3dGenerationProviderId = (typeof AVATAR_3D_GENERATION_PROVIDER_IDS)[number];

export function isAvatar3dGenerationProviderId(value: string): value is Avatar3dGenerationProviderId {
  return (AVATAR_3D_GENERATION_PROVIDER_IDS as readonly string[]).includes(value);
}

export type Avatar3dGenerationMode = 'text' | 'image';

/** SagaDrive-level quality knobs — providers translate these. */
export type GeometryQuality = 'low' | 'standard' | 'high' | 'maximum' | 'smart-topology';
export type TextureQuality = 'standard' | '2k' | '4k' | '8k';
export type PoseMode = 'a-pose' | 't-pose' | 'none';
export type TopologyMode = 'triangle' | 'quad';
export type OutputFormat = 'glb';

/**
 * Cross-provider settings bag. Unknown keys are stripped at the trust boundary.
 * Provider-specific extras live under `providerExtras` (validated per adapter).
 */
export interface Avatar3dGenerationSettings {
  readonly modelId: string;
  readonly geometryQuality: GeometryQuality;
  readonly textureQuality: TextureQuality;
  readonly pose: PoseMode;
  readonly topology: TopologyMode;
  readonly imageEnhancement: boolean;
  readonly pbr: boolean;
  readonly initialRemesh: boolean;
  readonly targetPolycount: number;
  readonly outputFormat: OutputFormat;
  /** When true, SagaDrive keeps a high-detail master before runtime optimize. */
  readonly keepMaster: boolean;
  /** After master: remesh/optimize toward this polycount for runtime LOD0. */
  readonly runtimePolycount: number;
  /** Optional provider-only knobs (already allowlisted by adapter). */
  readonly providerExtras?: Readonly<Record<string, string | number | boolean>>;
}

export type GenerationPresetId = 'fast' | 'recommended' | 'maximum';

export interface GenerationPresetDefinition {
  readonly id: GenerationPresetId;
  readonly labelDe: string;
  readonly descriptionDe: string;
  readonly version: number;
  readonly providerId: Avatar3dGenerationProviderId;
  readonly settings: Avatar3dGenerationSettings;
}

export type ProviderSettingControlType = 'select' | 'boolean' | 'number';

export interface ProviderSettingOption {
  readonly value: string;
  readonly labelDe: string;
}

export interface ProviderSettingField {
  readonly key: keyof Avatar3dGenerationSettings | `extras.${string}`;
  readonly labelDe: string;
  readonly type: ProviderSettingControlType;
  readonly values?: readonly ProviderSettingOption[];
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly hintDe?: string;
}

export interface ProviderModelDefinition {
  readonly id: string;
  readonly labelDe: string;
  readonly modes: readonly Avatar3dGenerationMode[];
}

export interface ProviderCapabilityDefinition {
  readonly providerId: Avatar3dGenerationProviderId;
  readonly displayName: string;
  readonly models: readonly ProviderModelDefinition[];
  readonly settings: readonly ProviderSettingField[];
  readonly presets: readonly GenerationPresetDefinition[];
  readonly supports: {
    readonly textTo3d: boolean;
    readonly imageTo3d: boolean;
    readonly remesh: boolean;
    readonly rigging: boolean;
  };
}

/** Snapshot persisted on each job — frozen at generation time. */
export interface Avatar3dGenerationRecord {
  readonly contractVersion: typeof AVATAR_3D_GENERATION_CONTRACT_VERSION;
  readonly providerId: Avatar3dGenerationProviderId;
  readonly providerModel: string;
  readonly presetId: GenerationPresetId | 'custom';
  readonly presetVersion: number;
  readonly presetDirty: boolean;
  readonly settings: Avatar3dGenerationSettings;
  readonly generatedAt: string;
  readonly providerTaskId?: string;
  readonly sourceMode: Avatar3dGenerationMode;
}

export interface GenerationError {
  readonly provider: string;
  readonly code:
    | 'not_configured'
    | 'rate_limited'
    | 'credits'
    | 'validation'
    | 'provider_unavailable'
    | 'provider_failed'
    | 'unsupported_provider'
    | 'unknown';
  readonly message: string;
  readonly retryable: boolean;
  readonly originalProviderError?: string;
}
