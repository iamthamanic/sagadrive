/**
 * avatar-animation-runtime — Three.js AnimationMixer retargeted via #6 bone handles.
 * Location: src/infrastructure/character/avatar/avatar-animation-runtime.ts
 *
 * Procedural allowlisted preview clips; tracks bind only to mapped SagaDriveHumanoidRigV1 bones.
 * Rigid attachment fixture follows the catalog attachment anchor.
 */

import * as THREE from 'three';
import {
  AVATAR_ANIMATION_CATALOG,
  getAnimationCatalogEntry,
  isAllowlistedAnimationClipId,
  resolveAnimationCrossfadeSeconds,
  resolveAvatarAnimationSupport,
  type AvatarAnimationActionId,
  type AvatarAnimationSupportResult,
} from '../../../domains/character/avatar/animation-contract';
import type {
  AvatarRigAnalysisResult,
  SagaDriveHumanoidBoneId,
} from '../../../domains/character/avatar/rig-contract';

export interface AvatarAnimationRuntimeState {
  support: AvatarAnimationSupportResult;
  activeAction: AvatarAnimationActionId | null;
  message: string;
}

type AnimationStateListener = (state: AvatarAnimationRuntimeState) => void;

function findBoneObject(
  root: THREE.Object3D,
  sourceName: string | undefined,
): THREE.Object3D | undefined {
  if (!sourceName) return undefined;
  let found: THREE.Object3D | undefined;
  root.traverse((object) => {
    if (found) return;
    if (object.name === sourceName) found = object;
  });
  return found;
}

/**
 * Build a short procedural clip on canonical bone *source names* from the rig map.
 * Never invents bone strings outside the mapped handles.
 */
function buildProceduralClip(
  actionId: AvatarAnimationActionId,
  mappedBones: Readonly<Partial<Record<SagaDriveHumanoidBoneId, string>>>,
): THREE.AnimationClip | null {
  const entry = getAnimationCatalogEntry(actionId);
  if (!entry || !isAllowlistedAnimationClipId(entry.clipId)) return null;

  const tracks: THREE.KeyframeTrack[] = [];
  const duration = actionId === 'emote' ? 1.2 : 1.0;

  const pushQuatTrack = (
    boneId: SagaDriveHumanoidBoneId,
    times: number[],
    values: number[],
  ) => {
    const sourceName = mappedBones[boneId];
    if (!sourceName) return;
    tracks.push(new THREE.QuaternionKeyframeTrack(`${sourceName}.quaternion`, times, values));
  };

  const identity = [0, 0, 0, 1];
  const tilt = (axis: 'x' | 'y' | 'z', radians: number): number[] => {
    const q = new THREE.Quaternion();
    const v = new THREE.Vector3(
      axis === 'x' ? 1 : 0,
      axis === 'y' ? 1 : 0,
      axis === 'z' ? 1 : 0,
    );
    q.setFromAxisAngle(v, radians);
    return [q.x, q.y, q.z, q.w];
  };

  switch (actionId) {
    case 'idle': {
      const soft = tilt('x', 0.03);
      pushQuatTrack('spine', [0, 0.5, 1], [...identity, ...soft, ...identity]);
      pushQuatTrack('chest', [0, 0.5, 1], [...identity, ...tilt('x', -0.02), ...identity]);
      pushQuatTrack('head', [0, 0.5, 1], [...identity, ...tilt('y', 0.04), ...identity]);
      break;
    }
    case 'walk': {
      const swing = 0.35;
      pushQuatTrack(
        'leftUpperLeg',
        [0, 0.5, 1],
        [...tilt('x', swing), ...tilt('x', -swing), ...tilt('x', swing)],
      );
      pushQuatTrack(
        'rightUpperLeg',
        [0, 0.5, 1],
        [...tilt('x', -swing), ...tilt('x', swing), ...tilt('x', -swing)],
      );
      pushQuatTrack('hips', [0, 0.5, 1], [...identity, ...tilt('y', 0.05), ...identity]);
      break;
    }
    case 'combat': {
      pushQuatTrack('rightUpperArm', [0, 0.5, 1], [...tilt('x', -0.8), ...tilt('x', -1.1), ...tilt('x', -0.8)]);
      pushQuatTrack('leftUpperArm', [0, 0.5, 1], [...tilt('x', -0.5), ...tilt('x', -0.4), ...tilt('x', -0.5)]);
      pushQuatTrack('chest', [0, 0.5, 1], [...identity, ...tilt('y', 0.08), ...identity]);
      break;
    }
    case 'emote': {
      pushQuatTrack(
        'rightUpperArm',
        [0, 0.4, 0.8, 1.2],
        [...identity, ...tilt('z', -1.2), ...tilt('z', -1.4), ...identity],
      );
      pushQuatTrack(
        'rightLowerArm',
        [0, 0.4, 0.8, 1.2],
        [...identity, ...tilt('x', -0.4), ...tilt('x', -0.2), ...identity],
      );
      break;
    }
    default:
      return null;
  }

  if (tracks.length === 0) return null;
  return new THREE.AnimationClip(entry.clipId, duration, tracks);
}

export class AvatarAnimationRuntime {
  private mixer?: THREE.AnimationMixer;
  private actions = new Map<AvatarAnimationActionId, THREE.AnimationAction>();
  private activeAction: AvatarAnimationActionId | null = null;
  private attachment?: THREE.Mesh;
  private attachmentParent?: THREE.Object3D;
  private root?: THREE.Object3D;
  private analysis?: AvatarRigAnalysisResult;
  private support: AvatarAnimationSupportResult = resolveAvatarAnimationSupport({
    capabilityFlags: [],
    mappedBones: {},
  });
  private prefersReducedMotion = false;
  private disposed = false;

  constructor(private readonly onStateChange?: AnimationStateListener) {}

  setPrefersReducedMotion(value: boolean): void {
    this.prefersReducedMotion = value;
  }

  /**
   * Bind to a loaded avatar root + rig analysis. Disposes prior mixer/actions.
   */
  bind(root: THREE.Object3D, analysis: AvatarRigAnalysisResult): void {
    this.disposeMixer();
    this.root = root;
    this.analysis = analysis;
    this.support = resolveAvatarAnimationSupport({
      capabilityFlags: analysis.capabilities.flags,
      mappedBones: analysis.rig.bones,
    });

    this.mixer = new THREE.AnimationMixer(root);
    this.actions.clear();
    this.activeAction = null;

    for (const entry of AVATAR_ANIMATION_CATALOG) {
      if (!this.support.supported.includes(entry.actionId)) continue;
      const clip = buildProceduralClip(entry.actionId, analysis.rig.bones);
      if (!clip) continue;
      const action = this.mixer.clipAction(clip);
      action.setLoop(entry.loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
      if (!entry.loop) action.clampWhenFinished = true;
      this.actions.set(entry.actionId, action);
    }

    this.ensureAttachmentFixture(analysis);
    this.emit('AnimationRuntime bereit.');

    if (this.support.defaultAction && !this.prefersReducedMotion) {
      this.play(this.support.defaultAction);
    }
  }

  getSupport(): AvatarAnimationSupportResult {
    return this.support;
  }

  getActiveAction(): AvatarAnimationActionId | null {
    return this.activeAction;
  }

  play(actionId: AvatarAnimationActionId): boolean {
    if (this.disposed || !this.mixer) return false;
    if (!this.support.supported.includes(actionId)) {
      this.emit(this.support.unsupportedReasons[actionId] ?? 'Aktion nicht unterstützt.');
      return false;
    }
    const next = this.actions.get(actionId);
    if (!next) {
      this.emit('Clip fehlt im Katalog.');
      return false;
    }

    const fade = resolveAnimationCrossfadeSeconds(this.prefersReducedMotion);
    const previous = this.activeAction ? this.actions.get(this.activeAction) : undefined;
    if (previous && previous !== next) {
      previous.fadeOut(fade);
    }
    next.reset().fadeIn(fade).play();
    this.activeAction = actionId;

    const entry = getAnimationCatalogEntry(actionId);
    if (entry && this.analysis) {
      this.rebindAttachment(entry.attachmentAnchor);
    }
    this.emit(`Spielt ${entry?.labelDe ?? actionId}.`);
    return true;
  }

  update(delta: number): void {
    if (this.disposed) return;
    this.mixer?.update(delta);
  }

  stopAll(): void {
    for (const action of this.actions.values()) {
      action.stop();
    }
    this.activeAction = null;
    this.emit('Animation gestoppt.');
  }

  dispose(): void {
    this.disposed = true;
    this.disposeMixer();
    this.root = undefined;
    this.analysis = undefined;
  }

  private disposeMixer(): void {
    this.stopAll();
    this.detachAttachment();
    if (this.mixer) {
      this.mixer.stopAllAction();
      this.mixer.uncacheRoot(this.mixer.getRoot());
      this.mixer = undefined;
    }
    this.actions.clear();
  }

  private ensureAttachmentFixture(analysis: AvatarRigAnalysisResult): void {
    this.detachAttachment();
    if (!this.root) return;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.08, 0.18),
      new THREE.MeshStandardMaterial({ color: '#F59E0B', roughness: 0.45, metalness: 0.2 }),
    );
    mesh.name = 'SagaDriveAnimationAttachmentFixture';
    this.attachment = mesh;
    const defaultAnchor =
      getAnimationCatalogEntry(this.support.defaultAction ?? 'idle')?.attachmentAnchor ?? 'hips';
    this.rebindAttachment(defaultAnchor, analysis);
  }

  private rebindAttachment(
    anchorId: import('../../../domains/character/avatar/rig-contract').SagaDriveHumanoidAnchorId,
    analysis: AvatarRigAnalysisResult | undefined = this.analysis,
  ): void {
    if (!this.attachment || !this.root || !analysis) return;
    const sourceName = analysis.rig.anchors[anchorId] ?? analysis.rig.bones[anchorId as SagaDriveHumanoidBoneId];
    const parent = findBoneObject(this.root, sourceName);
    if (!parent) return;
    if (this.attachmentParent === parent) return;
    this.attachmentParent?.remove(this.attachment);
    parent.add(this.attachment);
    this.attachment.position.set(0.05, 0.02, 0);
    this.attachmentParent = parent;
  }

  private detachAttachment(): void {
    if (this.attachment) {
      this.attachmentParent?.remove(this.attachment);
      this.attachment.geometry.dispose();
      if (Array.isArray(this.attachment.material)) {
        this.attachment.material.forEach((m) => m.dispose());
      } else {
        (this.attachment.material as THREE.Material).dispose();
      }
    }
    this.attachment = undefined;
    this.attachmentParent = undefined;
  }

  private emit(message: string): void {
    this.onStateChange?.({
      support: this.support,
      activeAction: this.activeAction,
      message,
    });
  }
}
