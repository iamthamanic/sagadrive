/**
 * Core NPC/creature archetypes — always present in world catalogs (#199).
 * Repository-local only; never written to npc_creature_definitions.
 * Location: src/domains/npc-creature/core-catalog.ts
 *
 * Domain-pure: no React, no Supabase, no UI imports.
 */

import type { NpcCreatureDefinition } from './definition';
import { buildBuiltinNpcCreature } from './packs/build-builtin';

/** Exact Core catalog size — completeness gate. */
export const NPC_CREATURE_CORE_CATALOG_SIZE = 6;

/** Always-on Core archetypes (cannot be excluded by world module). */
export const NPC_CREATURE_CORE_DEFINITIONS: readonly NpcCreatureDefinition[] = Object.freeze([
  buildBuiltinNpcCreature({
    id: 'core:npc.citizen',
    name: 'Bürger',
    description: 'Alltägliche Stadtbewohnerin ohne Kampffokus.',
    kind: 'npc',
    category: 'npc',
    level: 1,
    combatProfile: 'noncombat',
    tags: ['core', 'alltag'],
  }),
  buildBuiltinNpcCreature({
    id: 'core:npc.guard',
    name: 'Wache',
    description: 'Lokale Sicherheitskraft mit Standardausrüstung.',
    kind: 'npc',
    category: 'npc',
    level: 3,
    combatProfile: 'balanced',
    combatRole: 'standard',
    tags: ['core', 'ordnung'],
  }),
  buildBuiltinNpcCreature({
    id: 'core:npc.bandit',
    name: 'Bandit',
    description: 'Straßenräuber mit offensivem Nahkampfprofil.',
    kind: 'npc',
    category: 'npc',
    level: 2,
    combatProfile: 'offensive',
    combatRole: 'standard',
    tags: ['core', 'bedrohung'],
  }),
  buildBuiltinNpcCreature({
    id: 'core:creature.wild-beast',
    name: 'Wildtier',
    description: 'Generisches wildes Tier für schnelle Begegnungen.',
    kind: 'creature',
    category: 'tier',
    level: 2,
    combatProfile: 'tough',
    combatRole: 'standard',
    tags: ['core', 'tier'],
  }),
  buildBuiltinNpcCreature({
    id: 'core:creature.minion',
    name: 'Scherge',
    description: 'Einfache Bedrohung für Schwärme und Begleiter.',
    kind: 'creature',
    category: 'kreatur',
    level: 1,
    combatProfile: 'offensive',
    combatRole: 'standard',
    tags: ['core', 'schwarm'],
  }),
  buildBuiltinNpcCreature({
    id: 'core:npc.merchant',
    name: 'Händler',
    description: 'Reisende oder lokale Handelsfigur.',
    kind: 'npc',
    category: 'npc',
    level: 2,
    combatProfile: 'noncombat',
    tags: ['core', 'handel'],
  }),
]);

const BY_ID: ReadonlyMap<string, NpcCreatureDefinition> = new Map(
  NPC_CREATURE_CORE_DEFINITIONS.map((definition) => [definition.id, definition]),
);

export function listCoreNpcCreatureDefinitions(): readonly NpcCreatureDefinition[] {
  return NPC_CREATURE_CORE_DEFINITIONS;
}

export function getCoreNpcCreatureDefinition(
  definitionId: string,
): NpcCreatureDefinition | undefined {
  return BY_ID.get(definitionId);
}

export function isCoreNpcCreatureDefinitionId(definitionId: string): boolean {
  return BY_ID.has(definitionId);
}
