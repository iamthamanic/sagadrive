/**
 * Parse / normalize NPC-creature definition payloads (#196).
 * Location: src/domains/npc-creature/parse.ts
 *
 * Identity (id, scope) comes from trusted columns — never from payload.
 * Domain-pure: no React, no Supabase, no UI imports.
 */

import {
  isSagaDriveNpcLevel,
  normalizeCombatRoleForProfile,
  type SagaDriveCombatProfile,
  type SagaDriveCombatRole,
  type SagaDriveNpcLevel,
} from '../rules/sagadrive/npc-creature-power';
import type { NpcCreatureDefinition, NpcCreatureDefinitionWriteDraft } from './definition';
import { NPC_CREATURE_DEFINITION_PAYLOAD_VERSION } from './payload';
import {
  isNpcCreatureCategory,
  isNpcCreatureKind,
  isNpcCreatureScope,
  isNpcCreatureSheetMode,
  type NpcCreatureScope,
} from './taxonomy';
import { validateNpcCreatureDefinition } from './validate';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const COMBAT_PROFILES: readonly string[] = [
  'noncombat',
  'balanced',
  'tough',
  'offensive',
  'mobile',
  'ranged',
  'control_support',
];

const COMBAT_ROLES: readonly string[] = ['standard', 'elite', 'boss'];

function readString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function readTags(value: unknown): readonly string[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  const tags: string[] = [];
  for (const entry of value) {
    if (typeof entry !== 'string') return null;
    tags.push(entry);
  }
  return tags;
}

/**
 * Build a definition from trusted id/scope columns + untrusted payload.
 * Returns null when the row cannot be read as a valid SagaDrive definition.
 */
export function parseNpcCreatureDefinition(
  id: string,
  scope: NpcCreatureScope,
  payload: unknown,
): NpcCreatureDefinition | null {
  if (!isNpcCreatureScope(scope)) return null;
  if (typeof id !== 'string' || !id.startsWith(`${scope}:`)) return null;
  if (!isRecord(payload)) return null;

  // Payload must never declare a conflicting identity.
  if ('id' in payload || 'scope' in payload) return null;

  const name = readString(payload.name);
  const description = readString(payload.description) ?? '';
  if (!name) return null;

  if (!isNpcCreatureKind(payload.kind)) return null;
  if (!isNpcCreatureCategory(payload.category)) return null;
  if (!isNpcCreatureSheetMode(payload.sheetMode)) return null;

  const levelRaw = payload.level;
  if (typeof levelRaw !== 'number' || !isSagaDriveNpcLevel(levelRaw)) return null;
  const level: SagaDriveNpcLevel = levelRaw;

  if (typeof payload.combatProfile !== 'string' || !COMBAT_PROFILES.includes(payload.combatProfile)) {
    return null;
  }
  if (typeof payload.combatRole !== 'string' || !COMBAT_ROLES.includes(payload.combatRole)) {
    return null;
  }
  const combatProfile = payload.combatProfile as SagaDriveCombatProfile;
  const combatRole = payload.combatRole as SagaDriveCombatRole;
  if (normalizeCombatRoleForProfile(combatProfile, combatRole) !== combatRole) return null;

  const tags = readTags(payload.tags);
  if (tags === null) return null;

  const portraitAssetKey = payload.portraitAssetKey === undefined
    ? undefined
    : readString(payload.portraitAssetKey) ?? null;
  if (portraitAssetKey === null) return null;

  const notes = payload.notes === undefined ? undefined : readString(payload.notes);
  if (payload.notes !== undefined && notes === null) return null;

  let fullSheet: Readonly<Record<string, unknown>> | undefined;
  if (payload.fullSheet !== undefined) {
    if (!isRecord(payload.fullSheet)) return null;
    fullSheet = payload.fullSheet;
  }

  const candidate: NpcCreatureDefinition = {
    id,
    scope,
    name: name.trim(),
    description,
    kind: payload.kind,
    category: payload.category,
    sheetMode: payload.sheetMode,
    level,
    combatProfile,
    combatRole,
    tags,
    ...(portraitAssetKey !== undefined ? { portraitAssetKey } : {}),
    ...(notes !== undefined ? { notes } : {}),
    ...(fullSheet !== undefined ? { fullSheet } : {}),
  };

  const validation = validateNpcCreatureDefinition(candidate);
  if (!validation.ok) return null;
  return candidate;
}

/**
 * Payload column contents: everything except identity columns.
 * Stamps payloadVersion for the #196 contract.
 */
export function toNpcCreatureDefinitionPayload(
  definition: NpcCreatureDefinition,
): Record<string, unknown> {
  const { id: _id, scope: _scope, ...rest } = definition;
  return {
    ...rest,
    tags: [...rest.tags],
    payloadVersion: NPC_CREATURE_DEFINITION_PAYLOAD_VERSION,
  };
}

/** Assemble a write draft into a candidate definition for pre-write validation. */
export function assembleNpcCreatureDefinition(
  id: string,
  scope: NpcCreatureScope,
  draft: NpcCreatureDefinitionWriteDraft,
): NpcCreatureDefinition {
  return {
    ...draft,
    id,
    scope,
    tags: draft.tags ?? [],
  };
}
