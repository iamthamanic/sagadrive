/**
 * Apply SagaDriveMToonProfileV1 to Three.js scene/materials (no React).
 * Location: src/infrastructure/character/avatar/mtoon-style-applier.ts
 *
 * Prefers existing MToon materials; otherwise applies controlled PBR fallback.
 * Never injects custom shaders or user scripts.
 */
import * as THREE from 'three';
import {
  classifyMtoonMaterialClass,
  createSagaDriveMToonProfileV1,
  resolveMtoonPerformancePreset,
  resolveMtoonRenderPath,
  type MtoonMaterialClass,
  type MtoonPerformancePreset,
  type MtoonStyleCompatibility,
  type SagaDriveMToonProfileV1,
} from '../../../domains/character/avatar/mtoon-profile';

export interface MtoonStyleLights {
  hemisphere: THREE.HemisphereLight;
  key: THREE.DirectionalLight;
  fill: THREE.DirectionalLight;
  rim: THREE.DirectionalLight;
}

function materialsOf(mesh: THREE.Mesh): THREE.Material[] {
  return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
}

function isMtoonMaterial(material: THREE.Material): boolean {
  const record = material as THREE.Material & {
    isMToonMaterial?: boolean;
    shadeColorFactor?: unknown;
    shadingToonyFactor?: unknown;
  };
  if (record.isMToonMaterial === true) return true;
  if ('shadeColorFactor' in record && 'shadingToonyFactor' in record) return true;
  return material.type === 'MToonMaterial';
}

/** True when albedo/baseColor map is bound — flat hex tint would crush Meshy/import textures. */
function materialHasBaseMap(material: THREE.Material): boolean {
  const record = material as THREE.Material & {
    map?: THREE.Texture | null;
    colorMap?: THREE.Texture | null;
  };
  return Boolean(record.map || record.colorMap);
}

function multiplyHex(hex: string, factor: number): THREE.Color {
  const color = new THREE.Color(hex);
  color.multiplyScalar(Math.max(0, Math.min(1, factor)));
  return color;
}

export function detectHasMtoonMaterials(root: THREE.Object3D): boolean {
  let found = false;
  root.traverse((object) => {
    if (found || !(object instanceof THREE.Mesh)) return;
    for (const material of materialsOf(object)) {
      if (isMtoonMaterial(material)) found = true;
    }
  });
  return found;
}

export function createMtoonStyleLights(
  profile: SagaDriveMToonProfileV1 = createSagaDriveMToonProfileV1(),
): MtoonStyleLights {
  const light = profile.light;
  const hemisphere = new THREE.HemisphereLight(
    light.hemisphereSky,
    light.hemisphereGround,
    light.hemisphereIntensity,
  );
  const key = new THREE.DirectionalLight(light.keyColor, light.keyIntensity);
  key.position.set(...light.keyPosition);
  key.castShadow = true;
  key.shadow.mapSize.set(light.shadowMapSize, light.shadowMapSize);
  key.shadow.bias = light.shadowBias;

  const fill = new THREE.DirectionalLight(light.fillColor, light.fillIntensity);
  fill.position.set(...light.fillPosition);

  const rim = new THREE.DirectionalLight(light.rimColor, light.rimIntensity);
  rim.position.set(...light.rimPosition);

  return { hemisphere, key, fill, rim };
}

export function applyMtoonProfileToRenderer(
  renderer: THREE.WebGLRenderer,
  profile: SagaDriveMToonProfileV1 = createSagaDriveMToonProfileV1(),
  performancePreset: MtoonPerformancePreset = resolveMtoonPerformancePreset(),
): void {
  const perf = profile.performance[performancePreset];
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = profile.light.exposure;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, perf.maxPixelRatio));
}

export function applyMtoonProfileToScene(
  scene: THREE.Scene,
  lights: MtoonStyleLights,
  profile: SagaDriveMToonProfileV1 = createSagaDriveMToonProfileV1(),
  performancePreset: MtoonPerformancePreset = resolveMtoonPerformancePreset(),
): void {
  const perf = profile.performance[performancePreset];
  const light = profile.light;
  scene.background = new THREE.Color(profile.background);
  scene.fog = new THREE.Fog(profile.background, profile.fogNear, profile.fogFar);

  lights.hemisphere.color.set(light.hemisphereSky);
  lights.hemisphere.groundColor.set(light.hemisphereGround);
  lights.hemisphere.intensity = light.hemisphereIntensity;

  lights.key.color.set(light.keyColor);
  lights.key.intensity = light.keyIntensity;
  lights.key.position.set(...light.keyPosition);
  lights.key.shadow.mapSize.set(perf.shadowMapSize, perf.shadowMapSize);
  lights.key.shadow.bias = light.shadowBias;

  lights.fill.color.set(light.fillColor);
  lights.fill.intensity = light.fillIntensity * perf.rimIntensityScale;
  lights.fill.position.set(...light.fillPosition);

  lights.rim.color.set(light.rimColor);
  lights.rim.intensity = light.rimIntensity * perf.rimIntensityScale;
  lights.rim.position.set(...light.rimPosition);
}

function applyMtoonClassToMaterial(
  material: THREE.Material,
  classId: MtoonMaterialClass,
  profile: SagaDriveMToonProfileV1,
  perf: SagaDriveMToonProfileV1['performance'][MtoonPerformancePreset],
  baseColorHex?: string,
): void {
  const classProfile = profile.materials[classId];
  const outlineAllowed =
    classProfile.outlineEnabled && !profile.outline.disabledClasses.includes(classId);

  if (isMtoonMaterial(material)) {
    const mtoon = material as THREE.Material & {
      color?: THREE.Color;
      shadeColorFactor?: THREE.Color;
      shadingToonyFactor?: number;
      shadingShiftFactor?: number;
      parametricRimColorFactor?: THREE.Color;
      parametricRimFresnelPowerFactor?: number;
      outlineWidthMode?: string;
      outlineWidthFactor?: number;
      outlineColorFactor?: THREE.Color;
      needsUpdate: boolean;
    };
    const preserveMap = materialHasBaseMap(material);
    if (mtoon.color) {
      if (preserveMap) {
        // Keep albedo map visible (Three multiplies color × map).
        mtoon.color.set('#ffffff');
      } else if (baseColorHex) {
        mtoon.color.set(baseColorHex);
      }
    }
    if (mtoon.shadeColorFactor && mtoon.color) {
      mtoon.shadeColorFactor.copy(mtoon.color).multiplyScalar(classProfile.shadeColorMultiply);
    } else if (mtoon.shadeColorFactor && baseColorHex && !preserveMap) {
      mtoon.shadeColorFactor.copy(multiplyHex(baseColorHex, classProfile.shadeColorMultiply));
    }
    if (typeof mtoon.shadingToonyFactor === 'number') {
      mtoon.shadingToonyFactor = classProfile.shadingToonyFactor;
    }
    if (typeof mtoon.shadingShiftFactor === 'number') {
      mtoon.shadingShiftFactor = classProfile.shadingShiftFactor;
    }
    if (mtoon.parametricRimColorFactor) {
      mtoon.parametricRimColorFactor.set(profile.light.rimColor);
    }
    if (typeof mtoon.parametricRimFresnelPowerFactor === 'number') {
      mtoon.parametricRimFresnelPowerFactor = 2.5 + classProfile.parametricRimStrength * 2;
    }
    if (typeof mtoon.outlineWidthMode === 'string') {
      mtoon.outlineWidthMode = outlineAllowed ? profile.outline.mode : 'none';
    }
    if (typeof mtoon.outlineWidthFactor === 'number') {
      mtoon.outlineWidthFactor = outlineAllowed
        ? classProfile.outlineWidthFactor * perf.outlineWidthScale
        : 0;
    }
    if (mtoon.outlineColorFactor) {
      mtoon.outlineColorFactor.set(profile.outline.color);
    }
    mtoon.needsUpdate = true;
    return;
  }

  // Controlled PBR fallback — no custom shader injection.
  // When albedo/MR maps are present, preserve authored factors (Meshy/species PBR).
  // Only tint + override roughness/metalness for unmapped placeholder materials.
  const preserveMap = materialHasBaseMap(material);
  if ('color' in material && material.color instanceof THREE.Color) {
    if (preserveMap) {
      material.color.set('#ffffff');
    } else if (baseColorHex) {
      material.color.set(baseColorHex);
    }
  }
  if (!preserveMap) {
    if ('roughness' in material && typeof material.roughness === 'number') {
      material.roughness = classProfile.pbrRoughness;
    }
    if ('metalness' in material && typeof material.metalness === 'number') {
      material.metalness = classProfile.pbrMetalness;
    }
  }
  material.needsUpdate = true;
}

export function applyMtoonProfileToModel(input: {
  root: THREE.Object3D;
  profile?: SagaDriveMToonProfileV1;
  performancePreset?: MtoonPerformancePreset;
  isImportModel?: boolean;
  colors?: { skin?: string; hair?: string; clothing?: string; eyes?: string };
}): MtoonStyleCompatibility {
  const profile = input.profile ?? createSagaDriveMToonProfileV1();
  const perfPreset =
    input.performancePreset ??
    resolveMtoonPerformancePreset({
      maxTouchPoints: typeof navigator !== 'undefined' ? navigator.maxTouchPoints : 0,
    });
  const perf = profile.performance[perfPreset];
  const hasMtoon = detectHasMtoonMaterials(input.root);
  const compatibility = resolveMtoonRenderPath({
    hasMtoonMaterials: hasMtoon,
    isImportModel: input.isImportModel,
  });

  input.root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    for (const material of materialsOf(object)) {
      const classId = classifyMtoonMaterialClass(`${object.name} ${material.name}`, profile);
      let baseColor: string | undefined;
      if (classId === 'skin') baseColor = input.colors?.skin;
      else if (classId === 'hair') baseColor = input.colors?.hair;
      else if (classId === 'eyes') baseColor = input.colors?.eyes;
      else if (classId === 'cloth' || classId === 'leather') baseColor = input.colors?.clothing;
      applyMtoonClassToMaterial(material, classId, profile, perf, baseColor);
    }
  });

  return compatibility;
}

/** Portrait / viewer capture must reuse the same renderer path (no alternate style). */
export function capturePortraitFromRenderer(renderer: THREE.WebGLRenderer): string {
  return renderer.domElement.toDataURL('image/png');
}

/** Snapshot of style-relevant fields before SagaDrive MToon profile mutates materials. */
export interface MaterialStyleSnapshot {
  material: THREE.Material;
  color?: string;
  roughness?: number;
  metalness?: number;
  shadeColorFactor?: string;
  shadingToonyFactor?: number;
  shadingShiftFactor?: number;
  outlineWidthMode?: string;
  outlineWidthFactor?: number;
  parametricRimFresnelPowerFactor?: number;
}

/**
 * Capture material style fields after load, before first profile apply.
 * Used by editor MToon preview toggle to restore raw look.
 */
export function captureMaterialStyleSnapshots(root: THREE.Object3D): MaterialStyleSnapshot[] {
  const snapshots: MaterialStyleSnapshot[] = [];
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    for (const material of materialsOf(object)) {
      const record = material as THREE.Material & {
        color?: THREE.Color;
        roughness?: number;
        metalness?: number;
        shadeColorFactor?: THREE.Color;
        shadingToonyFactor?: number;
        shadingShiftFactor?: number;
        outlineWidthMode?: string;
        outlineWidthFactor?: number;
        parametricRimFresnelPowerFactor?: number;
      };
      snapshots.push({
        material,
        color: record.color instanceof THREE.Color ? `#${record.color.getHexString()}` : undefined,
        roughness: typeof record.roughness === 'number' ? record.roughness : undefined,
        metalness: typeof record.metalness === 'number' ? record.metalness : undefined,
        shadeColorFactor:
          record.shadeColorFactor instanceof THREE.Color
            ? `#${record.shadeColorFactor.getHexString()}`
            : undefined,
        shadingToonyFactor:
          typeof record.shadingToonyFactor === 'number' ? record.shadingToonyFactor : undefined,
        shadingShiftFactor:
          typeof record.shadingShiftFactor === 'number' ? record.shadingShiftFactor : undefined,
        outlineWidthMode:
          typeof record.outlineWidthMode === 'string' ? record.outlineWidthMode : undefined,
        outlineWidthFactor:
          typeof record.outlineWidthFactor === 'number' ? record.outlineWidthFactor : undefined,
        parametricRimFresnelPowerFactor:
          typeof record.parametricRimFresnelPowerFactor === 'number'
            ? record.parametricRimFresnelPowerFactor
            : undefined,
      });
    }
  });
  return snapshots;
}

export function restoreMaterialStyleSnapshots(snapshots: readonly MaterialStyleSnapshot[]): void {
  for (const snap of snapshots) {
    const material = snap.material;
    if (!material) continue;
    const record = material as THREE.Material & {
      color?: THREE.Color;
      roughness?: number;
      metalness?: number;
      shadeColorFactor?: THREE.Color;
      shadingToonyFactor?: number;
      shadingShiftFactor?: number;
      outlineWidthMode?: string;
      outlineWidthFactor?: number;
      parametricRimFresnelPowerFactor?: number;
      needsUpdate: boolean;
    };
    if (snap.color && record.color instanceof THREE.Color) record.color.set(snap.color);
    if (typeof snap.roughness === 'number' && typeof record.roughness === 'number') {
      record.roughness = snap.roughness;
    }
    if (typeof snap.metalness === 'number' && typeof record.metalness === 'number') {
      record.metalness = snap.metalness;
    }
    if (snap.shadeColorFactor && record.shadeColorFactor instanceof THREE.Color) {
      record.shadeColorFactor.set(snap.shadeColorFactor);
    }
    if (typeof snap.shadingToonyFactor === 'number' && typeof record.shadingToonyFactor === 'number') {
      record.shadingToonyFactor = snap.shadingToonyFactor;
    }
    if (typeof snap.shadingShiftFactor === 'number' && typeof record.shadingShiftFactor === 'number') {
      record.shadingShiftFactor = snap.shadingShiftFactor;
    }
    if (typeof snap.outlineWidthMode === 'string' && typeof record.outlineWidthMode === 'string') {
      record.outlineWidthMode = snap.outlineWidthMode;
    }
    if (typeof snap.outlineWidthFactor === 'number' && typeof record.outlineWidthFactor === 'number') {
      record.outlineWidthFactor = snap.outlineWidthFactor;
    }
    if (
      typeof snap.parametricRimFresnelPowerFactor === 'number' &&
      typeof record.parametricRimFresnelPowerFactor === 'number'
    ) {
      record.parametricRimFresnelPowerFactor = snap.parametricRimFresnelPowerFactor;
    }
    record.needsUpdate = true;
  }
}

/** Soft studio lights for raw PBR compare (warm key, low cool rim — skin reads less plastic). */
export function applyNeutralPreviewLights(scene: THREE.Scene, lights: MtoonStyleLights): void {
  const bg = '#10141c';
  scene.background = new THREE.Color(bg);
  scene.fog = new THREE.Fog(bg, 16, 36);
  lights.hemisphere.color.set('#e8eef6');
  lights.hemisphere.groundColor.set('#1c222c');
  lights.hemisphere.intensity = 0.42;
  lights.key.color.set('#fff6ea');
  lights.key.intensity = 0.95;
  lights.key.position.set(2.0, 3.8, 2.6);
  lights.fill.color.set('#d5dde8');
  lights.fill.intensity = 0.28;
  lights.fill.position.set(-2.2, 2.0, 1.8);
  lights.rim.color.set('#c8d0dc');
  lights.rim.intensity = 0.08;
  lights.rim.position.set(-1.0, 2.6, -3.0);
}

