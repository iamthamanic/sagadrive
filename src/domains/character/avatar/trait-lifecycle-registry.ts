/**
 * Trait lifecycle registry — pure in-memory TraitLifecyclePort (no Three.js).
 * Location: src/domains/character/avatar/trait-lifecycle-registry.ts
 *
 * Deterministic Add/Replace/Remove with load-generation guards for stale async results.
 * Base vs overlay of the same assetKey never share the same instance identity.
 */

import type {
  AvatarCoreStatus,
  CharacterTraitInstance,
  RuntimeOverlay,
  TraitLifecyclePort,
} from './types';

export interface TraitLifecycleRegistryOptions {
  /** Called exactly once per removed instanceId (Infrastructure attaches GPU dispose here). */
  onDisposeInstance?: (instance: CharacterTraitInstance) => void;
}

function newInstanceId(groupId: string, role: CharacterTraitInstance['role']): string {
  return `${role}:${groupId}:${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Create a source-neutral trait lifecycle registry.
 * MIT-inspired lifecycle semantics from M3 CharacterStudio; SagaDrive public contract is local.
 */
export function createTraitLifecycleRegistry(
  options: TraitLifecycleRegistryOptions = {},
): TraitLifecyclePort {
  const byGroup = new Map<string, CharacterTraitInstance>();
  const disposedIds = new Set<string>();
  const committedIds = new Set<string>();
  let status: AvatarCoreStatus = { status: 'idle' };

  function disposeInstance(instance: CharacterTraitInstance): void {
    if (disposedIds.has(instance.instanceId)) return;
    disposedIds.add(instance.instanceId);
    committedIds.delete(instance.instanceId);
    options.onDisposeInstance?.(instance);
  }

  function upsertOverlay(groupId: string, assetKey: string): CharacterTraitInstance {
    const trimmedGroup = groupId.trim();
    const trimmedKey = assetKey.trim();
    if (!trimmedGroup || !trimmedKey) {
      status = {
        status: 'error',
        traitId: trimmedGroup || 'unknown',
        message: 'Trait-Gruppe oder Asset-Schlüssel fehlt.',
      };
      throw new Error(status.message);
    }

    const existing = byGroup.get(trimmedGroup);
    if (existing) {
      disposeInstance(existing);
      byGroup.delete(trimmedGroup);
    }

    const instance: CharacterTraitInstance = {
      instanceId: newInstanceId(trimmedGroup, 'overlay'),
      groupId: trimmedGroup,
      assetKey: trimmedKey,
      role: 'overlay',
      loadGeneration: 0,
    };
    byGroup.set(trimmedGroup, instance);
    status = {
      status: 'loading',
      traitId: trimmedGroup,
      message: `Lade Trait ${trimmedGroup} …`,
    };
    return instance;
  }

  const port: TraitLifecyclePort = {
    addOverlay({ groupId, assetKey }) {
      return upsertOverlay(groupId, assetKey);
    },
    replaceOverlay({ groupId, assetKey }) {
      return upsertOverlay(groupId, assetKey);
    },
    removeOverlay(groupId) {
      const key = groupId.trim();
      const existing = byGroup.get(key);
      if (!existing) return;
      disposeInstance(existing);
      byGroup.delete(key);
      if (status.status !== 'idle' && status.traitId === key) {
        status = { status: 'idle' };
      }
    },
    listOverlays(): readonly RuntimeOverlay[] {
      return [...byGroup.values()].map((instance) => ({
        instanceId: instance.instanceId,
        groupId: instance.groupId,
        assetKey: instance.assetKey,
        attached: committedIds.has(instance.instanceId),
      }));
    },
    beginAsyncLoad(instanceId: string): number {
      for (const instance of byGroup.values()) {
        if (instance.instanceId !== instanceId) continue;
        instance.loadGeneration += 1;
        committedIds.delete(instance.instanceId);
        status = {
          status: 'loading',
          traitId: instance.groupId,
          message: `Lade Trait ${instance.groupId} …`,
        };
        return instance.loadGeneration;
      }
      return -1;
    },
    commitAsyncLoad(instanceId: string, generation: number): boolean {
      for (const instance of byGroup.values()) {
        if (instance.instanceId !== instanceId) continue;
        if (disposedIds.has(instance.instanceId)) return false;
        if (instance.loadGeneration !== generation) return false;
        committedIds.add(instance.instanceId);
        status = {
          status: 'ready',
          traitId: instance.groupId,
          message: `Trait ${instance.groupId} bereit`,
        };
        return true;
      }
      return false;
    },
    getStatus() {
      return status;
    },
    setStatus(next) {
      status = next;
    },
  };

  return port;
}

/**
 * Prove base and overlay with the same assetKey remain distinct instances (no shared mutable identity).
 */
export function assertDistinctInstanceIdentities(
  base: CharacterTraitInstance,
  overlay: CharacterTraitInstance,
): void {
  if (base.instanceId === overlay.instanceId) {
    throw new Error('Base and overlay must not share instance identity');
  }
  if (base.role === overlay.role && base.groupId === overlay.groupId) {
    throw new Error('Unexpected identical role+group pairing');
  }
}
