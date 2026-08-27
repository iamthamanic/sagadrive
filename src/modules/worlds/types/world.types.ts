export type WorldModuleConfig = Record<string, unknown>;
export type WorldModuleConfigMap = Record<string, WorldModuleConfig>;

export interface WorldProfileDto {
  id: string;
  owner_user_id: string;
  name: string;
  description: string | null;
  modules: unknown;
  created_at: string;
  updated_at: string;
}

export interface WorldProfileVm {
  id: string;
  name: string;
  description: string;
  modules: WorldModuleConfigMap;
  createdAt: Date;
  updatedAt: Date;
}

export interface EffectiveWorldConfig {
  projectId: string;
  characterId: string;
  worldProfileId: string;
  worldName: string;
  modules: WorldModuleConfigMap;
  speciesDevelopmentMode: 'explicit' | 'progressive' | 'disabled';
  source: 'project-world-profile';
}

export interface CreateWorldProfileDto {
  name: string;
  description?: string;
  modules?: WorldModuleConfigMap;
}

export interface UpdateWorldProfileDto {
  name?: string;
  description?: string;
  modules?: WorldModuleConfigMap;
}
