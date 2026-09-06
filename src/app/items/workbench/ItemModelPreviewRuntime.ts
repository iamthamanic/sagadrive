/**
 * ItemModelPreviewRuntime — lazy Three.js GLB viewer for Workbench 3D (#141).
 * Mirrors avatar studio GLTF+OrbitControls patterns without importing avatar modules.
 * Location: src/app/items/workbench/ItemModelPreviewRuntime.ts
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export type ItemModelPreviewState =
  | { status: 'loading'; message: string }
  | { status: 'ready'; message: string }
  | { status: 'error'; message: string };

type StateListener = (state: ItemModelPreviewState) => void;

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

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export class ItemModelPreviewRuntime {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);
  private readonly controls: OrbitControls;
  private readonly loader = new GLTFLoader();
  private readonly modelContainer = new THREE.Group();
  private currentRoot?: THREE.Object3D;
  private loadVersion = 0;
  private disposed = false;
  private readonly allowAutoSpin: boolean;

  constructor(
    canvas: HTMLCanvasElement,
    private readonly onStateChange: StateListener,
  ) {
    this.allowAutoSpin = !prefersReducedMotion();

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;

    this.scene.background = null;
    this.scene.add(this.modelContainer);

    const hemisphere = new THREE.HemisphereLight('#F5F0E8', '#1A1A1A', 1.4);
    this.scene.add(hemisphere);

    const key = new THREE.DirectionalLight('#FFFFFF', 2.2);
    key.position.set(2, 3.5, 2.5);
    this.scene.add(key);

    const fill = new THREE.DirectionalLight('#C8D4E8', 0.8);
    fill.position.set(-2, 1.5, -1.5);
    this.scene.add(fill);

    this.camera.position.set(0, 0.8, 2.8);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.minDistance = 0.8;
    this.controls.maxDistance = 8;
    this.controls.target.set(0, 0.5, 0);
    this.controls.update();

    this.loader.crossOrigin = 'anonymous';

    this.renderer.setAnimationLoop(() => {
      if (this.disposed) return;
      if (this.allowAutoSpin && this.currentRoot) {
        this.modelContainer.rotation.y += 0.004;
      }
      this.controls.update();
      this.resize();
      this.renderer.render(this.scene, this.camera);
    });
  }

  async loadModel(url: string): Promise<void> {
    if (this.disposed) return;
    const version = ++this.loadVersion;
    this.onStateChange({ status: 'loading', message: '3D-Modell wird geladen…' });

    try {
      const gltf = await this.loader.loadAsync(url);
      const root = gltf.scene;
      prepareModel(root);
      centerModel(root);

      if (this.disposed || version !== this.loadVersion) {
        root.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          object.geometry.dispose();
          for (const material of materialsOf(object)) material.dispose();
        });
        return;
      }

      this.removeCurrentModel();
      this.currentRoot = root;
      this.modelContainer.rotation.set(0, 0, 0);
      this.modelContainer.add(root);
      this.fitCamera();
      this.onStateChange({ status: 'ready', message: '3D-Vorschau' });
    } catch (error) {
      if (this.disposed || version !== this.loadVersion) return;
      const detail = error instanceof Error ? error.message : 'Unbekannter Ladefehler';
      this.onStateChange({
        status: 'error',
        message: `3D-Vorschau fehlgeschlagen: ${detail}`,
      });
    }
  }

  /** Orbit/zoom reset after user interaction (Issue #141). */
  resetView(): void {
    if (this.disposed || !this.currentRoot) return;
    this.modelContainer.rotation.set(0, 0, 0);
    this.fitCamera();
  }

  private fitCamera(): void {
    if (!this.currentRoot) return;
    this.modelContainer.updateWorldMatrix(true, true);
    const bounds = new THREE.Box3().setFromObject(this.modelContainer);
    if (bounds.isEmpty()) return;

    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 0.1);
    const distance = Math.max(1.2, maxDim * 2.1);
    this.controls.target.set(center.x, center.y, center.z);
    this.camera.position.set(center.x, center.y + maxDim * 0.15, center.z + distance);
    this.camera.near = Math.max(0.01, distance / 100);
    this.camera.far = Math.max(40, distance * 10);
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
    this.currentRoot.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      for (const material of materialsOf(object)) material.dispose();
    });
    this.currentRoot = undefined;
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
