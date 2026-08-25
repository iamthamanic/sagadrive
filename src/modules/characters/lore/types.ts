import type { CharacterRulesetKey } from '../../rulesets/characterCreation';

export type CharacterTraitCategory = 'personality' | 'ideals' | 'bonds' | 'flaws';

export interface CharacterTraitGroups {
  personality: string[];
  ideals: string[];
  bonds: string[];
  flaws: string[];
}

export interface CharacterLoreAttributes {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

export interface CharacterLoreAbility {
  name: string;
  description: string;
  type: 'combat' | 'magic' | 'skill';
  cost: number;
  effect: string;
}

export interface CharacterLoreItem {
  name: string;
  description: string;
  type: 'weapon' | 'armor' | 'consumable' | 'misc';
  quantity: number;
}

export interface CharacterLoreAppearance {
  bodySize: number;
  height: number;
  face: string;
  hairStyle: string;
  hairColor: string;
  skinTone: string;
  clothing: string;
  accessory?: string;
}

export interface CharacterLoreContext {
  ruleset: CharacterRulesetKey;
  name: string;
  description: string;
  characterClass: string;
  raceOrSpecies: string;
  setting?: string;
  essenceProfile?: string;
  dndBackground?: string;
  level: number;
  attributes: CharacterLoreAttributes;
  abilities: CharacterLoreAbility[];
  inventory: CharacterLoreItem[];
  appearance: CharacterLoreAppearance;
  traits: CharacterTraitGroups;
  projectId?: string;
  worldId?: string;
}

export interface CharacterLoreGenerationRequest {
  context: CharacterLoreContext;
  currentBackgroundStory?: string;
}

export interface CharacterLoreGenerationResult {
  story: string;
  provider: 'openai-compatible' | 'ollama';
  model: string;
}
