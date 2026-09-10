/**
 * items/workbench — Item Workbench create/edit/readonly/fork slice (#139).
 * Location: src/app/items/workbench/index.ts
 */
export { ItemWorkbenchScreen } from './ItemWorkbenchScreen';
export type { ItemWorkbenchScreenProps } from './ItemWorkbenchScreen';
/** Re-export visuals for workbench consumers that import from ./workbench historically. */
export {
  useItemAssets,
  useItemModel3dAssets,
  useItemVisualTools,
  ItemVisualToolsBar,
  ItemVisualModeToggle,
} from '../visuals';
