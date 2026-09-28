/**
 * starting-templates catalog — ten Level-1 builds from #465 design (#463).
 * Location: src/domains/rules/sagadrive/starting-templates/catalog.ts
 */
import {
  createEmptySagaDriveSkillRanks,
  type SagaDriveSkillKey,
} from '../character-creation';
import type { SagaDriveStartingTemplate } from './types';

function freeRanks(
  partial: Partial<Record<SagaDriveSkillKey, number>>,
): ReturnType<typeof createEmptySagaDriveSkillRanks> {
  const ranks = createEmptySagaDriveSkillRanks();
  for (const [key, value] of Object.entries(partial) as [SagaDriveSkillKey, number][]) {
    ranks[key] = value;
  }
  return ranks;
}

function bgSpec(skill: SagaDriveSkillKey, name: string) {
  return {
    skill,
    name,
    source: 'background' as const,
    acquiredAtLevel: 1,
  };
}

/**
 * Canonical V1 catalog — values must match `.qa/design/character-starting-templates-v1.md`.
 */
export const sagaDriveStartingTemplates: readonly SagaDriveStartingTemplate[] = [
  {
    key: 'berserker',
    labelDe: 'Berserker',
    archetype: 'fighter',
    essence: 'physical',
    attributes: {
      strength: 4,
      dexterity: 3,
      endurance: 3,
      mind: 1,
      perception: 2,
      charisma: 2,
    },
    backgroundTemplateId: 'sport-competition',
    freeSkillRanks: freeRanks({
      melee: 2,
      intimidation: 2,
      athletics: 1,
      awareness: 1,
      acrobatics: 1,
    }),
    backgroundSkillPoints: { athletics: 2 },
    archetypeTrainingSkill: 'melee',
    backgroundSpecialization: bgSpec('athletics', 'Kraftakt'),
  },
  {
    key: 'vanguard',
    labelDe: 'Vanguard',
    archetype: 'fighter',
    essence: 'technological',
    attributes: {
      strength: 3,
      dexterity: 2,
      endurance: 4,
      mind: 3,
      perception: 2,
      charisma: 1,
    },
    backgroundTemplateId: 'soldier',
    freeSkillRanks: freeRanks({
      athletics: 2,
      intimidation: 2,
      melee: 2,
      awareness: 1,
    }),
    backgroundSkillPoints: { ranged: 2 },
    archetypeTrainingSkill: 'ranged',
    backgroundSpecialization: bgSpec('ranged', 'Schusswaffen'),
  },
  {
    key: 'mage',
    labelDe: 'Zauberer',
    archetype: 'thinker',
    essence: 'spiritual',
    attributes: {
      strength: 1,
      dexterity: 2,
      endurance: 2,
      mind: 4,
      perception: 3,
      charisma: 3,
    },
    backgroundTemplateId: 'academy-research',
    freeSkillRanks: freeRanks({
      investigation: 2,
      awareness: 2,
      persuasion: 2,
      insight: 1,
    }),
    backgroundSkillPoints: { knowledge: 2 },
    archetypeTrainingSkill: 'knowledge',
    backgroundSpecialization: bgSpec('knowledge', 'Okkultes'),
  },
  {
    key: 'technomancer',
    labelDe: 'Technomant',
    archetype: 'thinker',
    essence: 'technological',
    attributes: {
      strength: 1,
      dexterity: 3,
      endurance: 2,
      mind: 4,
      perception: 3,
      charisma: 2,
    },
    backgroundTemplateId: 'academy-research',
    freeSkillRanks: freeRanks({
      technology: 2,
      investigation: 2,
      knowledge: 1,
      awareness: 1,
      sleight: 1,
    }),
    backgroundSkillPoints: { investigation: 1, awareness: 1 },
    archetypeTrainingSkill: 'technology',
    backgroundSpecialization: bgSpec('investigation', 'Archive'),
  },
  {
    key: 'medicus',
    labelDe: 'Medicus',
    archetype: 'healer',
    essence: 'physical',
    attributes: {
      strength: 1,
      dexterity: 2,
      endurance: 3,
      mind: 4,
      perception: 3,
      charisma: 2,
    },
    backgroundTemplateId: 'street-doctor',
    freeSkillRanks: freeRanks({
      insight: 2,
      survival: 2,
      awareness: 2,
      knowledge: 1,
    }),
    backgroundSkillPoints: { medicine: 2 },
    archetypeTrainingSkill: 'medicine',
    backgroundSpecialization: bgSpec('medicine', 'Notfallmedizin'),
  },
  {
    key: 'mystic',
    labelDe: 'Mystiker',
    archetype: 'healer',
    essence: 'spiritual',
    attributes: {
      strength: 1,
      dexterity: 2,
      endurance: 2,
      mind: 3,
      perception: 4,
      charisma: 3,
    },
    backgroundTemplateId: 'faith-order',
    freeSkillRanks: freeRanks({
      insight: 1,
      awareness: 2,
      persuasion: 2,
      knowledge: 1,
      medicine: 1,
    }),
    backgroundSkillPoints: { insight: 1, knowledge: 1 },
    archetypeTrainingSkill: 'insight',
    backgroundSpecialization: bgSpec('insight', 'Motivation'),
  },
  {
    key: 'assassin',
    labelDe: 'Assassine',
    archetype: 'rebel',
    essence: 'physical',
    attributes: {
      strength: 1,
      dexterity: 4,
      endurance: 3,
      mind: 2,
      perception: 3,
      charisma: 2,
    },
    backgroundTemplateId: 'smuggler',
    freeSkillRanks: freeRanks({
      stealth: 1,
      sleight: 2,
      acrobatics: 2,
      deception: 1,
      awareness: 1,
    }),
    backgroundSkillPoints: { stealth: 1, deception: 1 },
    archetypeTrainingSkill: 'stealth',
    backgroundSpecialization: bgSpec('stealth', 'Urbane Tarnung'),
  },
  {
    key: 'mechanom',
    labelDe: 'Mechanom',
    archetype: 'rebel',
    essence: 'technological',
    attributes: {
      strength: 1,
      dexterity: 4,
      endurance: 2,
      mind: 3,
      perception: 3,
      charisma: 2,
    },
    backgroundTemplateId: 'corporate-technician',
    freeSkillRanks: freeRanks({
      sleight: 1,
      technology: 2,
      stealth: 1,
      deception: 1,
      investigation: 1,
      awareness: 1,
    }),
    backgroundSkillPoints: { technology: 1, sleight: 1 },
    archetypeTrainingSkill: 'sleight',
    backgroundSpecialization: bgSpec('technology', 'Mechanik'),
  },
  {
    key: 'mentalist',
    labelDe: 'Mentalist',
    archetype: 'diplomat',
    essence: 'mental',
    attributes: {
      strength: 1,
      dexterity: 2,
      endurance: 2,
      mind: 3,
      perception: 3,
      charisma: 4,
    },
    backgroundTemplateId: 'investigator',
    freeSkillRanks: freeRanks({
      insight: 1,
      persuasion: 2,
      awareness: 2,
      deception: 1,
      investigation: 1,
    }),
    backgroundSkillPoints: { insight: 1, investigation: 1 },
    archetypeTrainingSkill: 'insight',
    backgroundSpecialization: bgSpec('insight', 'Lügen erkennen'),
  },
  {
    key: 'herald',
    labelDe: 'Herold',
    archetype: 'diplomat',
    essence: 'bound',
    attributes: {
      strength: 1,
      dexterity: 2,
      endurance: 3,
      mind: 2,
      perception: 3,
      charisma: 4,
    },
    backgroundTemplateId: 'stage-public',
    freeSkillRanks: freeRanks({
      persuasion: 1,
      performance: 2,
      insight: 2,
      intimidation: 1,
      deception: 1,
    }),
    backgroundSkillPoints: { persuasion: 1, performance: 1 },
    archetypeTrainingSkill: 'persuasion',
    backgroundSpecialization: bgSpec('performance', 'Rede'),
  },
];
