/**
 * library area — public API for other app areas.
 * Location: src/app/library/index.ts
 *
 * The Library screen mounts via `./root` (composition root only) so this barrel
 * stays free of the screen — items/workbench imports labels from here without cycles.
 */
export { ItemLibraryBrowser, useItemLibrary } from './items';
export type { UseItemLibraryOptions, UseItemLibraryResult } from './items';
export * from './items/itemLibraryLabels';
