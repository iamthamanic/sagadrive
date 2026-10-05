/**
 * host-mtoon-look-adapter — Default LookStyleAdapter on SagaDrive WebGL/MToon host (#342).
 * Location: src/infrastructure/look/adapters/host-mtoon-look-adapter.ts
 *
 * Reuses material snapshot restore + MToon style applier. Never imports ToonLab.
 */
import type { Object3D, Scene } from 'three';
import type { LookCapability, LookProfileVersion } from '../../../domains/look/types';
import { createSagaDriveMToonProfileV1 } from '../../../domains/character/avatar/mtoon-profile';
import {
  applyMtoonProfileToModel,
  applyMtoonProfileToScene,
  applyNeutralPreviewLights,
  restoreMaterialStyleSnapshots,
  type MaterialStyleSnapshot,
  type MtoonStyleLights,
} from '../../character/avatar/mtoon-style-applier';
import type {
  LookCapabilityApplyResult,
  LookRuntimeApplyResult,
  LookRuntimeTarget,
  LookStyleAdapter,
} from '../look-runtime-types';

function asObject3D(value: unknown): Object3D | null {
  return value && typeof value === 'object' ? (value as Object3D) : null;
}

function asScene(value: unknown): Scene | null {
  return value && typeof value === 'object' ? (value as Scene) : null;
}

function asLights(value: unknown): MtoonStyleLights | null {
  return value && typeof value === 'object' ? (value as MtoonStyleLights) : null;
}

function asSnapshots(value: unknown): MaterialStyleSnapshot[] {
  return Array.isArray(value) ? (value as MaterialStyleSnapshot[]) : [];
}

function capabilityResults(
  version: LookProfileVersion,
  applied: ReadonlySet<LookCapability>,
): LookCapabilityApplyResult[] {
  return version.capabilities.map((capability) => {
    if (capability === 'character' || capability === 'lighting') {
      return {
        capability,
        status: applied.has(capability) ? 'applied' : 'unsupported',
        noticeDe: applied.has(capability)
          ? null
          : 'Fähigkeit konnte auf dem Host-Adapter nicht angewendet werden.',
      };
    }
    if (capability === 'postFx') {
      return {
        capability,
        status: 'partial',
        noticeDe:
          'PostFX ist auf dem Host-MToon-Pfad vorbereitet, aber noch ohne eigenen Pass (no-op).',
      };
    }
    return {
      capability,
      status: 'unsupported',
      noticeDe: 'Welt-Domain noch nicht verfügbar.',
    };
  });
}

function restoreSnapshots(target: LookRuntimeTarget): void {
  const snapshots = asSnapshots(target.materialSnapshots);
  if (snapshots.length > 0) {
    restoreMaterialStyleSnapshots(snapshots);
  }
}

export function createHostMtoonLookAdapter(): LookStyleAdapter {
  const profile = createSagaDriveMToonProfileV1();

  return {
    id: 'host-mtoon',
    isAvailable: () => true,
    unavailableReasonDe: null,
    restoreBaseline: (target) => {
      restoreSnapshots(target);
      const scene = asScene(target.scene);
      const lights = asLights(target.styleLights);
      if (scene && lights) {
        applyNeutralPreviewLights(scene, lights);
      }
      return {
        status: 'restored',
        providerId: 'host-mtoon',
        profileId: null,
        version: null,
        executionMode: null,
        capabilities: [],
        noticeDe: null,
      };
    },
    apply: ({ version, target, executionMode }) => {
      restoreSnapshots(target);
      const root = asObject3D(target.root);
      const scene = asScene(target.scene);
      const lights = asLights(target.styleLights);
      const applied = new Set<LookCapability>();

      if (!root || !scene || !lights) {
        return {
          status: 'unsupported',
          providerId: 'host-mtoon',
          profileId: version.profileId,
          version: version.version,
          executionMode,
          capabilities: capabilityResults(version, applied),
          noticeDe: 'Look-Ziel (Root/Scene/Lights) fehlt.',
        };
      }

      if (version.capabilities.includes('lighting')) {
        applyMtoonProfileToScene(scene, lights, profile);
        applied.add('lighting');
      } else {
        applyNeutralPreviewLights(scene, lights);
      }

      if (version.capabilities.includes('character')) {
        applyMtoonProfileToModel({
          root,
          profile,
          isImportModel: target.isImportModel,
          colors: {
            skin: target.colors.skin,
            hair: target.colors.hair,
            clothing: target.colors.clothing,
            eyes: target.colors.eyes,
          },
        });
        applied.add('character');
      }

      if (version.capabilities.includes('postFx')) {
        applied.add('postFx');
      }

      const caps = capabilityResults(version, applied);
      const anyApplied = caps.some((c) => c.status === 'applied' || c.status === 'partial');
      return {
        status: anyApplied ? (caps.every((c) => c.status === 'applied') ? 'applied' : 'partial') : 'unsupported',
        providerId: 'host-mtoon',
        profileId: version.profileId,
        version: version.version,
        executionMode,
        capabilities: caps,
        noticeDe: null,
      };
    },
  };
}
