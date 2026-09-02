/**
 * characterEditorBootstrap — One-shot draft for opening CharacterEditor from a preset.
 * Location: src/modules/characters/characterEditorBootstrap.ts
 */
import type { CharacterPresetSnapshot } from './types/characterPreset.types';

export type CharacterEditorBootstrap = {
  kind: 'preset-snapshot';
  /** Prefill name (editable); defaults to preset display name. */
  characterName: string;
  snapshot: CharacterPresetSnapshot;
};

let pendingBootstrap: CharacterEditorBootstrap | null = null;

export function setCharacterEditorBootstrap(bootstrap: CharacterEditorBootstrap | null): void {
  pendingBootstrap = bootstrap;
}

export function takeCharacterEditorBootstrap(): CharacterEditorBootstrap | null {
  const next = pendingBootstrap;
  pendingBootstrap = null;
  return next;
}

export function clearCharacterEditorBootstrap(): void {
  pendingBootstrap = null;
}
