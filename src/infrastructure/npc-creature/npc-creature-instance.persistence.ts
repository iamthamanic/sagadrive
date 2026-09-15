/**
 * npc-creature-instance.persistence — row DTO ↔ domain instance mapper (#201).
 * Location: src/infrastructure/npc-creature/npc-creature-instance.persistence.ts
 */

import type {
  NpcCreatureDefinitionSnapshot,
  NpcCreatureInstance,
  NpcCreatureInstanceKind,
  NpcCreatureInstanceRuntime,
} from '../../domains/npc-creature';

export interface NpcCreatureInstanceRow {
  id: string;
  project_id: string;
  session_id: string | null;
  definition_id: string;
  display_name: string;
  instance_kind: string;
  sequence_number: number;
  snapshot: unknown;
  runtime: unknown;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string');
}

function parseSnapshot(raw: unknown): NpcCreatureDefinitionSnapshot {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const tags = asStringArray(obj.tags);
  return {
    name: typeof obj.name === 'string' ? obj.name : 'Figur',
    kind: obj.kind === 'creature' ? 'creature' : 'npc',
    category: (typeof obj.category === 'string' ? obj.category : 'sonstige') as NpcCreatureDefinitionSnapshot['category'],
    sheetMode: obj.sheetMode === 'full' ? 'full' : 'compact',
    level: (typeof obj.level === 'number' ? obj.level : 1) as NpcCreatureDefinitionSnapshot['level'],
    combatProfile: (typeof obj.combatProfile === 'string'
      ? obj.combatProfile
      : 'balanced') as NpcCreatureDefinitionSnapshot['combatProfile'],
    combatRole: (typeof obj.combatRole === 'string'
      ? obj.combatRole
      : 'standard') as NpcCreatureDefinitionSnapshot['combatRole'],
    tags,
    portraitAssetKey:
      typeof obj.portraitAssetKey === 'string' ? obj.portraitAssetKey : undefined,
    notes: typeof obj.notes === 'string' ? obj.notes : undefined,
    maxHealth: typeof obj.maxHealth === 'number' ? obj.maxHealth : 1,
    capturedAt:
      typeof obj.capturedAt === 'string' ? obj.capturedAt : new Date(0).toISOString(),
  };
}

function parseRuntime(raw: unknown): NpcCreatureInstanceRuntime {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const temp =
    obj.temporaryControllerUserId === null
    || obj.temporaryControllerUserId === undefined
      ? null
      : typeof obj.temporaryControllerUserId === 'string'
        ? obj.temporaryControllerUserId
        : null;
  return {
    currentHp: typeof obj.currentHp === 'number' ? obj.currentHp : 0,
    conditions: asStringArray(obj.conditions),
    temporaryControllerUserId: temp && temp.trim() ? temp.trim() : null,
    encounterNotes: typeof obj.encounterNotes === 'string' ? obj.encounterNotes : '',
  };
}

export function toNpcCreatureInstance(row: NpcCreatureInstanceRow): NpcCreatureInstance {
  const kind: NpcCreatureInstanceKind =
    row.instance_kind === 'persistent' ? 'persistent' : 'generic';
  return {
    id: row.id,
    projectId: row.project_id,
    sessionId: row.session_id,
    definitionId: row.definition_id,
    displayName: row.display_name,
    instanceKind: kind,
    sequenceNumber: row.sequence_number,
    snapshot: parseSnapshot(row.snapshot),
    runtime: parseRuntime(row.runtime),
  };
}

export function toInstanceRuntimePayload(
  runtime: NpcCreatureInstanceRuntime,
): Record<string, unknown> {
  return {
    currentHp: runtime.currentHp,
    conditions: [...runtime.conditions],
    temporaryControllerUserId: runtime.temporaryControllerUserId,
    encounterNotes: runtime.encounterNotes,
  };
}

export function toInstanceSnapshotPayload(
  snapshot: NpcCreatureDefinitionSnapshot,
): Record<string, unknown> {
  return {
    name: snapshot.name,
    kind: snapshot.kind,
    category: snapshot.category,
    sheetMode: snapshot.sheetMode,
    level: snapshot.level,
    combatProfile: snapshot.combatProfile,
    combatRole: snapshot.combatRole,
    tags: [...snapshot.tags],
    portraitAssetKey: snapshot.portraitAssetKey ?? null,
    notes: snapshot.notes ?? null,
    maxHealth: snapshot.maxHealth,
    capturedAt: snapshot.capturedAt,
  };
}
