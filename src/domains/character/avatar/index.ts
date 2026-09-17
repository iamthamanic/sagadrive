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
