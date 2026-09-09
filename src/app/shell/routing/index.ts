/**
 * Public barrel for App shell routing foundation (#133).
 * Location: src/app/shell/routing/index.ts
 */
export {
  knownViewIds,
  normalizeViewId,
  pathForItemCreateType,
  pathForItemDetail,
  pathForView,
  resolvePathname,
  routeToShellView,
  type ResolvedRoute,
  type ShellViewId,
} from './routes';
export { setNavigationBlocker, useAppLocation } from './useAppLocation';
