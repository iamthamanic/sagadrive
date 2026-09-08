/**
 * character area — composition-root screen entry (heavy editor mount).
 * Location: src/app/character/root.ts
 *
 * Kept separate from `index.ts` so light consumers (hooks/dialogs) do not
 * eagerly load CharacterEditor.
 */
export { CharacterEditor } from './edit/CharacterEditor';
