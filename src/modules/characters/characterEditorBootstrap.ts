/**
 * characterEditorBootstrap — One-shot draft for opening CharacterEditor from a preset.
 * Location: src/modules/characters/characterEditorBootstrap.ts
 */
import type { CharacterPresetSnapshot } from './types/characterPreset.types';

export type CharacterEditorBootstrap =
  | {
      kind: 'preset-snapshot';
      /** Prefill name (editable); defaults to preset display name. */
      characterName: string;
      snapshot: CharacterPresetSnapshot;
    }
  | {
      kind: 'character-edit';
      characterId: string;
    };

let pendingBootstrap: CharacterEditorBootstrap | null = null;

export function setCharacterEditorBootstrap(bootstrap: CharacterEditorBootstrap | null): void {
  pendingBootstrap = bootstrap;
  if (typeof sessionStorage !== 'undefined') {
    if (bootstrap?.kind === 'character-edit') {
      sessionStorage.setItem('sagadrive:character-edit-id', bootstrap.characterId);
    } else {
      sessionStorage.removeItem('sagadrive:character-edit-id');
    }
  }
}

export function takeCharacterEditorBootstrap(): CharacterEditorBootstrap | null {
  return pendingBootstrap;
}

export function clearCharacterEditorBootstrap(): void {
  pendingBootstrap = null;
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem('sagadrive:character-edit-id');
  }
}
