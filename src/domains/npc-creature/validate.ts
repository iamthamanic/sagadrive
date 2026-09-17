/**
 * Fail-closed validation for NPC/creature definitions (#196/#198).
 * Location: src/domains/npc-creature/validate.ts
 *
 * Domain-pure: no UI framework, no persistence client, no UI imports.
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
const MAX_COMBAT_TEXT_LEN = 4000;
const MAX_OVERRIDE_ATTR = 20;
const MAX_OVERRIDE_STAT = 9999;

const COMBAT_DETAIL_KEYS = [
  'attacks',
  'reactions',
  'signatures',
  'impulseOptions',
  'wendepunkt',
  'resistancesNotes',
  'weaknessesNotes',
  'immunitiesNotes',
] as const;

const DETAIL_EXTRA_KEYS = ['senses', 'behavior', 'loot'] as const;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function validateOptionalNonNegInt(
  errors: string[],
  value: unknown,
  label: string,
  max: number,
): void {
  if (value === undefined) return;
  pushIf(
    errors,
    !isFiniteNumber(value) || !Number.isInteger(value) || value < 0 || value > max,
    `${label} muss eine ganze Zahl zwischen 0 und ${max} sein.`,
  );
}

function validateStatOverrides(
  errors: string[],
  overrides: NpcCreatureDefinition['statOverrides'],
): void {
  if (overrides === undefined) return;
  if (typeof overrides !== 'object' || overrides === null || Array.isArray(overrides)) {
    errors.push('Stat-Overrides müssen ein Objekt sein.');
    return;
  }
  validateOptionalNonNegInt(errors, overrides.health, 'Gesundheit-Override', MAX_OVERRIDE_STAT);
  validateOptionalNonNegInt(errors, overrides.defense, 'Verteidigung-Override', MAX_OVERRIDE_STAT);
  validateOptionalNonNegInt(errors, overrides.movementMeters, 'Bewegung-Override', MAX_OVERRIDE_STAT);
  validateOptionalNonNegInt(errors, overrides.resistanceHigh, 'Körper-Widerstand-Override', MAX_OVERRIDE_STAT);
  validateOptionalNonNegInt(errors, overrides.resistanceNormal, 'Reflex-Widerstand-Override', MAX_OVERRIDE_STAT);
  validateOptionalNonNegInt(errors, overrides.resistanceLow, 'Geist-Widerstand-Override', MAX_OVERRIDE_STAT);
  if (overrides.attributes !== undefined) {
    const attrs = overrides.attributes;
    pushIf(
      errors,
      !Array.isArray(attrs) || attrs.length !== 6,
      'Attribut-Overrides brauchen genau 6 Werte.',
    );
    if (Array.isArray(attrs) && attrs.length === 6) {
      for (const attr of attrs) {
        pushIf(
          errors,
          !isFiniteNumber(attr) || !Number.isInteger(attr) || attr < 0 || attr > MAX_OVERRIDE_ATTR,
          `Jedes Attribut-Override muss 0–${MAX_OVERRIDE_ATTR} sein.`,
        );
      }
    }
  }
}

function validateStringMap(
  errors: string[],
  value: unknown,
  allowedKeys: readonly string[],
  maxLen: number,
  label: string,
): void {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    errors.push(`${label} müssen ein Objekt sein.`);
    return;
  }
  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    pushIf(errors, !allowedKeys.includes(key), `${label}: unbekannter Schlüssel "${key}".`);
  }
  for (const key of allowedKeys) {
    const entry = record[key];
    if (entry === undefined) continue;
    pushIf(
      errors,
      typeof entry !== 'string' || entry.length > maxLen,
      `${label}.${key} ist ungültig oder zu lang.`,
    );
  }
}

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

  if (def.iconKey !== undefined) {
    pushIf(
      errors,
      typeof def.iconKey !== 'string'
        || def.iconKey.length < 1
        || def.iconKey.length > MAX_PORTRAIT_KEY_LEN
        || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(def.iconKey),
      'Ungültiger Icon-Schlüssel (kebab-case slug erwartet).',
    );
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

  if (def.statOverrides !== undefined) {
    validateStatOverrides(errors, def.statOverrides);
  }
  if (def.combatDetails !== undefined) {
    validateStringMap(errors, def.combatDetails, COMBAT_DETAIL_KEYS, MAX_COMBAT_TEXT_LEN, 'Kampfdetails');
  }
  if (def.detailExtras !== undefined) {
    validateStringMap(errors, def.detailExtras, DETAIL_EXTRA_KEYS, MAX_COMBAT_TEXT_LEN, 'Details');
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
