/**
 * shell area — public API for other app areas.
 * Location: src/app/shell/index.ts
 */
export {
  knownViewIds,
  normalizeViewId,
  pathForItemDetail,
  pathForView,
  resolvePathname,
  routeToShellView,
  setNavigationBlocker,
  useAppLocation,
  type ResolvedRoute,
  type ShellViewId,
} from './routing';
