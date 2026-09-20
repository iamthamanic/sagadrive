/**
 * player-panel — Pure Player Panel V1 view model for live session screens (#298).
 * Location: src/domains/session/contracts/player-panel.ts
 * Hides: derived combat stats, inventory read-first projection, connection banners.
 * Never imports React or Supabase.
 */
import type { CharacterVm } from '../../character/contracts/character.views';
import type { CharacterAttributesDto } from '../../character/domain/character.entity';
import type { EquipmentSlot, InventoryState } from '../../character/inventory-v2';
import { EQUIPMENT_SLOTS } from '../../character/inventory-v2';
import {
  getSagaDriveExperienceBonus,
  resolveSagaDriveSkillBuildState,
  resolveSagaDriveSkillRanksSafe,
} from '../../rules/sagadrive/skill-progression';
import {
  getSagaDriveSkill,
  sagaDriveAttributeDefinitions,
  type SagaDriveAttributeKey,
  type SagaDriveSkillKey,
} from '../../rules/sagadrive/character-creation';
import { computeSagaDriveDerivedStats } from '../../rules/sagadrive/derived-stats';
import type { PlaySessionStatus } from './session-lifecycle';
import type { SessionPresenceEntry, SessionRuntimeState } from './session-runtime';
import { readLastSharedRoll, type SharedRollResultView } from './shared-rolls';
import {
  readSharedScenePresentation,
  type SharedScenePresentation,
} from './shared-scene-presentation';

export type PlayerPanelConnectionKind =
  | 'loading'
  | 'waiting'
  | 'paused'
  | 'ready'
  | 'disconnected'
  | 'error'
  | 'completed';

export interface PlayerPanelStatLine {
  key: string;
  label: string;
  value: string;
}

export interface PlayerPanelSkillLine {
  key: SagaDriveSkillKey;
  label: string;
  rank: number;
}

export interface PlayerPanelAttributeLine {
  key: SagaDriveAttributeKey;
  label: string;
  shortLabel: string;
  value: number;
}

export interface PlayerPanelInventoryLine {
  slot: EquipmentSlot | 'pack' | 'quick';
  label: string;
  name: string;
}

export interface PlayerPanelRosterLine {
  userId: string;
  characterId: string | null;
  isOnline: boolean;
  isSelf: boolean;
}

export interface PlayerPanelModel {
  characterName: string;
  characterPublicId: string | null;
  portraitUrl: string | null;
  level: number;
  classLabel: string;
  raceLabel: string;
  hpCurrent: number;
  hpMax: number;
  defense: number;
  resistances: PlayerPanelStatLine[];
  attributes: PlayerPanelAttributeLine[];
  skills: PlayerPanelSkillLine[];
  drive: number;
  momentum: number;
  momentumShared: boolean;
  inventory: PlayerPanelInventoryLine[];
  conditions: string[];
  roster: PlayerPanelRosterLine[];
  sceneId: string | null;
  scenePresentation: SharedScenePresentation | null;
  combatActive: boolean;
  sessionStatus: PlaySessionStatus | null;
  connection: PlayerPanelConnectionKind;
  connectionLabel: string;
  connectionDetail: string | null;
  canAttemptCheck: boolean;
  checkTarget: number | null;
  lastRoll: SharedRollResultView | null;
}

export interface BuildPlayerPanelModelInput {
  character: CharacterVm | null;
  runtime: SessionRuntimeState | null;
  selfUserId: string | null;
  isLoading: boolean;
  errorMessage: string | null;
  characterPublicId?: string | null;
}

const SLOT_LABELS: Record<EquipmentSlot, string> = {
  head: 'Kopf',
  body: 'Körper',
  accessory1: 'Accessoire 1',
  accessory2: 'Accessoire 2',
  mainHand: 'Haupthand',
  offHand: 'Nebenhand',
  special: 'Spezial',
  feet: 'Füße',
};

function connectionCopy(
  kind: PlayerPanelConnectionKind,
  detail: string | null,
): { label: string; detail: string | null } {
  switch (kind) {
    case 'loading':
      return { label: 'Lädt…', detail: detail ?? 'Session und Character werden geladen.' };
    case 'waiting':
      return { label: 'Warten auf Start', detail: detail ?? 'Die Session wurde noch nicht gestartet.' };
    case 'paused':
      return { label: 'Pausiert', detail: detail ?? 'Die Session ist pausiert. Warte auf den Spielleiter.' };
    case 'disconnected':
      return {
        label: 'Getrennt',
        detail: detail ?? 'Verbindung unterbrochen. Tippe auf Erneut verbinden.',
      };
    case 'error':
      return { label: 'Fehler', detail: detail ?? 'Etwas ist schiefgelaufen.' };
    case 'completed':
      return { label: 'Beendet', detail: detail ?? 'Diese Session ist abgeschlossen.' };
    case 'ready':
      return { label: 'Verbunden', detail: null };
  }
}

function readSharedNumber(shared: Record<string, unknown>, keys: readonly string[]): number | null {
  for (const key of keys) {
    const value = shared[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return null;
}

function readSharedStringList(shared: Record<string, unknown>, keys: readonly string[]): string[] {
  for (const key of keys) {
    const value = shared[key];
    if (!Array.isArray(value)) continue;
    return value
      .filter((entry): entry is string => typeof entry === 'string')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
      .slice(0, 24);
  }
  return [];
}

function skillBuildFromCharacter(character: CharacterVm) {
  const profile = character.sagaDriveProfile;
  const specialization = profile.background.specialization;
  return resolveSagaDriveSkillBuildState({
    freeSkillRanks: profile.freeSkillRanks,
    backgroundSkillPoints: profile.background.backgroundSkillPoints,
    skillPool: profile.background.skillPool,
    archetypeTrainingSkill: profile.archetypeTrainingSkill,
    skillAdvances: profile.skillAdvances,
    specializations: profile.specializations,
    backgroundSpecialization: specialization
      ? { skill: specialization.skill, name: specialization.name }
      : undefined,
  });
}

function inventoryLines(state: InventoryState): PlayerPanelInventoryLine[] {
  const lines: PlayerPanelInventoryLine[] = [];
  for (const slot of EQUIPMENT_SLOTS) {
    const instanceId = state.equipment[slot];
    if (!instanceId) continue;
    const instance = state.instances[instanceId];
    const name = instance?.definitionId?.trim() || 'Ausrüstung';
    lines.push({ slot, label: SLOT_LABELS[slot] ?? slot, name });
  }
  for (const instanceId of state.quickSlots) {
    if (!instanceId) continue;
    const instance = state.instances[instanceId];
    const name = instance?.definitionId?.trim() || 'Schnellzugriff';
    lines.push({ slot: 'quick', label: 'Schnell', name });
  }
  let packShown = 0;
  for (const instanceId of state.baseSlots) {
    if (!instanceId || packShown >= 8) continue;
    const instance = state.instances[instanceId];
    const name = instance?.definitionId?.trim() || 'Gegenstand';
    lines.push({ slot: 'pack', label: 'Rucksack', name });
    packShown += 1;
  }
  return lines;
}

function rosterLines(
  roster: readonly SessionPresenceEntry[],
  selfUserId: string | null,
): PlayerPanelRosterLine[] {
  return roster.map((entry) => ({
    userId: entry.userId,
    characterId: entry.characterId,
    isOnline: entry.isOnline,
    isSelf: selfUserId !== null && entry.userId === selfUserId,
  }));
}

function resolveConnection(input: BuildPlayerPanelModelInput): {
  kind: PlayerPanelConnectionKind;
  detail: string | null;
} {
  if (input.isLoading) return { kind: 'loading', detail: null };
  if (input.errorMessage) {
    const lower = input.errorMessage.toLowerCase();
    if (lower.includes('netzwerk') || lower.includes('network') || lower.includes('subscribe') || lower.includes('offline')) {
      return { kind: 'disconnected', detail: input.errorMessage };
    }
    return { kind: 'error', detail: input.errorMessage };
  }
  if (!input.character) {
    return {
      kind: 'error',
      detail: input.characterPublicId
        ? 'Character konnte nicht geladen werden.'
        : 'Kein Character in der Player-URL — wähle einen Character.',
    };
  }
  if (!input.runtime) {
    return { kind: 'disconnected', detail: 'Kein Session-Runtime-State.' };
  }
  if (input.runtime.status === 'waiting') return { kind: 'waiting', detail: null };
  if (input.runtime.status === 'paused') return { kind: 'paused', detail: null };
  if (input.runtime.status === 'completed') return { kind: 'completed', detail: null };

  if (input.selfUserId) {
    const self = input.runtime.roster.find((entry) => entry.userId === input.selfUserId);
    if (self && !self.isOnline) {
      return { kind: 'disconnected', detail: 'Du bist offline in der Session.' };
    }
  }
  return { kind: 'ready', detail: null };
}

/**
 * Build the read-only Player Panel model from character + authoritative runtime.
 */
export function buildPlayerPanelModel(input: BuildPlayerPanelModelInput): PlayerPanelModel {
  const connection = resolveConnection(input);
  const copy = connectionCopy(connection.kind, connection.detail);
  const character = input.character;
  const runtime = input.runtime;
  const shared = runtime?.gameplay.shared ?? {};

  const emptyAttributes = sagaDriveAttributeDefinitions.map((def) => ({
    key: def.key,
    label: def.label,
    shortLabel: def.shortLabel,
    value: 0,
  }));

  if (!character) {
    return {
      characterName: '—',
      characterPublicId: input.characterPublicId ?? null,
      portraitUrl: null,
      level: 0,
      classLabel: '—',
      raceLabel: '—',
      hpCurrent: 0,
      hpMax: 0,
      defense: 0,
      resistances: [],
      attributes: emptyAttributes,
      skills: [],
      drive: 0,
      momentum: 0,
      momentumShared: false,
      inventory: [],
      conditions: [],
      roster: runtime ? rosterLines(runtime.roster, input.selfUserId) : [],
      sceneId: runtime?.gameplay.sceneId ?? null,
      scenePresentation: runtime ? readSharedScenePresentation(runtime.gameplay.shared) : null,
      combatActive: runtime?.gameplay.combatActive ?? false,
      sessionStatus: runtime?.status ?? null,
      connection: connection.kind,
      connectionLabel: copy.label,
      connectionDetail: copy.detail,
      canAttemptCheck: false,
      checkTarget: null,
      lastRoll: runtime ? readLastSharedRoll(runtime.gameplay.shared) : null,
    };
  }

  const skillRanks = resolveSagaDriveSkillRanksSafe(skillBuildFromCharacter(character), character.level);
  const experienceBonus = getSagaDriveExperienceBonus(character.level);
  const attributes: CharacterAttributesDto = character.attributes;
  const derived = computeSagaDriveDerivedStats({
    attributes,
    finalSkillRanks: skillRanks,
    experienceBonus,
    level: character.level,
    overloaded: false,
  });

  const healthStat = derived.find((entry) => entry.key === 'health');
  const defenseStat = derived.find((entry) => entry.key === 'defense');
  const hpMax = Number.parseInt(healthStat?.displayValue ?? '0', 10) || 0;
  const overlayHp = readSharedNumber(shared, ['hpCurrent', 'hp_current', 'currentHp']);
  const hpCurrent = overlayHp !== null ? Math.max(0, Math.min(hpMax || overlayHp, overlayHp)) : hpMax;
  const defense = Number.parseInt(defenseStat?.displayValue ?? '0', 10) || 0;

  const resistanceKeys = [
    'body-resistance',
    'reflex-resistance',
    'mind-resistance',
    'maneuver-resistance',
  ] as const;
  const resistances: PlayerPanelStatLine[] = derived
    .filter((entry) => (resistanceKeys as readonly string[]).includes(entry.key))
    .map((entry) => ({ key: entry.key, label: entry.label, value: entry.displayValue }));

  const attributeLines: PlayerPanelAttributeLine[] = sagaDriveAttributeDefinitions.map((def) => ({
    key: def.key,
    label: def.label,
    shortLabel: def.shortLabel,
    value: attributes[def.key],
  }));

  const skills: PlayerPanelSkillLine[] = (Object.keys(skillRanks) as SagaDriveSkillKey[])
    .map((key) => ({
      key,
      label: getSagaDriveSkill(key).label,
      rank: skillRanks[key],
    }))
    .filter((line) => line.rank > 0)
    .sort((a, b) => b.rank - a.rank || a.label.localeCompare(b.label, 'de'));

  const sharedMomentum = readSharedNumber(shared, ['momentum', 'sharedMomentum', 'shared_momentum']);
  const momentumShared = sharedMomentum !== null;
  const momentum = momentumShared ? sharedMomentum : character.sagaDriveProfile.momentum;
  const conditions = readSharedStringList(shared, ['conditions', 'activeConditions', 'active_conditions']);
  const checkTarget = readSharedNumber(shared, ['checkTarget', 'check_target']);
  const lastRoll = readLastSharedRoll(shared);
  const scenePresentation = readSharedScenePresentation(shared);

  let drive = character.sagaDriveProfile.drive;
  const driveMap = shared.driveByCharacter;
  if (driveMap && typeof driveMap === 'object' && !Array.isArray(driveMap) && character.id) {
    const overlay = (driveMap as Record<string, unknown>)[character.id];
    if (typeof overlay === 'number' && Number.isFinite(overlay)) {
      drive = Math.max(0, Math.min(5, Math.round(overlay)));
    }
  }

  return {
    characterName: character.name,
    characterPublicId: character.publicId ?? input.characterPublicId ?? null,
    portraitUrl: character.portraitUrl ?? null,
    level: character.level,
    classLabel: character.class || '—',
    raceLabel: character.race || '—',
    hpCurrent,
    hpMax,
    defense,
    resistances,
    attributes: attributeLines,
    skills,
    drive,
    momentum,
    momentumShared,
    inventory: inventoryLines(character.inventoryV2),
    conditions,
    roster: runtime ? rosterLines(runtime.roster, input.selfUserId) : [],
    sceneId: runtime?.gameplay.sceneId ?? null,
    scenePresentation,
    combatActive: runtime?.gameplay.combatActive ?? false,
    sessionStatus: runtime?.status ?? null,
    connection: connection.kind,
    connectionLabel: copy.label,
    connectionDetail: copy.detail,
    canAttemptCheck: connection.kind === 'ready' || connection.kind === 'paused',
    checkTarget,
    lastRoll,
  };
}

/** Skills eligible for the V1 check action (trained ranks first). */
export function playerPanelCheckSkillOptions(model: PlayerPanelModel): PlayerPanelSkillLine[] {
  return model.skills;
}
