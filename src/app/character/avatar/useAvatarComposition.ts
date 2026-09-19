/**
 * useAvatarComposition — app-slice orchestration for V2 composition snapshot (#259).
 * Location: src/app/character/avatar/useAvatarComposition.ts
 *
 * Pure mapping lives in domain; this hook only memoizes the call for CharacterEditor.
 */

import { useMemo } from 'react';
import {
  compositionFromCharacterAvatarDto,
  type AvatarRigCapabilityFlag,
  type AvatarV2Composition,
} from '../../../domains/character/avatar';
import type { CharacterAvatarDto } from '../../../domains/character';

export function useAvatarComposition(
  avatar: CharacterAvatarDto | null | undefined,
  analysisCapabilities?: readonly AvatarRigCapabilityFlag[],
): AvatarV2Composition {
  return useMemo(
    () => compositionFromCharacterAvatarDto(avatar, analysisCapabilities),
    [avatar, analysisCapabilities],
  );
}
