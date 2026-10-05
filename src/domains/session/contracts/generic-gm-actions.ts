/**
 * generic-gm-actions — Catalog of GM Live actions that delegate to existing domains (#371).
 * Location: src/domains/session/contracts/generic-gm-actions.ts
 *
 * Orchestration descriptors only — no second rules/inventory/combat engine.
 */

import type { LiveSessionAccess } from './live-session-access';
import { canExecuteLiveSessionCommand } from './live-session-access';

export type GmActionGroup =
  | 'checks'
  | 'effects'
  | 'knowledge'
  | 'inventory'
  | 'presentation'
  | 'encounter'
  | 'adventure';

export type GmActionId =
  | 'request-check'
  | 'apply-damage'
  | 'apply-heal'
  | 'apply-condition'
  | 'reveal-knowledge'
  | 'give-item'
  | 'remove-item'
  | 'change-scene'
  | 'switch-program'
  | 'start-encounter'
  | 'end-encounter'
  | 'set-adventure-flag'
  | 'trigger-cue';

export type GmActionDescriptor = {
  readonly id: GmActionId;
  readonly group: GmActionGroup;
  readonly label: string;
  readonly description: string;
  /** Existing session runtime event kind (or presentation kind). */
  readonly runtimeKind: string;
  readonly requiresConfirm: boolean;
  readonly gameplay: boolean;
  readonly targetKinds: readonly ('none' | 'character' | 'participant' | 'scene' | 'fact' | 'item')[];
};

export const GM_ACTION_CATALOG: readonly GmActionDescriptor[] = [
  {
    id: 'request-check',
    group: 'checks',
    label: 'Check anfordern',
    description: 'Autoritative Probe über Rules Kernel (roll).',
    runtimeKind: 'roll',
    requiresConfirm: false,
    gameplay: true,
    targetKinds: ['character'],
  },
  {
    id: 'apply-damage',
    group: 'effects',
    label: 'Schaden anwenden',
    description: 'Combat damage über bestehendes combat command.',
    runtimeKind: 'combat',
    requiresConfirm: true,
    gameplay: true,
    targetKinds: ['participant'],
  },
  {
    id: 'apply-heal',
    group: 'effects',
    label: 'Heilung anwenden',
    description: 'Combat heal über bestehendes combat command.',
    runtimeKind: 'combat',
    requiresConfirm: true,
    gameplay: true,
    targetKinds: ['participant'],
  },
  {
    id: 'apply-condition',
    group: 'effects',
    label: 'Zustand setzen',
    description: 'Condition add/remove über combat API.',
    runtimeKind: 'combat',
    requiresConfirm: false,
    gameplay: true,
    targetKinds: ['participant'],
  },
  {
    id: 'reveal-knowledge',
    group: 'knowledge',
    label: 'Reveal senden',
    description: 'Knowledge reveal über reveal command.',
    runtimeKind: 'reveal',
    requiresConfirm: false,
    gameplay: false,
    targetKinds: ['fact'],
  },
  {
    id: 'give-item',
    group: 'inventory',
    label: 'Item geben',
    description: 'Inventory API (Lifecycle #372) — Descriptor reserved.',
    runtimeKind: 'inventory',
    requiresConfirm: true,
    gameplay: true,
    targetKinds: ['character', 'item'],
  },
  {
    id: 'remove-item',
    group: 'inventory',
    label: 'Item entfernen',
    description: 'Inventory API (Lifecycle #372) — Descriptor reserved.',
    runtimeKind: 'inventory',
    requiresConfirm: true,
    gameplay: true,
    targetKinds: ['character', 'item'],
  },
  {
    id: 'change-scene',
    group: 'presentation',
    label: 'Szene wechseln',
    description: 'Shared scene publish über scene command.',
    runtimeKind: 'scene',
    requiresConfirm: false,
    gameplay: false,
    targetKinds: ['scene'],
  },
  {
    id: 'switch-program',
    group: 'presentation',
    label: 'Program wechseln',
    description: 'Program switch über program command.',
    runtimeKind: 'program',
    requiresConfirm: false,
    gameplay: false,
    targetKinds: ['none'],
  },
  {
    id: 'start-encounter',
    group: 'encounter',
    label: 'Encounter starten',
    description: 'Combat start über combat API.',
    runtimeKind: 'combat',
    requiresConfirm: true,
    gameplay: true,
    targetKinds: ['none'],
  },
  {
    id: 'end-encounter',
    group: 'encounter',
    label: 'Encounter beenden',
    description: 'Combat end über combat API.',
    runtimeKind: 'combat',
    requiresConfirm: true,
    gameplay: true,
    targetKinds: ['none'],
  },
  {
    id: 'set-adventure-flag',
    group: 'adventure',
    label: 'Adventure-Flag setzen',
    description: 'Typed adventure state key (#374) — not raw world_state JSON.',
    runtimeKind: 'adventure-state',
    requiresConfirm: true,
    gameplay: true,
    targetKinds: ['none'],
  },
  {
    id: 'trigger-cue',
    group: 'presentation',
    label: 'Cue auslösen',
    description: 'Presentation cue (#375 Director) — descriptor reserved.',
    runtimeKind: 'cue',
    requiresConfirm: false,
    gameplay: false,
    targetKinds: ['none'],
  },
] as const;

export function listGmActions(query = ''): readonly GmActionDescriptor[] {
  const q = query.trim().toLowerCase();
  if (!q) return GM_ACTION_CATALOG;
  return GM_ACTION_CATALOG.filter(
    (a) =>
      a.label.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      a.group.includes(q) ||
      a.id.includes(q),
  );
}

export function getGmAction(id: GmActionId): GmActionDescriptor | null {
  return GM_ACTION_CATALOG.find((a) => a.id === id) ?? null;
}

/**
 * Director-only must not invoke gameplay actions.
 */
export function assertGmActionAllowed(
  access: LiveSessionAccess,
  action: GmActionDescriptor,
): void {
  if (access.role !== 'gamemaster') {
    throw new Error('Nur Gamemaster dürfen GM Actions ausführen');
  }
  if (
    action.gameplay &&
    !canExecuteLiveSessionCommand(access, 'gameplay_mutate')
  ) {
    throw new Error('Keine Gameplay-Rechte für diese Action');
  }
}

/** True when runtimeKind is already a SessionEventKind (not a future slice). */
export function isExecutableGmRuntimeKind(kind: string): boolean {
  return (
    kind === 'roll' ||
    kind === 'combat' ||
    kind === 'reveal' ||
    kind === 'scene' ||
    kind === 'program' ||
    kind === 'damage' ||
    kind === 'condition' ||
    kind === 'gameplay'
  );
}

/**
 * Compose a freeform table beat (e.g. "Taverne anzünden") into catalog actions.
 * No special-case adventure code — returns descriptors GM can chain.
 */
export function composeUnexpectedBeat(intent: string): readonly GmActionId[] {
  const text = intent.trim().toLowerCase();
  if (!text) return [];
  const ids: GmActionId[] = [];
  if (/(check|probe|würfel|wahrnehm|athlet)/.test(text)) ids.push('request-check');
  if (/(feuer|brenn|anzünd|schaden|verletz)/.test(text)) {
    ids.push('apply-damage', 'apply-condition');
  }
  if (/(heil|heilen|stabil)/.test(text)) ids.push('apply-heal');
  if (/(reveal|entdeck|geheim)/.test(text)) ids.push('reveal-knowledge');
  if (/(item|geben|nehmen|inventar)/.test(text)) ids.push('give-item');
  if (/(szene|scene|ort|taverne)/.test(text)) ids.push('change-scene');
  if (/(kampf|encounter|initiative)/.test(text)) ids.push('start-encounter');
  if (/(cue|cut|kamer)/.test(text)) ids.push('trigger-cue');
  if (ids.length === 0) {
    return ['change-scene', 'request-check', 'set-adventure-flag'];
  }
  return [...new Set(ids)];
}

export type ResolvedGmRuntimeCommand = {
  readonly kind: string;
  readonly payload: Record<string, unknown>;
  readonly requiresConfirm: boolean;
  readonly actionId: GmActionId;
};

/**
 * Map a catalog action + form fields to a runtime command payload.
 * Inventory/adventure/cue may return kind that later slices wire; validation stays here.
 */
export function resolveGmActionCommand(input: {
  actionId: GmActionId;
  targetId?: string | null;
  amount?: number | null;
  note?: string | null;
  skill?: string | null;
  condition?: string | null;
  sceneId?: string | null;
  factId?: string | null;
  itemId?: string | null;
  flagKey?: string | null;
  flagValue?: string | boolean | number | null;
}): ResolvedGmRuntimeCommand {
  const action = getGmAction(input.actionId);
  if (!action) throw new Error('Unbekannte GM Action');

  switch (input.actionId) {
    case 'request-check':
      return {
        actionId: action.id,
        kind: 'roll',
        requiresConfirm: action.requiresConfirm,
        payload: {
          skill: input.skill ?? 'perception',
          characterId: input.targetId ?? null,
          intent: 'gm-requested-check',
          mode: 'normal',
          useDrive: false,
          note: input.note ?? null,
        },
      };
    case 'apply-damage':
      return {
        actionId: action.id,
        kind: 'combat',
        requiresConfirm: true,
        payload: {
          action: 'damage',
          participantId: input.targetId ?? null,
          amount: Math.max(0, Math.round(Number(input.amount ?? 0))),
          mode: 'damage',
          note: input.note ?? null,
        },
      };
    case 'apply-heal':
      return {
        actionId: action.id,
        kind: 'combat',
        requiresConfirm: true,
        payload: {
          action: 'damage',
          participantId: input.targetId ?? null,
          amount: Math.max(0, Math.round(Number(input.amount ?? 0))),
          mode: 'heal',
          note: input.note ?? null,
        },
      };
    case 'apply-condition':
      return {
        actionId: action.id,
        kind: 'combat',
        requiresConfirm: false,
        payload: {
          action: 'condition',
          participantId: input.targetId ?? null,
          op: 'add',
          condition: input.condition ?? 'burning',
          note: input.note ?? null,
        },
      };
    case 'reveal-knowledge':
      return {
        actionId: action.id,
        kind: 'reveal',
        requiresConfirm: false,
        payload: {
          factId: input.factId ?? input.targetId ?? null,
          target: { kind: 'public' },
          note: input.note ?? null,
        },
      };
    case 'change-scene':
      return {
        actionId: action.id,
        kind: 'scene',
        requiresConfirm: false,
        payload: {
          sceneId: input.sceneId ?? input.targetId ?? null,
          note: input.note ?? null,
        },
      };
    case 'switch-program':
      return {
        actionId: action.id,
        kind: 'program',
        requiresConfirm: false,
        payload: { note: input.note ?? null },
      };
    case 'start-encounter':
      return {
        actionId: action.id,
        kind: 'combat',
        requiresConfirm: true,
        payload: { action: 'start', note: input.note ?? null },
      };
    case 'end-encounter':
      return {
        actionId: action.id,
        kind: 'combat',
        requiresConfirm: true,
        payload: { action: 'end', note: input.note ?? null },
      };
    case 'give-item':
    case 'remove-item':
      return {
        actionId: action.id,
        kind: 'inventory',
        requiresConfirm: true,
        payload: {
          op: input.actionId === 'give-item' ? 'give' : 'remove',
          characterId: input.targetId ?? null,
          itemId: input.itemId ?? null,
          note: input.note ?? null,
        },
      };
    case 'set-adventure-flag':
      return {
        actionId: action.id,
        kind: 'adventure-state',
        requiresConfirm: true,
        payload: {
          key: input.flagKey ?? 'flag',
          value: input.flagValue ?? true,
          note: input.note ?? null,
        },
      };
    case 'trigger-cue':
      return {
        actionId: action.id,
        kind: 'cue',
        requiresConfirm: false,
        payload: { note: input.note ?? null },
      };
  }
}
