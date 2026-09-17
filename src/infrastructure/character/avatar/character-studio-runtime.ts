/**
 * character-studio-runtime — Three.js / VRM avatar runtime (no React).
 * Location: src/infrastructure/character/avatar/character-studio-runtime.ts
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import {
  resolveEffectiveTraits,
  type AvatarRigAnalysisResult,
  type BaseTraitSelection,
  type RuntimeTraitOverlay,
} from '../../../domains/character/avatar';
import { normalizeAvatarModelUrl } from '../../../domains/character/use-cases/avatar-presets';
import type { CharacterAvatarDto } from '../../../domains/character/domain/character.entity';
import type { AvatarAssetManifest } from './avatar-asset-manifests';
import {
  createTraitLifecycleThreeAdapter,
  type TraitLifecycleThreeAdapter,
} from './trait-lifecycle-three-adapter';
import { analyzeAvatarRigFromObject3D } from './rig-analyzer';
import {
  applyMtoonProfileToModel,
  applyMtoonProfileToRenderer,
  applyMtoonProfileToScene,
  capturePortraitFromRenderer,
  createMtoonStyleLights,
  type MtoonStyleLights,
} from './mtoon-style-applier';
import {
  createSagaDriveMToonProfileV1,
  type MtoonStyleCompatibility,
  type SagaDriveMToonProfileV1,
} from '../../../domains/character/avatar/mtoon-profile';
import {
  AvatarAnimationRuntime,
  type AvatarAnimationRuntimeState,
} from './avatar-animation-runtime';
import type { AvatarAnimationActionId } from '../../../domains/character/avatar/animation-contract';

export type AvatarRuntimeState =
  | { status: 'loading'; message: string }
  | { status: 'ready'; message: string }
  | { status: 'error'; message: string };

type RuntimeStateListener = (state: AvatarRuntimeState) => void;
type RigAnalysisListener = (analysis: AvatarRigAnalysisResult) => void;
type AnimationStateListener = (state: AvatarAnimationRuntimeState) => void;

function includesHint(value: string, hints: readonly string[]): boolean {
  const normalized = value.toLowerCase();
  return hints.some((hint) => normalized.includes(hint));
}

function clothingTint(clothing: string | undefined): string {
  switch (clothing) {
    case 'robe':
      return '#315985';
    case 'armor':
      return '#667586';
    case 'leather':
      return '#744B32';
    case 'noble':
      return '#71508C';
    default:
      return '#465A70';
  }
}

function materialsOf(mesh: THREE.Mesh): THREE.Material[] {
  return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
}

function prepareModel(root: THREE.Object3D): void {
  root.traverse((object) => {
    object.frustumCulled = false;
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = true;
    object.receiveShadow = true;
  });
}

function centerModel(root: THREE.Object3D): void {
  root.updateWorldMatrix(true, true);
  const bounds = new THREE.Box3().setFromObject(root);
  if (bounds.isEmpty()) return;
  const center = bounds.getCenter(new THREE.Vector3());
  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y -= bounds.min.y;
  root.updateWorldMatrix(true, true);
}

function getVrm(gltfUserData: unknown): VRM | undefined {
  if (typeof gltfUserData !== 'object' || gltfUserData === null || !('vrm' in gltfUserData)) return undefined;
  const candidate = gltfUserData.vrm;
  return candidate instanceof VRM ? candidate : undefined;
}

export class CharacterStudioRuntime {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(30, 1, 0.01, 100);
  private readonly controls: OrbitControls;
  private readonly loader = new GLTFLoader();
  private readonly modelContainer = new THREE.Group();
  private readonly overlaysGroup = new THREE.Group();
  private readonly clock = new THREE.Clock();
  private readonly traitLifecycle: TraitLifecycleThreeAdapter;
  private currentRoot?: THREE.Object3D;
  private currentVrm?: VRM;
  private currentAvatar?: CharacterAvatarDto;
  private currentManifest?: AvatarAssetManifest;
  /** Runtime-only overlays (equipment etc.) — never written to appearance.avatar.traits. */
  private runtimeOverlays: RuntimeTraitOverlay[] = [];
  private lastRigAnalysis?: AvatarRigAnalysisResult;
  private loadVersion = 0;
  private disposed = false;
  private readonly styleProfile: SagaDriveMToonProfileV1 = createSagaDriveMToonProfileV1();
  private readonly styleLights: MtoonStyleLights;
  private styleCompatibility: MtoonStyleCompatibility = {
    path: 'pbr-fallback',
    noticeDe: null,
  };
  private readonly animationRuntime: AvatarAnimationRuntime;

  constructor(
    canvas: HTMLCanvasElement,
    private readonly onStateChange: RuntimeStateListener,
    private readonly onRigAnalysis?: RigAnalysisListener,
    private readonly onAnimationState?: AnimationStateListener,
  ) {
    this.animationRuntime = new AvatarAnimationRuntime(this.onAnimationState);
    if (typeof window !== 'undefined' && window.matchMedia) {
      this.animationRuntime.setPrefersReducedMotion(
        window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      );
    }
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    applyMtoonProfileToRenderer(this.renderer, this.styleProfile);

    this.modelContainer.add(this.overlaysGroup);
    this.scene.add(this.modelContainer);
    this.traitLifecycle = createTraitLifecycleThreeAdapter(this.overlaysGroup);

    this.styleLights = createMtoonStyleLights(this.styleProfile);
    this.scene.add(this.styleLights.hemisphere);
    this.scene.add(this.styleLights.key);
    this.scene.add(this.styleLights.fill);
    this.scene.add(this.styleLights.rim);
    applyMtoonProfileToScene(this.scene, this.styleLights, this.styleProfile);

    const floorMaterial = new THREE.MeshStandardMaterial({
      color: '#111C2E',
      roughness: 0.82,
      metalness: 0.12,
    });
    const floor = new THREE.Mesh(new THREE.CircleGeometry(2.8, 64), floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const ringMaterial = new THREE.MeshBasicMaterial({
      color: '#3B82F6',
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.52, 1.57, 96), ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.006;
    this.scene.add(ring);

    this.camera.position.set(0, 1.2, 4.2);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.minDistance = 1.4;
    this.controls.maxDistance = 7;
    this.controls.minPolarAngle = Math.PI * 0.18;
    this.controls.maxPolarAngle = Math.PI * 0.72;
    this.controls.target.set(0, 1, 0);
    this.controls.update();

    this.loader.crossOrigin = 'anonymous';
    this.loader.register((parser) => new VRMLoaderPlugin(parser));

    this.renderer.setAnimationLoop(() => {
      if (this.disposed) return;
      const delta = this.clock.getDelta();
      this.currentVrm?.update(delta);
      this.animationRuntime.update(delta);
      this.controls.update();
      this.resize();
      this.renderer.render(this.scene, this.camera);
    });
  }

  async loadModel(url: string, avatar: CharacterAvatarDto, manifest: AvatarAssetManifest): Promise<void> {
    if (this.disposed) return;

    const version = ++this.loadVersion;
    this.currentAvatar = avatar;
    this.currentManifest = manifest;

    const safeUrl = normalizeAvatarModelUrl(url);
    if (!safeUrl) {
      this.removeCurrentModel();
      this.onStateChange({
        status: 'error',
        message: 'Die 3D-Modell-URL ist nicht zulässig. Erlaubt sind lokale oder HTTPS-VRM/GLB-Dateien.',
      });
      return;
    }

    this.onStateChange({ status: 'loading', message: `Lade ${manifest.displayName} …` });

    try {
      const gltf = await this.loader.loadAsync(safeUrl);
      const vrm = getVrm(gltf.userData as unknown);
      if (vrm) {
        VRMUtils.removeUnnecessaryVertices(gltf.scene);
        VRMUtils.combineSkeletons(gltf.scene);
        VRMUtils.combineMorphs(vrm);
        VRMUtils.rotateVRM0(vrm);
      }

      const root = vrm?.scene ?? gltf.scene;
      prepareModel(root);
      centerModel(root);

      if (this.disposed || version !== this.loadVersion) {
        VRMUtils.deepDispose(root);
        return;
      }

      this.removeCurrentModel();
      this.currentRoot = root;
      this.currentVrm = vrm;
      this.modelContainer.add(root);
      this.applyAppearance(this.currentAvatar ?? avatar, this.currentManifest ?? manifest);
      this.fitCamera();
      this.lastRigAnalysis = analyzeAvatarRigFromObject3D(root, { vrm });
      this.onRigAnalysis?.(this.lastRigAnalysis);
      this.animationRuntime.bind(root, this.lastRigAnalysis);
      this.onStateChange({
        status: 'ready',
        message: vrm ? `${manifest.displayName} · VRM` : `${manifest.displayName} · glTF`,
      });
    } catch (error) {
      if (this.disposed || version !== this.loadVersion) return;
      const detail = error instanceof Error ? error.message : 'Unbekannter Ladefehler';
      this.onStateChange({ status: 'error', message: `3D-Modell konnte nicht geladen werden: ${detail}` });
    }
  }

  /**
   * Replace runtime overlays (e.g. helmet that hides hair). Does not touch persisted base traits.
   */
  setRuntimeOverlays(overlays: readonly RuntimeTraitOverlay[]): void {
    this.runtimeOverlays = [...overlays];
    if (this.currentAvatar && this.currentManifest) {
      this.applyAppearance(this.currentAvatar, this.currentManifest);
    }
  }

  getLastRigAnalysis(): AvatarRigAnalysisResult | undefined {
    return this.lastRigAnalysis;
  }

  getTraitLifecycle(): TraitLifecycleThreeAdapter {
    return this.traitLifecycle;
  }

  getStyleCompatibility(): MtoonStyleCompatibility {
    return this.styleCompatibility;
  }

  getStyleProfile(): SagaDriveMToonProfileV1 {
    return this.styleProfile;
  }

  playAnimation(actionId: AvatarAnimationActionId): boolean {
    return this.animationRuntime.play(actionId);
  }

  getAnimationRuntime(): AvatarAnimationRuntime {
    return this.animationRuntime;
  }

  setPrefersReducedMotion(value: boolean): void {
    this.animationRuntime.setPrefersReducedMotion(value);
  }

  /** Portrait capture — same renderer/style path as live preview. */
  capturePortraitDataUrl(): string {
    this.renderNow();
    return capturePortraitFromRenderer(this.renderer);
  }

  applyAppearance(avatar: CharacterAvatarDto, manifest: AvatarAssetManifest): void {
    this.currentAvatar = avatar;
    this.currentManifest = manifest;
    const root = this.currentRoot;
    if (!root) return;

    const base: BaseTraitSelection = {
      head: avatar.traits.head,
      ears: avatar.traits.ears,
      hair: avatar.traits.hair,
      clothing: avatar.traits.clothing,
      accessory: avatar.traits.accessory,
    };
    const effective = resolveEffectiveTraits(base, this.runtimeOverlays);
    const hairHidden =
      effective.hiddenGroups.includes('hair') || effective.traits.hair === 'bald';

    const widthScale = 0.88 + avatar.body.size * 0.0024;
    const heightScale = 0.88 + avatar.body.height * 0.0024;
    this.modelContainer.scale.set(
      manifest.modelScale * widthScale,
      manifest.modelScale * heightScale,
      manifest.modelScale * widthScale,
    );

    const clothingColor = clothingTint(effective.traits.clothing ?? avatar.traits.clothing);
    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const semanticName = `${object.name}`.toLowerCase();
      if (includesHint(semanticName, manifest.materialHints.hair)) {
        object.visible = !hairHidden;
      }
    });

    const isImportModel = Boolean(avatar.model_url);
    this.styleCompatibility = applyMtoonProfileToModel({
      root,
      profile: this.styleProfile,
      isImportModel,
      colors: {
        skin: avatar.colors.skin,
        hair: avatar.colors.hair,
        clothing: clothingColor,
        eyes: avatar.colors.eyes,
      },
    });
  }

  renderNow(): void {
    if (this.disposed) return;
    this.resize();
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Apply morph contract values to existing morph targets without reloading the model.
   * Unknown target names are skipped (fail-safe).
   */
  applyMorphState(morph: {
    body: Readonly<Record<string, number>>;
    face: Readonly<Record<string, number>>;
  }): void {
    const root = this.currentRoot;
    if (!root) return;

    const weights: Record<string, number> = {};
    for (const [key, value] of Object.entries(morph.body)) {
      if (typeof value === 'number' && Number.isFinite(value)) {
        weights[`sd_body_${key}`] = Math.max(-1, Math.min(1, value));
      }
    }
    for (const [key, value] of Object.entries(morph.face)) {
      if (typeof value === 'number' && Number.isFinite(value)) {
        weights[`sd_face_${key}`] = Math.max(-1, Math.min(1, value));
      }
    }

    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const dictionary = object.morphTargetDictionary;
      const influences = object.morphTargetInfluences;
      if (!dictionary || !influences) return;
      for (const [targetName, weight] of Object.entries(weights)) {
        const index = dictionary[targetName];
        if (typeof index !== 'number') continue;
        // Morph targets typically expect 0..1; map [-1,1] → [0,1] around neutral 0.5.
        influences[index] = (weight + 1) / 2;
      }
    });
  }

  private fitCamera(): void {
    if (!this.currentRoot) return;
    this.modelContainer.updateWorldMatrix(true, true);
    const bounds = new THREE.Box3().setFromObject(this.modelContainer);
    if (bounds.isEmpty()) return;

    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const verticalFov = THREE.MathUtils.degToRad(this.camera.fov);
    const distance = Math.max(1.6, (size.y * 0.58) / Math.tan(verticalFov / 2));
    this.controls.target.set(center.x, center.y * 0.96, center.z);
    this.camera.position.set(center.x, center.y * 0.98, center.z + distance * 1.08);
    this.camera.near = Math.max(0.01, distance / 100);
    this.camera.far = Math.max(30, distance * 8);
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  private resize(): void {
    const canvas = this.renderer.domElement;
    const width = Math.max(1, Math.round(canvas.clientWidth));
    const height = Math.max(1, Math.round(canvas.clientHeight));
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const targetWidth = Math.round(width * pixelRatio);
    const targetHeight = Math.round(height * pixelRatio);
    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      this.renderer.setPixelRatio(pixelRatio);
      this.renderer.setSize(width, height, false);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }
  }

  private removeCurrentModel(): void {
    this.animationRuntime.stopAll();
    if (!this.currentRoot) return;
    this.modelContainer.remove(this.currentRoot);
    VRMUtils.deepDispose(this.currentRoot);
    this.currentRoot = undefined;
    this.currentVrm = undefined;
    this.modelContainer.scale.set(1, 1, 1);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.loadVersion += 1;
    this.renderer.setAnimationLoop(null);
    this.controls.dispose();
    this.animationRuntime.dispose();
    this.traitLifecycle.dispose();
    this.runtimeOverlays = [];
    this.removeCurrentModel();
    this.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      for (const material of materialsOf(object)) material.dispose();
    });
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}
