/**
 * liveact-character-face-debug — deformed face anchor → screen debug sampling (#400).
 * Location: src/infrastructure/character/liveact/liveact-character-face-debug.ts
 *
 * No scene graph mutation; projects evaluated SagaDriveFaceAnchorsV1 via runtime camera.
 */

import * as THREE from 'three';
import type { SagaDriveFaceAnchorId, SagaDriveFaceAnchorsManifestV1 } from '../../../domains/character/avatar/face-anchor-contract';
import type { LiveActFaceLandmark2d } from '../../../domains/character/liveact/liveact-face-diagnostics';
import {
  buildLiveActFaceLandmarksFromAnchorScreenPoints,
  computeLiveActFaceMetrics,
  type LiveActFaceMetricsV1,
} from '../../../domains/character/liveact/liveact-face-metrics';
import {
  evaluateFaceAnchorsManifest,
  type FaceAnchorEvaluationV1,
} from '../avatar/face-anchor-runtime';

export interface LiveActCharacterFaceScreenPoint {
  readonly x: number;
  readonly y: number;
}

export interface LiveActCharacterFaceDebugContours {
  readonly lips: readonly LiveActCharacterFaceScreenPoint[];
  readonly leftEye: readonly LiveActCharacterFaceScreenPoint[];
  readonly rightEye: readonly LiveActCharacterFaceScreenPoint[];
  readonly leftEyebrow: readonly LiveActCharacterFaceScreenPoint[];
  readonly rightEyebrow: readonly LiveActCharacterFaceScreenPoint[];
}

export interface LiveActCharacterFaceDebugSnapshot {
  readonly available: boolean;
  readonly canvasWidth: number;
  readonly canvasHeight: number;
  readonly contours: LiveActCharacterFaceDebugContours | null;
  readonly metrics: LiveActFaceMetricsV1;
}

/** Minimum anchor ids for overlay + metrics — fail closed when missing. */
export const LIVEACT_CHARACTER_FACE_OVERLAY_ANCHOR_IDS = [
  'mouthUpper',
  'mouthLower',
  'mouthCornerLeft',
  'mouthCornerRight',
  'eyeLeftInner',
  'eyeLeftOuter',
  'eyeLeftUpper',
  'eyeLeftLower',
  'eyeRightInner',
  'eyeRightOuter',
  'eyeRightUpper',
  'eyeRightLower',
  'browLeftInner',
  'browLeftCenter',
  'browLeftOuter',
  'browRightInner',
  'browRightCenter',
  'browRightOuter',
] as const satisfies readonly SagaDriveFaceAnchorId[];

export interface LiveActCharacterFaceDebugHandle {
  /** In-place snapshot updated by {@link sample}. */
  readonly snapshot: LiveActCharacterFaceDebugSnapshot;
  sample(): void;
  isMappingAvailable(): boolean;
}

export interface LiveActCharacterFaceDebugController {
  bindModelRoot(root: THREE.Object3D | null): void;
  bindManifest(manifest: SagaDriveFaceAnchorsManifestV1 | null): void;
  setEnabled(enabled: boolean): void;
  isEnabled(): boolean;
  isMappingAvailable(): boolean;
  getHandle(): LiveActCharacterFaceDebugHandle;
  /** Hide overlay sampling during portrait capture (no WebGL side effects). */
  runWithoutSampling<T>(fn: () => T): T;
  dispose(): void;
}

const _project = new THREE.Vector3();

function projectWorldToCanvas(
  camera: THREE.PerspectiveCamera,
  x: number,
  y: number,
  z: number,
  canvasWidth: number,
  canvasHeight: number,
): LiveActCharacterFaceScreenPoint | null {
  _project.set(x, y, z);
  _project.project(camera);
  if (!Number.isFinite(_project.x) || !Number.isFinite(_project.y)) return null;
  if (_project.z > 1) return null;
  return {
    x: (_project.x * 0.5 + 0.5) * canvasWidth,
    y: (-_project.y * 0.5 + 0.5) * canvasHeight,
  };
}

function pickScreen(
  screen: Partial<Record<SagaDriveFaceAnchorId, LiveActCharacterFaceScreenPoint>>,
  id: SagaDriveFaceAnchorId,
): LiveActCharacterFaceScreenPoint | null {
  return screen[id] ?? null;
}

function buildContours(
  screen: Partial<Record<SagaDriveFaceAnchorId, LiveActCharacterFaceScreenPoint>>,
): LiveActCharacterFaceDebugContours | null {
  const mouthUpper = pickScreen(screen, 'mouthUpper');
  const mouthLower = pickScreen(screen, 'mouthLower');
  const mouthCornerLeft = pickScreen(screen, 'mouthCornerLeft');
  const mouthCornerRight = pickScreen(screen, 'mouthCornerRight');
  const li = pickScreen(screen, 'eyeLeftInner');
  const lo = pickScreen(screen, 'eyeLeftOuter');
  const lu = pickScreen(screen, 'eyeLeftUpper');
  const ll = pickScreen(screen, 'eyeLeftLower');
  const ri = pickScreen(screen, 'eyeRightInner');
  const ro = pickScreen(screen, 'eyeRightOuter');
  const ru = pickScreen(screen, 'eyeRightUpper');
  const rl = pickScreen(screen, 'eyeRightLower');
  const bli = pickScreen(screen, 'browLeftInner');
  const blc = pickScreen(screen, 'browLeftCenter');
  const blo = pickScreen(screen, 'browLeftOuter');
  const bri = pickScreen(screen, 'browRightInner');
  const brc = pickScreen(screen, 'browRightCenter');
  const bro = pickScreen(screen, 'browRightOuter');

  if (
    !mouthUpper ||
    !mouthLower ||
    !mouthCornerLeft ||
    !mouthCornerRight ||
    !li ||
    !lo ||
    !lu ||
    !ll ||
    !ri ||
    !ro ||
    !ru ||
    !rl ||
    !bli ||
    !blc ||
    !blo ||
    !bri ||
    !brc ||
    !bro
  ) {
    return null;
  }

  return {
    lips: [mouthUpper, mouthCornerLeft, mouthLower, mouthCornerRight],
    leftEye: [li, lu, lo, ll],
    rightEye: [ri, ru, ro, rl],
    leftEyebrow: [bli, blc, blo],
    rightEyebrow: [bri, brc, bro],
  };
}

function toNormalizedLandmark(
  p: LiveActCharacterFaceScreenPoint,
  width: number,
  height: number,
): LiveActFaceLandmark2d {
  return {
    x: width > 0 ? p.x / width : 0,
    y: height > 0 ? p.y / height : 0,
  };
}

function evaluationsAvailable(
  evaluations: Readonly<Partial<Record<SagaDriveFaceAnchorId, FaceAnchorEvaluationV1>>>,
  ids: readonly SagaDriveFaceAnchorId[],
): boolean {
  for (const id of ids) {
    const ev = evaluations[id];
    if (!ev || ev.status !== 'available') return false;
  }
  return true;
}

const EMPTY_METRICS: LiveActFaceMetricsV1 = {
  available: false,
  mouthGap: null,
  eyeOpenLeft: null,
  eyeOpenRight: null,
  browLiftLeft: null,
  browLiftRight: null,
  bbox: null,
};

export function createLiveActCharacterFaceDebugController(deps: {
  camera: THREE.PerspectiveCamera;
  getCanvasSize: () => { width: number; height: number };
}): LiveActCharacterFaceDebugController {
  let modelRoot: THREE.Object3D | null = null;
  let manifest: SagaDriveFaceAnchorsManifestV1 | null = null;
  let enabled = false;
  let suppressSampling = false;

  let snapshot: LiveActCharacterFaceDebugSnapshot = {
    available: false,
    canvasWidth: 1,
    canvasHeight: 1,
    contours: null,
    metrics: EMPTY_METRICS,
  };

  const handle: LiveActCharacterFaceDebugHandle = {
    get snapshot() {
      return snapshot;
    },
    sample() {
      if (suppressSampling || !enabled || !modelRoot || !manifest) {
        const { width, height } = deps.getCanvasSize();
        snapshot = {
          available: false,
          canvasWidth: width,
          canvasHeight: height,
          contours: null,
          metrics: EMPTY_METRICS,
        };
        return;
      }

      const { width, height } = deps.getCanvasSize();
      const evaluated = evaluateFaceAnchorsManifest(modelRoot, manifest);
      if (!evaluationsAvailable(evaluated.evaluations, LIVEACT_CHARACTER_FACE_OVERLAY_ANCHOR_IDS)) {
        snapshot = {
          available: false,
          canvasWidth: width,
          canvasHeight: height,
          contours: null,
          metrics: EMPTY_METRICS,
        };
        return;
      }

      const screen: Partial<Record<SagaDriveFaceAnchorId, LiveActCharacterFaceScreenPoint>> = {};
      for (const id of LIVEACT_CHARACTER_FACE_OVERLAY_ANCHOR_IDS) {
        const ev = evaluated.evaluations[id];
        if (!ev || ev.status !== 'available') continue;
        const projected = projectWorldToCanvas(
          deps.camera,
          ev.x,
          ev.y,
          ev.z,
          width,
          height,
        );
        if (projected) screen[id] = projected;
      }

      const contours = buildContours(screen);
      if (!contours) {
        snapshot = {
          available: false,
          canvasWidth: width,
          canvasHeight: height,
          contours: null,
          metrics: EMPTY_METRICS,
        };
        return;
      }

      const normalized: Partial<Record<SagaDriveFaceAnchorId, LiveActFaceLandmark2d>> = {};
      for (const id of LIVEACT_CHARACTER_FACE_OVERLAY_ANCHOR_IDS) {
        const pt = screen[id];
        if (pt) normalized[id] = toNormalizedLandmark(pt, width, height);
      }
      const landmarks = buildLiveActFaceLandmarksFromAnchorScreenPoints(normalized);
      const metrics = computeLiveActFaceMetrics(landmarks);

      snapshot = {
        available: true,
        canvasWidth: width,
        canvasHeight: height,
        contours,
        metrics,
      };
    },
    isMappingAvailable() {
      return Boolean(manifest && modelRoot);
    },
  };

  return {
    bindModelRoot(root) {
      modelRoot = root;
    },
    bindManifest(next) {
      manifest = next;
    },
    setEnabled(next) {
      enabled = next;
    },
    isEnabled() {
      return enabled;
    },
    isMappingAvailable() {
      return handle.isMappingAvailable();
    },
    getHandle() {
      return handle;
    },
    runWithoutSampling(fn) {
      suppressSampling = true;
      try {
        return fn();
      } finally {
        suppressSampling = false;
      }
    },
    dispose() {
      enabled = false;
      modelRoot = null;
      manifest = null;
      snapshot = {
        available: false,
        canvasWidth: 1,
        canvasHeight: 1,
        contours: null,
        metrics: EMPTY_METRICS,
      };
    },
  };
}
