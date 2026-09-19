/**
 * App shell route table — pure pathname ↔ screen mapping (no React, no Supabase).
 * Location: src/app/shell/routing/routes.ts
 *
 * #133 History foundation + #276 Saga/Session public-id resource routes.
 */

import {
  isValidPublicResourceId,
  parsePublicResourceId,
} from '../../../domains/resource-id';

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
  | 'npc-creature-create'
  | 'npc-creature-edit'
  | 'saga-list'
  | 'saga-new'
  | 'saga-section'
  | 'session-phase'
  | 'session-live'
  | 'character-public'
  | 'not-found';

export type SagaSectionId =
  | 'overview'
  | 'characters'
  | 'world'
  | 'npc-creatures'
  | 'items'
  | 'quests'
  | 'sessions'
  | 'settings';

export type SessionPhaseId = 'prepare' | 'live' | 'recap';

/** Neutral session URL resolves phase from persisted status in the app layer. */
export type SessionPhaseRouteId = SessionPhaseId | 'auto';

export type LiveViewId = 'gamemaster' | 'player' | 'player-resolve' | 'display';

export type ResolvedRoute =
  | {
      kind: 'view';
      view: Exclude<
        ShellViewId,
        | 'item-detail'
        | 'item-create'
        | 'npc-creature-create'
        | 'npc-creature-edit'
        | 'saga-list'
        | 'saga-new'
        | 'saga-section'
        | 'session-phase'
        | 'session-live'
        | 'character-public'
        | 'not-found'
      >;
    }
  | { kind: 'item-create'; typeSlug?: string }
  | { kind: 'item-detail'; itemId: string }
  | { kind: 'npc-creature-create' }
  | { kind: 'npc-creature-edit'; definitionId: string }
  | { kind: 'saga-list' }
  | { kind: 'saga-new' }
  | { kind: 'saga-section'; sagaPublicId: string; section: SagaSectionId }
  | {
      kind: 'session-phase';
      sagaPublicId: string;
      sessionPublicId: string;
      phase: SessionPhaseRouteId;
    }
  | {
      kind: 'session-live';
      sagaPublicId: string;
      sessionPublicId: string;
      liveView: LiveViewId;
      characterPublicId?: string;
    }
  | {
      kind: 'character-public';
      characterPublicId: string;
      mode: 'view' | 'edit';
    }
  | { kind: 'not-found'; attemptedPath: string };

const VIEW_PATHS: Record<
  Exclude<
    ShellViewId,
    | 'item-detail'
    | 'item-create'
    | 'npc-creature-create'
    | 'npc-creature-edit'
    | 'saga-list'
    | 'saga-new'
    | 'saga-section'
    | 'session-phase'
    | 'session-live'
    | 'character-public'
    | 'not-found'
  >,
  string
> = {
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
const VIEW_ALIASES: Record<
  string,
  keyof typeof VIEW_PATHS | 'item-create' | 'npc-creature-create' | 'saga-list'
> = {
  'project-join': 'join',
  home: 'dashboard',
  sagas: 'saga-list',
};

const PATH_TO_VIEW = new Map<string, keyof typeof VIEW_PATHS>(
  Object.entries(VIEW_PATHS).map(([view, path]) => [path, view as keyof typeof VIEW_PATHS]),
);

const SAGA_SECTIONS = new Set<SagaSectionId>([
  'overview',
  'characters',
  'world',
  'npc-creatures',
  'items',
  'quests',
  'sessions',
  'settings',
]);

function normalizePathname(pathname: string): string {
  const raw = pathname.trim() || '/';
  return raw.length > 1 && raw.endsWith('/') ? raw.slice(0, -1) : raw;
}

function decodeSegment(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function requireSagaPublicId(raw: string): string | null {
  const value = decodeSegment(raw).trim().toUpperCase();
  return isValidPublicResourceId(value, 'saga') ? value : null;
}

function requireSessionPublicId(raw: string): string | null {
  const value = decodeSegment(raw).trim().toUpperCase();
  return isValidPublicResourceId(value, 'session') ? value : null;
}

function requireCharacterPublicId(raw: string): string | null {
  const value = decodeSegment(raw).trim().toUpperCase();
  return isValidPublicResourceId(value, 'character') ? value : null;
}

export function normalizeViewId(raw: string): string {
  return VIEW_ALIASES[raw] ?? raw;
}

export function pathForView(viewId: string): string | null {
  const normalized = normalizeViewId(viewId);
  if (normalized === 'item-create') return '/items/create';
  if (normalized === 'npc-creature-create') return '/npc-creatures/create';
  if (normalized === 'saga-list') return '/sagas';
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

export function pathForNpcCreatureCreate(): string {
  return '/npc-creatures/create';
}

export function pathForNpcCreatureEdit(definitionId: string): string {
  const safe = encodeURIComponent(definitionId.trim());
  return `/npc-creatures/${safe}`;
}

export function pathForSagaList(): string {
  return '/sagas';
}

export function pathForSagaNew(): string {
  return '/sagas/new';
}

export function pathForSagaSection(
  sagaPublicId: string,
  section: SagaSectionId = 'overview',
): string {
  const id = sagaPublicId.trim().toUpperCase();
  if (section === 'overview') return `/sagas/${encodeURIComponent(id)}/overview`;
  return `/sagas/${encodeURIComponent(id)}/${section}`;
}

export function pathForSessionPhase(
  sagaPublicId: string,
  sessionPublicId: string,
  phase: SessionPhaseId,
): string {
  const saga = encodeURIComponent(sagaPublicId.trim().toUpperCase());
  const session = encodeURIComponent(sessionPublicId.trim().toUpperCase());
  return `/sagas/${saga}/sessions/${session}/${phase}`;
}

export function pathForSessionLive(
  sagaPublicId: string,
  sessionPublicId: string,
  liveView: Exclude<LiveViewId, 'player-resolve'>,
  characterPublicId?: string,
): string {
  const base = pathForSessionPhase(sagaPublicId, sessionPublicId, 'live');
  if (liveView === 'player') {
    if (!characterPublicId) return `${base}/player`;
    return `${base}/player/${encodeURIComponent(characterPublicId.trim().toUpperCase())}`;
  }
  return `${base}/${liveView}`;
}

export function pathForCharacterPublic(
  characterPublicId: string,
  mode: 'view' | 'edit' = 'view',
): string {
  const id = encodeURIComponent(characterPublicId.trim().toUpperCase());
  return mode === 'edit' ? `/characters/${id}/edit` : `/characters/${id}`;
}

function resolveSagaRoutes(path: string): ResolvedRoute | null {
  if (path === '/sagas') return { kind: 'saga-list' };
  if (path === '/sagas/new') return { kind: 'saga-new' };

  const sagaOnly = path.match(/^\/sagas\/([^/]+)$/);
  if (sagaOnly) {
    const sagaPublicId = requireSagaPublicId(sagaOnly[1] ?? '');
    if (!sagaPublicId) return { kind: 'not-found', attemptedPath: path };
    return { kind: 'saga-section', sagaPublicId, section: 'overview' };
  }

  const sagaSection = path.match(/^\/sagas\/([^/]+)\/([^/]+)$/);
  if (sagaSection) {
    const sagaPublicId = requireSagaPublicId(sagaSection[1] ?? '');
    const sectionRaw = sagaSection[2] ?? '';
    if (!sagaPublicId) return { kind: 'not-found', attemptedPath: path };
    if (sectionRaw === 'sessions') {
      return { kind: 'saga-section', sagaPublicId, section: 'sessions' };
    }
    if (SAGA_SECTIONS.has(sectionRaw as SagaSectionId)) {
      return {
        kind: 'saga-section',
        sagaPublicId,
        section: sectionRaw as SagaSectionId,
      };
    }
    return { kind: 'not-found', attemptedPath: path };
  }

  const sessionRoot = path.match(/^\/sagas\/([^/]+)\/sessions\/([^/]+)$/);
  if (sessionRoot) {
    const sagaPublicId = requireSagaPublicId(sessionRoot[1] ?? '');
    const sessionPublicId = requireSessionPublicId(sessionRoot[2] ?? '');
    if (!sagaPublicId || !sessionPublicId) {
      return { kind: 'not-found', attemptedPath: path };
    }
    // Neutral session route — app resolves phase from status.
    return {
      kind: 'session-phase',
      sagaPublicId,
      sessionPublicId,
      phase: 'auto',
    };
  }

  const sessionPhase = path.match(
    /^\/sagas\/([^/]+)\/sessions\/([^/]+)\/(prepare|live|recap)$/,
  );
  if (sessionPhase) {
    const sagaPublicId = requireSagaPublicId(sessionPhase[1] ?? '');
    const sessionPublicId = requireSessionPublicId(sessionPhase[2] ?? '');
    const phase = sessionPhase[3] as SessionPhaseId;
    if (!sagaPublicId || !sessionPublicId) {
      return { kind: 'not-found', attemptedPath: path };
    }
    return { kind: 'session-phase', sagaPublicId, sessionPublicId, phase };
  }

  const livePlayerChar = path.match(
    /^\/sagas\/([^/]+)\/sessions\/([^/]+)\/live\/player\/([^/]+)$/,
  );
  if (livePlayerChar) {
    const sagaPublicId = requireSagaPublicId(livePlayerChar[1] ?? '');
    const sessionPublicId = requireSessionPublicId(livePlayerChar[2] ?? '');
    const characterPublicId = requireCharacterPublicId(livePlayerChar[3] ?? '');
    if (!sagaPublicId || !sessionPublicId || !characterPublicId) {
      return { kind: 'not-found', attemptedPath: path };
    }
    return {
      kind: 'session-live',
      sagaPublicId,
      sessionPublicId,
      liveView: 'player',
      characterPublicId,
    };
  }

  const liveView = path.match(
    /^\/sagas\/([^/]+)\/sessions\/([^/]+)\/live\/(gamemaster|player|display)$/,
  );
  if (liveView) {
    const sagaPublicId = requireSagaPublicId(liveView[1] ?? '');
    const sessionPublicId = requireSessionPublicId(liveView[2] ?? '');
    const view = liveView[3] as 'gamemaster' | 'player' | 'display';
    if (!sagaPublicId || !sessionPublicId) {
      return { kind: 'not-found', attemptedPath: path };
    }
    return {
      kind: 'session-live',
      sagaPublicId,
      sessionPublicId,
      liveView: view === 'player' ? 'player-resolve' : view,
    };
  }

  if (path.startsWith('/sagas/')) {
    return { kind: 'not-found', attemptedPath: path };
  }

  return null;
}

function resolveCharacterRoutes(path: string): ResolvedRoute | null {
  const edit = path.match(/^\/characters\/([^/]+)\/edit$/);
  if (edit) {
    const characterPublicId = requireCharacterPublicId(edit[1] ?? '');
    if (!characterPublicId) return { kind: 'not-found', attemptedPath: path };
    return { kind: 'character-public', characterPublicId, mode: 'edit' };
  }

  const view = path.match(/^\/characters\/([^/]+)$/);
  if (view) {
    const characterPublicId = requireCharacterPublicId(view[1] ?? '');
    if (!characterPublicId) return { kind: 'not-found', attemptedPath: path };
    return { kind: 'character-public', characterPublicId, mode: 'view' };
  }

  if (path.startsWith('/characters/')) {
    return { kind: 'not-found', attemptedPath: path };
  }

  return null;
}

export function resolvePathname(pathname: string): ResolvedRoute {
  const path = normalizePathname(pathname);

  const sagaRoute = resolveSagaRoutes(path);
  if (sagaRoute) return sagaRoute;

  const characterRoute = resolveCharacterRoutes(path);
  if (characterRoute) return characterRoute;

  const createTypedMatch = path.match(/^\/items\/create\/new\/([^/]+)$/);
  if (createTypedMatch) {
    let typeSlug = createTypedMatch[1] ?? '';
    typeSlug = decodeSegment(typeSlug).trim().toLowerCase();
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
    let itemId = decodeSegment(itemMatch[1] ?? '').trim();
    // Prefer public IT- ids when present; legacy internal ids still accepted.
    const parsed = parsePublicResourceId(itemId);
    if (parsed?.kind === 'item') {
      itemId = parsed.value;
    }
    if (!itemId || itemId === 'create') {
      return { kind: 'not-found', attemptedPath: path };
    }
    return { kind: 'item-detail', itemId };
  }

  if (path === '/npc-creatures/create') {
    return { kind: 'npc-creature-create' };
  }

  if (path.startsWith('/npc-creatures/create/')) {
    return { kind: 'not-found', attemptedPath: path };
  }

  const npcMatch = path.match(/^\/npc-creatures\/([^/]+)$/);
  if (npcMatch) {
    let definitionId = decodeSegment(npcMatch[1] ?? '').trim();
    const parsed = parsePublicResourceId(definitionId);
    if (parsed?.kind === 'npcCreature') {
      definitionId = parsed.value;
    }
    if (!definitionId || definitionId === 'create') {
      return { kind: 'not-found', attemptedPath: path };
    }
    return { kind: 'npc-creature-edit', definitionId };
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
    case 'npc-creature-create':
      return 'npc-creature-create';
    case 'npc-creature-edit':
      return 'npc-creature-edit';
    case 'saga-list':
      return 'saga-list';
    case 'saga-new':
      return 'saga-new';
    case 'saga-section':
      return 'saga-section';
    case 'session-phase':
      return 'session-phase';
    case 'session-live':
      return 'session-live';
    case 'character-public':
      return 'character-public';
    case 'not-found':
      return 'not-found';
  }
}

export function knownViewIds(): string[] {
  return [
    ...Object.keys(VIEW_PATHS),
    'item-create',
    'item-detail',
    'npc-creature-create',
    'npc-creature-edit',
    'saga-list',
    'saga-new',
    'saga-section',
    'session-phase',
    'session-live',
    'character-public',
  ];
}
