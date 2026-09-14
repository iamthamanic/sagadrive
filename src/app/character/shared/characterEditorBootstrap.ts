/**
 * characterEditorBootstrap — One-shot draft for opening CharacterEditor from a preset
 * or NPC/creature promotion (#200).
 * Location: src/app/character/shared/characterEditorBootstrap.ts
 */
import type { CharacterPresetSnapshot } from '../../../domains/character/contracts/character-preset.types';
import type { NpcPromotionPlan } from '../../../domains/npc-creature';

const CHARACTER_EDIT_STORAGE_KEY = 'sagadrive:character-edit-id';
const NPC_PROMOTION_STORAGE_KEY = 'sagadrive:npc-promotion';

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
    }
  | {
      kind: 'npc-promotion';
      plan: NpcPromotionPlan;
    };

let pendingBootstrap: CharacterEditorBootstrap | null = null;

function clearNpcPromotionStorage(): void {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(NPC_PROMOTION_STORAGE_KEY);
  }
}

function clearCharacterEditStorage(): void {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(CHARACTER_EDIT_STORAGE_KEY);
  }
}

export function setCharacterEditorBootstrap(bootstrap: CharacterEditorBootstrap | null): void {
  pendingBootstrap = bootstrap;
  if (typeof sessionStorage === 'undefined') return;

  if (bootstrap?.kind === 'character-edit') {
    sessionStorage.setItem(CHARACTER_EDIT_STORAGE_KEY, bootstrap.characterId);
    clearNpcPromotionStorage();
    return;
  }

  if (bootstrap?.kind === 'npc-promotion') {
    sessionStorage.setItem(NPC_PROMOTION_STORAGE_KEY, JSON.stringify(bootstrap.plan));
    clearCharacterEditStorage();
    return;
  }

  clearCharacterEditStorage();
  clearNpcPromotionStorage();
}

export function takeCharacterEditorBootstrap(): CharacterEditorBootstrap | null {
  if (pendingBootstrap) return pendingBootstrap;

  if (typeof sessionStorage === 'undefined') return null;

  const storedPromotion = sessionStorage.getItem(NPC_PROMOTION_STORAGE_KEY);
  if (!storedPromotion) return null;

  try {
    const plan = JSON.parse(storedPromotion) as NpcPromotionPlan;
    if (
      plan
      && (plan.kind === 'template-to-character' || plan.kind === 'compact-to-full')
      && typeof plan.sourceDefinitionId === 'string'
      && plan.editorSeed
    ) {
      return { kind: 'npc-promotion', plan };
    }
  } catch (error) {
    console.error('NPC promotion bootstrap parse failed:', error);
  }

  return null;
}

export function clearCharacterEditorBootstrap(): void {
  pendingBootstrap = null;
  clearCharacterEditStorage();
  clearNpcPromotionStorage();
}
