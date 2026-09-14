/**
 * Ownership / visibility policy for NPC-creature definitions (#196).
 * Location: src/domains/npc-creature/policy.ts
 *
 * Mirrors inventory catalog personal/world rules. Domain-pure.
 */

import type { NpcCreatureDefinition } from './definition';
import type { NpcCreatureScope, NpcCreatureStatus } from './taxonomy';

export interface NpcCreatureCatalogRecord {
  definition: NpcCreatureDefinition;
  status: NpcCreatureStatus;
  ownerUserId: string;
  worldProfileId: string | null;
}

export interface NpcCreatureMutationContext {
  userId: string;
  /** World profiles the caller may edit (trusted). */
  editableWorldProfileIds: readonly string[];
}

export interface NpcCreatureVisibilityContext {
  userId: string;
  /** Worlds the caller may read (trusted). */
  readableWorldProfileIds: readonly string[];
}

function normalizeId(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Whether the caller may see this record. */
export function isNpcCreatureDefinitionVisible(
  record: NpcCreatureCatalogRecord,
  context: NpcCreatureVisibilityContext,
): boolean {
  switch (record.definition.scope) {
    case 'core':
      // Repository-local Core / builtin pack members are always readable.
      return true;
    case 'personal': {
      const ownerUserId = normalizeId(record.ownerUserId);
      const userId = normalizeId(context.userId);
      if (!ownerUserId || !userId) return false;
      return ownerUserId === userId;
    }
    case 'world': {
      const worldProfileId = normalizeId(record.worldProfileId);
      if (!worldProfileId) return false;
      return context.readableWorldProfileIds.some(
        (id) => normalizeId(id) === worldProfileId,
      );
    }
    default:
      return false;
  }
}

/** Whether the caller may create/update/archive this record. */
export function canMutateNpcCreatureDefinition(
  record: NpcCreatureCatalogRecord,
  context: NpcCreatureMutationContext,
): boolean {
  switch (record.definition.scope) {
    case 'core':
      // Core / builtin definitions are never mutated through persistence.
      return false;
    case 'personal': {
      const ownerUserId = normalizeId(record.ownerUserId);
      const userId = normalizeId(context.userId);
      if (!ownerUserId || !userId) return false;
      return ownerUserId === userId;
    }
    case 'world': {
      const worldProfileId = normalizeId(record.worldProfileId);
      if (!worldProfileId) return false;
      return context.editableWorldProfileIds.some(
        (id) => normalizeId(id) === worldProfileId,
      );
    }
    default:
      return false;
  }
}

/** Whether the caller may create a new definition in the given scope. */
export function canCreateNpcCreatureDefinition(
  scope: NpcCreatureScope,
  context: NpcCreatureMutationContext,
  worldProfileId?: string | null,
): boolean {
  if (scope === 'core') return false;
  if (scope === 'personal') {
    return normalizeId(context.userId) !== null;
  }
  if (scope === 'world') {
    const wid = normalizeId(worldProfileId);
    if (!wid) return false;
    return context.editableWorldProfileIds.some((id) => normalizeId(id) === wid);
  }
  return false;
}
