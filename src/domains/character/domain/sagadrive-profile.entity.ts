/**
 * sagadrive-profile.entity — Domain entities for SagaDrive character profile.
 * Location: src/domains/character/domain/sagadrive-profile.entity.ts
 */
import type {
  SagaDriveArchetypeKey,
  SagaDriveAttributeKey,
  SagaDriveEssenceKey,
  SagaDriveSkillKey,
  SagaDriveSpeciesTraitKey,
} from '../../rules/sagadrive/character-creation';
import type {
  SagaDriveBackgroundSkillPoints,
  SagaDriveSkillAdvanceDto,
  SagaDriveSkillProvenanceStatus,
  SagaDriveSpecializationRecordDto,
  SagaDriveSpecializationSource,
} from '../../rules/sagadrive/skill-progression';
import type { SagaDriveSpeciesTraitOptionKey } from '../../rules/sagadrive/species-trait-options';
import type { CharacterAttributesDto } from './character.entity';

export type SagaDriveAttributeAdvancesDto = Partial<Record<8 | 16, SagaDriveAttributeKey>>;

export interface SagaDriveSpecializationDto {
  skill: SagaDriveSkillKey;
  name: string;
  source?: SagaDriveSpecializationSource;
  acquiredAtLevel?: number;
}

export interface SagaDriveBackgroundDto {
  name: string;
  skillPool: SagaDriveSkillKey[];
  trainedSkills: SagaDriveSkillKey[];
  backgroundSkillPoints?: SagaDriveBackgroundSkillPoints;
  specialization?: SagaDriveSpecializationDto;
  milieuAccess: string;
  contact: string;
  complication: string;
  communication: string;
}

export type SagaDriveSpeciesTraitDetailsDto = Partial<Record<SagaDriveSpeciesTraitKey, string>>;

export type SagaDriveSpeciesTraitSource = 'species-creation';

export interface SagaDriveSpeciesTraitInstanceDto {
  trait: SagaDriveSpeciesTraitKey;
  option?: SagaDriveSpeciesTraitOptionKey;
  legacyDetail?: string;
  source: SagaDriveSpeciesTraitSource;
  acquiredAtLevel: number;
}

export interface SagaDriveSpeciesProfileDto {
  name: string;
  bodyDescription: string;
}

export type SagaDrivePresetReleaseMode = 'manual' | 'auto';

export interface SagaDriveProfileDto {
  archetype?: SagaDriveArchetypeKey;
  essence?: SagaDriveEssenceKey;
  speciesTraitInstances: SagaDriveSpeciesTraitInstanceDto[];
  speciesTraits?: SagaDriveSpeciesTraitKey[];
  speciesTraitDetails?: SagaDriveSpeciesTraitDetailsDto;
  speciesProfile?: SagaDriveSpeciesProfileDto;
  backgroundTemplateId?: string | null;
  background: SagaDriveBackgroundDto;
  archetypeTrainingSkill?: SagaDriveSkillKey;
  freeSkillRanks?: Partial<Record<SagaDriveSkillKey, number>>;
  skillAdvances?: SagaDriveSkillAdvanceDto[];
  specializations?: SagaDriveSpecializationRecordDto[];
  skillProvenanceStatus?: SagaDriveSkillProvenanceStatus;
  baseAttributes?: CharacterAttributesDto;
  attributeAdvances?: SagaDriveAttributeAdvancesDto;
  presetReleaseMode?: SagaDrivePresetReleaseMode;
  drive: number;
  momentum: number;
}
