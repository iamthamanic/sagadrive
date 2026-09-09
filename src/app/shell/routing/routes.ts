/**
 * App shell route table — pure pathname ↔ screen mapping (no React, no Supabase).
 * Location: src/app/shell/routing/routes.ts
 */

export type ShellViewId =
  | 'dashboard'
  | 'character-editor'
  | 'adventure-editor'
  | 'gamemaster'
  | 'marketplace'
  | 'library'
  | 'profile'
  | 'join'
  | 'rulesets-test'
  | 'item-create'
  | 'item-detail'
  | 'not-found';

export type ResolvedRoute =
  | { kind: 'view'; view: Exclude<ShellViewId, 'item-detail' | 'item-create' | 'not-found'> }
  | { kind: 'item-create'; typeSlug?: string }
  | { kind: 'item-detail'; itemId: string }
  | { kind: 'not-found'; attemptedPath: string };

const VIEW_PATHS: Record<Exclude<ShellViewId, 'item-detail' | 'item-create' | 'not-found'>, string> = {
  dashboard: '/',
  library: '/library',
  'character-editor': '/character-editor',
  'adventure-editor': '/adventure-editor',
  gamemaster: '/gamemaster',
  marketplace: '/marketplace',
  profile: '/profile',
  join: '/join',
  'rulesets-test': '/rulesets-test',
};

/** Legacy aliases still emitted by Dashboard / older callers. */
const VIEW_ALIASES: Record<string, keyof typeof VIEW_PATHS | 'item-create'> = {
  'project-join': 'join',
  home: 'dashboard',
};

const PATH_TO_VIEW = new Map<string, keyof typeof VIEW_PATHS>(
  Object.entries(VIEW_PATHS).map(([view, path]) => [path, view as keyof typeof VIEW_PATHS]),
);

export function normalizeViewId(raw: string): string {
  return VIEW_ALIASES[raw] ?? raw;
}

export function pathForView(viewId: string): string | null {
  const normalized = normalizeViewId(viewId);
  if (normalized === 'item-create') return '/items/create';
  if (normalized in VIEW_PATHS) {
    return VIEW_PATHS[normalized as keyof typeof VIEW_PATHS];
  }
  return null;
}

export function pathForItemDetail(itemId: string): string {
  const safe = encodeURIComponent(itemId.trim());
  return `/items/${safe}`;
}

/** Typed create forge: `/items/create/new/waffe` */
export function pathForItemCreateType(typeSlug: string): string {
  const safe = encodeURIComponent(typeSlug.trim().toLowerCase());
  return `/items/create/new/${safe}`;
}

export function resolvePathname(pathname: string): ResolvedRoute {
  const raw = pathname.trim() || '/';
  const path = raw.length > 1 && raw.endsWith('/') ? raw.slice(0, -1) : raw;

  const createTypedMatch = path.match(/^\/items\/create\/new\/([^/]+)$/);
  if (createTypedMatch) {
    let typeSlug = createTypedMatch[1] ?? '';
    try {
      typeSlug = decodeURIComponent(typeSlug);
    } catch {
      // keep raw segment
    }
    typeSlug = typeSlug.trim().toLowerCase();
    if (!typeSlug) {
      return { kind: 'not-found', attemptedPath: path };
    }
    return { kind: 'item-create', typeSlug };
  }

  if (path === '/items/create') {
    return { kind: 'item-create' };
  }

  // Reject unknown /items/create/... so they don't fall through as item ids.
  if (path.startsWith('/items/create/')) {
    return { kind: 'not-found', attemptedPath: path };
  }

  const itemMatch = path.match(/^\/items\/([^/]+)$/);
  if (itemMatch) {
    let itemId = itemMatch[1] ?? '';
    try {
      itemId = decodeURIComponent(itemId);
    } catch {
      // keep raw segment if decode fails
    }
    if (!itemId || itemId === 'create') {
      return { kind: 'not-found', attemptedPath: path };
    }
    return { kind: 'item-detail', itemId };
  }

  const view = PATH_TO_VIEW.get(path);
  if (view) {
    return { kind: 'view', view };
  }

  return { kind: 'not-found', attemptedPath: path };
}

export function routeToShellView(route: ResolvedRoute): ShellViewId {
  switch (route.kind) {
    case 'view':
      return route.view;
    case 'item-create':
      return 'item-create';
    case 'item-detail':
      return 'item-detail';
    case 'not-found':
      return 'not-found';
  }
}

export function knownViewIds(): string[] {
  return [...Object.keys(VIEW_PATHS), 'item-create', 'item-detail'];
}
