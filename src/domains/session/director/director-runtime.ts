/**
 * director-runtime — Production/Director domain (cues, automatic mode) (#375).
 * Location: src/domains/session/director/director-runtime.ts
 *
 * Independent of React, media SDK, and gameplay rules. Manual override wins.
 */
import type { LiveSessionAccess } from '../contracts/live-session-access';
import { canExecuteLiveSessionCommand } from '../contracts/live-session-access';

export const DIRECTOR_RUNTIME_SCHEMA_VERSION = 1 as const;

export type DirectorAutomaticMode = 'off' | 'on';

export type CueTriggerKind =
  | 'manual'
  | 'scene'
  | 'combat_start'
  | 'combat_end'
  | 'roll'
  | 'reveal'
  | 'downed'
  | 'dead'
  | 'program';

export type SourceRef = {
  readonly kind: 'neutral' | 'shared-scene' | 'look' | 'program';
  readonly lookId?: string | null;
};

export type LayoutPresetRef = {
  readonly kind: 'fullscreen-16x9' | 'letterbox' | 'split-focus';
};

export type DirectorCue = {
  readonly id: string;
  readonly trigger: CueTriggerKind;
  readonly source: SourceRef;
  readonly layout: LayoutPresetRef;
  readonly overlayText: string | null;
  readonly manual: boolean;
  readonly appliedAt: string | null;
};

export type DirectorRuntimeState = {
  readonly schemaVersion: typeof DIRECTOR_RUNTIME_SCHEMA_VERSION;
  readonly automaticMode: DirectorAutomaticMode;
  readonly preview: {
    readonly source: SourceRef;
    readonly layout: LayoutPresetRef;
  };
  readonly program: {
    readonly source: SourceRef;
    readonly layout: LayoutPresetRef;
    readonly revision: number;
  };
  readonly lastCue: DirectorCue | null;
  readonly lastManualOverrideAt: string | null;
  readonly cooldownMs: number;
  readonly lastAutoAppliedAt: string | null;
  readonly updatedAt: string | null;
};

export type DirectorCueCommand =
  | {
      readonly op: 'set_automatic_mode';
      readonly mode: DirectorAutomaticMode;
    }
  | {
      readonly op: 'apply_cue';
      readonly trigger: CueTriggerKind;
      readonly source?: SourceRef | null;
      readonly layout?: LayoutPresetRef | null;
      readonly overlayText?: string | null;
      readonly manual?: boolean;
      readonly nowMs?: number;
    }
  | {
      readonly op: 'set_preview';
      readonly source: SourceRef;
      readonly layout: LayoutPresetRef;
    }
  | {
      readonly op: 'take_preview_to_program';
      readonly nowMs?: number;
    };

export type DirectorApplyResult =
  | {
      readonly ok: true;
      readonly state: DirectorRuntimeState;
      readonly applied: boolean;
      readonly reason: string | null;
      readonly eventPayload: Record<string, unknown>;
      /** When true, also bump programPresentation via SQL. */
      readonly pushProgram: boolean;
    }
  | { readonly ok: false; readonly reason: string };

const TRIGGERS: readonly CueTriggerKind[] = [
  'manual',
  'scene',
  'combat_start',
  'combat_end',
  'roll',
  'reveal',
  'downed',
  'dead',
  'program',
];

export function emptyDirectorRuntimeState(): DirectorRuntimeState {
  return {
    schemaVersion: DIRECTOR_RUNTIME_SCHEMA_VERSION,
    automaticMode: 'off',
    preview: {
      source: { kind: 'shared-scene' },
      layout: { kind: 'fullscreen-16x9' },
    },
    program: {
      source: { kind: 'shared-scene' },
      layout: { kind: 'fullscreen-16x9' },
      revision: 0,
    },
    lastCue: null,
    lastManualOverrideAt: null,
    cooldownMs: 1500,
    lastAutoAppliedAt: null,
    updatedAt: null,
  };
}

export function parseDirectorRuntimeState(raw: unknown): DirectorRuntimeState {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return emptyDirectorRuntimeState();
  }
  const row = raw as Record<string, unknown>;
  const base = emptyDirectorRuntimeState();
  const automaticMode = row.automaticMode === 'on' ? 'on' : 'off';
  const preview = parseStage(row.preview) ?? base.preview;
  const programRaw = row.program;
  let program = base.program;
  if (programRaw && typeof programRaw === 'object' && !Array.isArray(programRaw)) {
    const p = programRaw as Record<string, unknown>;
    const stage = parseStage(p) ?? base.program;
    program = {
      ...stage,
      revision:
        typeof p.revision === 'number' && Number.isFinite(p.revision)
          ? Math.max(0, Math.floor(p.revision))
          : 0,
    };
  }
  return {
    schemaVersion: DIRECTOR_RUNTIME_SCHEMA_VERSION,
    automaticMode,
    preview,
    program,
    lastCue: parseCue(row.lastCue),
    lastManualOverrideAt:
      typeof row.lastManualOverrideAt === 'string' ? row.lastManualOverrideAt : null,
    cooldownMs:
      typeof row.cooldownMs === 'number' && Number.isFinite(row.cooldownMs)
        ? Math.max(0, Math.min(30_000, Math.floor(row.cooldownMs)))
        : 1500,
    lastAutoAppliedAt:
      typeof row.lastAutoAppliedAt === 'string' ? row.lastAutoAppliedAt : null,
    updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : null,
  };
}

export function readDirectorRuntime(shared: Record<string, unknown>): DirectorRuntimeState {
  return parseDirectorRuntimeState(shared.director);
}

function parseSource(raw: unknown): SourceRef {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { kind: 'shared-scene' };
  }
  const kind = (raw as Record<string, unknown>).kind;
  if (kind === 'neutral' || kind === 'shared-scene' || kind === 'program') {
    return { kind };
  }
  if (kind === 'look') {
    const lookId = (raw as Record<string, unknown>).lookId;
    return {
      kind: 'look',
      lookId: typeof lookId === 'string' ? lookId.slice(0, 128) : null,
    };
  }
  return { kind: 'shared-scene' };
}

function parseLayout(raw: unknown): LayoutPresetRef {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { kind: 'fullscreen-16x9' };
  }
  const kind = (raw as Record<string, unknown>).kind;
  if (kind === 'letterbox' || kind === 'split-focus' || kind === 'fullscreen-16x9') {
    return { kind };
  }
  return { kind: 'fullscreen-16x9' };
}

function parseStage(raw: unknown): { source: SourceRef; layout: LayoutPresetRef } | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  return { source: parseSource(row.source), layout: parseLayout(row.layout) };
}

function parseCue(raw: unknown): DirectorCue | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  const trigger = row.trigger;
  if (typeof trigger !== 'string' || !TRIGGERS.includes(trigger as CueTriggerKind)) {
    return null;
  }
  return {
    id: typeof row.id === 'string' ? row.id : 'cue',
    trigger: trigger as CueTriggerKind,
    source: parseSource(row.source),
    layout: parseLayout(row.layout),
    overlayText: typeof row.overlayText === 'string' ? row.overlayText.slice(0, 120) : null,
    manual: row.manual === true,
    appliedAt: typeof row.appliedAt === 'string' ? row.appliedAt : null,
  };
}

/**
 * Deterministic event → cue mapping for Automatic Mode.
 * Unknown events → null (no-op, never random).
 */
export function mapSessionEventToCueTrigger(
  sessionEventKind: string,
  detail?: { readonly lifeStatus?: string | null; readonly combatAction?: string | null },
): CueTriggerKind | null {
  switch (sessionEventKind) {
    case 'scene':
      return 'scene';
    case 'combat':
      if (detail?.combatAction === 'end') return 'combat_end';
      if (detail?.combatAction === 'start') return 'combat_start';
      return 'combat_start';
    case 'roll':
      return 'roll';
    case 'reveal':
      return 'reveal';
    case 'program':
      return 'program';
    case 'life':
    case 'damage':
      if (detail?.lifeStatus === 'dead') return 'dead';
      if (detail?.lifeStatus === 'downed' || detail?.lifeStatus === 'stable') return 'downed';
      return null;
    default:
      return null;
  }
}

/** Default cue body for a trigger (deterministic). */
export function defaultCueForTrigger(trigger: CueTriggerKind): {
  source: SourceRef;
  layout: LayoutPresetRef;
  overlayText: string | null;
} {
  switch (trigger) {
    case 'combat_start':
      return {
        source: { kind: 'shared-scene' },
        layout: { kind: 'split-focus' },
        overlayText: 'Kampf',
      };
    case 'combat_end':
      return {
        source: { kind: 'shared-scene' },
        layout: { kind: 'fullscreen-16x9' },
        overlayText: null,
      };
    case 'roll':
      return {
        source: { kind: 'shared-scene' },
        layout: { kind: 'letterbox' },
        overlayText: 'Probe',
      };
    case 'reveal':
      return {
        source: { kind: 'shared-scene' },
        layout: { kind: 'fullscreen-16x9' },
        overlayText: 'Enthüllt',
      };
    case 'downed':
      return {
        source: { kind: 'shared-scene' },
        layout: { kind: 'letterbox' },
        overlayText: 'Kampfunfähig',
      };
    case 'dead':
      return {
        source: { kind: 'shared-scene' },
        layout: { kind: 'letterbox' },
        overlayText: 'Gefallen',
      };
    case 'scene':
    case 'program':
    case 'manual':
    default:
      return {
        source: { kind: 'shared-scene' },
        layout: { kind: 'fullscreen-16x9' },
        overlayText: null,
      };
  }
}

export function assertDirectorCueAccess(access: LiveSessionAccess): void {
  if (!canExecuteLiveSessionCommand(access, 'cue')) {
    throw new Error('Keine Director-/Cue-Rechte');
  }
}

/**
 * Director cannot mutate gameplay — domain refuses gameplay ops entirely.
 */
export function assertDirectorCannotMutateGameplay(op: string): void {
  const forbidden = [
    'damage',
    'heal',
    'combat',
    'life',
    'adventure',
    'inventory',
    'reveal_secret_body',
  ];
  if (forbidden.includes(op)) {
    throw new Error('Director darf Gameplay nicht mutieren');
  }
}

function stamp(state: DirectorRuntimeState): DirectorRuntimeState {
  return { ...state, updatedAt: new Date().toISOString() };
}

function withinCooldown(state: DirectorRuntimeState, nowMs: number): boolean {
  if (!state.lastAutoAppliedAt) return false;
  const last = Date.parse(state.lastAutoAppliedAt);
  if (!Number.isFinite(last)) return false;
  return nowMs - last < state.cooldownMs;
}

/**
 * Apply a director command. Manual cues always win over automatic.
 * Automatic cues respect mode + cooldown; never apply when mode is off.
 */
export function applyDirectorCueCommand(input: {
  command: DirectorCueCommand;
  previous: DirectorRuntimeState;
}): DirectorApplyResult {
  const { command } = input;
  let state = input.previous;

  switch (command.op) {
    case 'set_automatic_mode':
      state = stamp({ ...state, automaticMode: command.mode });
      return {
        ok: true,
        state,
        applied: true,
        reason: null,
        pushProgram: false,
        eventPayload: {
          op: 'set_automatic_mode',
          mode: command.mode,
          authoritative: true,
        },
      };
    case 'set_preview':
      state = stamp({
        ...state,
        preview: { source: command.source, layout: command.layout },
      });
      return {
        ok: true,
        state,
        applied: true,
        reason: null,
        pushProgram: false,
        eventPayload: {
          op: 'set_preview',
          source: command.source,
          layout: command.layout,
          authoritative: true,
        },
      };
    case 'take_preview_to_program': {
      const now = new Date(command.nowMs ?? Date.now()).toISOString();
      const cue: DirectorCue = {
        id: `cue-manual-${Date.now().toString(36)}`,
        trigger: 'manual',
        source: state.preview.source,
        layout: state.preview.layout,
        overlayText: null,
        manual: true,
        appliedAt: now,
      };
      state = stamp({
        ...state,
        program: {
          source: state.preview.source,
          layout: state.preview.layout,
          revision: state.program.revision + 1,
        },
        lastCue: cue,
        lastManualOverrideAt: now,
      });
      return {
        ok: true,
        state,
        applied: true,
        reason: null,
        pushProgram: true,
        eventPayload: {
          op: 'take_preview_to_program',
          cue,
          programRevision: state.program.revision,
          authoritative: true,
        },
      };
    }
    case 'apply_cue': {
      const manual = command.manual === true || command.trigger === 'manual';
      const nowMs = command.nowMs ?? Date.now();
      const nowIso = new Date(nowMs).toISOString();
      const defaults = defaultCueForTrigger(command.trigger);
      const source = command.source ?? defaults.source;
      const layout = command.layout ?? defaults.layout;
      const overlayText =
        command.overlayText !== undefined ? command.overlayText : defaults.overlayText;

      if (!manual) {
        if (state.automaticMode !== 'on') {
          return {
            ok: true,
            state,
            applied: false,
            reason: 'automatic_mode_off',
            pushProgram: false,
            eventPayload: {
              op: 'apply_cue',
              applied: false,
              reason: 'automatic_mode_off',
              trigger: command.trigger,
              authoritative: true,
            },
          };
        }
        if (withinCooldown(state, nowMs)) {
          return {
            ok: true,
            state,
            applied: false,
            reason: 'cooldown',
            pushProgram: false,
            eventPayload: {
              op: 'apply_cue',
              applied: false,
              reason: 'cooldown',
              trigger: command.trigger,
              authoritative: true,
            },
          };
        }
      }

      const cue: DirectorCue = {
        id: `cue-${command.trigger}-${Date.now().toString(36)}`,
        trigger: command.trigger,
        source,
        layout,
        overlayText,
        manual,
        appliedAt: nowIso,
      };
      state = stamp({
        ...state,
        program: {
          source,
          layout,
          revision: state.program.revision + 1,
        },
        lastCue: cue,
        lastManualOverrideAt: manual ? nowIso : state.lastManualOverrideAt,
        lastAutoAppliedAt: manual ? state.lastAutoAppliedAt : nowIso,
      });
      return {
        ok: true,
        state,
        applied: true,
        reason: null,
        pushProgram: true,
        eventPayload: {
          op: 'apply_cue',
          applied: true,
          cue,
          programRevision: state.program.revision,
          authoritative: true,
        },
      };
    }
  }
}

export function parseDirectorCueCommand(raw: unknown): DirectorCueCommand {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Ungültiger Cue-Command');
  }
  const row = raw as Record<string, unknown>;
  const op = row.op;
  if (op === 'set_automatic_mode') {
    return { op, mode: row.mode === 'on' ? 'on' : 'off' };
  }
  if (op === 'set_preview') {
    return {
      op,
      source: parseSource(row.source),
      layout: parseLayout(row.layout),
    };
  }
  if (op === 'take_preview_to_program') {
    return { op };
  }
  // Default / GM palette: apply_cue (trigger optional → manual)
  const triggerRaw = typeof row.trigger === 'string' ? row.trigger : 'manual';
  const trigger = TRIGGERS.includes(triggerRaw as CueTriggerKind)
    ? (triggerRaw as CueTriggerKind)
    : 'manual';
  return {
    op: 'apply_cue',
    trigger,
    source: row.source ? parseSource(row.source) : null,
    layout: row.layout ? parseLayout(row.layout) : null,
    overlayText: typeof row.overlayText === 'string' ? row.overlayText : typeof row.note === 'string' ? row.note : null,
    manual: row.manual !== false && (trigger === 'manual' || row.manual === true),
  };
}
