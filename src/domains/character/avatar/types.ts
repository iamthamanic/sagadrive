/**
 * Avatar core types — pure SagaDrive CharacterStudio contracts (no React / Three / network).
 * Location: src/domains/character/avatar/types.ts
 *
 * Adapted from M3 CharacterStudio lifecycle ideas (MIT). No Wallet/NFT/Web3 concepts.
 */

export type AvatarTraitFormat = 'vrm' | 'glb';

/** Logical asset reference — Infrastructure resolves this to a validated URL. */
export interface CharacterTraitAssetRef {
  id: string;
  name: string;
  assetKey: string;
}

export interface CharacterTraitGroup {
  id: string;
  name: string;
  required: boolean;
  initial: boolean;
  assets: readonly CharacterTraitAssetRef[];
}

export interface CharacterTraitManifest {
  format: AvatarTraitFormat;
  groups: readonly CharacterTraitGroup[];
}

export type TraitInstanceRole = 'base' | 'overlay';

export interface CharacterTraitInstance {
  instanceId: string;
  groupId: string;
  assetKey: string;
  role: TraitInstanceRole;
  /** Monotonic per-instance counter; stale async loads must not commit. */
  loadGeneration: number;
}

export interface RuntimeOverlay {
  instanceId: string;
  groupId: string;
  assetKey: string;
  attached: boolean;
}

/**
 * Typed status for App layer — never throw across the domain→app boundary for expected failures.
 */
export type AvatarCoreStatus =
  | { status: 'idle' }
  | { status: 'loading'; traitId: string; message: string }
  | { status: 'ready'; traitId: string; message: string }
  | { status: 'error'; traitId: string; message: string };

export interface TraitLifecyclePort {
  addOverlay(input: { groupId: string; assetKey: string }): CharacterTraitInstance;
  replaceOverlay(input: { groupId: string; assetKey: string }): CharacterTraitInstance;
  removeOverlay(groupId: string): void;
  listOverlays(): readonly RuntimeOverlay[];
  beginAsyncLoad(instanceId: string): number;
  /** Returns false when the load generation is stale (caller must discard GPU result). */
  commitAsyncLoad(instanceId: string, generation: number): boolean;
  getStatus(): AvatarCoreStatus;
  setStatus(status: AvatarCoreStatus): void;
}
