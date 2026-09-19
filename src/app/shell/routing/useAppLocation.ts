/**
 * useAppLocation — History API location hook for App shell routing.
 * Location: src/app/shell/routing/useAppLocation.ts
 */
import { useEffect, useRef, useState } from 'react';
import {
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
  type ShellViewId,
} from './routes';

export type NavigationBlocker = () => boolean | string;

let navigationBlocker: NavigationBlocker | null = null;

/** Register a blocker for dirty forms; return unregister. Stub for Workbench (#139). */
export function setNavigationBlocker(blocker: NavigationBlocker | null): () => void {
  navigationBlocker = blocker;
  return () => {
    if (navigationBlocker === blocker) navigationBlocker = null;
  };
}

function readPathname(): string {
  if (typeof window === 'undefined') return '/';
  return window.location.pathname || '/';
}

function allowLeave(): boolean {
  if (!navigationBlocker) return true;
  const result = navigationBlocker();
  if (result === true) return true;
  if (result === false) return false;
  if (typeof result === 'string' && typeof window !== 'undefined') {
    return window.confirm(result);
  }
  return true;
}

export function useAppLocation() {
  const [pathname, setPathname] = useState(readPathname);
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  useEffect(() => {
    const onPopState = () => {
      if (!allowLeave()) {
        // Revert browser history navigation when a dirty form blocks leave.
        window.history.pushState(null, '', pathnameRef.current);
        return;
      }
      setPathname(readPathname());
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const route: ResolvedRoute = resolvePathname(pathname);
  const currentView: ShellViewId = routeToShellView(route);
  const itemId = route.kind === 'item-detail' ? route.itemId : null;
  const createTypeSlug = route.kind === 'item-create' ? route.typeSlug ?? null : null;
  const npcCreatureDefinitionId =
    route.kind === 'npc-creature-edit' ? route.definitionId : null;
  const sagaPublicId =
    route.kind === 'saga-section'
    || route.kind === 'session-phase'
    || route.kind === 'session-live'
      ? route.sagaPublicId
      : null;
  const sessionPublicId =
    route.kind === 'session-phase' || route.kind === 'session-live'
      ? route.sessionPublicId
      : null;
  const characterPublicId =
    route.kind === 'character-public'
      ? route.characterPublicId
      : route.kind === 'session-live'
        ? route.characterPublicId ?? null
        : null;

  const navigateToPath = (nextPath: string, options?: { replace?: boolean }) => {
    if (typeof window === 'undefined') return;
    const normalized =
      nextPath.length > 1 && nextPath.endsWith('/') ? nextPath.slice(0, -1) : nextPath || '/';
    if (normalized === pathnameRef.current) return;
    if (!allowLeave()) return;
    if (options?.replace) {
      window.history.replaceState(null, '', normalized);
    } else {
      window.history.pushState(null, '', normalized);
    }
    setPathname(normalized);
  };

  const navigateToView = (viewId: string, options?: { replace?: boolean }) => {
    const path = pathForView(normalizeViewId(viewId));
    if (!path) {
      console.warn('⚠️ App routing: unknown view:', viewId);
      return;
    }
    navigateToPath(path, options);
  };

  const navigateToItem = (id: string, options?: { replace?: boolean }) => {
    navigateToPath(pathForItemDetail(id), options);
  };

  const navigateToItemCreateType = (typeSlug: string, options?: { replace?: boolean }) => {
    navigateToPath(pathForItemCreateType(typeSlug), options);
  };

  const navigateToNpcCreatureCreate = (options?: { replace?: boolean }) => {
    navigateToPath(pathForNpcCreatureCreate(), options);
  };

  const navigateToNpcCreatureEdit = (definitionId: string, options?: { replace?: boolean }) => {
    navigateToPath(pathForNpcCreatureEdit(definitionId), options);
  };

  const navigateToSagaList = (options?: { replace?: boolean }) => {
    navigateToPath(pathForSagaList(), options);
  };

  const navigateToSagaNew = (options?: { replace?: boolean }) => {
    navigateToPath(pathForSagaNew(), options);
  };

  const navigateToSagaSection = (
    sagaId: string,
    section: SagaSectionId = 'overview',
    options?: { replace?: boolean },
  ) => {
    navigateToPath(pathForSagaSection(sagaId, section), options);
  };

  const navigateToSessionPhase = (
    sagaId: string,
    sessionId: string,
    phase: SessionPhaseId,
    options?: { replace?: boolean },
  ) => {
    navigateToPath(pathForSessionPhase(sagaId, sessionId, phase), options);
  };

  const navigateToSessionLive = (
    sagaId: string,
    sessionId: string,
    liveView: Exclude<LiveViewId, 'player-resolve'>,
    characterId?: string,
    options?: { replace?: boolean },
  ) => {
    navigateToPath(pathForSessionLive(sagaId, sessionId, liveView, characterId), options);
  };

  const navigateToCharacterPublic = (
    characterId: string,
    mode: 'view' | 'edit' = 'view',
    options?: { replace?: boolean },
  ) => {
    navigateToPath(pathForCharacterPublic(characterId, mode), options);
  };

  return {
    pathname,
    route,
    currentView,
    itemId,
    createTypeSlug,
    npcCreatureDefinitionId,
    sagaPublicId,
    sessionPublicId,
    characterPublicId,
    navigateToPath,
    navigateToView,
    navigateToItem,
    navigateToItemCreateType,
    navigateToNpcCreatureCreate,
    navigateToNpcCreatureEdit,
    navigateToSagaList,
    navigateToSagaNew,
    navigateToSagaSection,
    navigateToSessionPhase,
    navigateToSessionLive,
    navigateToCharacterPublic,
  };
}
