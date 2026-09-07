/**
 * character area — public API for other app areas.
 * Location: src/app/character/index.ts
 *
 * Intra-character slice rules (edit/creation/progression) stay in the character
 * cross-slice checker; this barrel is only for app/<other> → character.
 */
export { useCharacters, useCharacterSummaries } from './list';
export { CreateCharacterEntryDialog } from './creation/CreateCharacterEntryDialog';
export {
  setCharacterEditorBootstrap,
  takeCharacterEditorBootstrap,
  clearCharacterEditorBootstrap,
} from './shared/characterEditorBootstrap';
export { InventoryItemThumb } from './inventory/InventoryItemThumb';
export { PersonalItemFormDialog } from './inventory/PersonalItemFormDialog';
export * from './inventory/inventory-ui-labels';
