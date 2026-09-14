/**
 * NpcCreatureDefinition — reusable library definition (not a session instance).
 * Location: src/domains/npc-creature/definition.ts
 *
 * Domain-pure: no React, no Supabase, no UI imports.
 * Machtgrad is derived from level via the power framework — never authored.
 */

import type {
  SagaDriveCombatProfile,
  SagaDriveCombatRole,
  SagaDriveNpcLevel,
} from '../rules/sagadrive/npc-creature-power';
import type {
  NpcCreatureCategory,
  NpcCreatureKind,
  NpcCreatureScope,
  NpcCreatureSheetMode,
} from './taxonomy';

/**
 * Catalog definition of an NPC or creature.
 * Instances (session HP/conditions/controller) are out of scope for #196.
 */
export interface NpcCreatureDefinition {
  /** Stable catalog id, e.g. `personal:<uuid>` or `world:<uuid>`. */
  id: string;
  scope: NpcCreatureScope;
  name: string;
  description: string;
  kind: NpcCreatureKind;
  category: NpcCreatureCategory;
  sheetMode: NpcCreatureSheetMode;
  level: SagaDriveNpcLevel;
  combatProfile: SagaDriveCombatProfile;
  combatRole: SagaDriveCombatRole;
  /** Free-form tags; empty/omitted is fine. */
  tags: readonly string[];
  /** Optional portrait/thumbnail key (asset pipeline later). */
  portraitAssetKey?: string;
  /** Optional notes / lore hooks (definition-level only). */
  notes?: string;
  /**
   * Opaque full-sheet snapshot when sheetMode is `full`.
   * Compact definitions must not carry this; parse fails closed if present.
   */
  fullSheet?: Readonly<Record<string, unknown>>;
}

/** Write draft: identity (id/scope) assigned by infrastructure. */
export type NpcCreatureDefinitionWriteDraft = Omit<NpcCreatureDefinition, 'id' | 'scope'>;
