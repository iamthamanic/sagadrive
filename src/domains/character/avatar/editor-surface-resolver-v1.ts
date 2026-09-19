/**
 * Avatar Editor Surface Resolver v1 — pure domain (#259 / Epic #248).
 * Location: src/domains/character/avatar/editor-surface-resolver-v1.ts
 *
 * Maps validated morph/rig capabilities + composition axes → editor surfaces.
 * Source/provider never unlock surfaces. Fail-closed when pending/unknown.
 */

import type { AvatarV2Composition } from './composition-contract-v2';
import {
  resolveAvatarMorphCapabilities,
  type AvatarMorphCapabilityFlag,
} from './morph-contract';
import type { AvatarRigCapabilityFlag } from './rig-contract';

export const AVATAR_EDITOR_SURFACE_RESOLVER_VERSION =
  'SagaDriveAvatarEditorSurfaceResolverV1' as const;

export const AVATAR_EDITOR_SURFACE_IDS = [
  'morphBody',
  'morphFace',
  'traits',
  'clothing',
  'colors',
  'facial',
  'equipment',
] as const;

export type AvatarEditorSurfaceId = (typeof AVATAR_EDITOR_SURFACE_IDS)[number];

export type AvatarEditorCapabilityStatus = 'pending' | 'ready' | 'limited' | 'failed';

export type AvatarEditorSurfaceMap = Readonly<Record<AvatarEditorSurfaceId, boolean>>;

export interface AvatarMorphEvidenceInput {
  hasBodyMorphTargets: boolean;
  hasFaceMorphTargets: boolean;
}

export interface AvatarMorphEvidenceResolution {
  status: 'pending' | 'ready';
  morphFlags: readonly AvatarMorphCapabilityFlag[];
  limitations: readonly string[];
}

export interface AvatarEditorSurfaces {
  contractVersion: typeof AVATAR_EDITOR_SURFACE_RESOLVER_VERSION;
  status: AvatarEditorCapabilityStatus;
  surfaces: AvatarEditorSurfaceMap;
  morphFlags: readonly AvatarMorphCapabilityFlag[];
  /** End-user DE summary — no internal ticket/contract shorthand. */
  summaryDe: string;
  limitations: readonly string[];
}

const ALL_OFF: AvatarEditorSurfaceMap = {
  morphBody: false,
  morphFace: false,
  traits: false,
  clothing: false,
  colors: false,
  facial: false,
  equipment: false,
};

/**
 * Resolve morph evidence without reading AvatarSource.
 * Catalog edit-norm uses composition anatomy/modularity only (not source labels).
 */
export function resolveMorphEvidenceForComposition(input: {
  composition: Pick<AvatarV2Composition, 'anatomy' | 'modularity'>;
  hasExternalModel: boolean;
  /** null = inspection still pending for an external mesh. */
  inspected?: AvatarMorphEvidenceInput | null;
}): AvatarMorphEvidenceResolution {
  if (input.composition.anatomy === 'custom-creature') {
    return {
      status: 'ready',
      morphFlags: [],
      limitations: [
        'Dieser Körper ist keine Humanoid-Vorlage — Körper-/Gesichts-Morphs sind nicht verfügbar.',
      ],
    };
  }

  // Catalog modular humanoid without external mesh → edit-norm morphs (composition axes).
  if (
    !input.hasExternalModel &&
    input.composition.anatomy === 'humanoid' &&
    input.composition.modularity === 'modular-parts'
  ) {
    return {
      status: 'ready',
      morphFlags: resolveAvatarMorphCapabilities({
        hasBodyMorphTargets: true,
        hasFaceMorphTargets: true,
      }).flags,
      limitations: [],
    };
  }

  if (input.hasExternalModel) {
    if (input.inspected == null) {
      return {
        status: 'pending',
        morphFlags: [],
        limitations: ['Avatar-Struktur wird noch geprüft — Editor-Funktionen folgen danach.'],
      };
    }
    const caps = resolveAvatarMorphCapabilities(input.inspected);
    const limitations: string[] = [];
    if (!input.inspected.hasBodyMorphTargets) {
      limitations.push('Keine Körper-Morph-Targets erkannt.');
    }
    if (!input.inspected.hasFaceMorphTargets) {
      limitations.push('Keine Gesichts-Morph-Targets erkannt.');
    }
    return {
      status: 'ready',
      morphFlags: caps.flags,
      limitations,
    };
  }

  return {
    status: 'ready',
    morphFlags: [],
    limitations: ['Für diesen Avatar sind keine Morph-Controls freigeschaltet.'],
  };
}

function buildSummaryDe(input: {
  status: AvatarEditorCapabilityStatus;
  surfaces: AvatarEditorSurfaceMap;
  limitations: readonly string[];
}): string {
  if (input.status === 'pending') {
    return 'Analyse läuft · Funktionen folgen nach der Prüfung';
  }
  if (input.status === 'failed') {
    return 'Analyse fehlgeschlagen · Bearbeitung eingeschränkt';
  }

  const parts: string[] = [];
  if (input.surfaces.morphBody || input.surfaces.morphFace) {
    const body = input.surfaces.morphBody ? 'Körper' : null;
    const face = input.surfaces.morphFace ? 'Gesicht' : null;
    parts.push([body, face].filter(Boolean).join('/') + ' editierbar');
  } else {
    parts.push('Körper/Gesicht nicht morphbar');
  }
  parts.push(input.surfaces.traits ? 'Traits möglich' : 'keine Traits');
  parts.push(input.surfaces.facial ? 'Facial möglich' : 'kein Facial');
  parts.push(input.surfaces.equipment ? 'Wearables möglich' : 'starres Equipment');
  if (input.status === 'limited' && input.limitations.length > 0) {
    parts.push('eingeschränkt');
  }
  return parts.join(' · ');
}

/**
 * Map validated capabilities + composition → which editor surfaces are shown.
 * Never consults AvatarSource / provider ids.
 */
export function resolveAvatarEditorSurfaces(input: {
  composition: Pick<AvatarV2Composition, 'anatomy' | 'modularity'>;
  morphFlags: readonly AvatarMorphCapabilityFlag[];
  rigFlags?: readonly AvatarRigCapabilityFlag[];
  status: AvatarEditorCapabilityStatus;
  limitations?: readonly string[];
}): AvatarEditorSurfaces {
  const limitations = input.limitations ? [...input.limitations] : [];
  const morphFlags = [...input.morphFlags];
  const rigFlags = input.rigFlags ?? [];

  if (input.status === 'pending') {
    return {
      contractVersion: AVATAR_EDITOR_SURFACE_RESOLVER_VERSION,
      status: 'pending',
      surfaces: ALL_OFF,
      morphFlags: [],
      summaryDe: buildSummaryDe({ status: 'pending', surfaces: ALL_OFF, limitations }),
      limitations:
        limitations.length > 0
          ? limitations
          : ['Avatar-Struktur wird noch geprüft — Editor-Funktionen folgen danach.'],
    };
  }

  if (input.status === 'failed') {
    return {
      contractVersion: AVATAR_EDITOR_SURFACE_RESOLVER_VERSION,
      status: 'failed',
      surfaces: ALL_OFF,
      morphFlags: [],
      summaryDe: buildSummaryDe({ status: 'failed', surfaces: ALL_OFF, limitations }),
      limitations:
        limitations.length > 0
          ? limitations
          : ['Avatar-Analyse fehlgeschlagen — Bearbeitung nicht freigeschaltet.'],
    };
  }

  const morphBody = morphFlags.includes('morph-body-v1');
  const morphFace = morphFlags.includes('morph-face-v1');
  const modularHumanoid =
    input.composition.anatomy === 'humanoid' &&
    input.composition.modularity === 'modular-parts';
  const traits = modularHumanoid;
  const clothing = modularHumanoid;
  const colors = morphBody || morphFace || traits;
  const facial = morphFace;
  const equipment =
    rigFlags.includes('rigid-equipment-ready') ||
    rigFlags.includes('skinned-wearable-ready');

  const surfaces: AvatarEditorSurfaceMap = {
    morphBody,
    morphFace,
    traits,
    clothing,
    colors,
    facial,
    equipment,
  };

  const anySurface = AVATAR_EDITOR_SURFACE_IDS.some((id) => surfaces[id]);
  const status: AvatarEditorCapabilityStatus =
    input.status === 'limited' || (limitations.length > 0 && !anySurface)
      ? 'limited'
      : limitations.length > 0
        ? 'limited'
        : 'ready';

  return {
    contractVersion: AVATAR_EDITOR_SURFACE_RESOLVER_VERSION,
    status,
    surfaces,
    morphFlags,
    summaryDe: buildSummaryDe({ status, surfaces, limitations }),
    limitations,
  };
}

/**
 * Convenience: evidence → surfaces in one pure step (fixtures / CharacterEditor).
 */
export function resolveEditorSurfacesFromAvatarState(input: {
  composition: Pick<AvatarV2Composition, 'anatomy' | 'modularity'>;
  hasExternalModel: boolean;
  inspected?: AvatarMorphEvidenceInput | null;
  rigFlags?: readonly AvatarRigCapabilityFlag[];
  forceStatus?: AvatarEditorCapabilityStatus;
}): AvatarEditorSurfaces {
  if (input.forceStatus === 'failed') {
    return resolveAvatarEditorSurfaces({
      composition: input.composition,
      morphFlags: [],
      rigFlags: input.rigFlags,
      status: 'failed',
    });
  }

  const evidence = resolveMorphEvidenceForComposition({
    composition: input.composition,
    hasExternalModel: input.hasExternalModel,
    inspected: input.inspected,
  });

  const status: AvatarEditorCapabilityStatus =
    input.forceStatus === 'pending' || evidence.status === 'pending'
      ? 'pending'
      : evidence.limitations.length > 0 && evidence.morphFlags.length === 0
        ? 'limited'
        : 'ready';

  return resolveAvatarEditorSurfaces({
    composition: input.composition,
    morphFlags: evidence.morphFlags,
    rigFlags: input.rigFlags,
    status,
    limitations: evidence.limitations,
  });
}
