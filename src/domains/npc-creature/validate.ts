/**
 * Fail-closed validation for NPC/creature definitions (#196).
 * Location: src/domains/npc-creature/validate.ts
 *
 * Domain-pure: no React, no Supabase, no UI imports.
 */

import {
  isSagaDriveNpcLevel,
  normalizeCombatRoleForProfile,
  type SagaDriveCombatProfile,
  type SagaDriveCombatRole,
} from '../rules/sagadrive/npc-creature-power';
import type { NpcCreatureDefinition } from './definition';
import {
  isNpcCreatureCategory,
  isNpcCreatureKind,
  isNpcCreatureScope,
  isNpcCreatureSheetMode,
} from './taxonomy';

const COMBAT_PROFILES: readonly SagaDriveCombatProfile[] = [
  'noncombat',
  'balanced',
  'tough',
  'offensive',
  'mobile',
  'ranged',
  'control_support',
];

const COMBAT_ROLES: readonly SagaDriveCombatRole[] = ['standard', 'elite', 'boss'];

const MAX_NAME_LEN = 120;
const MAX_DESCRIPTION_LEN = 4000;
const MAX_NOTES_LEN = 8000;
const MAX_TAG_LEN = 48;
const MAX_TAGS = 24;
const MAX_PORTRAIT_KEY_LEN = 256;

export type NpcCreatureValidationResult =
  | { ok: true }
  | { ok: false; errors: string[] };

function isCombatProfile(value: unknown): value is SagaDriveCombatProfile {
  return typeof value === 'string' && (COMBAT_PROFILES as readonly string[]).includes(value);
}

function isCombatRole(value: unknown): value is SagaDriveCombatRole {
  return typeof value === 'string' && (COMBAT_ROLES as readonly string[]).includes(value);
}

function pushIf(errors: string[], condition: boolean, message: string): void {
  if (condition) errors.push(message);
}

/**
 * Validate a fully assembled definition (id/scope already assigned).
 * German user-facing messages for trust-boundary failures.
 */
export function validateNpcCreatureDefinition(
  def: NpcCreatureDefinition,
): NpcCreatureValidationResult {
  const errors: string[] = [];

  pushIf(errors, !isNpcCreatureScope(def.scope), 'Ungültiger Scope.');
  pushIf(
    errors,
    typeof def.id !== 'string' || !def.id.startsWith(`${def.scope}:`) || def.id.length < 10,
    'Ungültige Definitions-ID.',
  );

  pushIf(
    errors,
    typeof def.name !== 'string' || def.name.trim().length < 1 || def.name.length > MAX_NAME_LEN,
    'Name muss zwischen 1 und 120 Zeichen liegen.',
  );
  pushIf(
    errors,
    typeof def.description !== 'string' || def.description.length > MAX_DESCRIPTION_LEN,
    'Beschreibung ist zu lang.',
  );

  pushIf(errors, !isNpcCreatureKind(def.kind), 'Ungültige Art (NPC/Kreatur).');
  pushIf(errors, !isNpcCreatureCategory(def.category), 'Ungültige Kategorie.');
  pushIf(errors, !isNpcCreatureSheetMode(def.sheetMode), 'Ungültiger Darstellungsmodus.');
  pushIf(errors, !isSagaDriveNpcLevel(def.level), 'Stufe muss zwischen 1 und 20 liegen.');
  pushIf(errors, !isCombatProfile(def.combatProfile), 'Ungültiges Kampfprofil.');
  pushIf(errors, !isCombatRole(def.combatRole), 'Ungültige Kampfrolle.');

  if (isCombatProfile(def.combatProfile) && isCombatRole(def.combatRole)) {
    const normalized = normalizeCombatRoleForProfile(def.combatProfile, def.combatRole);
    pushIf(
      errors,
      def.combatProfile === 'noncombat' && def.combatRole !== 'standard',
      'Nichtkämpferisch erlaubt nur die Kampfrolle Standard.',
    );
    pushIf(errors, normalized !== def.combatRole, 'Kampfrolle passt nicht zum Kampfprofil.');
  }

  if (!Array.isArray(def.tags)) {
    errors.push('Tags müssen eine Liste sein.');
  } else {
    pushIf(errors, def.tags.length > MAX_TAGS, `Höchstens ${MAX_TAGS} Tags erlaubt.`);
    for (const tag of def.tags) {
      pushIf(
        errors,
        typeof tag !== 'string' || tag.trim().length < 1 || tag.length > MAX_TAG_LEN,
        'Jeder Tag muss 1–48 Zeichen lang sein.',
      );
    }
  }

  if (def.portraitAssetKey !== undefined) {
    pushIf(
      errors,
      typeof def.portraitAssetKey !== 'string'
        || def.portraitAssetKey.length < 1
        || def.portraitAssetKey.length > MAX_PORTRAIT_KEY_LEN,
      'Ungültiger Portrait-Schlüssel.',
    );
  }

  if (def.notes !== undefined) {
    pushIf(
      errors,
      typeof def.notes !== 'string' || def.notes.length > MAX_NOTES_LEN,
      'Notizen sind zu lang.',
    );
  }

  if (def.sheetMode === 'compact' && def.fullSheet !== undefined) {
    errors.push('Statblock-Definitionen dürfen keinen Charakterbogen-Payload tragen.');
  }
  if (def.sheetMode === 'full' && def.fullSheet !== undefined) {
    pushIf(
      errors,
      typeof def.fullSheet !== 'object'
        || def.fullSheet === null
        || Array.isArray(def.fullSheet),
      'Charakterbogen-Payload muss ein Objekt sein.',
    );
  }

  // Legacy D&D field names must never appear as source of truth.
  const bannedKeys = ['challenge_rating', 'armor_class', 'hit_dice', 'cr', 'ac', 'dnd'];
  for (const key of bannedKeys) {
    if (Object.prototype.hasOwnProperty.call(def, key)) {
      errors.push(`Legacy-Feld "${key}" ist in SagaDrive-Definitionen nicht erlaubt.`);
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true };
}
