/**
 * assert-character-persistence — Server-side SagaDrive build validation before persistence.
 * Location: src/domains/character/use-cases/assert-character-persistence.ts
 */
import {
  applySagaDriveAttributeAdvances,
  isValidSagaDriveAttributeBuild,
  type SagaDriveAttributeAdvances,
} from '../../rules/sagadrive/attribute-progression';
import {
  assertSagaDriveSkillPersistence,
  resolveSagaDriveSkillBuildState,
  type SagaDriveSkillRankMap,
} from '../../rules/sagadrive/skill-progression';
import type { CharacterAttributesDto } from '../domain/character.entity';
import type { SagaDriveProfileDto } from '../domain/sagadrive-profile.entity';

function attributesEqual(left: CharacterAttributesDto, right: CharacterAttributesDto): boolean {
  return left.strength === right.strength
    && left.dexterity === right.dexterity
    && left.endurance === right.endurance
    && left.mind === right.mind
    && left.perception === right.perception
    && left.charisma === right.charisma;
}

export function assertValidSagaDriveAttributePersistence(
  attributes: CharacterAttributesDto,
  profile: SagaDriveProfileDto,
  level: number,
): void {
  if (!profile.baseAttributes) return;
  const advances = (profile.attributeAdvances ?? {}) as SagaDriveAttributeAdvances;
  if (!isValidSagaDriveAttributeBuild(profile.baseAttributes, advances, level)) {
    throw new Error('Invalid SagaDrive attribute build: base distribution or permanent advances violate Core rules.');
  }
  const expected = applySagaDriveAttributeAdvances(profile.baseAttributes, advances, level);
  if (!attributesEqual(attributes, expected)) {
    throw new Error('Invalid SagaDrive attribute build: final attributes must match baseAttributes plus advances.');
  }
}

export function assertValidSagaDriveSkillPersistence(
  skills: SagaDriveSkillRankMap,
  profile: SagaDriveProfileDto,
  level: number,
): void {
  const resolved = resolveSagaDriveSkillBuildState({
    freeSkillRanks: profile.freeSkillRanks,
    backgroundSkillPoints: profile.background.backgroundSkillPoints,
    skillPool: profile.background.skillPool,
    archetypeTrainingSkill: profile.archetypeTrainingSkill,
    skillAdvances: profile.skillAdvances,
    specializations: profile.specializations,
    backgroundSpecialization: profile.background.specialization,
  });

  assertSagaDriveSkillPersistence(
    skills,
    resolved,
    level,
    profile.background.skillPool,
    profile.archetype,
  );
}

export function assertValidSagaDriveCharacterPersistence(
  attributes: CharacterAttributesDto,
  skills: SagaDriveSkillRankMap,
  profile: SagaDriveProfileDto,
  level: number,
): void {
  assertValidSagaDriveAttributePersistence(attributes, profile, level);
  assertValidSagaDriveSkillPersistence(skills, profile, level);
}
