/**
 * adventure-runtime-state — Typed playthrough World State (#374).
 * Location: src/domains/session/contracts/adventure-runtime-state.ts
 *
 * Separates Adventure definitionRefs from mutable runtime. Pure domain.
 * Never stores LiveAct frames, webcam, or landmark biometrics.
 */
import type { LiveSessionAccess } from './live-session-access';
import { canExecuteLiveSessionCommand } from './live-session-access';

export const ADVENTURE_RUNTIME_SCHEMA_VERSION = 1 as const;

export type AdventureVisibility = 'public' | 'shared' | 'gm_only';

export type AdventureFlagValue = boolean | number | string;

export type AdventureFlagEntry = {
  readonly key: string;
  readonly value: AdventureFlagValue;
  readonly visibility: AdventureVisibility;
  readonly updatedAt: string | null;
};

export type AdventureRelationship = {
  readonly actorRef: string;
  readonly targetRef: string;
  readonly score: number;
  readonly note: string | null;
  readonly visibility: AdventureVisibility;
};

export type AdventureClock = {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly max: number;
  readonly visibility: AdventureVisibility;
};

export type AdventureConsequence = {
  readonly id: string;
  readonly kind: string;
  readonly summary: string;
  readonly visibility: AdventureVisibility;
  readonly createdAt: string | null;
};

/**
 * Versioned adventure playthrough state.
 * `definitionRef` points at package/fixture identity — never mutated as a definition body.
 */
export type AdventureRuntimeState = {
  readonly schemaVersion: typeof ADVENTURE_RUNTIME_SCHEMA_VERSION;
  readonly definitionRef: string | null;
  readonly flags: Readonly<Record<string, AdventureFlagEntry>>;
  readonly relationships: Readonly<Record<string, AdventureRelationship>>;
  readonly clocks: Readonly<Record<string, AdventureClock>>;
  readonly consequences: readonly AdventureConsequence[];
  readonly sliceRevision: number;
  readonly updatedAt: string | null;
};

export type AdventureRuntimeOp =
  | 'set_flag'
  | 'set_relationship'
  | 'tick_clock'
  | 'add_consequence'
  | 'set_definition_ref'
  | 'hydrate_from_project'
  | 'persist_to_project';

export type AdventureRuntimeCommand = {
  readonly op: AdventureRuntimeOp;
  readonly key?: string | null;
  readonly value?: AdventureFlagValue | null;
  readonly visibility?: AdventureVisibility | null;
  readonly actorRef?: string | null;
  readonly targetRef?: string | null;
  readonly score?: number | null;
  readonly clockId?: string | null;
  readonly clockLabel?: string | null;
  readonly clockDelta?: number | null;
  readonly clockMax?: number | null;
  readonly consequenceKind?: string | null;
  readonly summary?: string | null;
  readonly definitionRef?: string | null;
  readonly note?: string | null;
};

export type AdventureRuntimeApplyResult =
  | {
      readonly ok: true;
      readonly state: AdventureRuntimeState;
      readonly eventPayload: Record<string, unknown>;
      readonly persistToProject: boolean;
      readonly hydrateFromProject: boolean;
    }
  | { readonly ok: false; readonly reason: string };

const VIS: readonly AdventureVisibility[] = ['public', 'shared', 'gm_only'];
const OPS: readonly AdventureRuntimeOp[] = [
  'set_flag',
  'set_relationship',
  'tick_clock',
  'add_consequence',
  'set_definition_ref',
  'hydrate_from_project',
  'persist_to_project',
];

export function emptyAdventureRuntimeState(): AdventureRuntimeState {
  return {
    schemaVersion: ADVENTURE_RUNTIME_SCHEMA_VERSION,
    definitionRef: null,
    flags: {},
    relationships: {},
    clocks: {},
    consequences: [],
    sliceRevision: 0,
    updatedAt: null,
  };
}

export function isAdventureVisibility(value: string): value is AdventureVisibility {
  return (VIS as readonly string[]).includes(value);
}

function stamp(state: AdventureRuntimeState): AdventureRuntimeState {
  return {
    ...state,
    sliceRevision: state.sliceRevision + 1,
    updatedAt: new Date().toISOString(),
  };
}

function parseFlagValue(raw: unknown): AdventureFlagValue | null {
  if (typeof raw === 'boolean' || typeof raw === 'number') return raw;
  if (typeof raw === 'string') return raw.slice(0, 200);
  return null;
}

export function parseAdventureRuntimeState(raw: unknown): AdventureRuntimeState {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return emptyAdventureRuntimeState();
  }
  const row = raw as Record<string, unknown>;
  const flags: Record<string, AdventureFlagEntry> = {};
  const flagsRaw = row.flags;
  if (flagsRaw && typeof flagsRaw === 'object' && !Array.isArray(flagsRaw)) {
    for (const [key, entry] of Object.entries(flagsRaw as Record<string, unknown>)) {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
      const e = entry as Record<string, unknown>;
      const value = parseFlagValue(e.value);
      if (value === null) continue;
      const visibility =
        typeof e.visibility === 'string' && isAdventureVisibility(e.visibility)
          ? e.visibility
          : 'gm_only';
      flags[key.slice(0, 64)] = {
        key: key.slice(0, 64),
        value,
        visibility,
        updatedAt: typeof e.updatedAt === 'string' ? e.updatedAt : null,
      };
    }
  }
  const relationships: Record<string, AdventureRelationship> = {};
  const relRaw = row.relationships;
  if (relRaw && typeof relRaw === 'object' && !Array.isArray(relRaw)) {
    for (const [id, entry] of Object.entries(relRaw as Record<string, unknown>)) {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
      const e = entry as Record<string, unknown>;
      const actorRef = typeof e.actorRef === 'string' ? e.actorRef.trim().slice(0, 80) : '';
      const targetRef = typeof e.targetRef === 'string' ? e.targetRef.trim().slice(0, 80) : '';
      if (!actorRef || !targetRef) continue;
      const score =
        typeof e.score === 'number' && Number.isFinite(e.score)
          ? Math.max(-100, Math.min(100, Math.round(e.score)))
          : 0;
      const visibility =
        typeof e.visibility === 'string' && isAdventureVisibility(e.visibility)
          ? e.visibility
          : 'gm_only';
      relationships[id.slice(0, 64)] = {
        actorRef,
        targetRef,
        score,
        note: typeof e.note === 'string' ? e.note.slice(0, 200) : null,
        visibility,
      };
    }
  }
  const clocks: Record<string, AdventureClock> = {};
  const clocksRaw = row.clocks;
  if (clocksRaw && typeof clocksRaw === 'object' && !Array.isArray(clocksRaw)) {
    for (const [id, entry] of Object.entries(clocksRaw as Record<string, unknown>)) {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
      const e = entry as Record<string, unknown>;
      const max =
        typeof e.max === 'number' && Number.isFinite(e.max)
          ? Math.max(1, Math.min(12, Math.floor(e.max)))
          : 4;
      const value =
        typeof e.value === 'number' && Number.isFinite(e.value)
          ? Math.max(0, Math.min(max, Math.floor(e.value)))
          : 0;
      const visibility =
        typeof e.visibility === 'string' && isAdventureVisibility(e.visibility)
          ? e.visibility
          : 'shared';
      clocks[id.slice(0, 64)] = {
        id: id.slice(0, 64),
        label: typeof e.label === 'string' ? e.label.slice(0, 80) : id.slice(0, 64),
        value,
        max,
        visibility,
      };
    }
  }
  const consequences: AdventureConsequence[] = [];
  if (Array.isArray(row.consequences)) {
    for (const entry of row.consequences) {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
      const e = entry as Record<string, unknown>;
      const id = typeof e.id === 'string' ? e.id.trim().slice(0, 64) : '';
      if (!id) continue;
      const visibility =
        typeof e.visibility === 'string' && isAdventureVisibility(e.visibility)
          ? e.visibility
          : 'gm_only';
      consequences.push({
        id,
        kind: typeof e.kind === 'string' ? e.kind.slice(0, 40) : 'generic',
        summary: typeof e.summary === 'string' ? e.summary.slice(0, 200) : '',
        visibility,
        createdAt: typeof e.createdAt === 'string' ? e.createdAt : null,
      });
      if (consequences.length >= 64) break;
    }
  }
  return {
    schemaVersion: ADVENTURE_RUNTIME_SCHEMA_VERSION,
    definitionRef:
      typeof row.definitionRef === 'string' ? row.definitionRef.trim().slice(0, 120) || null : null,
    flags,
    relationships,
    clocks,
    consequences,
    sliceRevision:
      typeof row.sliceRevision === 'number' && Number.isFinite(row.sliceRevision)
        ? Math.max(0, Math.floor(row.sliceRevision))
        : 0,
    updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : null,
  };
}

export function readAdventureRuntime(shared: Record<string, unknown>): AdventureRuntimeState {
  return parseAdventureRuntimeState(shared.adventure);
}

/** Strip gm_only bodies for player/viewer projections (server must mirror). */
export function projectAdventureRuntimeForAudience(
  state: AdventureRuntimeState,
  audience: 'gamemaster' | 'player' | 'viewer',
): AdventureRuntimeState {
  if (audience === 'gamemaster') return state;
  const allowShared = audience === 'player' || audience === 'viewer';
  const flags: Record<string, AdventureFlagEntry> = {};
  for (const [key, flag] of Object.entries(state.flags)) {
    if (flag.visibility === 'public' || (allowShared && flag.visibility === 'shared')) {
      flags[key] = flag;
    }
  }
  const relationships: Record<string, AdventureRelationship> = {};
  for (const [id, rel] of Object.entries(state.relationships)) {
    if (rel.visibility === 'public' || (allowShared && rel.visibility === 'shared')) {
      relationships[id] = rel;
    }
  }
  const clocks: Record<string, AdventureClock> = {};
  for (const [id, clock] of Object.entries(state.clocks)) {
    if (clock.visibility === 'public' || (allowShared && clock.visibility === 'shared')) {
      clocks[id] = clock;
    }
  }
  const consequences = state.consequences.filter(
    (c) => c.visibility === 'public' || (allowShared && c.visibility === 'shared'),
  );
  return {
    ...state,
    flags,
    relationships,
    clocks,
    consequences,
  };
}

export function parseAdventureRuntimeCommand(raw: unknown): AdventureRuntimeCommand {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Ungültiger Adventure-Command');
  }
  const row = raw as Record<string, unknown>;
  const op = row.op;
  if (typeof op !== 'string' || !OPS.includes(op as AdventureRuntimeOp)) {
    // Back-compat: GM palette may send { key, value } without op
    if (typeof row.key === 'string' && row.key.trim()) {
      return {
        op: 'set_flag',
        key: row.key.trim().slice(0, 64),
        value: parseFlagValue(row.value) ?? true,
        visibility:
          typeof row.visibility === 'string' && isAdventureVisibility(row.visibility)
            ? row.visibility
            : 'shared',
        note: typeof row.note === 'string' ? row.note : null,
      };
    }
    throw new Error('Ungültige Adventure-Operation');
  }
  return {
    op: op as AdventureRuntimeOp,
    key: typeof row.key === 'string' ? row.key.trim().slice(0, 64) : null,
    value: parseFlagValue(row.value),
    visibility:
      typeof row.visibility === 'string' && isAdventureVisibility(row.visibility)
        ? row.visibility
        : null,
    actorRef: typeof row.actorRef === 'string' ? row.actorRef.trim().slice(0, 80) : null,
    targetRef: typeof row.targetRef === 'string' ? row.targetRef.trim().slice(0, 80) : null,
    score:
      typeof row.score === 'number' && Number.isFinite(row.score)
        ? Math.max(-100, Math.min(100, Math.round(row.score)))
        : null,
    clockId: typeof row.clockId === 'string' ? row.clockId.trim().slice(0, 64) : null,
    clockLabel: typeof row.clockLabel === 'string' ? row.clockLabel.trim().slice(0, 80) : null,
    clockDelta:
      typeof row.clockDelta === 'number' && Number.isFinite(row.clockDelta)
        ? Math.round(row.clockDelta)
        : null,
    clockMax:
      typeof row.clockMax === 'number' && Number.isFinite(row.clockMax)
        ? Math.max(1, Math.min(12, Math.floor(row.clockMax)))
        : null,
    consequenceKind:
      typeof row.consequenceKind === 'string' ? row.consequenceKind.trim().slice(0, 40) : null,
    summary: typeof row.summary === 'string' ? row.summary.trim().slice(0, 200) : null,
    definitionRef:
      typeof row.definitionRef === 'string' ? row.definitionRef.trim().slice(0, 120) : null,
    note: typeof row.note === 'string' ? row.note : null,
  };
}

export function assertAdventureRuntimeAccess(
  access: LiveSessionAccess,
  _command: AdventureRuntimeCommand,
): void {
  if (access.role !== 'gamemaster') {
    throw new Error('Nur Spielleiter darf Adventure Runtime ändern');
  }
  if (!canExecuteLiveSessionCommand(access, 'gameplay_mutate')) {
    throw new Error('Keine Gameplay-Rechte');
  }
}

export function applyAdventureRuntimeCommand(input: {
  command: AdventureRuntimeCommand;
  previous: AdventureRuntimeState;
  projectState?: AdventureRuntimeState | null;
}): AdventureRuntimeApplyResult {
  const { command } = input;
  let state = input.previous;

  switch (command.op) {
    case 'hydrate_from_project': {
      const project = input.projectState ?? emptyAdventureRuntimeState();
      state = stamp({
        ...project,
        schemaVersion: ADVENTURE_RUNTIME_SCHEMA_VERSION,
        sliceRevision: state.sliceRevision,
      });
      return {
        ok: true,
        state,
        persistToProject: false,
        hydrateFromProject: true,
        eventPayload: {
          op: 'hydrate_from_project',
          definitionRef: state.definitionRef,
          sliceRevision: state.sliceRevision,
          authoritative: true,
        },
      };
    }
    case 'persist_to_project':
      return {
        ok: true,
        state,
        persistToProject: true,
        hydrateFromProject: false,
        eventPayload: {
          op: 'persist_to_project',
          definitionRef: state.definitionRef,
          sliceRevision: state.sliceRevision,
          authoritative: true,
        },
      };
    case 'set_definition_ref': {
      if (!command.definitionRef) {
        return { ok: false, reason: 'definitionRef erforderlich' };
      }
      state = stamp({ ...state, definitionRef: command.definitionRef });
      return {
        ok: true,
        state,
        persistToProject: true,
        hydrateFromProject: false,
        eventPayload: {
          op: 'set_definition_ref',
          definitionRef: command.definitionRef,
          authoritative: true,
        },
      };
    }
    case 'set_flag': {
      if (!command.key) return { ok: false, reason: 'key erforderlich' };
      const value = command.value ?? true;
      const visibility = command.visibility ?? 'shared';
      const flags = {
        ...state.flags,
        [command.key]: {
          key: command.key,
          value,
          visibility,
          updatedAt: new Date().toISOString(),
        },
      };
      state = stamp({ ...state, flags });
      return {
        ok: true,
        state,
        persistToProject: true,
        hydrateFromProject: false,
        eventPayload: {
          op: 'set_flag',
          key: command.key,
          value,
          visibility,
          note: command.note,
          authoritative: true,
        },
      };
    }
    case 'set_relationship': {
      if (!command.actorRef || !command.targetRef) {
        return { ok: false, reason: 'actorRef und targetRef erforderlich' };
      }
      const id = `${command.actorRef}->${command.targetRef}`.slice(0, 64);
      const relationships = {
        ...state.relationships,
        [id]: {
          actorRef: command.actorRef,
          targetRef: command.targetRef,
          score: command.score ?? 0,
          note: command.note ?? null,
          visibility: command.visibility ?? 'gm_only',
        },
      };
      state = stamp({ ...state, relationships });
      return {
        ok: true,
        state,
        persistToProject: true,
        hydrateFromProject: false,
        eventPayload: {
          op: 'set_relationship',
          id,
          score: command.score ?? 0,
          authoritative: true,
        },
      };
    }
    case 'tick_clock': {
      const id = command.clockId ?? 'danger';
      const prev = state.clocks[id];
      const max = command.clockMax ?? prev?.max ?? 4;
      const delta = command.clockDelta ?? 1;
      const value = Math.max(0, Math.min(max, (prev?.value ?? 0) + delta));
      const clocks = {
        ...state.clocks,
        [id]: {
          id,
          label: command.clockLabel ?? prev?.label ?? id,
          value,
          max,
          visibility: command.visibility ?? prev?.visibility ?? 'shared',
        },
      };
      state = stamp({ ...state, clocks });
      return {
        ok: true,
        state,
        persistToProject: true,
        hydrateFromProject: false,
        eventPayload: {
          op: 'tick_clock',
          clockId: id,
          value,
          max,
          authoritative: true,
        },
      };
    }
    case 'add_consequence': {
      if (!command.summary) return { ok: false, reason: 'summary erforderlich' };
      const id = `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const entry: AdventureConsequence = {
        id,
        kind: command.consequenceKind ?? 'generic',
        summary: command.summary,
        visibility: command.visibility ?? 'shared',
        createdAt: new Date().toISOString(),
      };
      const consequences = [...state.consequences, entry].slice(-64);
      state = stamp({ ...state, consequences });
      return {
        ok: true,
        state,
        persistToProject: true,
        hydrateFromProject: false,
        eventPayload: {
          op: 'add_consequence',
          id,
          kind: entry.kind,
          visibility: entry.visibility,
          authoritative: true,
        },
      };
    }
  }
}

/** Durable subset for project.adventure_runtime (no session-only noise). */
export function durableAdventureSnapshot(state: AdventureRuntimeState): AdventureRuntimeState {
  return {
    schemaVersion: ADVENTURE_RUNTIME_SCHEMA_VERSION,
    definitionRef: state.definitionRef,
    flags: state.flags,
    relationships: state.relationships,
    clocks: state.clocks,
    consequences: state.consequences,
    sliceRevision: state.sliceRevision,
    updatedAt: state.updatedAt,
  };
}
