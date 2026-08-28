import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { normalizeAvatarModelUrl } from '../../avatar';
import type { CharacterAvatarDto } from '../../types/character.types';
import type { AvatarAssetManifest } from '../manifests';

export type AvatarRuntimeState =
  | { status: 'loading'; message: string }
  | { status: 'ready'; message: string }
  | { status: 'error'; message: string };

type RuntimeStateListener = (state: AvatarRuntimeState) => void;

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

function setMaterialColor(material: THREE.Material, color: string): boolean {
  if (!('color' in material) || !(material.color instanceof THREE.Color)) return false;
  material.color.set(color);
  material.needsUpdate = true;
  return true;
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
  private readonly clock = new THREE.Clock();
  private currentRoot?: THREE.Object3D;
  private currentVrm?: VRM;
  private currentAvatar?: CharacterAvatarDto;
  private currentManifest?: AvatarAssetManifest;
  private loadVersion = 0;
  private disposed = false;

  constructor(
    canvas: HTMLCanvasElement,
    private readonly onStateChange: RuntimeStateListener,
  ) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene.background = new THREE.Color('#09111F');
    this.scene.fog = new THREE.Fog('#09111F', 8, 18);
    this.scene.add(this.modelContainer);

    const hemisphere = new THREE.HemisphereLight('#DDEBFF', '#101828', 2.1);
    this.scene.add(hemisphere);

    const key = new THREE.DirectionalLight('#FFF4DE', 4.2);
    key.position.set(2.5, 4.5, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    this.scene.add(key);

    const rim = new THREE.DirectionalLight('#5EA7FF', 2.2);
    rim.position.set(-3, 2.5, -4);
    this.scene.add(rim);

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

  applyAppearance(avatar: CharacterAvatarDto, manifest: AvatarAssetManifest): void {
    this.currentAvatar = avatar;
    this.currentManifest = manifest;
    const root = this.currentRoot;
    if (!root) return;

    const widthScale = 0.88 + avatar.body.size * 0.0024;
    const heightScale = 0.88 + avatar.body.height * 0.0024;
    this.modelContainer.scale.set(
      manifest.modelScale * widthScale,
      manifest.modelScale * heightScale,
      manifest.modelScale * widthScale,
    );

    const clothingColor = clothingTint(avatar.traits.clothing);
    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      for (const material of materialsOf(object)) {
        const semanticName = `${object.name} ${material.name}`.toLowerCase();
        if (includesHint(semanticName, manifest.materialHints.hair)) {
          setMaterialColor(material, avatar.colors.hair);
        } else if (includesHint(semanticName, manifest.materialHints.skin)) {
          setMaterialColor(material, avatar.colors.skin);
        } else if (includesHint(semanticName, manifest.materialHints.clothing)) {
          setMaterialColor(material, clothingColor);
        }
      }
    });
  }

  renderNow(): void {
    if (this.disposed) return;
    this.resize();
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
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
