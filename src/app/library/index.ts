/**
 * library area — public API for other app areas.
 * Location: src/app/library/index.ts
 *
 * The Library screen itself is composition-root only (`App.tsx` imports
 * `./Library` directly) so this barrel does not re-export it — that would
 * create cycles when items/workbench imports labels from here.
 */
export { ItemLibraryBrowser, useItemLibrary } from './items';
export type { UseItemLibraryOptions, UseItemLibraryResult } from './items';
export * from './items/itemLibraryLabels';
