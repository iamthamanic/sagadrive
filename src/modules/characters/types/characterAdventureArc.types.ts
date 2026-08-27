/**
 * characterAdventureArc.types — DTOs/VMs for adventure participation + development history.
 * Location: src/modules/characters/types/characterAdventureArc.types.ts
 */

export type CharacterAdventureArcStatus = 'active' | 'completed' | 'left';

export type CharacterAdventureDevelopmentKind = 'level' | 'species-trait' | 'skill' | 'note';

export interface CharacterAdventureDevelopmentDto {
  id: string;
  at: string;
  kind: CharacterAdventureDevelopmentKind;
  title: string;
  detail?: string;
  meta?: Record<string, unknown>;
}

export interface CharacterAdventureArcDto {
  id: string;
  character_id: string;
  project_id: string;
  status: CharacterAdventureArcStatus;
  started_at: string;
  ended_at: string | null;
  summary: string | null;
  developments: CharacterAdventureDevelopmentDto[] | unknown;
  created_at: string;
  updated_at: string;
}

export interface CharacterAdventureArcVm {
  id: string;
  characterId: string;
  projectId: string;
  projectName: string;
  projectStatus: string | null;
  sessionCount: number;
  status: CharacterAdventureArcStatus;
  startedAt: string;
  endedAt: string | null;
  summary: string;
  developments: CharacterAdventureDevelopmentDto[];
  createdAt: string;
  updatedAt: string;
}

export interface AppendAdventureDevelopmentInput {
  kind: CharacterAdventureDevelopmentKind;
  title: string;
  detail?: string;
  meta?: Record<string, unknown>;
}
