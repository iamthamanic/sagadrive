/**
 * character/avatar domain — public API for SagaDrive avatar core contracts.
 * Location: src/domains/character/avatar/index.ts
 */
export type {
  AvatarCoreStatus,
  AvatarTraitFormat,
  CharacterTraitAssetRef,
  CharacterTraitGroup,
  CharacterTraitInstance,
  CharacterTraitManifest,
  RuntimeOverlay,
  TraitInstanceRole,
  TraitLifecyclePort,
} from './types';
export {
  assertDistinctInstanceIdentities,
  createTraitLifecycleRegistry,
  type TraitLifecycleRegistryOptions,
} from './trait-lifecycle-registry';
export {
  AVATAR_TRAIT_GROUP_IDS,
  isAvatarTraitGroupId,
  resolveEffectiveTraits,
  serializePersistedBaseTraits,
  type AvatarTraitGroupId,
  type BaseTraitSelection,
  type EffectiveTraitSelection,
  type RuntimeTraitOverlay,
} from './trait-layers';
export {
  AVATAR_TRAIT_SECTIONS,
  getTraitOption,
  isAllowedTraitId,
  listTraitOptionsForGroup,
  traitGroupLabel,
  type AvatarTraitOption,
  type AvatarTraitSection,
} from './trait-catalog';
