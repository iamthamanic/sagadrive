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
  pathForCharacterPublic,
  pathForItemCreateType,
  pathForItemDetail,
  pathForNpcCreatureCreate,
  pathForNpcCreatureEdit,
  pathForSagaList,
  pathForSagaNew,
  pathForSagaSection,
  pathForSessionLive,
  pathForSessionPhase,
  pathForView,
  resolvePathname,
  routeToShellView,
  setNavigationBlocker,
  useAppLocation,
  type LiveViewId,
  type ResolvedRoute,
  type SagaSectionId,
  type SessionPhaseId,
  type SessionPhaseRouteId,
  type ShellViewId,
} from './routing';
