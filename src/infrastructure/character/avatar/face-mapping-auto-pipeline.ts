/**
 * face-mapping-auto-pipeline — character render landmarks → same raycast bindings (#421).
 * Location: src/infrastructure/character/avatar/face-mapping-auto-pipeline.ts
 *
 * Reuses listFaceMappingRaycastCandidates / allowlist — no second binding path.
 * Auto may select a later semantically allowed hit (depth-gated) or a small screen snap.
 */

import type {
  FaceMappingAutoAnchorResultV1,
  FaceMappingAutoSessionResultV1,
  FaceMappingAutoSurfaceSelectionEvidenceV1,
} from '../../../domains/character/avatar/face-mapping-auto-v1';
import { FACE_MAPPING_AUTO_CONTRACT_VERSION } from '../../../domains/character/avatar/face-mapping-auto-v1';
import {
  buildFaceMappingScreenSnapOffsets,
  computeFaceMappingFaceWidthWorld,
  faceMappingScreenSnapBiasForAnchor,
  selectFaceMappingSurfaceAwareCandidate,
} from '../../../domains/character/avatar/face-mapping-auto-surface-select-v1';
import type { SagaDriveFaceAnchorId } from '../../../domains/character/avatar/face-anchor-contract';
import type { FaceMappingRaycastCandidateV1 } from './face-mapping-raycast';
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
  /**
   * Ordered allowlisted hits for one canvas point (same path as Manual Mapping).
   * Prefer this over a single-hit raycast so Auto can surface-select.
   */
  readonly listRaycastCandidates: (
    canvasX: number,
    canvasY: number,
  ) => readonly FaceMappingRaycastCandidateV1[];
  /** Optional presence score 0..1 (defaults from landmark availability). */
  readonly presenceConfidence?: number;
  /** Optional world-space face width for depth gate (when known). */
  readonly faceWidthWorld?: number | null;
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

function trySelectFromCandidates(
  candidates: readonly FaceMappingRaycastCandidateV1[],
  anchorId: SagaDriveFaceAnchorId,
  faceWidthWorld: number | null | undefined,
): {
  candidate: FaceMappingRaycastCandidateV1 | null;
  evidence: FaceMappingAutoSurfaceSelectionEvidenceV1;
} {
  const selection = selectFaceMappingSurfaceAwareCandidate(candidates, anchorId, {
    faceWidthWorld,
  });
  const selected =
    selection.selectedIndex != null ? (candidates[selection.selectedIndex] ?? null) : null;
  return {
    candidate: selected,
    evidence: {
      strategy: selection.strategy,
      originalScreenX: 0,
      originalScreenY: 0,
      resolvedScreenX: null,
      resolvedScreenY: null,
      snapDistancePx: null,
      normalizedSnapDistance: null,
      maxDepthDelta: selection.maxDepthDelta,
      selectedSurface: selected?.nodeIdentity ?? null,
      candidates: selection.candidates,
    },
  };
}

/**
 * Build a proposed auto-mapping session from IMAGE-mode landmarks + Manual raycast candidates.
 */
export function runFaceMappingAutoPipeline(
  input: FaceMappingAutoPipelineInput,
): FaceMappingAutoSessionResultV1 {
  const { faceCount, canvasWidth, canvasHeight, listRaycastCandidates } = input;

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
  const byId = new Map(samples.map((s) => [s.anchorId, s]));
  const leftOuter = byId.get('eyeLeftOuter');
  const rightOuter = byId.get('eyeRightOuter');
  let interocularPx: number | null = null;
  if (
    leftOuter?.available &&
    rightOuter?.available &&
    leftOuter.x != null &&
    rightOuter.x != null
  ) {
    interocularPx =
      Math.hypot(
        (leftOuter.x - rightOuter.x) * canvasWidth,
        (leftOuter.y - rightOuter.y) * canvasHeight,
      ) || null;
  }

  let faceWidthWorld = input.faceWidthWorld ?? null;
  if (
    faceWidthWorld == null &&
    leftOuter?.available &&
    rightOuter?.available
  ) {
    const lHits = listRaycastCandidates(
      leftOuter.x * canvasWidth,
      leftOuter.y * canvasHeight,
    );
    const rHits = listRaycastCandidates(
      rightOuter.x * canvasWidth,
      rightOuter.y * canvasHeight,
    );
    faceWidthWorld = computeFaceMappingFaceWidthWorld(
      lHits[0]?.worldPoint ?? null,
      rHits[0]?.worldPoint ?? null,
    );
  }

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
    const confidence = sample.availability * (input.presenceConfidence ?? 1);
    const primaryCandidates = listRaycastCandidates(screenX, screenY);

    if (primaryCandidates.length === 0) {
      // Screen snap neighborhood before giving up as miss.
      const bias = faceMappingScreenSnapBiasForAnchor(sample.anchorId);
      const offsets = buildFaceMappingScreenSnapOffsets({
        bias,
        interocularPx,
      });
      let snapped: FaceMappingRaycastCandidateV1 | null = null;
      let snapEvidence: FaceMappingAutoSurfaceSelectionEvidenceV1 | null = null;
      for (const off of offsets) {
        const sx = screenX + off.dx;
        const sy = screenY + off.dy;
        if (sx < 0 || sy < 0 || sx > canvasWidth || sy > canvasHeight) continue;
        const cands = listRaycastCandidates(sx, sy);
        const attempt = trySelectFromCandidates(
          cands,
          sample.anchorId,
          faceWidthWorld,
        );
        if (attempt.candidate) {
          const snapDistancePx = Math.hypot(off.dx, off.dy);
          snapped = attempt.candidate;
          snapEvidence = {
            ...attempt.evidence,
            strategy: 'screen_snap',
            originalScreenX: screenX,
            originalScreenY: screenY,
            resolvedScreenX: sx,
            resolvedScreenY: sy,
            snapDistancePx,
            normalizedSnapDistance:
              interocularPx != null && interocularPx > 1e-6
                ? snapDistancePx / interocularPx
                : null,
            selectedSurface: attempt.candidate.nodeIdentity,
          };
          break;
        }
      }

      if (snapped && snapEvidence) {
        mapped += 1;
        anchors.push({
          anchorId: sample.anchorId,
          outcome: 'mapped',
          binding: snapped.binding,
          confidence,
          landmarkAvailability: sample.availability,
          screenX: snapEvidence.resolvedScreenX,
          screenY: snapEvidence.resolvedScreenY,
          meshNodeIdentity: snapped.nodeIdentity,
          laterality: sample.laterality,
          surfaceSelection: snapEvidence,
        });
        continue;
      }

      anchors.push({
        anchorId: sample.anchorId,
        outcome: 'raycast_miss',
        binding: null,
        confidence,
        landmarkAvailability: sample.availability,
        screenX,
        screenY,
        meshNodeIdentity: null,
        laterality: sample.laterality,
        surfaceSelection: {
          strategy: 'raycast_miss',
          originalScreenX: screenX,
          originalScreenY: screenY,
          resolvedScreenX: null,
          resolvedScreenY: null,
          snapDistancePx: null,
          normalizedSnapDistance: null,
          maxDepthDelta: null,
          selectedSurface: null,
          candidates: [],
        },
      });
      continue;
    }

    const primary = trySelectFromCandidates(
      primaryCandidates,
      sample.anchorId,
      faceWidthWorld,
    );
    const primaryEvidence: FaceMappingAutoSurfaceSelectionEvidenceV1 = {
      ...primary.evidence,
      originalScreenX: screenX,
      originalScreenY: screenY,
      resolvedScreenX: primary.candidate ? screenX : null,
      resolvedScreenY: primary.candidate ? screenY : null,
    };

    if (primary.candidate) {
      mapped += 1;
      anchors.push({
        anchorId: sample.anchorId,
        outcome: 'mapped',
        binding: primary.candidate.binding,
        confidence,
        landmarkAvailability: sample.availability,
        screenX,
        screenY,
        meshNodeIdentity: primary.candidate.nodeIdentity,
        laterality: sample.laterality,
        surfaceSelection: primaryEvidence,
      });
      continue;
    }

    // Same-ray had no depth-gated allowed hit → local semantic screen snap.
    const bias = faceMappingScreenSnapBiasForAnchor(sample.anchorId);
    const offsets = buildFaceMappingScreenSnapOffsets({
      bias,
      interocularPx,
    });
    let snapped: FaceMappingRaycastCandidateV1 | null = null;
    let snapEvidence: FaceMappingAutoSurfaceSelectionEvidenceV1 | null = null;
    for (const off of offsets) {
      const sx = screenX + off.dx;
      const sy = screenY + off.dy;
      if (sx < 0 || sy < 0 || sx > canvasWidth || sy > canvasHeight) continue;
      const cands = listRaycastCandidates(sx, sy);
      const attempt = trySelectFromCandidates(
        cands,
        sample.anchorId,
        faceWidthWorld,
      );
      if (attempt.candidate) {
        const snapDistancePx = Math.hypot(off.dx, off.dy);
        snapped = attempt.candidate;
        snapEvidence = {
          ...attempt.evidence,
          strategy: 'screen_snap',
          originalScreenX: screenX,
          originalScreenY: screenY,
          resolvedScreenX: sx,
          resolvedScreenY: sy,
          snapDistancePx,
          normalizedSnapDistance:
            interocularPx != null && interocularPx > 1e-6
              ? snapDistancePx / interocularPx
              : null,
          selectedSurface: attempt.candidate.nodeIdentity,
        };
        break;
      }
    }

    if (snapped && snapEvidence) {
      mapped += 1;
      anchors.push({
        anchorId: sample.anchorId,
        outcome: 'mapped',
        binding: snapped.binding,
        confidence,
        landmarkAvailability: sample.availability,
        screenX: snapEvidence.resolvedScreenX,
        screenY: snapEvidence.resolvedScreenY,
        meshNodeIdentity: snapped.nodeIdentity,
        laterality: sample.laterality,
        surfaceSelection: snapEvidence,
      });
      continue;
    }

    anchors.push({
      anchorId: sample.anchorId,
      outcome: 'surface_mismatch',
      binding: null,
      confidence,
      landmarkAvailability: sample.availability,
      screenX,
      screenY,
      meshNodeIdentity: primaryCandidates[0]?.nodeIdentity ?? null,
      laterality: sample.laterality,
      surfaceSelection: primaryEvidence,
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
