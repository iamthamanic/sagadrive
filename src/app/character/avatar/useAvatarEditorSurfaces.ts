/**
 * useAvatarEditorSurfaces — app-slice orchestration for capability→UI surfaces (#259).
 * Location: src/app/character/avatar/useAvatarEditorSurfaces.ts
 *
 * No business rules: delegates to resolveEditorSurfacesFromAvatarState.
 */

import { useMemo } from 'react';
import {
  resolveEditorSurfacesFromAvatarState,
  type AvatarEditorCapabilityStatus,
  type AvatarEditorSurfaces,
  type AvatarMorphEvidenceInput,
  type AvatarRigCapabilityFlag,
  type AvatarV2Composition,
} from '../../../domains/character/avatar';

export interface UseAvatarEditorSurfacesInput {
  composition: Pick<AvatarV2Composition, 'anatomy' | 'modularity'>;
  hasExternalModel: boolean;
  /** null = pending inspection for external mesh; omit for catalog path. */
  inspected?: AvatarMorphEvidenceInput | null;
  rigFlags?: readonly AvatarRigCapabilityFlag[];
  forceStatus?: AvatarEditorCapabilityStatus;
}

export function useAvatarEditorSurfaces(
  input: UseAvatarEditorSurfacesInput,
): AvatarEditorSurfaces {
  const {
    composition,
    hasExternalModel,
    inspected,
    rigFlags,
    forceStatus,
  } = input;

  return useMemo(
    () =>
      resolveEditorSurfacesFromAvatarState({
        composition,
        hasExternalModel,
        inspected,
        rigFlags,
        forceStatus,
      }),
    [composition, hasExternalModel, inspected, rigFlags, forceStatus],
  );
}
