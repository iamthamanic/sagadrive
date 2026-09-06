/**
 * History API location hook for App shell routing (no react-router dependency).
 * Location: src/app/shell/routing/useAppLocation.ts
 */
import { useEffect, useRef, useState } from 'react';
import {
  normalizeViewId,
  pathForItemDetail,
  pathForView,
  resolvePathname,
  routeToShellView,
  type ResolvedRoute,
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
      setPathname(readPathname());
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const route: ResolvedRoute = resolvePathname(pathname);
  const currentView: ShellViewId = routeToShellView(route);
  const itemId = route.kind === 'item-detail' ? route.itemId : null;

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

  return {
    pathname,
    route,
    currentView,
    itemId,
    navigateToPath,
    navigateToView,
    navigateToItem,
  };
}
