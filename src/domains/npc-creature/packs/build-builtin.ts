/**
 * buildBuiltinNpcCreature — construct a read-only Core/builtin NpcCreatureDefinition.
 * Location: src/domains/npc-creature/packs/build-builtin.ts
 *
 * Domain-pure: no React, no Supabase, no UI imports.
 */

import type { NpcCreatureDefinition } from '../definition';
import type { NpcCreatureCategory, NpcCreatureKind } from '../taxonomy';
import type {
  SagaDriveCombatProfile,
  SagaDriveCombatRole,
  SagaDriveNpcLevel,
} from '../../rules/sagadrive/npc-creature-power';
import { normalizeCombatRoleForProfile } from '../../rules/sagadrive/npc-creature-power';

export interface BuiltinNpcCreatureInput {
  id: string;
  name: string;
  description: string;
  kind: NpcCreatureKind;
  category: NpcCreatureCategory;
  level: SagaDriveNpcLevel;
  combatProfile: SagaDriveCombatProfile;
  combatRole?: SagaDriveCombatRole;
  tags?: readonly string[];
  notes?: string;
}

/** Build a scope=core repository-local definition (never a DB row). */
export function buildBuiltinNpcCreature(input: BuiltinNpcCreatureInput): NpcCreatureDefinition {
  const combatRole = normalizeCombatRoleForProfile(
    input.combatProfile,
    input.combatRole ?? 'standard',
  );
  return Object.freeze({
    id: input.id,
    scope: 'core',
    name: input.name,
    description: input.description,
    kind: input.kind,
    category: input.category,
    sheetMode: 'compact',
    level: input.level,
    combatProfile: input.combatProfile,
    combatRole,
    tags: Object.freeze([...(input.tags ?? [])]),
    notes: input.notes,
  });
}
