/**
 * shell area — public API for other app areas and the composition root.
 * Location: src/app/shell/index.ts
 */
export { AuthGate } from './auth/AuthGate';
export { Layout } from './Layout';
export { ViewLoadingFallback } from './ViewLoadingFallback';
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
