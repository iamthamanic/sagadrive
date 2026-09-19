/**
 * Avatar 3D generation domain barrel.
 * Location: src/domains/character/avatar/generation/index.ts
 */

export {
  AVATAR_3D_GENERATION_CONTRACT_VERSION,
  AVATAR_3D_GENERATION_PROVIDER_IDS,
  isAvatar3dGenerationProviderId,
  type Avatar3dGenerationMode,
  type Avatar3dGenerationProviderId,
  type Avatar3dGenerationRecord,
  type Avatar3dGenerationSettings,
  type GenerationError,
  type GenerationPresetDefinition,
  type GenerationPresetId,
  type GeometryQuality,
  type OutputFormat,
  type PoseMode,
  type ProviderCapabilityDefinition,
  type ProviderModelDefinition,
  type ProviderSettingField,
  type ProviderSettingOption,
  type TextureQuality,
  type TopologyMode,
} from './types';

export {
  MESHY_CAPABILITY,
  MESHY_PRESET_FAST,
  MESHY_PRESET_MAXIMUM,
  MESHY_PRESET_RECOMMENDED,
  MESHY_PROVIDER_ID,
  mapSettingsToMeshyImageTo3d,
  summarizeSettingsDe,
  type MeshyImageTo3dMappedParams,
} from './meshy-adapter';

export {
  buildGenerationRecord,
  defaultPresetForProvider,
  getPreset,
  getProviderCapability,
  isPresetDirty,
  listAvatar3dGenerationProviders,
  mapProviderFailureToGenerationError,
  presetLabelDe,
  settingsEqual,
  validateGenerationSettings,
} from './resolve-settings';
