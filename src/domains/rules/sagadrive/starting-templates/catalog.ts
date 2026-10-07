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
    summaryDe:
      'Körperlicher Nahkämpfer: Druck im Nahkampf, Stärke und Athletik. Wähle ihn, wenn du frontal gehst und körperlich dominant spielen willst — nicht den distanzierten Soldaten.',
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
    summaryDe:
      'Tech-Kämpfer mit Feuerdisziplin: Ausdauer, Fernkampf und soldatische Haltung. Wähle ihn, um Position zu halten, Deckung zu nutzen und mit Ausrüstung zu kämpfen.',
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
    summaryDe:
      'Akademischer Denker mit spirituellem Fokus: Wissen, Recherche und Okkultes. Wähle ihn für Analyse, Geisteswelt und Argumentation — nicht für Gadgets und Systeme.',
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
    summaryDe:
      'System-Denker: Technik, Archive und präzise Analyse. Wähle ihn, wenn Probleme über Geräte, Netze und Hacking gelöst werden sollen statt über Okkultes.',
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
    summaryDe:
      'Feldarzt unter Druck: Notfallmedizin, Überleben und Wachsamkeit. Wähle ihn als Versorger in Action-Szenen — praktisch und körperlich, nicht spirituell.',
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
    summaryDe:
      'Spiritueller Stabilisator: Menschen lesen, Motivation und leichter Heil-Support. Wähle ihn für Glauben, Insight und seelische Stabilität — nicht als Notfallchirurg.',
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
    summaryDe:
      'Körperlicher Infiltrator: Heimlichkeit, Akrobatik und Unterwelt. Wähle ihn für unbemerktes Vorgehen, urbane Tarnung und körperliche Präzision.',
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
    summaryDe:
      'Tech-Rebell und Saboteur: Fingerfertigkeit, Mechanik und Geräte. Wähle ihn, um Türen, Systeme und Werkstatt-Tricks zu nutzen statt reiner Körper-Stealth.',
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
    summaryDe:
      'Leiser Einfluss: Insight, Ermittlung und Lügen erkennen. Wähle ihn für Verhöre, Menschen lesen und stille Kontrolle — nicht für große Bühnenauftritte.',
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
    summaryDe:
      'Öffentliche Stimme mit gebundener Autorität: Überzeugung, Performance und Rede. Wähle ihn für Bühne, Ansprachen und sichtbare Führung statt stiller Ermittlung.',
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
