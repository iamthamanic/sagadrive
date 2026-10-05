/**
 * live-inventory-lifecycle — Session-scoped inventory commands over Inventory V2 (#372).
 * Location: src/domains/session/contracts/live-inventory-lifecycle.ts
 *
 * Reuses inventory-v2 ops; no Inventory v3. Pure domain orchestration.
 */
import type {
  EquipmentSlot,
  InventoryState,
  ItemDefinition,
  ItemDefinitionLookup,
} from '../../character/inventory-v2';
import {
  addItems,
  consumeItem,
  equipItem,
  removeItem,
  unequipItem,
  type InventoryOperationResult,
} from '../../character/inventory-v2';

function opFailReason(result: InventoryOperationResult): string {
  if (result.ok === true) return 'Inventory-Operation fehlgeschlagen';
  return result.reason;
}
import type { LiveSessionAccess } from './live-session-access';
import { canExecuteLiveSessionCommand } from './live-session-access';

export type LiveInventoryOp =
  | 'discover'
  | 'acquire'
  | 'give'
  | 'transfer'
  | 'equip'
  | 'unequip'
  | 'consume'
  | 'remove';

export type LiveInventoryCommand = {
  readonly op: LiveInventoryOp;
  readonly characterId: string;
  readonly targetCharacterId?: string | null;
  readonly definitionId?: string | null;
  readonly instanceId?: string | null;
  readonly equipmentSlot?: EquipmentSlot | null;
  readonly quantity?: number | null;
  readonly note?: string | null;
};

export type LiveInventoryApplyResult =
  | {
      readonly ok: true;
      readonly sourceState: InventoryState;
      readonly targetState?: InventoryState;
      readonly eventPayload: Record<string, unknown>;
    }
  | { readonly ok: false; readonly reason: string };

export function parseLiveInventoryCommand(raw: unknown): LiveInventoryCommand {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Ungültiger Inventory-Command');
  }
  const row = raw as Record<string, unknown>;
  const op = row.op;
  const allowed: LiveInventoryOp[] = [
    'discover',
    'acquire',
    'give',
    'transfer',
    'equip',
    'unequip',
    'consume',
    'remove',
  ];
  if (typeof op !== 'string' || !allowed.includes(op as LiveInventoryOp)) {
    throw new Error('Ungültige Inventory-Operation');
  }
  const characterId = typeof row.characterId === 'string' ? row.characterId.trim() : '';
  if (!characterId) throw new Error('characterId erforderlich');
  return {
    op: op as LiveInventoryOp,
    characterId,
    targetCharacterId:
      typeof row.targetCharacterId === 'string' ? row.targetCharacterId.trim() : null,
    definitionId: typeof row.definitionId === 'string' ? row.definitionId.trim() : null,
    instanceId: typeof row.instanceId === 'string' ? row.instanceId.trim() : null,
    equipmentSlot:
      typeof row.equipmentSlot === 'string'
        ? (row.equipmentSlot as EquipmentSlot)
        : null,
    quantity:
      typeof row.quantity === 'number' && Number.isFinite(row.quantity)
        ? Math.max(1, Math.round(row.quantity))
        : 1,
    note: typeof row.note === 'string' ? row.note : null,
  };
}

export function assertLiveInventoryAccess(
  access: LiveSessionAccess,
  command: LiveInventoryCommand,
  boundCharacterId: string | null,
): void {
  const gm = access.role === 'gamemaster';
  if (gm) {
    if (
      command.op === 'give' ||
      command.op === 'remove' ||
      command.op === 'discover' ||
      command.op === 'acquire'
    ) {
      if (!canExecuteLiveSessionCommand(access, 'gameplay_mutate')) {
        throw new Error('Keine Gameplay-Rechte');
      }
      return;
    }
  }
  if (access.role !== 'player' || !boundCharacterId) {
    throw new Error('Nur gebundenen Spielern erlaubt');
  }
  if (command.characterId !== boundCharacterId) {
    throw new Error('Nur eigener Charakter darf inventarisiert werden');
  }
  if (command.op === 'give' || command.op === 'discover') {
    throw new Error('Spieler darf diese GM-Operation nicht ausführen');
  }
}

function lookupFromDefinition(definition: ItemDefinition): ItemDefinitionLookup {
  return (id: string) => (id === definition.id ? definition : undefined);
}

/**
 * Apply one inventory op using Inventory V2 pure functions.
 * Transfer mutates both source and target states.
 */
export function applyLiveInventoryCommand(input: {
  command: LiveInventoryCommand;
  sourceState: InventoryState;
  targetState?: InventoryState | null;
  definition?: ItemDefinition | null;
  characterStrength?: number;
}): LiveInventoryApplyResult {
  const { command } = input;
  const qty = command.quantity ?? 1;
  const strength =
    typeof input.characterStrength === 'number' && Number.isFinite(input.characterStrength)
      ? input.characterStrength
      : 10;

  switch (command.op) {
    case 'discover':
    case 'acquire':
    case 'give': {
      if (!input.definition) {
        return { ok: false, reason: 'Item-Definition fehlt' };
      }
      const added = addItems(
        input.sourceState,
        lookupFromDefinition(input.definition),
        input.definition.id,
        qty,
      );
      if (!added.ok) return { ok: false, reason: opFailReason(added) };
      return {
        ok: true,
        sourceState: added.state,
        eventPayload: {
          op: command.op,
          characterId: command.characterId,
          definitionId: input.definition.id,
          quantity: qty,
          note: command.note,
        },
      };
    }
    case 'transfer': {
      if (!command.instanceId || !command.targetCharacterId || !input.targetState) {
        return { ok: false, reason: 'Transfer benötigt instanceId und Ziel-Charakter' };
      }
      const instance = input.sourceState.instances[command.instanceId];
      if (!instance) return { ok: false, reason: 'Instanz unbekannt' };
      if (!input.definition) return { ok: false, reason: 'Item-Definition fehlt' };
      const removed = removeItem(input.sourceState, command.instanceId);
      if (!removed.ok) return { ok: false, reason: opFailReason(removed) };
      const added = addItems(
        input.targetState,
        lookupFromDefinition(input.definition),
        input.definition.id,
        instance.quantity,
      );
      if (!added.ok) return { ok: false, reason: opFailReason(added) };
      return {
        ok: true,
        sourceState: removed.state,
        targetState: added.state,
        eventPayload: {
          op: 'transfer',
          characterId: command.characterId,
          targetCharacterId: command.targetCharacterId,
          instanceId: command.instanceId,
          definitionId: input.definition.id,
          quantity: instance.quantity,
          note: command.note,
        },
      };
    }
    case 'equip': {
      if (!command.instanceId || !command.equipmentSlot || !input.definition) {
        return { ok: false, reason: 'equip benötigt instanceId, Slot und Definition' };
      }
      const next = equipItem(
        input.sourceState,
        lookupFromDefinition(input.definition),
        command.instanceId,
        command.equipmentSlot,
        strength,
      );
      if (!next.ok) return { ok: false, reason: opFailReason(next) };
      return {
        ok: true,
        sourceState: next.state,
        eventPayload: {
          op: 'equip',
          characterId: command.characterId,
          instanceId: command.instanceId,
          equipmentSlot: command.equipmentSlot,
        },
      };
    }
    case 'unequip': {
      if (!command.equipmentSlot) {
        return { ok: false, reason: 'unequip benötigt Slot' };
      }
      const next = unequipItem(input.sourceState, command.equipmentSlot);
      if (!next.ok) return { ok: false, reason: opFailReason(next) };
      return {
        ok: true,
        sourceState: next.state,
        eventPayload: {
          op: 'unequip',
          characterId: command.characterId,
          equipmentSlot: command.equipmentSlot,
        },
      };
    }
    case 'consume': {
      if (!command.instanceId || !input.definition) {
        return { ok: false, reason: 'consume benötigt instanceId und Definition' };
      }
      const next = consumeItem(
        input.sourceState,
        lookupFromDefinition(input.definition),
        command.instanceId,
      );
      if (!next.ok) return { ok: false, reason: opFailReason(next) };
      return {
        ok: true,
        sourceState: next.state,
        eventPayload: {
          op: 'consume',
          characterId: command.characterId,
          instanceId: command.instanceId,
          quantity: 1,
        },
      };
    }
    case 'remove': {
      if (!command.instanceId) return { ok: false, reason: 'remove benötigt instanceId' };
      const next = removeItem(input.sourceState, command.instanceId);
      if (!next.ok) return { ok: false, reason: opFailReason(next) };
      return {
        ok: true,
        sourceState: next.state,
        eventPayload: {
          op: 'remove',
          characterId: command.characterId,
          instanceId: command.instanceId,
          note: command.note,
        },
      };
    }
  }
}
