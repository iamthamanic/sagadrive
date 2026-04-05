// ============================================
// Supabase Client - Self-Hosted Configuration
// ============================================

import { createClient } from '@supabase/supabase-js';

// Environment variables for self-hosted or cloud
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:8000';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// ============================================
// Edge Function Helpers
// ============================================

/**
 * Call an Edge Function
 * @param functionName The function name (e.g., 'ai-gm')
 * @param payload The request body
 * @returns The function response
 */
export async function callFunction<T>(
  functionName: string,
  payload: any
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: payload,
    });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as T, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

// ============================================
// AI Game Master
// ============================================

export interface AIGMRequest {
  sessionId: string;
  action: string;
  context?: {
    characters?: any[];
    npcs?: any[];
    location?: string;
    recentEvents?: string[];
  };
  stream?: boolean;
}

export interface AIGMResponse {
  narrative: string;
  worldStateUpdate?: any;
  diceRollsRequired?: Array<{ type: string; dc?: number; description: string }>;
  combatInitiated?: boolean;
}

export const aiGM = {
  generate: (payload: AIGMRequest) => 
    callFunction<AIGMResponse>('ai-gm', payload),
  
  generateNarrative: (sessionId: string, action: string, context?: any) =>
    callFunction<AIGMResponse>('ai-gm', { sessionId, action, context }),
};

// ============================================
// DM Tools
// ============================================

export interface DiceRollRequest {
  notation: string;
  modifier?: number;
  advantage?: 'adv' | 'dis';
}

export interface DiceRollResponse {
  notation: string;
  rolls: number[];
  modifier: number;
  total: number;
  criticalHit?: boolean;
  criticalFail?: boolean;
}

export interface CombatInitRequest {
  sessionId: string;
  participants: Array<{
    id: string;
    name: string;
    type: 'player' | 'npc' | 'monster';
    initiativeBonus?: number;
    hp: number;
    maxHp: number;
    ac: number;
  }>;
}

export interface CombatState {
  id: string;
  sessionId: string;
  round: number;
  currentTurn: number;
  participants: any[];
  status: 'inactive' | 'active' | 'paused' | 'completed';
}

export const dmTools = {
  rollDice: (payload: DiceRollRequest) =>
    callFunction<DiceRollResponse>('dm-tools', payload),
  
  rollMultiple: (payload: { rolls: DiceRollRequest[] }) =>
    callFunction<DiceRollResponse[]>('dm-tools', { ...payload, action: 'dice/multiple' }),
  
  initCombat: (payload: CombatInitRequest) =>
    callFunction<CombatState>('dm-tools', { ...payload, action: 'combat/init' }),
  
  getCombat: (combatId: string) =>
    callFunction<CombatState>('dm-tools', { action: 'combat/get', combatId }),
  
  nextTurn: (combatId: string) =>
    callFunction<CombatState>('dm-tools', { action: 'combat/next', combatId }),
  
  endCombat: (combatId: string) =>
    callFunction<CombatState>('dm-tools', { action: 'combat/end', combatId }),
  
  getConditions: () =>
    callFunction<Record<string, any>>('dm-tools', { action: 'conditions' }),
  
  getRuleset: (rulesetId: string) =>
    callFunction<any>('dm-tools', { action: `rulesets/${rulesetId}` }),
};

// ============================================
// Sessions
// ============================================

export interface SessionCreateRequest {
  projectId: string;
  name: string;
  description?: string;
}

export interface Session extends CombatState {
  projectId: string;
  sessionNumber: number;
  name: string;
  description?: string;
  worldState: any;
  savePoints: any[];
  createdAt: string;
  updatedAt: string;
}

export const sessions = {
  create: (payload: SessionCreateRequest) =>
    callFunction<Session>('sessions', payload),
  
  get: (sessionId: string) =>
    callFunction<Session>('sessions', { action: 'get', sessionId }),
  
  update: (sessionId: string, updates: Partial<Session>) =>
    callFunction<Session>('sessions', { action: 'update', sessionId, ...updates }),
  
  delete: (sessionId: string) =>
    callFunction<void>('sessions', { action: 'delete', sessionId }),
  
  join: (sessionId: string, userId: string, characterId?: string) =>
    callFunction<any>('sessions', { action: 'join', sessionId, userId, characterId }),
  
  leave: (sessionId: string, userId: string) =>
    callFunction<void>('sessions', { action: 'leave', sessionId, userId }),
  
  save: (sessionId: string, name: string, description?: string) =>
    callFunction<any>('sessions', { action: 'save', sessionId, name, description }),
  
  load: (sessionId: string, savePointId: string) =>
    callFunction<any>('sessions', { action: 'load', sessionId, savePointId }),
};

// ============================================
// Characters
// ============================================

export interface CharacterCreateRequest {
  ownerId: string;
  projectId?: string;
  name: string;
  race: string;
  class: string;
  background?: string;
  attributes?: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  };
}

export interface Character {
  id: string;
  ownerId: string;
  projectId?: string;
  name: string;
  race: string;
  class: string;
  level: number;
  hp: number;
  maxHp: number;
  ac: number;
  attributes: any;
  skills: any;
  equipment: any[];
  createdAt: string;
  updatedAt: string;
}

export const characters = {
  create: (payload: CharacterCreateRequest) =>
    callFunction<Character>('characters', payload),
  
  get: (characterId: string) =>
    callFunction<Character>('characters', { action: 'get', characterId }),
  
  update: (characterId: string, updates: Partial<Character>) =>
    callFunction<Character>('characters', { action: 'update', characterId, ...updates }),
  
  delete: (characterId: string) =>
    callFunction<void>('characters', { action: 'delete', characterId }),
  
  list: (ownerId?: string, projectId?: string) =>
    callFunction<Character[]>('characters', { action: 'list', ownerId, projectId }),
  
  levelUp: (characterId: string, choice?: any) =>
    callFunction<Character>('characters', { action: 'levelUp', characterId, ...choice }),
  
  addEquipment: (characterId: string, equipment: any) =>
    callFunction<any>('characters', { action: 'addEquipment', characterId, ...equipment }),
  
  takeDamage: (characterId: string, damage: number) =>
    callFunction<Character>('characters', { action: 'takeDamage', characterId, damage }),
  
  heal: (characterId: string, healing: number) =>
    callFunction<Character>('characters', { action: 'heal', characterId, healing }),
};

// ============================================
// Rulesets
// ============================================

export interface Ruleset {
  id: string;
  name: string;
  version: string;
  description: string;
  abilities: string[];
  skills: Record<string, string>;
  conditions: string[];
  dice: string[];
  classes: Record<string, any>;
  races: Record<string, any>;
  isOfficial: boolean;
}

export const rulesets = {
  list: () =>
    callFunction<Ruleset[]>('rulesets', { action: 'list' }),
  
  get: (rulesetId: string, enrich: boolean = false) =>
    callFunction<Ruleset>('rulesets', { action: 'get', rulesetId, enrich }),
  
  getSkills: (rulesetId: string) =>
    callFunction<Record<string, string>>('rulesets', { action: 'getSkills', rulesetId }),
  
  getConditions: (rulesetId: string) =>
    callFunction<string[]>('rulesets', { action: 'getConditions', rulesetId }),
  
  getClasses: (rulesetId: string) =>
    callFunction<Record<string, any>>('rulesets', { action: 'getClasses', rulesetId }),
  
  getRaces: (rulesetId: string) =>
    callFunction<Record<string, any>>('rulesets', { action: 'getRaces', rulesetId }),
  
  getSpells: (rulesetId: string, filter?: { level?: number; school?: string; class?: string }) =>
    callFunction<any[]>('rulesets', { action: 'getSpells', rulesetId, ...filter }),
  
  getMonsters: (rulesetId: string, filter?: { type?: string; cr?: number }) =>
    callFunction<any[]>('rulesets', { action: 'getMonsters', rulesetId, ...filter }),
};

// ============================================
// NPC Management
// ============================================

export interface NPC {
  id: string;
  name: string;
  type: 'npc' | 'monster' | 'creature';
  race?: string;
  class?: string;
  level?: number;
  hp: number;
  maxHp: number;
  ac: number;
  disposition: 'friendly' | 'neutral' | 'hostile';
  location?: string;
  memories: string[];
  relationships: Record<string, string>;
}

export const npcs = {
  create: (payload: Partial<NPC>) =>
    callFunction<NPC>('npcs', payload),
  
  get: (npcId: string) =>
    callFunction<NPC>('npcs', { action: 'get', npcId }),
  
  update: (npcId: string, updates: Partial<NPC>) =>
    callFunction<NPC>('npcs', { action: 'update', npcId, ...updates }),
  
  delete: (npcId: string) =>
    callFunction<void>('npcs', { action: 'delete', npcId }),
  
  list: (filter?: { type?: string; location?: string }) =>
    callFunction<NPC[]>('npcs', { action: 'list', ...filter }),
  
  generate: (options?: any) =>
    callFunction<NPC>('npcs', { action: 'generate', ...options }),
  
  addMemory: (npcId: string, memory: string) =>
    callFunction<NPC>('npcs', { action: 'addMemory', npcId, memory }),
  
  getMemories: (npcId: string, limit?: number) =>
    callFunction<string[]>('npcs', { action: 'getMemories', npcId, limit }),
  
  setRelationship: (npcId: string, targetId: string, relationship: string) =>
    callFunction<NPC>('npcs', { action: 'setRelationship', npcId, targetId, relationship }),
};

// ============================================
// Bestiary (Monsters)
// ============================================

export interface Monster {
  id: string;
  name: string;
  type: string;
  size: string;
  challengeRating: number;
  xp: number;
  hp: number;
  ac: number;
  speed: Record<string, number>;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  actions: any[];
  source: string;
}

export interface Encounter {
  id: string;
  name: string;
  monsters: Array<{ monsterId: string; name: string; count: number; xp: number }>;
  totalXP: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'deadly';
}

export const bestiary = {
  listMonsters: (filter?: { type?: string; cr?: number }) =>
    callFunction<Monster[]>('bestiary', { action: 'listMonsters', ...filter }),
  
  getMonster: (monsterId: string) =>
    callFunction<Monster>('bestiary', { action: 'getMonster', monsterId }),
  
  searchMonsters: (query: string) =>
    callFunction<Monster[]>('bestiary', { action: 'searchMonsters', query }),
  
  createEncounter: (payload: { name: string; monsters: Array<{ monsterId: string; count: number }> }) =>
    callFunction<Encounter>('bestiary', { action: 'createEncounter', ...payload }),
  
  generateEncounter: (difficulty: 'easy' | 'medium' | 'hard' | 'deadly', partySize: number, partyLevel: number) =>
    callFunction<Encounter>('bestiary', { action: 'generateEncounter', difficulty, partySize, partyLevel }),
};

// ============================================
// World Management
// ============================================

export interface World {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  locations: any[];
  events: any[];
  factions: any[];
  time: any;
  weather: any;
}

export const world = {
  create: (payload: { projectId: string; name: string; description?: string }) =>
    callFunction<World>('world', payload),
  
  get: (worldId: string) =>
    callFunction<World>('world', { action: 'get', worldId }),
  
  update: (worldId: string, updates: Partial<World>) =>
    callFunction<World>('world', { action: 'update', worldId, ...updates }),
  
  addLocation: (worldId: string, location: any) =>
    callFunction<any>('world', { action: 'addLocation', worldId, ...location }),
  
  addEvent: (worldId: string, event: any) =>
    callFunction<any>('world', { action: 'addEvent', worldId, ...event }),
  
  advanceTime: (worldId: string, hours: number) =>
    callFunction<any>('world', { action: 'advanceTime', worldId, hours }),
  
  setWeather: (worldId: string, weather: any) =>
    callFunction<any>('world', { action: 'setWeather', worldId, ...weather }),
};

// ============================================
// Lorekeeper (Knowledge Graph)
// ============================================

export const lorekeeper = {
  createGraph: (projectId: string, name: string) =>
    callFunction<any>('lorekeeper', { action: 'createGraph', projectId, name }),
  
  getGraph: (projectId: string) =>
    callFunction<any>('lorekeeper', { action: 'getGraph', projectId }),
  
  createNode: (worldId: string, node: any) =>
    callFunction<any>('lorekeeper', { action: 'createNode', worldId, ...node }),
  
  getNode: (nodeId: string) =>
    callFunction<any>('lorekeeper', { action: 'getNode', nodeId }),
  
  createRelationship: (fromId: string, toId: string, type: string) =>
    callFunction<any>('lorekeeper', { action: 'createRelationship', fromId, toId, type }),
  
  addMemory: (npcId: string, sessionId: string, content: string, type: string) =>
    callFunction<any>('lorekeeper', { action: 'addMemory', npcId, sessionId, content, type }),
  
  getNPCContext: (npcId: string) =>
    callFunction<any>('lorekeeper', { action: 'getNPCContext', npcId }),
  
  checkConsistency: (worldId: string) =>
    callFunction<any>('lorekeeper', { action: 'checkConsistency', worldId }),
};

// ============================================
// Quests
// ============================================

export interface Quest {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  type: 'main' | 'side' | 'personal';
  status: 'available' | 'active' | 'completed' | 'failed';
  objectives: any[];
  rewards: any[];
}

export const quests = {
  create: (payload: Partial<Quest>) =>
    callFunction<Quest>('quests', payload),
  
  get: (questId: string) =>
    callFunction<Quest>('quests', { action: 'get', questId }),
  
  list: (projectId?: string, status?: string) =>
    callFunction<Quest[]>('quests', { action: 'list', projectId, status }),
  
  update: (questId: string, updates: Partial<Quest>) =>
    callFunction<Quest>('quests', { action: 'update', questId, ...updates }),
  
  completeObjective: (questId: string, objectiveId: string) =>
    callFunction<Quest>('quests', { action: 'completeObjective', questId, objectiveId }),
  
  generate: (type: 'main' | 'side' | 'personal', level: number) =>
    callFunction<Quest>('quests', { action: 'generate', type, level }),
};

// ============================================
// Marketplace
// ============================================

export const marketplace = {
  listTemplates: (type?: string, tag?: string) =>
    callFunction<any[]>('marketplace', { action: 'list', type, tag }),
  
  getTemplate: (templateId: string) =>
    callFunction<any>('marketplace', { action: 'get', templateId }),
  
  search: (query: string) =>
    callFunction<any[]>('marketplace', { action: 'search', query }),
  
  download: (templateId: string) =>
    callFunction<any>('marketplace', { action: 'download', templateId }),
  
  rate: (templateId: string, rating: number) =>
    callFunction<any>('marketplace', { action: 'rate', templateId, rating }),
};

// Server client for authenticated requests
export const createServerClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey);
};

export default supabase;