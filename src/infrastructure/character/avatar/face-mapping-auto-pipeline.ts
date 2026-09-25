/**
 * face-mapping-auto-pipeline — character render landmarks → same raycast bindings (#421).
 * Location: src/infrastructure/character/avatar/face-mapping-auto-pipeline.ts
 *
 * Reuses raycastFaceMappingPointer / allowlist — no second binding path.
 */

import type {
  FaceMappingAutoAnchorResultV1,
  FaceMappingAutoSessionResultV1,
} from '../../../domains/character/avatar/face-mapping-auto-v1';
import { FACE_MAPPING_AUTO_CONTRACT_VERSION } from '../../../domains/character/avatar/face-mapping-auto-v1';
import type { FaceMappingRaycastHitV1 } from './face-mapping-raycast';
import {
  MEDIAPIPE_SAGADRIVE_FACE_ANCHOR_MAP_VERSION,
  resolveAllMediaPipeAnchorSamples,
  type NormalizedLandmark2dLike,
} from '../liveact/mediapipe-sagadrive-face-anchor-map-v1';

export interface FaceMappingAutoPipelineInput {
  readonly landmarks: readonly NormalizedLandmark2dLike[];
  readonly faceCount: number;
  readonly canvasWidth: number;
  readonly canvasHeight: number;
  /** Same raycast used by Manual Mapping (canvas CSS pixels). */
  readonly raycast: (canvasX: number, canvasY: number) => FaceMappingRaycastHitV1 | null;
  /** Optional presence score 0..1 (defaults from landmark availability). */
  readonly presenceConfidence?: number;
}

function messageForStatus(
  status: FaceMappingAutoSessionResultV1['status'],
  mapped: number,
): string {
  switch (status) {
    case 'no_face':
      return 'Kein Gesicht im Character-Render erkannt — Framing prüfen oder manuell setzen.';
    case 'multi_face':
      return 'Mehrere Gesichter erkannt — Auto Mapping abgebrochen. Manuell korrigieren.';
    case 'failed':
      return 'Auto Mapping fehlgeschlagen — MediaPipe oder Render nicht verfügbar.';
    case 'incomplete':
      return `Auto Mapping unvollständig (${mapped}/21) — fehlende Marker manuell setzen.`;
    case 'proposed':
      return `Auto Mapping Vorschlag (${mapped}/21) — bitte prüfen und bei Bedarf korrigieren.`;
    default:
      return 'Auto Mapping Status unbekannt.';
  }
}

/**
 * Build a proposed auto-mapping session from IMAGE-mode landmarks + Manual raycast.
 */
export function runFaceMappingAutoPipeline(
  input: FaceMappingAutoPipelineInput,
): FaceMappingAutoSessionResultV1 {
  const { faceCount, canvasWidth, canvasHeight, raycast } = input;

  if (faceCount === 0) {
    return {
      contractVersion: FACE_MAPPING_AUTO_CONTRACT_VERSION,
      status: 'no_face',
      faceCount: 0,
      messageDe: messageForStatus('no_face', 0),
      anchors: [],
      mapVersion: MEDIAPIPE_SAGADRIVE_FACE_ANCHOR_MAP_VERSION,
    };
  }

  if (faceCount > 1) {
    return {
      contractVersion: FACE_MAPPING_AUTO_CONTRACT_VERSION,
      status: 'multi_face',
      faceCount,
      messageDe: messageForStatus('multi_face', 0),
      anchors: [],
      mapVersion: MEDIAPIPE_SAGADRIVE_FACE_ANCHOR_MAP_VERSION,
    };
  }

  if (!(canvasWidth > 0) || !(canvasHeight > 0) || input.landmarks.length === 0) {
    return {
      contractVersion: FACE_MAPPING_AUTO_CONTRACT_VERSION,
      status: 'failed',
      faceCount,
      messageDe: messageForStatus('failed', 0),
      anchors: [],
      mapVersion: MEDIAPIPE_SAGADRIVE_FACE_ANCHOR_MAP_VERSION,
    };
  }

  const samples = resolveAllMediaPipeAnchorSamples(input.landmarks);
  const anchors: FaceMappingAutoAnchorResultV1[] = [];
  let mapped = 0;

  for (const sample of samples) {
    if (!sample.available) {
      anchors.push({
        anchorId: sample.anchorId,
        outcome: 'missing_landmark',
        binding: null,
        confidence: null,
        landmarkAvailability: sample.availability,
        screenX: null,
        screenY: null,
        meshNodeIdentity: null,
        laterality: sample.laterality,
      });
      continue;
    }

    if (sample.availability < 0.34) {
      anchors.push({
        anchorId: sample.anchorId,
        outcome: 'low_confidence',
        binding: null,
        confidence: sample.availability,
        landmarkAvailability: sample.availability,
        screenX: null,
        screenY: null,
        meshNodeIdentity: null,
        laterality: sample.laterality,
      });
      continue;
    }

    const screenX = sample.x * canvasWidth;
    const screenY = sample.y * canvasHeight;
    const hit = raycast(screenX, screenY);
    if (!hit) {
      anchors.push({
        anchorId: sample.anchorId,
        outcome: 'raycast_miss',
        binding: null,
        confidence: sample.availability * (input.presenceConfidence ?? 1),
        landmarkAvailability: sample.availability,
        screenX,
        screenY,
        meshNodeIdentity: null,
        laterality: sample.laterality,
      });
      continue;
    }

    mapped += 1;
    anchors.push({
      anchorId: sample.anchorId,
      outcome: 'mapped',
      binding: hit.binding,
      confidence: sample.availability * (input.presenceConfidence ?? 1),
      landmarkAvailability: sample.availability,
      screenX,
      screenY,
      meshNodeIdentity: hit.binding.nodeIdentity,
      laterality: sample.laterality,
    });
  }

  const status = mapped === 21 ? 'proposed' : mapped > 0 ? 'incomplete' : 'incomplete';
  return {
    contractVersion: FACE_MAPPING_AUTO_CONTRACT_VERSION,
    status,
    faceCount: 1,
    messageDe: messageForStatus(status, mapped),
    anchors,
    mapVersion: MEDIAPIPE_SAGADRIVE_FACE_ANCHOR_MAP_VERSION,
  };
}
