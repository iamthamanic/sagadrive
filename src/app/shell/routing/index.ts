/**
 * Public barrel for App shell routing foundation (#133 / #276).
 * Location: src/app/shell/routing/index.ts
 */
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
  type LiveViewId,
  type ResolvedRoute,
  type SagaSectionId,
  type SessionPhaseId,
  type SessionPhaseRouteId,
  type ShellViewId,
} from './routes';
export { setNavigationBlocker, useAppLocation } from './useAppLocation';
