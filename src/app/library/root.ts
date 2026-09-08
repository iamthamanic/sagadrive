/**
 * library area — composition-root screen entry.
 * Location: src/app/library/root.ts
 *
 * Kept separate from `index.ts` so items/workbench can import labels from the
 * public barrel without pulling the Library screen (cycle risk).
 */
export { Library } from './Library';
